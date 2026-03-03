import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart_city_ml")

# Import services and routers
from services.model_loader import load_models
from routers import aqi, water, health, deforestation, traffic, forest

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager runs before the server starts accepting requests
    and after the server stops.
    """
    logger.info("Initializing Smart City ML Backend...")
    # Attempt to load all 5 models at startup
    load_models()
    yield
    logger.info("Shutting down Smart City ML Backend...")

app = FastAPI(
    title="Smart City ML Prediction API",
    description="Machine Learning Prediction endpoints for Urban Environment, Water, Health, Forest, and Traffic.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(aqi.router)
app.include_router(water.router)
app.include_router(health.router)
app.include_router(traffic.router)
app.include_router(forest.router)
app.include_router(deforestation.router)
from routers import transparency, multi_forecast
app.include_router(transparency.router)
app.include_router(multi_forecast.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Smart City ML Backend", 
        "docs": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    # To run locally: python main.py
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
