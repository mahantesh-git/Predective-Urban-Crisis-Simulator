from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
from schemas.prediction import HealthPredictionRequest, HealthPredictionResponse
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["Health Pipeline"])

@router.post("/health", response_model=HealthPredictionResponse)
async def predict_health(request: HealthPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    
    model = registry.health_model
    try:
        pm25_proxy = request.aqi * 0.55
        no2_proxy  = request.aqi * 0.15
        so2_proxy  = request.aqi * 0.08

        features = pd.DataFrame([{
            "aqi":                request.aqi,
            "pm25":              pm25_proxy,
            "no2":               no2_proxy,
            "so2":               so2_proxy,
            "temperature":       request.temperature,
            "humidity":          request.humidity,
            "population_density": request.population_density,
            "water_quality":     request.water_quality_index,
        }])
        
        prediction = int(model.predict(features)[0])
        
        risk_map = {0: "LOW", 1: "MODERATE", 2: "HIGH", 3: "CRITICAL"}
        risk_level = risk_map.get(prediction, str(prediction))
        
        return HealthPredictionResponse(risk_level=risk_level)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health prediction failed: {str(e)}")
