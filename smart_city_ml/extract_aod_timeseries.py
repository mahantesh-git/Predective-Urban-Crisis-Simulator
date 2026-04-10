import os
import zipfile
import netCDF4
import pandas as pd
import numpy as np
from datetime import datetime
import shutil
from pyproj import Proj

import glob

# Constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWDATA_DIR = os.path.join(BASE_DIR, "datasets", "newdata")
LATLON_CSV = os.path.join(BASE_DIR, "datasets", "long_lat.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "datasets", "historical_pollution.csv")
TMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aod_worker")

# India LCC Projection
proj_str = "+proj=lcc +lat_1=12.472944444 +lat_2=35.172805555 +lat_0=24.0 +lon_0=80.0 +x_0=4000000 +y_0=4000000 +datum=WGS84 +units=m"
projection = Proj(proj_str)

# Target Cities
df_cities = pd.read_csv(LATLON_CSV)
cities_meta = []
for _, row in df_cities.iterrows():
    # Lon, Lat -> X, Y
    x, y = projection(row['lng'], row['lat'])
    cities_meta.append({
        "name": row['city'].lower(),
        "x": x,
        "y": y
    })

def extract_year_data(year):
    zip_path = os.path.join(NEWDATA_DIR, f"aod_model_{year}.zip")
    if not os.path.exists(zip_path):
        return []
        
    print(f"--- Processing {year} ---")
    results = []
    
    # Create clean work dir
    work_dir = os.path.join(TMP_DIR, str(year))
    if os.path.exists(work_dir):
        shutil.rmtree(work_dir, ignore_errors=True)
    os.makedirs(work_dir)
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        nc_files = [f for f in z.namelist() if f.endswith('.nc4') and "__MACOSX" not in f]
        # Sample every 10th day
        sample_files = nc_files[::10] 
        print(f"Sampling {len(sample_files)} files from {year}...")
        
        for nc_info in sample_files:
            temp_path = None
            try:
                filename = os.path.basename(nc_info)
                # Parse date from filename: V01AL_PM25_India_20191014.nc4 or similar
                date_str = filename.split('_')[-1].split('.')[0]
                date_obj = datetime.strptime(date_str, "%Y%m%d")
                
                # Extract file
                temp_path = z.extract(nc_info, work_dir)
                
                # Open with netCDF4 for low-level stability
                with netCDF4.Dataset(temp_path, 'r') as nc:
                    # Multi-key lookup due to dataset versioning
                    data_var = None
                    for candidate in ['pm25_pred', 'pm25_predicted', 'PM25']:
                        if candidate in nc.variables:
                            data_var = nc.variables[candidate]
                            break
                            
                    if data_var is None:
                        continue
                    
                    data = data_var[:] # Load selection into memory
                    y_vals = nc.variables['y'][:]
                    x_vals = nc.variables['x'][:]
                    
                    for city in cities_meta:
                        try:
                            # Spatial Selection
                            y_idx = np.abs(y_vals - city['y']).argmin()
                            x_idx = np.abs(x_vals - city['x']).argmin()
                            
                            val = data[y_idx, x_idx]
                            if not np.isnan(val) and val > 0:
                                results.append({
                                    "date": date_obj.strftime("%Y-%m-%d"),
                                    "city": city['name'],
                                    "pm25": float(val)
                                })
                        except Exception:
                            continue
            except Exception:
                continue
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
    
    # Cleanup year dir
    shutil.rmtree(work_dir, ignore_errors=True)
    return results

# Main Execution Loop
if not os.path.exists(TMP_DIR):
    os.makedirs(TMP_DIR)

final_all_data = []
# Process the full 15-year historical span
zip_files = glob.glob(os.path.join(NEWDATA_DIR, "aod_model_*.zip"))
benchmark_years = sorted([int(os.path.basename(f).split('_')[2].split('.')[0]) for f in zip_files])

for year in benchmark_years:
    year_data = extract_year_data(year)
    final_all_data.extend(year_data)

if final_all_data:
    df_final = pd.DataFrame(final_all_data)
    df_final.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSUCCESS: Extracted {len(df_final)} records for all compatible cities.")
    print(f"Top 5 cities by record count:\n{df_final['city'].value_counts().head(5)}")
    print(f"Historical pollution data saved to {OUTPUT_CSV}")
else:
    print("FAILED: No pollution data extracted. Check spatial coverage and variable candidates.")
