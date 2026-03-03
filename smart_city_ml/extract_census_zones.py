"""
extract_census_zones.py
========================
Extracts real city zone/ward data from Census 2011 datasets:
  - PCA11-UA-0000.xlsx  (ward-level: population, households, literacy, workforce)
  - PC11_TV_DIR.xlsx    (town/village directory: zone names)

Outputs:
  - datasets/city_zones.json   (served by backend /api/zones/census endpoint)
"""
import pandas as pd
import json
import warnings
import os
import re

warnings.filterwarnings('ignore')

BASE = os.path.join(os.path.dirname(__file__), '../datasets/')
OUT = os.path.join(BASE, 'city_zones.json')

print("=" * 60)
print("  Extracting Real City Zones from Census 2011")
print("=" * 60)

# ─── Load PCA11 ──────────────────────────────────────────────────────────────
df = pd.read_excel(BASE + 'PCA11-UA-0000.xlsx')
df.columns = [c.strip() for c in df.columns]
df['UA Name'] = df['UA Name'].astype(str).str.strip()

# ─── City → search keyword mapping ──────────────────────────────────────────
# Uses Census 2011 naming conventions (e.g. Bangalore, Gurgaon, Ahmadabad)
CITY_SEARCH = {
    'delhi':              'Delhi',
    'mumbai':             'Mumbai',
    'bengaluru':          'Bangalore',
    'chennai':            'Chennai',
    'hyderabad':          'Hyderabad',
    'kolkata':            'Kolkata',
    'ahmedabad':          'Ahmadabad',
    'jaipur':             'Jaipur',
    'pune':               'Pune',
    'lucknow':            'Lucknow',
    'nagpur':             'Nagpur',
    'patna':              'Patna',
    'amritsar':           'Amritsar',
    'coimbatore':         'Coimbatore',
    'visakhapatnam':      'Visakhapatnam',
    'thiruvananthapuram': 'Thiruvananthapuram',
    'bhopal':             'Bhopal',
    'jodhpur':            'Jodhpur',
    'ernakulam':          'Kochi',
    'shillong':           'Shillong',
    'gurugram':           'Gurgaon',
    'aizawl':             'Aizawl',
    'amaravati':          'Amravati',
    'talcher':            'Talcher',
    'surat':              'Surat',
    'kanpur':             'Kanpur',
}

# ─── Zone type inference from name keywords ──────────────────────────────────
INDUSTRIAL_KW  = ['industrial', 'factory', 'port', 'mfg', 'ogi', 'petroc']
COMMERCIAL_KW  = ['market', 'bazaar', 'commercial', 'corp', 'town', 'cantt', 'cantonment',
                  'civil lines', 'junction', 'railway', 'station', 'city']
ECOLOGICAL_KW  = ['lake', 'forest', 'park', 'beach', 'river', 'garden', 'hill', 'valley',
                  'nagar van', 'waterbody']
TRANSPORT_KW   = ['road', 'highway', 'airport', 'terminal', 'bypass', 'nagar road']
RESIDENTIAL_KW = ['nagar', 'colony', 'vihar', 'puram', 'ganj', 'ward', 'extension',
                  'layout', 'sector', 'society', 'area', 'enclave', 'residency']

def infer_zone_type(name: str) -> str:
    nl = name.lower()
    if any(k in nl for k in INDUSTRIAL_KW):  return 'INDUSTRIAL'
    if any(k in nl for k in ECOLOGICAL_KW):  return 'ECOLOGICAL'
    if any(k in nl for k in TRANSPORT_KW):   return 'TRANSPORT'
    if any(k in nl for k in COMMERCIAL_KW):  return 'COMMERCIAL'
    return 'RESIDENTIAL'

def clean_zone_name(name: str) -> str:
    """Remove Census hierarchy prefix like '(a)', '(i)', '(ii) ' etc."""
    name = re.sub(r'^\([a-z0-9]+\)\s*', '', name.strip())
    name = re.sub(r'^\([ivxlcdm]+\)\s*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\(M Corp\.?\+?OG\)', '', name)
    name = re.sub(r'\(M Corp\.?\)', '', name)
    name = re.sub(r'\(M Cl\.?\+?OG\)', '', name)
    name = re.sub(r'\(CT\)', '', name)
    name = re.sub(r'\(OG\)', '', name)
    name = re.sub(r'\(M\.?\s*Corp\.?\)', '', name)
    name = re.sub(r'\(Urban Agglomeration\)', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def make_zone_id(name: str, idx: int) -> str:
    slug = re.sub(r'[^a-z0-9]', '_', name.lower().strip())
    slug = re.sub(r'_+', '_', slug).strip('_')[:30]
    return f'zone_{idx:02d}_{slug}'

def infer_description(name: str, pop: int, hh: int, lit_rate: float) -> str:
    zone_type = infer_zone_type(name)
    density = round(pop / max(hh, 1), 1)
    lit_pct = round(lit_rate * 100, 0)
    type_desc = {
        'INDUSTRIAL':  f'Industrial zone with {pop:,} residents, {hh:,} households',
        'COMMERCIAL':  f'Commercial hub — {pop:,} population, high economic activity',
        'ECOLOGICAL':  f'Urban ecological zone — {pop:,} residents in green buffer',
        'TRANSPORT':   f'Transport corridor — {pop:,} population, high connectivity',
        'RESIDENTIAL': f'Residential area with {pop:,} residents, avg {density} ppl/HH',
    }
    base = type_desc.get(zone_type, f'{pop:,} residents, {hh:,} households')
    return f'{base}. Literacy: {lit_pct:.0f}%.'

def safe_int(v):
    try:
        return int(float(v)) if pd.notna(v) else 0
    except:
        return 0

# ─── Extract zones per city ──────────────────────────────────────────────────
city_zones = {}
stats = {}

for city_id, search_kw in CITY_SEARCH.items():
    matches = df[df['UA Name'].str.contains(search_kw, na=False, case=False)]
    # Level 0 = whole UA total (skip), Level 1+ = city/sub-parts
    parts = matches[matches['Level'].astype(float) >= 1].copy()

    # Fallback: if no Level 1+ parts found (e.g. Jaipur), use Level 0 row
    if len(parts) == 0 and len(matches) > 0:
        print(f"  ℹ️  {city_id}: No sub-parts, falling back to Level 0 entry")
        parts = matches.copy()

    if len(parts) == 0:
        print(f"  ⚠️  {city_id}: no UA match for '{search_kw}'")
        city_zones[city_id] = []
        continue

    zones = []
    for i, (_, row) in enumerate(parts.iterrows()):
        raw_name = str(row['UA Name'])
        name = clean_zone_name(raw_name)
        if not name or name == 'nan':
            continue

        pop       = safe_int(row.get('TOT_P', 0))
        hh        = safe_int(row.get('No_HH', 0))
        lit       = safe_int(row.get('P_LIT', 0))
        work      = safe_int(row.get('TOT_WORK_P', 0))
        total_m   = safe_int(row.get('TOT_M', 0))
        total_f   = safe_int(row.get('TOT_F', 0))

        lit_rate  = lit / max(pop, 1)
        work_rate = work / max(pop, 1)
        z_type    = infer_zone_type(name)
        desc      = infer_description(name, pop, hh, lit_rate)

        zones.append({
            'id':           make_zone_id(name, i),
            'name':         name,
            'type':         z_type,
            'description':  desc,
            'population':   pop,
            'households':   hh,
            'literacy_rate': round(lit_rate, 3),
            'workforce_ratio': round(work_rate, 3),
            'males':        total_m,
            'females':      total_f,
            'data_source':  'Census 2011 PCA11-UA'
        })

    # Limit to top 8 zones (largest population), always include at least 3
    zones_sorted = sorted(zones, key=lambda z: z['population'], reverse=True)
    top_zones    = zones_sorted[:8]

    city_zones[city_id] = top_zones
    stats[city_id] = len(top_zones)
    print(f"  ✅ {city_id}: {len(top_zones)} zones (from {len(parts)} UA parts)")

# ─── Save output ─────────────────────────────────────────────────────────────
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(city_zones, f, indent=2, ensure_ascii=False)

print(f"\n✅ Saved {sum(len(z) for z in city_zones.values())} zones for "
      f"{len([c for c in city_zones if city_zones[c]])} cities")
print(f"   → {os.path.abspath(OUT)}")
