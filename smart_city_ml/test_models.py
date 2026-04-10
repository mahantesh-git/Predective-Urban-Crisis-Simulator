import pandas as pd
from services.model_loader import load_models, get_registry
from schemas.prediction import HealthPredictionRequest, TrafficPredictionRequest, ForestPredictionRequest

print("Loading models...")
load_models()
registry = get_registry()

# 1. Test Health Model (XGBoost Classifier)
print("\n[Testing Health Model]")
health_req = HealthPredictionRequest(
    aqi=150, temperature=30, humidity=80, population_density=5000,
    water_quality_index=70, hospital_beds_per1k=2.5, literacy_rate=0.85,
    month=5, monsoon=0, avg_rainfall=800, max_temp=38
)
health_df = pd.DataFrame([{
    "aqi": health_req.aqi,
    "temperature": health_req.temperature,
    "humidity": health_req.humidity,
    "population_density": health_req.population_density,
    "water_quality": health_req.water_quality_index,
    "hospital_beds_per1k": health_req.hospital_beds_per1k,
    "literacy_rate": health_req.literacy_rate,
    "month": health_req.month,
    "monsoon": health_req.monsoon,
    "avg_rainfall": health_req.avg_rainfall,
    "max_temp": health_req.max_temp
}])
health_pred = registry.health_model.predict(health_df)[0]
health_labels = {0: "Low", 1: "Moderate", 2: "High", 3: "Critical"}
print(f"Health Input: AQI=150, Temp=30 -> Risk Prediction: {health_labels.get(health_pred, 'Unknown')}")

# 2. Test Traffic Model (XGBoost Classifier)
print("\n[Testing Traffic Model]")
traffic_req = TrafficPredictionRequest(
    time_of_day=18, day_of_week=0, traffic_density=800, temperature=30,
    population_density=5000, household_density=1200, month=5, summer=1
)
traffic_df = pd.DataFrame([{
    "time_of_day": traffic_req.time_of_day,
    "day_of_week": traffic_req.day_of_week,
    "traffic_density": traffic_req.traffic_density,
    "temperature": traffic_req.temperature,
    "population_density": traffic_req.population_density,
    "household_density": traffic_req.household_density,
    "month": traffic_req.month,
    "summer": traffic_req.summer
}])
traffic_pred = registry.traffic_model.predict(traffic_df)[0]
traffic_labels = {0: "Free Flow", 1: "Slow", 2: "Congested"}
print(f"Traffic Input: Monday 18:00 (Rush hour), Density=800 -> Status: {traffic_labels.get(traffic_pred, 'Unknown')}")

# 3. Test Forest Regressor
print("\n[Testing Forest Model]")
forest_req = ForestPredictionRequest(
    rainfall=150, urban_expansion_rate=1.5, forest_cover_ha=100000,
    population_density=5000, avg_rainfall=800, workforce_ratio=0.4
)
forest_df = pd.DataFrame([{
    "rainfall": forest_req.rainfall,
    "urban_expansion_rate": forest_req.urban_expansion_rate,
    "forest_cover_ha": forest_req.forest_cover_ha,
    "population_density": forest_req.population_density,
    "avg_rainfall": forest_req.avg_rainfall,
    "workforce_ratio": forest_req.workforce_ratio
}])
forest_pred = registry.forest_model.predict(forest_df)[0]
print(f"Forest Input: Expansion 1.5% -> Predicted Shift: {forest_pred:.2f} ha")

# 4. Test Prophet Models
print("\n[Testing AQI & Water Time-Series (Prophet)]")
future_aqi = registry.aqi_model.make_future_dataframe(periods=3)
future_aqi_pred = registry.aqi_model.predict(future_aqi)
print(f"AQI Forecast +3 Days: {future_aqi_pred[['ds', 'yhat']].tail(3).values.tolist()}")

future_water = registry.water_model.make_future_dataframe(periods=3)
future_water_pred = registry.water_model.predict(future_water)
print(f"Water Forecast +3 Days: {future_water_pred[['ds', 'yhat']].tail(3).values.tolist()}")

print("\nSUCCESS: All models function correctly via schemas!")
