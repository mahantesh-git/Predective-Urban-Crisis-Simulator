"""
Full Production ML Training Script
===================================
Fetches 4 years of real historical data from the Open-Meteo API (Bengaluru, India)
and trains all models required by the smart_city_ml microservice.

Models trained:
  1. models/aqi.pkl             - Prophet for AQI forecasting
  2. models/water.pkl           - Prophet for Water Quality forecasting
  3. models/health.pkl          - XGBoost Classifier (4 classes: Low/Mod/High/Critical)
  4. models/forest.pkl          - XGBoost Regressor (forest cover change)
  5. models/traffic.pkl         - XGBoost Classifier (3 classes: Free/Slow/Congested)
  6. models/crisis_classifier.json - XGBoost Booster (binary: crisis / no-crisis) for SHAP

Run with:
  cd smart_city_ml
  python train_models.py
"""

import os
import json
import pandas as pd
import numpy as np
import requests
import joblib
import warnings
warnings.filterwarnings('ignore')

from prophet import Prophet
import xgboost as xgb
from xgboost import XGBClassifier, XGBRegressor

# ─── Config ────────────────────────────────────────────────────────────────────
LAT         = 12.9716
LON         = 77.5946
CITY        = "Bengaluru, India"
START_DATE  = "2020-01-01"
END_DATE    = "2024-12-31"   # 5 years of real data
MODELS_DIR  = "models"
DATA_DIR    = "data"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# ─── 1. Fetch Real Data ─────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"  CitySentinel AI — Full Model Training Pipeline")
print(f"  City: {CITY} | {START_DATE} → {END_DATE}")
print(f"{'='*60}\n")

print("📡 [1/4] Fetching historical weather data from Open-Meteo Archive API...")
weather_url = (
    f"https://archive-api.open-meteo.com/v1/archive"
    f"?latitude={LAT}&longitude={LON}"
    f"&start_date={START_DATE}&end_date={END_DATE}"
    f"&daily=temperature_2m_mean,rain_sum,windspeed_10m_max,relative_humidity_2m_mean"
    f"&timezone=Asia%2FKolkata"
)
weather_res = requests.get(weather_url, timeout=30).json()
if 'error' in weather_res:
    raise RuntimeError(f"Weather API error: {weather_res}")

print("📡 [2/4] Fetching historical AQI (hourly) from Open-Meteo Air Quality API...")
aqi_url = (
    f"https://air-quality-api.open-meteo.com/v1/air-quality"
    f"?latitude={LAT}&longitude={LON}"
    f"&start_date={START_DATE}&end_date={END_DATE}"
    f"&hourly=us_aqi,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide"
    f"&timezone=Asia%2FKolkata"
)
aqi_res = requests.get(aqi_url, timeout=60).json()
if 'error' in aqi_res:
    raise RuntimeError(f"AQI API error: {aqi_res}")

# ─── 2. Process & Merge Data ────────────────────────────────────────────────────
print("\n🔧 [3/4] Processing and merging data...")

df_weather = pd.DataFrame({
    'date':        pd.to_datetime(weather_res['daily']['time']),
    'temperature': weather_res['daily']['temperature_2m_mean'],
    'rainfall':    weather_res['daily']['rain_sum'],
    'windspeed':   weather_res['daily']['windspeed_10m_max'],
    'humidity':    weather_res['daily']['relative_humidity_2m_mean'],
})

df_aqi_h = pd.DataFrame({
    'time': pd.to_datetime(aqi_res['hourly']['time']),
    'aqi':  aqi_res['hourly']['us_aqi'],
    'co':   aqi_res['hourly']['carbon_monoxide'],
    'no2':  aqi_res['hourly']['nitrogen_dioxide'],
    'so2':  aqi_res['hourly']['sulphur_dioxide'],
})
df_aqi_h['date'] = df_aqi_h['time'].dt.normalize()
df_aqi_daily = df_aqi_h.groupby('date').agg({
    'aqi': 'max',
    'co':  'mean',
    'no2': 'mean',
    'so2': 'mean',
}).reset_index()

df = pd.merge(df_weather, df_aqi_daily, on='date', how='inner')
df.fillna(method='ffill', inplace=True)
df.fillna(0, inplace=True)

days = len(df)
print(f"   Merged {days} days of real historical data.")

# ── Derived / Synthetic Features ────────────────────────────────────────────────
np.random.seed(42)

# Water quality: real rainfall helps, high AQI hurts
df['water_quality'] = np.clip(
    80 - (df['aqi'] / 20) + (df['rainfall'] * 0.4) + np.random.normal(0, 4, days), 0, 100
)

# Industrial emission index from real pollutants (CO/NO2/SO2)
df['industry_emission'] = np.clip(
    (df['co'] / 4000) * 40 + (df['no2'] / 100) * 30 + (df['so2'] / 50) * 30
    + np.random.normal(0, 3, days), 0, 100
)

# Traffic density (AQI-correlated, random noise, day-of-week pattern)
df['day_of_week'] = df['date'].dt.dayofweek
weekday_boost = df['day_of_week'].map({0: 1.2, 1: 1.3, 2: 1.3, 3: 1.2, 4: 1.4, 5: 0.8, 6: 0.6})
df['traffic_density'] = np.clip(
    df['aqi'] * 1.5 * weekday_boost + np.random.normal(0, 20, days), 0, 1000
)

df['population_density'] = np.linspace(12000, 14500, days)
df['forest_cover_ha'] = np.clip(np.linspace(115000, 102000, days) + np.random.normal(0, 500, days), 90000, 120000)
df['urban_expansion_rate'] = np.random.uniform(0.1, 2.5, days)
df['drought_index'] = 1 - (df['water_quality'] / 100)
df['time_of_day'] = 12

# ── Composite Crisis Score (0–100) ──────────────────────────────────────────────
aqi_norm        = df['aqi'] / 500          # 0-1
water_norm      = (100 - df['water_quality']) / 100   # 0-1 (higher stress = higher crisis)
traffic_norm    = df['traffic_density'] / 1000
emission_norm   = df['industry_emission'] / 100

composite = (aqi_norm * 0.35) + (water_norm * 0.30) + (traffic_norm * 0.20) + (emission_norm * 0.15)
df['crisis_score'] = np.clip(composite * 100, 0, 100)
df['crisis_label'] = (df['crisis_score'] >= 50).astype(int)   # Binary: 0=safe, 1=crisis

# ── Classification Labels ──────────────────────────────────────────────────────
df['health_risk_label']    = pd.cut(df['aqi'], bins=[-np.inf, 50, 100, 200, np.inf], labels=[0, 1, 2, 3]).astype(int)
df['traffic_status_label'] = pd.cut(df['traffic_density'], bins=[-np.inf, 300, 600, np.inf], labels=[0, 1, 2]).astype(int)

df.to_csv(f'{DATA_DIR}/historical_training_data.csv', index=False)
print(f"   Saved {DATA_DIR}/historical_training_data.csv")

# ─── 3. Train All Models ────────────────────────────────────────────────────────
print(f"\n🤖 [4/4] Training models...\n")

# ── AQI Prophet ─────────────────────────────────────────────────────────────────
print("  [1/6] Training AQI Prophet model...")
df_aqi_p = df[['date', 'aqi']].rename(columns={'date': 'ds', 'aqi': 'y'})
aqi_model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False,
                    changepoint_prior_scale=0.15)
aqi_model.add_regressor('rainfall_reg', standardize=True)
# Prophet requires regressors in the fit df - rebuild:
df_aqi_p2 = df[['date', 'aqi', 'rainfall']].rename(columns={'date': 'ds', 'aqi': 'y', 'rainfall': 'rainfall_reg'})
aqi_model.fit(df_aqi_p2)
joblib.dump(aqi_model, f"{MODELS_DIR}/aqi.pkl")
print("     ✅ aqi.pkl saved")

# ── Water Prophet ───────────────────────────────────────────────────────────────
print("  [2/6] Training Water Quality Prophet model...")
df_water_p = df[['date', 'water_quality']].rename(columns={'date': 'ds', 'water_quality': 'y'})
water_model = Prophet(yearly_seasonality=True, weekly_seasonality=False,
                      changepoint_prior_scale=0.05)
water_model.fit(df_water_p)
joblib.dump(water_model, f"{MODELS_DIR}/water.pkl")
print("     ✅ water.pkl saved")

# ── Health XGBoost ──────────────────────────────────────────────────────────────
print("  [3/6] Training Health Risk XGBoost classifier...")
X_health = df[['aqi', 'temperature', 'humidity', 'population_density', 'water_quality']]
y_health  = df['health_risk_label']
health_model = XGBClassifier(n_estimators=200, max_depth=5, learning_rate=0.05, eval_metric='mlogloss',
                              num_class=4, objective='multi:softprob', use_label_encoder=False)
health_model.fit(X_health, y_health)
joblib.dump(health_model, f"{MODELS_DIR}/health.pkl")
print("     ✅ health.pkl saved")

# ── Forest XGBoost ──────────────────────────────────────────────────────────────
print("  [4/6] Training Forest Cover XGBoost regressor...")
X_forest = df[['rainfall', 'urban_expansion_rate', 'forest_cover_ha']].shift(1).dropna()
y_forest  = df['forest_cover_ha'].iloc[1:]
forest_model = XGBRegressor(n_estimators=200, max_depth=4, learning_rate=0.05)
forest_model.fit(X_forest, y_forest)
joblib.dump(forest_model, f"{MODELS_DIR}/forest.pkl")
print("     ✅ forest.pkl saved")

# ── Traffic XGBoost ─────────────────────────────────────────────────────────────
print("  [5/6] Training Traffic Status XGBoost classifier...")
X_traffic = df[['time_of_day', 'day_of_week', 'traffic_density', 'temperature']]
y_traffic  = df['traffic_status_label']
traffic_model = XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.05, eval_metric='mlogloss',
                               num_class=3, objective='multi:softprob', use_label_encoder=False)
traffic_model.fit(X_traffic, y_traffic)
joblib.dump(traffic_model, f"{MODELS_DIR}/traffic.pkl")
print("     ✅ traffic.pkl saved")

# ── Crisis Classifier (SHAP) ────────────────────────────────────────────────────
print("  [6/6] Training Crisis Probability XGBoost classifier (for SHAP)...")
# Feature vector: 7 days x 3 metrics = 21 features  (aqi, traffic/10, water)
WINDOW = 7
records = []
labels  = []
for i in range(WINDOW, len(df)):
    window_df = df.iloc[i - WINDOW: i]
    feat = []
    for _, row in window_df.iterrows():
        feat.extend([row['aqi'], row['traffic_density'] / 10, row['water_quality']])
    records.append(feat)
    labels.append(df.iloc[i]['crisis_label'])

X_crisis = np.array(records, dtype=np.float32)
y_crisis  = np.array(labels,  dtype=np.float32)

dtrain = xgb.DMatrix(X_crisis, label=y_crisis)
params = {
    'objective':        'binary:logistic',
    'eval_metric':      'logloss',
    'max_depth':        5,
    'eta':              0.05,
    'subsample':        0.8,
    'colsample_bytree': 0.8,
    'min_child_weight': 3,
}
crisis_booster = xgb.train(params, dtrain, num_boost_round=300, verbose_eval=False)
crisis_booster.save_model(f"{MODELS_DIR}/crisis_classifier.json")
print("     ✅ crisis_classifier.json saved")

print(f"\n{'='*60}")
print(f"  ✅ All 6 models trained and saved to ./{MODELS_DIR}/")
print(f"{'='*60}\n")
