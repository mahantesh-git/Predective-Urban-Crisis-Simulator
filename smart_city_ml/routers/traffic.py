from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
from schemas.prediction import TrafficPredictionRequest, TrafficPredictionResponse
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["Traffic Pipeline"])

@router.post("/traffic", response_model=TrafficPredictionResponse)
async def predict_traffic(request: TrafficPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    """
    Assess traffic congestion status using XGBoost classifier based on census and real-time features.
    """
    model = registry.traffic_model
    
    if model is None:
        # Mock logic based on density
        status = "CLEAR"
        if request.traffic_density > 400:
            status = "CONGESTED"
        elif request.traffic_density > 200:
            status = "MODERATE"
        return TrafficPredictionResponse(traffic_status=status)

    try:
        # Prepare input features matching the classifier's expected format (8 features)
        # Features: ['time_of_day', 'day_of_week', 'traffic_density', 'temperature', 'population_density', 'household_density', 'month', 'summer']
        features = pd.DataFrame([{
            "time_of_day": request.time_of_day,
            "day_of_week": request.day_of_week,
            "traffic_density": request.traffic_density,
            "temperature": request.temperature,
            "population_density": request.population_density,
            "household_density": request.household_density,
            "month": request.month,
            "summer": request.summer
        }])
        
        prediction = int(model.predict(features)[0])
        
        # Risk map matching training labels
        status_map = {0: "CLEAR", 1: "MODERATE", 2: "HEAVY", 3: "CONGESTED"}
        
        traffic_status = status_map.get(prediction, str(prediction))
        
        return TrafficPredictionResponse(traffic_status=traffic_status)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Traffic prediction failed: {str(e)}")
