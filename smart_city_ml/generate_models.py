import os
import json
import pandas as pd
import numpy as np
import joblib
from prophet import Prophet
from prophet.serialize import model_to_json
from xgboost import XGBClassifier, XGBRegressor

# Ensure target directory exists
os.makedirs("models", exist_ok=True)

print("Training placeholder AQI model (Prophet)...")
df_aqi = pd.DataFrame({
    'ds': pd.date_range(start='2023-01-01', periods=100),
    'y': np.random.normal(loc=150, scale=20, size=100)
})
aqi_model = Prophet()
aqi_model.fit(df_aqi)
with open("models/aqi.json", "w") as f:
    f.write(model_to_json(aqi_model))

print("Training placeholder Water model (Prophet)...")
df_water = pd.DataFrame({
    'ds': pd.date_range(start='2023-01-01', periods=100),
    'y': np.random.normal(loc=75, scale=10, size=100)
})
water_model = Prophet()
water_model.fit(df_water)
with open("models/water.json", "w") as f:
    f.write(model_to_json(water_model))

print("Training placeholder Health model (XGBClassifier)...")
# Features: aqi, temperature, humidity, population_density, water_quality_index
X_health = np.random.rand(100, 5) * 100
y_health = np.random.randint(0, 4, 100) # 4 classes
health_model = XGBClassifier()
health_model.fit(X_health, y_health)
joblib.dump(health_model, "models/health.pkl")

print("Training placeholder Forest model (XGBRegressor)...")
# Features: rainfall, urban_expansion_rate, previous_forest_area
X_forest = np.random.rand(100, 3) * 100
y_forest = np.random.rand(100) * 10 
forest_model = XGBRegressor()
forest_model.fit(X_forest, y_forest)
joblib.dump(forest_model, "models/forest.pkl")

print("Training placeholder Traffic model (XGBClassifier)...")
# Features: time_of_day, day_of_week, vehicle_count, weather
X_traffic = np.random.rand(100, 4) * 100
y_traffic = np.random.randint(0, 4, 100)
traffic_model = XGBClassifier()
traffic_model.fit(X_traffic, y_traffic)
joblib.dump(traffic_model, "models/traffic.pkl")

print("Done generating 5 placeholder .pkl models in models/ folder.")
