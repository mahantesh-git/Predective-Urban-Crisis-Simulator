import joblib
import pickle
import os
import logging

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
        "aqi_model": "aqi.pkl",
        "water_model": "water.pkl",
        "health_model": "health.pkl",
        "forest_model": "forest.pkl",
        "traffic_model": "traffic.pkl"
    }

    loaded_count = 0
    for attr, filename in model_files.items():
        filepath = os.path.join(resolved_models_dir, filename)
        if os.path.exists(filepath):
            try:
                # Use pickle for Prophet models, joblib for others
                if filename in ["aqi.pkl", "water.pkl"]:
                    with open(filepath, 'rb') as f:
                        model = pickle.load(f)
                else:
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
