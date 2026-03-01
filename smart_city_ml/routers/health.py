from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
from schemas.prediction import HealthPredictionRequest, HealthPredictionResponse
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["Health Pipeline"])

@router.post("/health", response_model=HealthPredictionResponse)
async def predict_health(request: HealthPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    """
    Assess health risk using XGBoost classifier based on environmental conditions.
    """
    model = registry.health_model
    
    if model is None:
        # Mock logic
        risk = "LOW"
        if request.aqi > 150 or request.water_quality_index < 60:
            risk = "HIGH"
        elif request.aqi > 100:
            risk = "MODERATE"
        return HealthPredictionResponse(risk_level=risk)

    try:
        # Prepare input features matching the classifier's expected format
        features = pd.DataFrame([{
            "aqi": request.aqi,
            "temperature": request.temperature,
            "humidity": request.humidity,
            "population_density": request.population_density,
            "water_quality": request.water_quality_index
        }])
        
        prediction = int(model.predict(features)[0])
        
        # Assume model outputs string labels or map from ints
        risk_map = {0: "LOW", 1: "MODERATE", 2: "HIGH", 3: "CRITICAL"}
        
        risk_level = risk_map.get(prediction, str(prediction))
        
        return HealthPredictionResponse(risk_level=risk_level)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health prediction failed: {str(e)}")
