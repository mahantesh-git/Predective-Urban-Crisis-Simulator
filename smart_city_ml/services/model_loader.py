import joblib
import pickle
import os
import logging
import json
from prophet.serialize import model_from_json

logger = logging.getLogger("smart_city_ml")

class ModelRegistry:
    """Singleton registry to hold loaded ML models."""
    def __init__(self):
        self.aqi_model = None
        self.water_model = None
        self.health_model = None
        self.forest_model = None
        self.traffic_model = None

registry = ModelRegistry()

def load_models(models_dir: str = "models"):
    """
    Load all pre-trained models from the specified directory.
    If a model file is missing, the service logs a warning instead of hard crashing,
    useful for graceful degradation or initial setup phases.
    """
    logger.info("Loading pre-trained models...")
    
    # Resolve absolute path for models directory relative to this file
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resolved_models_dir = os.path.join(base_dir, models_dir)

    model_files = {
        "aqi_model": {"filename": "aqi.json", "type": "prophet"},
        "water_model": {"filename": "water.json", "type": "prophet"},
        "health_model": {"filename": "health.pkl", "type": "joblib"},
        "forest_model": {"filename": "forest.pkl", "type": "joblib"},
        "traffic_model": {"filename": "traffic.pkl", "type": "joblib"}
    }

    loaded_count = 0
    for attr, info in model_files.items():
        filename = info["filename"]
        filepath = os.path.join(resolved_models_dir, filename)
        if os.path.exists(filepath):
            try:
                model = joblib.load(filepath)
                setattr(registry, attr, model)
                logger.info(f"Successfully loaded {filename}")
                loaded_count += 1
            except Exception as e:
                logger.error(f"Failed to load {filename}: {e}")
        else:
            logger.warning(f"Model file missing: {filepath}")

    logger.info(f"Model loading complete. {loaded_count}/{len(model_files)} models loaded.")

def get_registry() -> ModelRegistry:
    return registry
