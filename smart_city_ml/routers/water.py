from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
import pandas as pd
from schemas.prediction import WaterPredictionRequest, WaterPredictionResponse, WaterForecastPoint
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["Water Pipeline"])

@router.post("/water", response_model=WaterPredictionResponse)
async def predict_water(request: WaterPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    model = registry.water_model
    try:
        future = model.make_future_dataframe(periods=request.days)
        forecast_df = model.predict(future)
        forecast_sliced = forecast_df.tail(request.days)
        forecast_points = []

        for _, row in forecast_sliced.iterrows():
            forecast_points.append(
                WaterForecastPoint(
                    date=row['ds'].strftime("%Y-%m-%d"),
                    prediction=max(0, min(100, round(row['yhat'], 2))),
                    lower_bound=max(0, min(100, round(row['yhat_lower'], 2))),
                    upper_bound=max(0, min(100, round(row['yhat_upper'], 2)))
                )
            )
        return WaterPredictionResponse(forecast=forecast_points)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Water forecasting failed: {str(e)}")
