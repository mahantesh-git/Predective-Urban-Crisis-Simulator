from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
from schemas.prediction import TrafficPredictionRequest, TrafficPredictionResponse
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["Traffic Pipeline"])

@router.post("/traffic", response_model=TrafficPredictionResponse)
async def predict_traffic(request: TrafficPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    model = registry.traffic_model
    try:
        features = pd.DataFrame([{
            "time_of_day":     request.time_of_day,
            "day_of_week":     request.day_of_week,
            "traffic_density": request.traffic_density,
            "aqi":             request.aqi,
            "temperature":     request.temperature,
        }])
        
        prediction = int(model.predict(features)[0])
        status_map = {0: "CLEAR", 1: "MODERATE", 2: "HEAVY", 3: "CONGESTED"}
        traffic_status = status_map.get(prediction, str(prediction))
        return TrafficPredictionResponse(traffic_status=traffic_status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Traffic prediction failed: {str(e)}")
