# CitySentinel AI : Urban Crisis Intelligence
### *Predictive Urban Environmental Crisis Simulator (PUECS)*

**CitySentinel AI** is a state-of-the-art urban crisis management platform designed for the modern smart city. Built for the **Ballary Hackathon (Challenge 6)**, it uses predictive modeling and cascading risk analysis to forecast environmental emergencies — from AQI spikes to water stress — and provides actionable policy recommendations for city administrators.

---

## 🌟 Key Features

- **Cascading Risk Analysis**: Models dependencies between urban systems (Infrastructure → Ecology → Health) to predict how a localized failure (like a traffic surge) amplifies into a city-wide AQI crisis.
- **Monte Carlo Policy Simulations**: Stress-test urban resilience by simulating up to 5 concurrent policy scenarios side-by-side.
- **Decision Support System**: Ranked policy interventions based on "Efficiency Score" (Risk Reduction vs. Implementation Cost).
- **Zonal Risk Heatmap**: A high-fidelity temporal visualization of how environmental risks propagate across 5 key urban zones over a 30-day window.
- **ML-Powered Forecaster**: Integrates with a Python microservice using Prophet and XGBoost to provide confidence-weighted crisis probabilities.

---

## 🏗️ Architecture

The project is structured as a robust 3-tier microservice architecture:

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Tailwind 4, Recharts | Interactive Dashboards & Simulations |
| **Backend** | Node.js, Express, MongoDB | Risk Engines, API Orchestration, Data Persistence |
| **ML Service** | Python (FastAPI), Prophet, XGBoost | Time-series Forecasting & Risk Quantification |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (Local or Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
# Configure your .env (PORT, MONGODB_URI)
npm start
```

### 2. ML Service Setup
```bash
cd smart_city_ml
pip install -r requirements.txt
python main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Technical Requirements Compliance

This implementation strictly adheres to the Challenge 6 requirements:
- ✅ **Cascading Risks**: Implemented in `backend/engine/cascadeEngine.js`.
- ✅ **Policy Simulation**: Interactive multi-parameter inputs in `frontend/src/app/pages/Simulate.tsx`.
- ✅ **Uncertainty Quantification**: Confidence bands (±N%) displayed on all forecast and simulation results.
- ✅ **Crisis Intelligence**: Crisis Probability, Time-to-Impact, and Affected Zone forecasts provided via ML endpoints.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Lucide Icons, Framer Motion, Recharts.
- **Backend**: Node.js, Mongoose, Express.
- **ML**: Python, Pandas, Prophet, Scikit-learn.
- **Styling**: Vanilla CSS + Tailwind CSS 4.0.

---