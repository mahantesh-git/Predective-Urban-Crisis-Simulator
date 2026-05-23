
start "ML Engine" cmd /k "cd smart_city_ml && ..\.venv\Scripts\python main.py"

start "Node Backend" cmd /k "cd backend && npm run dev"

start "Frontend" cmd /k "cd frontend && npm run dev"
