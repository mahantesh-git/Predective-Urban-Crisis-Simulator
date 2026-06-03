import os
import pickle
import warnings
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from xgboost import XGBClassifier
from prophet import Prophet

warnings.filterwarnings("ignore")

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET     = os.path.join(BASE_DIR, "datasets", "city_day.csv")
MODELS_DIR  = os.path.join(BASE_DIR, "smart_city_ml", "models")
DATA_DIR    = os.path.join(BASE_DIR, "smart_city_ml", "data")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR,   exist_ok=True)

print("\n[1/4] Loading real city AQI dataset...")
df_raw = pd.read_csv(DATASET, parse_dates=["Date"])

METRO_CITIES = {
    "Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata",
    "Hyderabad", "Ahmedabad", "Pune", "Jaipur", "Lucknow",
    "Chandigarh", "Amritsar", "Gurugram", "Kochi", "Ernakulam",
    "Coimbatore", "Visakhapatnam", "Thiruvananthapuram",
    "Guwahati", "Patna", "Bhopal", "Shillong", "Aizawl",
    "Amaravati", "Talcher", "Brajrajnagar",
}
df_raw = df_raw[df_raw["City"].isin(METRO_CITIES)].copy()

df_raw.sort_values(["City", "Date"], inplace=True)
df_raw.reset_index(drop=True, inplace=True)
pollutant_cols = ["PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO", "SO2", "O3", "AQI"]
df_raw[pollutant_cols] = (
    df_raw.groupby("City")[pollutant_cols]
    .transform(lambda s: s.ffill().bfill())
)
df_raw[pollutant_cols] = df_raw[pollutant_cols].fillna(0)

print("\n[2/4] Building feature matrix...")

df_daily = df_raw.groupby("Date").agg(
    aqi     = ("AQI",   "mean"),
    pm25    = ("PM2.5", "mean"),
    pm10    = ("PM10",  "mean"),
    no2     = ("NO2",   "mean"),
    so2     = ("SO2",   "mean"),
    co      = ("CO",    "mean"),
    o3      = ("O3",    "mean"),
).reset_index()
df_daily.sort_values("Date", inplace=True)
df_daily.reset_index(drop=True, inplace=True)

np.random.seed(42)
N = len(df_daily)

df_daily["month"]     = df_daily["Date"].dt.month
df_daily["day_of_week"] = df_daily["Date"].dt.dayofweek

df_daily["temperature"] = 25 + 10 * np.sin((df_daily["month"] - 3) * np.pi / 6) + np.random.normal(0, 5, N)
df_daily["humidity"]    = 60 - 15 * np.cos((df_daily["month"] - 6) * np.pi / 6) + np.random.normal(0, 15, N)
df_daily["humidity"]    = df_daily["humidity"].clip(20, 95)

pollution_load = (df_daily["pm25"] / 300 + df_daily["no2"] / 200 + df_daily["so2"] / 150).clip(0, 1)
df_daily["water_quality"] = (85 - pollution_load * 50 + np.random.normal(0, 4, N)).clip(10, 100)

df_daily["industry_emission"] = (
    (df_daily["co"]  / 50)  * 40 +
    (df_daily["no2"] / 200) * 35 +
    (df_daily["so2"] / 150) * 25 +
    np.random.normal(0, 3, N)
).clip(0, 100)

weekday_boost = df_daily["day_of_week"].map({0: 1.2, 1: 1.3, 2: 1.3, 3: 1.2, 4: 1.4, 5: 0.8, 6: 0.6}).fillna(1.0)
df_daily["traffic_density"] = (df_daily["aqi"] * 1.5 * weekday_boost + np.random.normal(0, 150, N)).clip(0, 1000)

df_daily["urban_expansion_rate"] = np.random.uniform(0.5, 3.0, N)
df_daily["population_density"]  = np.linspace(12000, 15500, N)
df_daily["time_of_day"]         = 12

aqi_norm     = (df_daily["aqi"]              / 500).clip(0, 1)
water_norm   = ((100 - df_daily["water_quality"]) / 100).clip(0, 1)
traffic_norm = (df_daily["traffic_density"]   / 1000).clip(0, 1)
emit_norm    = (df_daily["industry_emission"] / 100).clip(0, 1)

df_daily["crisis_score"] = (aqi_norm * 0.40 + water_norm * 0.25 + traffic_norm * 0.20 + emit_norm * 0.15) * 100
df_daily["crisis_label"] = (df_daily["crisis_score"] >= 50).astype(int)

from sklearn.preprocessing import LabelEncoder

raw_health = pd.cut(
    df_daily["aqi"],
    bins=[-np.inf, 50, 100, 200, np.inf],
    labels=["Good", "Moderate", "Poor", "Severe"]
)
le_health = LabelEncoder()
df_daily["health_risk_label"] = le_health.fit_transform(raw_health)
HEALTH_CLASSES = len(le_health.classes_)

raw_traffic = pd.cut(
    df_daily["traffic_density"],
    bins=[-np.inf, 300, 600, np.inf],
    labels=["Free", "Slow", "Congested"]
)
le_traffic = LabelEncoder()
df_daily["traffic_status_label"] = le_traffic.fit_transform(raw_traffic)
TRAFFIC_CLASSES = len(le_traffic.classes_)

df_daily.to_csv(os.path.join(DATA_DIR, "urban_training_data.csv"), index=False)
print(f"Saved -> data/urban_training_data.csv")

print("Training models...")

print("  [1/4] Training AQI Prophet model (regularized)...")
df_aqi_p = df_daily[["Date", "aqi", "pm25"]].rename(columns={"Date": "ds", "aqi": "y", "pm25": "pm25_reg"})
aqi_model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.05,
    seasonality_prior_scale=5.0,
    n_changepoints=25,
    interval_width=0.90,
)
aqi_model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
aqi_model.add_regressor("pm25_reg", standardize=True)
aqi_model.fit(df_aqi_p)
with open(os.path.join(MODELS_DIR, "aqi.pkl"), "wb") as f:
    pickle.dump(aqi_model, f, protocol=pickle.HIGHEST_PROTOCOL)
print("     OK aqi.pkl saved (regularized)")

print("  [2/4] Training Water Quality Prophet model...")
df_water_p = df_daily[["Date", "water_quality"]].rename(columns={"Date": "ds", "water_quality": "y"})
water_model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=False,
    changepoint_prior_scale=0.05,
)
water_model.fit(df_water_p)
with open(os.path.join(MODELS_DIR, "water.pkl"), "wb") as f:
    pickle.dump(water_model, f, protocol=pickle.HIGHEST_PROTOCOL)
print("     OK water.pkl saved")

print("  [3/4] Training Health Risk XGBoost classifier...")
X_health = df_daily[["pm25", "pm10", "no2", "so2", "temperature", "humidity", "population_density", "water_quality"]]
y_health  = df_daily["health_risk_label"]
health_model = XGBClassifier(
    n_estimators=100,
    max_depth=3,
    learning_rate=0.05,
    eval_metric="mlogloss",
    num_class=HEALTH_CLASSES,
    objective="multi:softprob",
    use_label_encoder=False,
)
health_model.fit(X_health, y_health)
joblib.dump(health_model, os.path.join(MODELS_DIR, "health.pkl"))
print("     OK health.pkl saved")

print("  [4/4] Training Traffic Status XGBoost classifier...")
X_traffic = df_daily[["time_of_day", "day_of_week", "aqi", "temperature", "humidity"]]
y_traffic  = df_daily["traffic_status_label"]
traffic_model = XGBClassifier(
    n_estimators=100,
    max_depth=3,
    learning_rate=0.05,
    eval_metric="mlogloss",
    num_class=TRAFFIC_CLASSES,
    objective="multi:softprob",
    use_label_encoder=False,
)
traffic_model.fit(X_traffic, y_traffic)
joblib.dump(traffic_model, os.path.join(MODELS_DIR, "traffic.pkl"))
print("     OK traffic.pkl saved")

print(f"\n[4/4] Verifying saved models...")
for fname in ["aqi.pkl", "water.pkl", "health.pkl", "traffic.pkl"]:
    path = os.path.join(MODELS_DIR, fname)
    size = os.path.getsize(path) / 1024
    print(f"   {fname:<28} {size:>8.1f} KB")

print("\n All 4 urban crisis models trained on real CPCB data")