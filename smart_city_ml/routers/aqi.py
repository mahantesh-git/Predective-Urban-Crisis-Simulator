from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
import pandas as pd
from schemas.prediction import AQIPredictionRequest, AQIPredictionResponse, AQIForecastPoint
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["AQI Pipeline"])

@router.post("/aqi", response_model=AQIPredictionResponse)
async def predict_aqi(request: AQIPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    model = registry.aqi_model

    try:
        future = model.make_future_dataframe(periods=request.days)

        if "pm25_reg" in model.extra_regressors:
            last_pm25 = model.history["pm25_reg"].mean()
            future["pm25_reg"] = last_pm25

        forecast_df = model.predict(future)
        forecast_sliced = forecast_df.tail(request.days)
        
        forecast_points = []
        for _, row in forecast_sliced.iterrows():
            forecast_points.append(
                AQIForecastPoint(
                    date=row['ds'].strftime("%Y-%m-%d"),
                    prediction=max(0, round(row['yhat'], 2)),
                    lower_bound=max(0, round(row['yhat_lower'], 2)),
                    upper_bound=max(0, round(row['yhat_upper'], 2))
                )
            )
        return AQIPredictionResponse(forecast=forecast_points)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AQI forecasting failed: {str(e)}")
