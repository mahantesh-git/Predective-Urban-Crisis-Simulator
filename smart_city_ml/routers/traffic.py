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
        # The traffic model was trained on exactly 5 features:
        # ['time_of_day', 'day_of_week', 'traffic_density', 'aqi', 'temperature']
        # Derive aqi and temperature from traffic context (population & density proxy).
        aqi_proxy  = min(500, request.traffic_density * 0.8)  # denser traffic → higher AQI
        temp_proxy = request.temperature

        features = pd.DataFrame([{
            "time_of_day":     request.time_of_day,
            "day_of_week":     request.day_of_week,
            "traffic_density": request.traffic_density,
            "aqi":             aqi_proxy,
            "temperature":     temp_proxy,
        }])
        
        prediction = int(model.predict(features)[0])
        
        # Risk map matching training labels
        status_map = {0: "CLEAR", 1: "MODERATE", 2: "HEAVY", 3: "CONGESTED"}
        
        traffic_status = status_map.get(prediction, str(prediction))
        
        return TrafficPredictionResponse(traffic_status=traffic_status)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Traffic prediction failed: {str(e)}")
