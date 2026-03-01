import random
import numpy as np
import logging

logger = logging.getLogger("smart_city_ml.rl_optimizer")

class PolicyAgent:
    """
    Reinforcement Learning Policy Optimizer.
    Uses generic Q-Learning/DQN principles to recommend structural mitigations.
    """
    def __init__(self):
        # Master list of available actions (policies)
        self.actions = [
            {"id": "A1", "name": "Restrict Heavy Traffic", "cost_usd": 150000, "mitigation_power": 0.4, "target": "traffic"},
            {"id": "A2", "name": "Mandate Industrial Filter Checks", "cost_usd": 80000, "mitigation_power": 0.6, "target": "emissions"},
            {"id": "A3", "name": "Activate Backup Water Treatment", "cost_usd": 300000, "mitigation_power": 0.8, "target": "water"},
            {"id": "A4", "name": "Cloud Seeding Operations", "cost_usd": 500000, "mitigation_power": 0.3, "target": "aqi"},
            {"id": "A5", "name": "Public Health Advisory & Free Masks", "cost_usd": 25000, "mitigation_power": 0.2, "target": "health"}
        ]
        
    def _calculate_q_value(self, state: dict, action: dict) -> float:
        """
        Mock Q-Value calculation.
        Reward function: Maximize Risk Reduction - Penalty for Cost
        """
        # How bad is the current state for this target?
        state_severity = state.get(action["target"], 0.5) # 0 to 1
        
        # If the state is fine, this action is useless
        if state_severity < 0.3:
            return -100.0
            
        # Reward = (Severity * Mitigation) - Scaled Cost
        reward = (state_severity * action["mitigation_power"] * 1000) - (action["cost_usd"] / 10000)
        return float(np.round(reward, 2))

    def get_optimal_policies(self, current_state: dict, top_n: int = 3):
        """
        Given the current state {aqi: 0.8, traffic: 0.9, water: 0.2 ...}
        evaluate Q-values for all actions and return the best ones.
        """
        # Map raw data names to target names
        mapped_state = {
            "aqi": current_state.get("aqi", 0),
            "traffic": current_state.get("traffic", 0),
            "water": current_state.get("water_quality", 0) / 100, # Assuming 0-100 scale inverted? Adjust if needed
            "emissions": current_state.get("industry_emission", 0) / 100,
            "health": (current_state.get("aqi",0) * 0.5 + current_state.get("water_quality",0)*0.5) # Synth
        }

        # Normalize AQI if it's 0-500 raw
        if mapped_state["aqi"] > 1:
            mapped_state["aqi"] = mapped_state["aqi"] / 500.0
            
        # Water Quality lower is worse, but severity should be higher is worse
        mapped_state["water"] = 1.0 - mapped_state["water"]

        ranked_actions = []
        for action in self.actions:
            q_val = self._calculate_q_value(mapped_state, action)
            ranked_actions.append({
                "policy": action["name"],
                "policy_id": action["id"],
                "target_metric": action["target"],
                "estimated_cost_usd": action["cost_usd"],
                "q_value": q_val,
                "confidence": float(np.round(random.uniform(0.70, 0.95), 2)) # Mock confidence interval of RL agent
            })

        # Sort descending by Q-Value
        ranked_actions.sort(key=lambda x: x["q_value"], reverse=True)
        
        # Filter out actions with negative Q-values if we have positive options
        positive_actions = [a for a in ranked_actions if a["q_value"] > 0]
        
        if len(positive_actions) > 0:
            return positive_actions[:top_n]
        return ranked_actions[:1] # Return the "least bad" option if all are negative

rl_agent = PolicyAgent()
