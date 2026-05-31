from pydantic import BaseModel, Field
from typing import List

class AQIPredictionRequest(BaseModel):
    days: int = Field(..., ge=1, le=365, description="Number of days to forecast")

class AQIForecastPoint(BaseModel):
    date: str
    prediction: float
    lower_bound: float
    upper_bound: float

class AQIPredictionResponse(BaseModel):
    forecast: List[AQIForecastPoint]

class WaterPredictionRequest(BaseModel):
    days: int = Field(..., ge=1, le=365, description="Number of days to forecast")

class WaterForecastPoint(BaseModel):
    date: str
    prediction: float
    lower_bound: float
    upper_bound: float

class WaterPredictionResponse(BaseModel):
    forecast: List[WaterForecastPoint]

class HealthPredictionRequest(BaseModel):
    aqi: float
    temperature: float
    humidity: float
    population_density: float
    water_quality_index: float
    hospital_beds_per1k: float = 2.0
    literacy_rate: float = 0.85
    month: int = 1
    monsoon: int = 0
    avg_rainfall: float = 1000.0
    max_temp: float = 35.0

class HealthPredictionResponse(BaseModel):
    risk_level: str

class TrafficPredictionRequest(BaseModel):
    time_of_day: int = Field(..., description="Hour of the day 0-23")
    day_of_week: int = Field(..., description="0=Monday, 6=Sunday")
    traffic_density: float
    temperature: float
    aqi: float = Field(100.0, ge=0, le=500, description="Air Quality Index (0–500)")

class TrafficPredictionResponse(BaseModel):
    traffic_status: str
