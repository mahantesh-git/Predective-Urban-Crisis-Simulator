from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel

router = APIRouter(prefix="/deforestation", tags=["Deforestation Insights"])

MOCK_OVERVIEW = {
    "year_range": [2001, 2023],
    "total_states": 28,
    "total_records": 336,
    "years_available": [2001, 2003, 2005, 2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021, 2023],
    "latest_year_summary": {
        "year": 2023,
        "total_forest_cover_sq_km": 713789,
        "total_tree_cover_loss_ha": 68420,
        "total_reforestation_ha": 52300,
        "total_net_change_ha": -16120,
        "avg_deforestation_rate_pct": 0.198,
        "avg_forest_cover_pct": 21.7,
    },
}

MOCK_RISK_SCORES = [
    { "state": "Jharkhand", "risk_score": 78.2, "risk_level": "Critical", "deforestation_rate_pct": 0.45, "tree_cover_loss_ha": 12400, "net_change_ha": -8200, "forest_cover_pct": 29.6 },
    { "state": "Assam", "risk_score": 71.5, "risk_level": "Critical", "deforestation_rate_pct": 0.38, "tree_cover_loss_ha": 9800, "net_change_ha": -6500, "forest_cover_pct": 34.2 },
    { "state": "Madhya Pradesh", "risk_score": 62.4, "risk_level": "High", "deforestation_rate_pct": 0.28, "tree_cover_loss_ha": 11200, "net_change_ha": -4800, "forest_cover_pct": 25.1 },
    { "state": "Maharashtra", "risk_score": 55.8, "risk_level": "High", "deforestation_rate_pct": 0.22, "tree_cover_loss_ha": 8500, "net_change_ha": -3200, "forest_cover_pct": 16.5 },
    { "state": "Karnataka", "risk_score": 48.3, "risk_level": "Moderate", "deforestation_rate_pct": 0.18, "tree_cover_loss_ha": 6200, "net_change_ha": -1800, "forest_cover_pct": 20.1 },
    { "state": "Odisha", "risk_score": 44.1, "risk_level": "Moderate", "deforestation_rate_pct": 0.15, "tree_cover_loss_ha": 5800, "net_change_ha": -1200, "forest_cover_pct": 33.2 },
    { "state": "Rajasthan", "risk_score": 38.7, "risk_level": "Moderate", "deforestation_rate_pct": 0.12, "tree_cover_loss_ha": 3200, "net_change_ha": 500, "forest_cover_pct": 4.9 },
    { "state": "Kerala", "risk_score": 25.2, "risk_level": "Low", "deforestation_rate_pct": 0.06, "tree_cover_loss_ha": 1800, "net_change_ha": 2200, "forest_cover_pct": 54.4 },
]

MOCK_NATIONAL = {
    "years": [2001, 2005, 2009, 2013, 2017, 2021, 2023],
    "total_forest_cover": [678333, 690899, 697898, 701673, 708273, 713789, 713789],
    "total_tree_loss": [42000, 48500, 52300, 58100, 62800, 65400, 68420],
    "total_reforestation": [35000, 38200, 42100, 45800, 48900, 51200, 52300],
    "total_net_change": [-7000, -10300, -10200, -12300, -13900, -14200, -16120],
    "avg_deforestation_rate": [0.12, 0.15, 0.16, 0.18, 0.19, 0.19, 0.198],
}

@router.get("/overview")
async def get_overview():
    return MOCK_OVERVIEW

@router.get("/risk")
async def get_risk(year: Optional[int] = Query(None)):
    # In a real model, year would filter the data from a database or ML prediction.
    return {
        "scores": MOCK_RISK_SCORES,
        "year": year if year else "latest"
    }

@router.get("/national")
async def get_national():
    return MOCK_NATIONAL

@router.get("/states")
async def get_states():
    return {
        "states": [s["state"] for s in MOCK_RISK_SCORES],
        "count": len(MOCK_RISK_SCORES)
    }

@router.get("/state/{name}")
async def get_state(name: str):
    state_data = next((s for s in MOCK_RISK_SCORES if s["state"].lower() == name.lower()), None)
    if not state_data:
        raise HTTPException(status_code=404, detail="State not found")
    
    return {
        "state": state_data["state"],
        "current_metrics": state_data,
        "historical_trend": {
            "years": MOCK_NATIONAL["years"][-3:],
            "forest_cover_pct": [
                round(max(0, state_data["forest_cover_pct"] + (i * 0.5)), 1) for i in [2, 1, 0]
            ],
            "deforestation_rate_pct": [
                round(max(0, state_data["deforestation_rate_pct"] - (i * 0.02)), 2) for i in [2, 1, 0]
            ]
        }
    }

@router.get("/rankings")
async def get_rankings(metric: str = "risk_score", top_n: int = 5, ascending: bool = False):
    try:
        sorted_scores = sorted(MOCK_RISK_SCORES, key=lambda x: x[metric], reverse=not ascending)
        return {
            "rankings": sorted_scores[:top_n]
        }
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid metric: {metric}")

class CompareRequest(BaseModel):
    states: List[str]
    metric: str = "risk_score"

@router.post("/compare")
async def compare_states(payload: CompareRequest):
    results = []
    for state_name in payload.states:
        state_data = next((s for s in MOCK_RISK_SCORES if s["state"].lower() == state_name.lower()), None)
        if state_data:
            results.append(state_data)
    
    return {
        "comparison": results,
        "metric_used": payload.metric
    }
