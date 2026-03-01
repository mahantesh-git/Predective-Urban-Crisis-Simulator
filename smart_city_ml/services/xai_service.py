import shap
import xgboost as xgb
import numpy as np
import logging

logger = logging.getLogger("smart_city_ml.xai")

class XAIService:
    """
    Explainable AI (XAI) Module using SHAP.
    Provides local explanations for individual XGBoost predictions.
    """
    def __init__(self):
        self.explainers = {}

    def get_or_create_explainer(self, model: xgb.Booster, model_id: str):
        if model_id not in self.explainers:
            logger.info(f"Creating TreeExplainer for model: {model_id}")
            self.explainers[model_id] = shap.TreeExplainer(model)
        return self.explainers[model_id]

    def explain_prediction(self, model: xgb.Booster, model_id: str, input_features: list[float], feature_names: list[str] = None):
        """
        Generate SHAP values for a single prediction instance.
        """
        try:
            # SHAP expects a 2D array for single instances: shape (1, num_features)
            X_instance = np.array([input_features])
            
            explainer = self.get_or_create_explainer(model, model_id)
            shap_values = explainer.shap_values(X_instance)
            
            # Extract values for the single row
            vals = shap_values[0] if isinstance(shap_values, np.ndarray) else shap_values[0][0]

            # Assign default names if none provided
            if not feature_names:
                feature_names = [f"Feature_{i}" for i in range(len(input_features))]

            # Combine names and impacts, sort by absolute impact magnitude
            impacts = [{"feature": name, "impact": float(val)} for name, val in zip(feature_names, vals)]
            impacts.sort(key=lambda x: abs(x["impact"]), reverse=True)

            # Return top 5 most influential factors
            return impacts[:5]

        except Exception as e:
            logger.error(f"XAI Error explaining {model_id}: {str(e)}")
            return [{"feature": "error", "impact": 0.0}]

# Singleton instance
xai_engine = XAIService()
