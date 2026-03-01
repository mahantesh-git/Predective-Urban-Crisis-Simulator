# Product Requirements Document (PRD)

## Product Name: CitySentinel AI – Predictive Urban Environmental Crisis Simulator (PUECS)

**Domain:** Smart Cities & Climate Resilience  
**Primary Audience:** City Administrators, Urban Planners, Emergency Responders  
**Status:** Completed & Verified  

---

## 1. Executive Summary

CitySentinel AI is a state-of-the-art urban crisis management platform developed for the Ballary Hackathon (Challenge 6). It leverages predictive modeling and cascading risk analysis to forecast interconnected environmental emergencies—ranging from Air Quality Index (AQI) spikes to water stress and deforestation. By understanding how a localized failure (like a traffic surge) can amplify into a city-wide crisis, administrators can utilize the platform to plan, simulate, and enact robust policy interventions.

---

## 2. Product Architecture & Stack

The project features a robust 3-tier microservice architecture:

| Component | Technology Stack | Core Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS 4, Recharts, Vite | Interactive Dashboards, Policy Simulations, Risk Mapping |
| **Backend** | Node.js 20, Express, MongoDB Atlas, WebSocket | Risk Engines, API Orchestration, Data Persistence, Real-time Broadcasting |
| **ML Service** | Python (FastAPI), Prophet, XGBoost | Time-series Forecasting, Risk Quantification, Anomaly Detection |

---

## 3. Core Features & Capabilities

### 3.1. Cascading Risk Analysis
- **Dependency Graph:** Models dependencies between urban systems (Traffic → AQI; Industry → Water Quality / AQI; AQI + Heatwave → Health).
- **Triggers:** Computes a composite risk score (0-1). If risk crosses the threshold (e.g., 0.65), it triggers a priority alert with cascading impacts to adjacent sectors.

### 3.2. Forecasting Engine (Machine Learning)
- **7-Day Predictive Modeling:** Extrapolates historical environmental data (AQI, water stress, etc.) into a 7-day forecast.
- **Uncertainty Quantification:** Generates dynamic confidence intervals (±N% widening further into the future) to outline prediction uncertainties clearly.

### 3.3. Policy Simulation Engine
- **Monte Carlo Simulations:** Stress-test urban resilience by running and comparing up to 5 concurrent policy scenarios.
- **Adjustable Parameters:** Simulators use sliders for variables like Traffic Reduction, Industrial Emission Cuts, and Heatwave Adjustments.
- **Delta Analysis:** Provides before/after risk scores to visualize the potential outcomes of a policy intervention.

### 3.4. Decision Support System (Recommendations)
- **Ranked Interventions:** Interventions are automatically prioritized using an "Efficiency Score" that evaluates the trade-off between risk reduction and implementation cost.
- **ROI Ratings:** Cost multipliers applied to interventions range from "Low Cost" to "High Cost" to help budget and plan realistic policies.

### 3.5. Zonal Risk Heatmapping
- **City Zoning:** Breaks the city into 5 functional zones (Industrial Corridor, Residential District, Commercial Hub, Ecological Waterfront, Transport Gateway).
- **Risk Distribution:** Highlights high-risk zones, alerting administrators on evacuation priorities and specific environmental threats affecting local populations.

### 3.6. Real-time Telemetry
- **WebSocket Broadcasts:** Instant alerts and dynamic dashboard updates on standard data ingest events (sensor pushes).

---

## 4. User Interface & Dashboards

The Frontend offers several immersive dashboards for operators:
- **Overview Dashboard (`/`):** Real-time gauge of the city’s health with active cascading warnings.
- **Scenario Simulator (`/simulate`):** Interactive policy parameter manipulation showing comparative outcomes.
- **7-Day Forecast (`/forecast`):** Trend charts mapping ML-derived predictions with confidence bands.
- **Policy Recommendations (`/recommendations`):** Tabular/Card views of the ranked mitigation strategies.
- **Zone Risk Map (`/zones`):** Geographic overview and threat levels per district.
- **Historical Analysis (`/history`):** Long-term data evaluations demonstrating worsening or improving trends.

---

## 5. Non-Functional Requirements (NFR)

- **Performance:** Backend APIs optimized for < 500ms latency with in-memory graph computation for real-time scenario modeling.
- **Resilience:** Features an ML-Adapter Pattern; seamlessly switches to a mock engine if the ML service encounters downtime. 
- **Graceful Degradation:** The UI fully supports realistic mock data visualization to keep operators functional even without a backend.
- **Security:** Equipped with `helmet` security headers, comprehensive input sanitization (`express-validator`), and 3-tiered API rate limiting (`express-rate-limit`).
- **Containerization:** The platform is fully containerized with Docker, enabling multi-stage production builds and easy multi-environment orchestration via Docker Compose.

---

## 6. Success Metrics

1. **Modeling Accuracy:** Accurate cascade propagation verified against historical/mock event data.
2. **Hackathon Compliance:** Covers all expected outputs natively—Crisis Score, Time-to-Impact, Zone Forecasts, Recommendations, and Confidence Intervals.
3. **Actionability:** Combined policy runs successfully reflect a quantifiable percentage improvement in overarching risk models.
4. **Architectural Isolation:** Decoupled frontend, logical Node engine modules, and ML microservices ensure high maintainability and ease of scaling.
