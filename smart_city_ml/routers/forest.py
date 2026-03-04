from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
from schemas.prediction import ForestPredictionRequest, ForestPredictionResponse
from services.model_loader import get_registry, ModelRegistry

router = APIRouter(prefix="/predict", tags=["Forest Pipeline"])

@router.post("/forest", response_model=ForestPredictionResponse)
async def predict_forest(request: ForestPredictionRequest, registry: ModelRegistry = Depends(get_registry)):
    """
    Predict forest cover loss using XGBoost regressor based on urban expansion and census features.
    """
    model = registry.forest_model
    
    if model is None:
        # Mock logic: loss scales with urban expansion and population density
        loss = (request.urban_expansion_rate * 50) + (request.population_density * 0.01)
        return ForestPredictionResponse(predicted_forest_loss=round(loss, 2))

    try:
        # Prepare input features matching the regressor's expected format (6 features)
        # Features: ['rainfall', 'urban_expansion_rate', 'forest_cover_ha', 'population_density', 'avg_rainfall', 'workforce_ratio']
        features = pd.DataFrame([{
            "rainfall": request.rainfall,
            "urban_expansion_rate": request.urban_expansion_rate,
            "forest_cover_ha": request.forest_cover_ha,
            "population_density": request.population_density,
            "avg_rainfall": request.avg_rainfall,
            "workforce_ratio": request.workforce_ratio
        }])
        
        prediction = float(model.predict(features)[0])
        
        # In our training, we predicted future forest cover. 
        # Loss = previous_forest_area - prediction
        forest_loss = request.forest_cover_ha - prediction
        
        return ForestPredictionResponse(predicted_forest_loss=max(0, round(forest_loss, 2)))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forest prediction failed: {str(e)}")
