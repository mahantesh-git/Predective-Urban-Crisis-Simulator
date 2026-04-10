from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
import pandas as pd
from schemas.prediction import WaterPredictionRequest, WaterPredictionResponse, WaterForecastPoint
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["Water Pipeline"])

@router.post("/water", response_model=WaterPredictionResponse)
async def predict_water(request: WaterPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    """
    Generate Water Quality/Level forecast using Prophet time series model.
    """
    model = registry.water_model
    
    # If the model `.pkl` hasn't been added yet, return mock data
    if model is None:
        today = datetime.now()
        forecast = []
        for d in range(request.days):
            date_str = (today + timedelta(days=d+1)).strftime("%Y-%m-%d")
            base = 75.0 - (d * 0.5)
            forecast.append(WaterForecastPoint(
                date=date_str,
                prediction=round(base, 2),
                lower_bound=round(base - 5.0, 2),
                upper_bound=round(base + 5.0, 2)
            ))
        return WaterPredictionResponse(forecast=forecast)

    try:
        # Prophet prediction logic
        future = model.make_future_dataframe(periods=request.days)
        forecast_df = model.predict(future)
        
        # Get only the forecasted part
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
