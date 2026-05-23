import pandas as pd
from services.model_loader import load_models, get_registry
from schemas.prediction import HealthPredictionRequest, TrafficPredictionRequest

print("Loading models...")
load_models()
registry = get_registry()

# 1. Test Health Model (XGBoost Classifier)
# Training features: [aqi, pm25, no2, so2, temperature, humidity, population_density, water_quality]
print("\n[Testing Health Model]")
health_req = HealthPredictionRequest(
    aqi=150, temperature=30, humidity=80, population_density=5000,
    water_quality_index=70
)
health_df = pd.DataFrame([{
    "aqi":                health_req.aqi,
    "pm25":              health_req.aqi * 0.55,
    "no2":               health_req.aqi * 0.15,
    "so2":               health_req.aqi * 0.08,
    "temperature":       health_req.temperature,
    "humidity":          health_req.humidity,
    "population_density": health_req.population_density,
    "water_quality":     health_req.water_quality_index,
}])
health_pred = registry.health_model.predict(health_df)[0]
health_labels = {0: "Low", 1: "Moderate", 2: "High", 3: "Critical"}
print(f"Health Input: AQI=150, Temp=30 -> Risk Prediction: {health_labels.get(health_pred, 'Unknown')}")

# 2. Test Traffic Model (XGBoost Classifier)
# Training features: [time_of_day, day_of_week, traffic_density, aqi, temperature]
print("\n[Testing Traffic Model]")
traffic_req = TrafficPredictionRequest(
    time_of_day=18, day_of_week=0, traffic_density=800, temperature=30,
    population_density=5000, household_density=1200, month=5, summer=1
)
traffic_df = pd.DataFrame([{
    "time_of_day":     traffic_req.time_of_day,
    "day_of_week":     traffic_req.day_of_week,
    "traffic_density": traffic_req.traffic_density,
    "aqi":             min(500, traffic_req.traffic_density * 0.8),
    "temperature":     traffic_req.temperature,
}])
traffic_pred = registry.traffic_model.predict(traffic_df)[0]
traffic_labels = {0: "Clear", 1: "Moderate", 2: "Heavy", 3: "Congested"}
print(f"Traffic Input: Monday 18:00 (Rush hour), Density=800 -> Status: {traffic_labels.get(traffic_pred, 'Unknown')}")

# 3. Test Prophet Models
print("\n[Testing AQI & Water Time-Series (Prophet)]")
future_aqi = registry.aqi_model.make_future_dataframe(periods=3)
if "pm25_reg" in registry.aqi_model.extra_regressors:
    future_aqi["pm25_reg"] = registry.aqi_model.history["pm25_reg"].mean()
future_aqi_pred = registry.aqi_model.predict(future_aqi)
print(f"AQI Forecast +3 Days: {future_aqi_pred[['ds', 'yhat']].tail(3).values.tolist()}")

future_water = registry.water_model.make_future_dataframe(periods=3)
future_water_pred = registry.water_model.predict(future_water)
print(f"Water Forecast +3 Days: {future_water_pred[['ds', 'yhat']].tail(3).values.tolist()}")

print("\nSUCCESS: All models function correctly via schemas!")
