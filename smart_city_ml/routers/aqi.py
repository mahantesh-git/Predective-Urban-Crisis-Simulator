from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
import pandas as pd
from schemas.prediction import AQIPredictionRequest, AQIPredictionResponse, AQIForecastPoint
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["AQI Pipeline"])

@router.post("/aqi", response_model=AQIPredictionResponse)
async def predict_aqi(request: AQIPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    """
    Generate AQI forecast using Prophet time series model.
    """
    model = registry.aqi_model
    
    # If the model `.pkl` hasn't been added yet, return mock data
    if model is None:
        today = datetime.now()
        forecast = []
        for d in range(request.days):
            date_str = (today + timedelta(days=d+1)).strftime("%Y-%m-%d")
            base = 150.0 + (d * 2.5)
            forecast.append(AQIForecastPoint(
                date=date_str,
                prediction=round(base, 2),
                lower_bound=round(base - 15.0, 2),
                upper_bound=round(base + 15.0, 2)
            ))
        return AQIPredictionResponse(forecast=forecast)

    try:
        # Prophet prediction logic
        future = model.make_future_dataframe(periods=request.days)
        forecast_df = model.predict(future)
        
        # Get only the forecasted part
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
