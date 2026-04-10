@echo off
echo ========================================================
echo       Starting PUECS Smart City Dashboard Services       
echo ========================================================

echo.
echo [1/3] Starting Smart City ML Engine (Python FastAPI)
start "ML Engine" cmd /k "cd smart_city_ml && ..\.venv\Scripts\python main.py"

echo [2/3] Starting Simulation Engine Backend (Node.js)
start "Node Backend" cmd /k "cd backend && npm run dev"

echo [3/3] Starting Frontend Dashboard (Vite React)
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services have been launched in separate windows!
echo Please check the individual windows for logs.
echo ========================================================
pause
