import random
import numpy as np
import logging

logger = logging.getLogger("smart_city_ml.anomaly")

class AnomalyDetector:
    """
    Anomaly Detection Engine.
    Detects sudden spikes in AQI or drops in water quality/levels.
    """
    def __init__(self):
        # In production, we'd load a trained sklearn IsolationForest model
        self.is_ready = True

    def compute_z_score(self, current_val: float, historical_series: list[float]) -> float:
        """
        Compute standard Z-Score for a single metric.
        z = (x - mean) / std_dev
        """
        if len(historical_series) < 2:
            return 0.0
            
        mean = np.mean(historical_series)
        std = np.std(historical_series)
        
        if std == 0:
            return 0.0
            
        return (current_val - mean) / std

    def detect_anomalies(self, current_data: dict, history_streams: dict):
        """
        Run multi-variate anomaly detection.
        Returns a list of detected anomalies if any cross the threshold.
        """
        anomalies = []
        
        # Z-Score Threshold config
        THRESHOLDS = {
            "aqi": 2.5,          # 2.5 std devs above mean is suspicious
            "water_quality": -2.0 # -2.0 std devs below mean (sudden drop)
        }

        # 1. AQI check
        if "aqi" in current_data and "aqi" in history_streams:
            z_aqi = self.compute_z_score(current_data["aqi"], history_streams["aqi"])
            if z_aqi > THRESHOLDS["aqi"]:
                anomalies.append({
                    "metric": "aqi",
                    "type": "SPIKE",
                    "severity": "CRITICAL" if z_aqi > 3.5 else "WARNING",
                    "z_score": float(np.round(z_aqi, 2)),
                    "message": f"Abnormal AQI spike detected. {float(np.round(z_aqi,2))} std devs above normal."
                })

        # 2. Water Quality check
        if "water_quality" in current_data and "water_quality" in history_streams:
            z_water = self.compute_z_score(current_data["water_quality"], history_streams["water_quality"])
            # We care about drops in quality
            if z_water < THRESHOLDS["water_quality"]:
                anomalies.append({
                    "metric": "water_quality",
                    "type": "DROP",
                    "severity": "CRITICAL" if z_water < -3.0 else "WARNING",
                    "z_score": float(np.round(z_water, 2)),
                    "message": f"Sudden drop in water quality. {float(np.round(z_water,2))} std devs below normal."
                })

        # 3. Multivariate Check (Isolation Forest Simulation)
        # If both aqi spikes and water drops simultaneously, it's highly anomalous
        if len(anomalies) >= 2:
            anomalies.append({
                "metric": "multi_variate",
                "type": "CASCADING_FAILURE",
                "severity": "CRISIS",
                "z_score": None,
                "message": "Multiple simultaneous sensor anomalies detected. Possible systemic event."
            })

        return anomalies

anomaly_engine = AnomalyDetector()
