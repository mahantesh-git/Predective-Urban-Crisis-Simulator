# CitySentinel AI Dashboard - System Design & Components

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Component Hierarchy](#component-hierarchy)
4. [Data Flow Architecture](#data-flow-architecture)
5. [State Management](#state-management)
6. [Routing System](#routing-system)
7. [API Integration](#api-integration)
8. [Real-Time Features](#real-time-features)
9. [UI Component Library](#ui-component-library)
10. [Styling & Theme System](#styling--theme-system)
11. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CitySentinel AI Dashboard                 │
│                      (React 18 + Vite)                       │
└─────────────────────────────────────────────────────────────┘
                              ▼
        ┌─────────────────────────────────────────┐
        │          Application Layer              │
        │  ┌──────────────────────────────────┐   │
        │  │  Router (React Router v7)        │   │
        │  │  - 7 Main Routes + Outlet        │   │
        │  │  - Nested Child Routes           │   │
        │  │  - Layout Management             │   │
        │  └──────────────────────────────────┘   │
        └─────────────────────────────────────────┘
                              ▼
    ┌───────────────────────────────────────────────────┐
    │          Presentation Layer (Pages)               │
    │  ┌──────────────────────────────────────────────┐ │
    │  │ Dashboard │ Simulate  │ Forecast             │ │
    │  │ Zones     │ History   │ Recommendations     │ │
    │  │ Ecology   │                                  │ │
    │  └──────────────────────────────────────────────┘ │
    └───────────────────────────────────────────────────┘
                              ▼
    ┌───────────────────────────────────────────────────┐
    │         Business Logic Layer                       │
    │  ┌──────────────────────────────────────────────┐ │
    │  │ Context: CityProvider                        │ │
    │  │ - City State Management                      │ │
    │  │ - Global Context Distribution                │ │
    │  └──────────────────────────────────────────────┘ │
    │  ┌──────────────────────────────────────────────┐ │
    │  │ Utility Functions                            │ │
    │  │ - Calculations & Transformations             │ │
    │  │ - Helper Functions                           │ │
    │  └──────────────────────────────────────────────┘ │
    └───────────────────────────────────────────────────┘
                              ▼
    ┌───────────────────────────────────────────────────┐
    │         UI Component Layer                         │
    │  ┌──────────────────────────────────────────────┐ │
    │  │ 40+ Radix UI Components                      │ │
    │  │ - Buttons, Cards, Dialogs                    │ │
    │  │ - Forms, Tables, Navigation                  │ │
    │  │ - Charts, Progress, Sliders                  │ │
    │  └──────────────────────────────────────────────┘ │
    │  ┌──────────────────────────────────────────────┐ │
    │  │ Custom Components                            │ │
    │  │ - Error Boundary, Loading Spinner            │ │
    │  │ - Welcome Dialog, Page Transitions           │ │
    │  └──────────────────────────────────────────────┘ │
    └───────────────────────────────────────────────────┘
                              ▼
    ┌───────────────────────────────────────────────────┐
    │         Data & Integration Layer                   │
    │  ┌──────────────────────────────────────────────┐ │
    │  │ API Client (Axios)                           │ │
    │  │ - REST API endpoints                         │ │
    │  │ - Mock data fallback                         │ │
    │  │ - Error handling                             │ │
    │  └──────────────────────────────────────────────┘ │
    │  ┌──────────────────────────────────────────────┐ │
    │  │ WebSocket Service                            │ │
    │  │ - Real-time updates                          │ │
    │  │ - Auto-reconnection                          │ │
    │  │ - Polling fallback                           │ │
    │  └──────────────────────────────────────────────┘ │
    └───────────────────────────────────────────────────┘
                        ▼           ▼
    ┌──────────────────────────────────────────────────────┐
    │              External Services                        │
    │  ┌──────────────────┐      ┌──────────────────────┐  │
    │  │ Backend REST API │      │ ML Service (Python)  │  │
    │  │ Port: 5000       │      │ Port: 8000           │  │
    │  └──────────────────┘      └──────────────────────┘  │
    │         WebSocket                                     │
    │      (Same as REST)                                   │
    └──────────────────────────────────────────────────────┘
```

---

## System Components

### 1. **Pages Layer** (6 Main + 1 Landing)

#### Dashboard Page
```
Dashboard.tsx
├── Purpose: Real-time city health overview
├── Key Elements:
│   ├── Risk Score Gauge (Radial Progress)
│   ├── Crisis Level Badge
│   ├── 4 Cascade Effect Cards (AQI, Water, Health, Traffic)
│   ├── Triggered Systems Display
│   ├── Time-to-Impact Countdown
│   ├── Confidence Intervals
│   └── Latest Sensor Readings Grid
├── Data Source: GET /status (WebSocket)
├── State: Local React state with useEffect polling
└── Refresh Rate: Real-time (WebSocket) + 30s fallback
```

#### Simulate Page
```
Simulate.tsx
├── Purpose: Policy scenario simulation & comparison
├── Modes:
│   ├── Single Scenario: 3 input sliders
│   │   ├── Traffic Reduction (0-100%)
│   │   ├── Industrial Cut (0-100%)
│   │   └── Heatwave Level (0-5)
│   └── Compare Mode: Up to 5 scenarios with rankings
├── Key Elements:
│   ├── Before/After Comparison Panels
│   ├── Risk Reduction Calculations
│   ├── Percentage Improvement Display
│   ├── Ranked Results Table
│   └── Trophy Badge for Best Scenario
├── Data Source: POST /simulate (single) & POST /simulate/compare
├── Calculation: Client-side risk reduction algorithm
└── State: Local state for slider values + scenario list
```

#### Forecast Page
```
Forecast.tsx
├── Purpose: 7-day ML-powered predictions
├── Key Elements:
│   ├── AQI Forecast Chart (Area with confidence bands)
│   ├── Water Stress Forecast Chart (Area with confidence bands)
│   ├── Peak Risk Summary Cards
│   ├── Confidence Visualization
│   └── Affected Zones Display
├── Data Source: GET /forecast (from ML service)
├── Chart Type: Recharts Area Charts
├── Confidence Bands: Shaded ribbon visualization
└── Refresh: Page load + manual refresh option
```

#### Recommendations Page
```
Recommendations.tsx
├── Purpose: AI-ranked policy strategies for crisis mitigation
├── Key Elements:
│   ├── 6 Strategy Cards (sorted by efficiency score)
│   ├── Card Contents:
│   │   ├── Strategy Name & Description
│   │   ├── Efficiency Score (0-1.0)
│   │   ├── Cost Indicator (LOW/MEDIUM/HIGH)
│   │   ├── Projected Risk New Value
│   │   ├── Improvement Percentage
│   │   └── ROI Rating Bars
│   ├── Baseline Risk Display
│   └── Trophy Badge for #1 Recommendation
├── Data Source: GET /recommendations
├── Sorting: By efficiency_score (descending)
└── State: Local state for expansion/collapse
```

#### Zones Page
```
Zones.tsx
├── Purpose: Geographic zone-based risk monitoring
├── Key Elements:
│   ├── 6 Zone Cards with:
│   │   ├── Zone Name
│   │   ├── Alert Level Badge (SAFE/WATCH/WARNING/CRITICAL)
│   │   ├── Evacuation Priority Banner (if critical)
│   │   ├── Risk Score
│   │   ├── Primary Threat Identification
│   │   ├── Population Statistics
│   │   └── Color-Coded Borders
│   └── Expandable Zone Details with:
│       ├── 7-Day Zone Forecast Chart
│       ├── Recommended Actions List
│       └── Threat Analysis
├── Data Source: GET /zones + GET /zones/:id
├── Interactivity: Click to expand zone details modal
└── State: Local state for selected zone + expanded zones
```

#### History Page
```
History.tsx
├── Purpose: 7-day historical trend analysis
├── Key Elements:
│   ├── Multi-Series Area Chart (AQI, Water, Traffic, Emissions)
│   ├── Individual Metric Breakdowns (4 cards)
│   ├── Summary Statistics:
│   │   ├── Average Values
│   │   ├── Trend Direction (WORSENING/IMPROVING)
│   │   └── Alert Badges
│   └── Progress Bar Visualizations
├── Data Source: GET /history
├── Chart Type: Recharts Area Chart (multi-series)
├── Trend Detection: Client-side algorithm
└── State: Local state for selected date range
```

#### Ecology Page
```
Ecology.tsx
├── Purpose: Environmental data & deforestation monitoring
├── Key Elements:
│   ├── Satellite Imagery Display
│   ├── Deforestation Trends
│   ├── Forest Cover Analysis
│   ├── Environmental Metrics
│   └── Conservation Recommendations
├── Data Source: GET /deforestation + Satellite data
├── Visualization: Map & charts
└── State: Local state for map selection & time period
```

#### Home Page (Landing)
```
Home.tsx
├── Purpose: Welcome & system introduction
├── Key Elements:
│   ├── Product Overview
│   ├── Feature Highlights
│   ├── Call-to-Action Button
│   └── Introduction Content
├── Navigation: Link to /app (main dashboard)
└── State: No persistent state
```

---

### 2. **Layout Components**

#### RootLayout
```
RootLayout.tsx
├── Purpose: Main application shell & navigation
├── Structure:
│   ├── Header
│   │   ├── Logo + Branding
│   │   ├── City Selector (opens India Map Modal)
│   │   └── Live Status Indicator
│   ├── Navigation Bar
│   │   ├── 7 Nav Items with Icons
│   │   ├── Active Route Highlighting
│   │   └── Hover Effects
│   └── Content Area
│       └── <Outlet /> for nested routes
├── Props: None (uses React Router context)
├── State: mapOpen (boolean for map modal)
└── Features:
    ├── Welcome Dialog on first visit
    ├── Satellite Map Modal
    └── City context integration
```

---

### 3. **Utility Components**

#### ErrorBoundary
```
ErrorBoundary.tsx
├── Purpose: Graceful error handling
├── Features:
│   ├── Catches React errors
│   ├── Displays error UI
│   ├── Logs errors to console
│   └── Allows recovery via reload button
├── Boundary: Wraps entire App
└── State: { hasError, error, errorInfo }
```

#### LoadingSpinner
```
LoadingSpinner.tsx
├── Purpose: Loading state indicator
├── Features:
│   ├── Animated spinner icon
│   ├── Optional loading text
│   ├── Customizable size
│   └── Dark theme styling
├── Props: { text?: string; fullScreen?: boolean }
└── Usage: In pages during data fetching
```

#### WelcomeDialog
```
WelcomeDialog.tsx
├── Purpose: First-time user onboarding
├── Features:
│   ├── Dismissible modal
│   ├── Feature overview
│   ├── Usage instructions
│   └── localStorage tracking
├── Trigger: First visit (localStorage check)
└── State: { open, dismissed }
```

#### PageTransition
```
PageTransition.tsx
├── Purpose: Route transition animations
├── Features:
│   ├── Framer Motion animations
│   ├── Fade in/out effects
│   ├── Smooth page transitions
│   └── Customizable durations
├── Usage: Wrapper for page components
└── Props: { children, key }
```

#### PageHeader
```
PageHeader.tsx
├── Purpose: Consistent page header layout
├── Elements:
│   ├── Page Title
│   ├── Description
│   ├── Action Buttons
│   └── Breadcrumb Navigation
├── Props: { title, description, actions }
└── Usage: Top of each page
```

---

### 4. **Feature Components**

#### Analytics Components
```
analytics/
├── Purpose: Data visualization & analysis
├── Subcomponents:
│   ├── Chart Components (Wrappers for Recharts)
│   ├── Metric Cards
│   ├── Trend Indicators
│   └── Summary Statistics
└── Integration: Used in Dashboard, Forecast, History
```

#### Scenario Components
```
scenario/
├── Purpose: Scenario simulation features
├── Subcomponents:
│   ├── Scenario Slider Inputs
│   ├── Comparison Table
│   ├── Result Cards
│   └── Scenario Manager
└── Integration: Used in Simulate page
```

#### Timeline Components
```
timeline/
├── Purpose: Historical data timeline visualization
├── Subcomponents:
│   ├── Timeline Header
│   ├── Timeline Events
│   ├── Date Range Selector
│   └── Timeline Chart
└── Integration: Used in History page
```

#### XAI (Explainable AI) Components
```
xai/
├── Purpose: Model explainability & interpretation
├── Subcomponents:
│   ├── Feature Importance Display
│   ├── Model Explanation Cards
│   ├── Decision Trees Visualization
│   └── Factor Contribution Charts
└── Integration: Used in Recommendations, Forecast
```

#### Network Components
```
network/
├── Purpose: Network visualization & monitoring
├── Subcomponents:
│   ├── Network Graph
│   ├── Connection Status
│   ├── Data Flow Visualization
│   └── Network Health Metrics
└── Integration: Used in Zones, Ecology
```

#### Map Components
```
IndiaMapSelector.tsx (Custom)
├── Purpose: City selection on India map
├── Features:
│   ├── Interactive Leaflet map
│   ├── City markers
│   ├── State boundaries
│   ├── Search functionality
│   └── Real-time updates
├── Integration: RootLayout header
└── Updates: CityContext on selection

SatelliteMapSelector.tsx (Custom)
├── Purpose: Satellite imagery viewing
├── Features:
│   ├── Leaflet satellite layers
│   ├── Zoom controls
│   ├── Layer toggling
│   ├── Historical imagery
│   └── Annotation tools
├── Integration: Ecology page, Zones detail
└── State: View state, selected layer, time range
```

---

### 5. **UI Component Library (Radix UI)**

#### Available Components (40+)

| Category | Components |
|----------|------------|
| **Layout** | Card, Separator, AspectRatio, ScrollArea |
| **Navigation** | Breadcrumb, NavigationMenu, Tabs, Menubar |
| **Forms** | Input, Label, Button, Checkbox, RadioGroup, Select, Switch, Textarea, Toggle, ToggleGroup, Slider, InputOTP |
| **Dialogs** | Dialog, AlertDialog, Sheet, Drawer, Popover, HoverCard, ContextMenu |
| **Data Display** | Table, Accordion, Collapsible, Carousel, Pagination, Avatar, Badge |
| **Feedback** | Alert, Tooltip, Sonner (Toast) |
| **Charts** | Chart (Recharts wrapper) |
| **Utilities** | Command (CMD Palette), DropdownMenu, Progress, Skeleton, useMobile |

#### Component Usage Patterns

```typescript
// Example: Button Component
import { Button } from '@/components/ui/button'

<Button 
  variant="default" 
  size="lg" 
  onClick={handleClick}
>
  Click Me
</Button>

// Example: Card Component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Example: Slider Component
import { Slider } from '@/components/ui/slider'

<Slider 
  min={0} 
  max={100} 
  step={1} 
  value={value}
  onValueChange={setValue}
/>

// Example: Chart Component
import { Chart } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis } from 'recharts'

<Chart>
  <LineChart data={data}>
    <XAxis />
    <YAxis />
    <Line />
  </LineChart>
</Chart>
```

---

## Component Hierarchy

### Complete Component Tree

```
App
├── ErrorBoundary
│   ├── CityProvider
│   │   ├── RouterProvider
│   │   │   ├── Home (Route: /)
│   │   │   │
│   │   │   └── RootLayout (Route: /app)
│   │   │       ├── WelcomeDialog
│   │   │       ├── SatelliteMapSelector
│   │   │       ├── Header
│   │   │       │   ├── Logo
│   │   │       │   ├── City Selector Button
│   │   │       │   └── Live Indicator
│   │   │       ├── Navigation Bar
│   │   │       │   └── NavItems[7]
│   │   │       │       ├── Dashboard
│   │   │       │       ├── Simulate
│   │   │       │       ├── Forecast
│   │   │       │       ├── Recommendations
│   │   │       │       ├── Zones
│   │   │       │       ├── Ecology
│   │   │       │       └── History
│   │   │       └── Outlet
│   │   │
│   │   ├── Dashboard (Route: /app)
│   │   │   ├── PageHeader
│   │   │   ├── RiskScoreGauge
│   │   │   ├── CascadeEffectsCards[4]
│   │   │   ├── TriggeredSystemsDisplay
│   │   │   ├── SensorReadingsGrid
│   │   │   └── WelcomeDialog
│   │   │
│   │   ├── Simulate (Route: /app/simulate)
│   │   │   ├── PageHeader
│   │   │   ├── ScenarioInputs
│   │   │   │   ├── TrafficSlider
│   │   │   │   ├── IndustrialSlider
│   │   │   │   └── HeatwaveSlider
│   │   │   ├── ComparisonPanel
│   │   │   ├── RankedResultsTable
│   │   │   └── ScenarioManager
│   │   │
│   │   ├── Forecast (Route: /app/forecast)
│   │   │   ├── PageHeader
│   │   │   ├── AQIForecastChart
│   │   │   ├── WaterStressForecastChart
│   │   │   ├── PeakRisummarySummaryCards[3]
│   │   │   └── AffectedZonesDisplay
│   │   │
│   │   ├── Recommendations (Route: /app/recommendations)
│   │   │   ├── PageHeader
│   │   │   ├── StrategyCards[6]
│   │   │   │   ├── CardHeader
│   │   │   │   ├── EfficiencyScore
│   │   │   │   ├── CostIndicator
│   │   │   │   ├── ProjectedRisk
│   │   │   │   └── ROIRating
│   │   │   └── BaselineRiskDisplay
│   │   │
│   │   ├── Zones (Route: /app/zones)
│   │   │   ├── PageHeader
│   │   │   ├── ZoneCards[6]
│   │   │   │   ├── ZoneName
│   │   │   │   ├── AlertBadge
│   │   │   │   ├── EvacuationBanner (conditional)
│   │   │   │   ├── RiskScore
│   │   │   │   ├── ThreatIndicator
│   │   │   │   └── PopulationDisplay
│   │   │   └── ZoneDetailModal
│   │   │       ├── ZoneForecastChart
│   │   │       ├── RecommendedActionsList
│   │   │       └── ThreatAnalysis
│   │   │
│   │   ├── History (Route: /app/history)
│   │   │   ├── PageHeader
│   │   │   ├── MultiSeriesChart
│   │   │   ├── MetricBreakdowns[4]
│   │   │   ├── TrendIndicators
│   │   │   └── SummaryStatistics
│   │   │
│   │   ├── Ecology (Route: /app/ecology)
│   │   │   ├── PageHeader
│   │   │   ├── SatelliteImageryDisplay
│   │   │   ├── DeforestationTrendChart
│   │   │   ├── ForestCoverAnalysis
│   │   │   ├── EnvironmentalMetrics
│   │   │   └── ConservationRecommendations
│   │   │
│   │   └── Toaster (for notifications)
└── Toaster (Sonner)
```

---

## Data Flow Architecture

### User Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interaction                          │
│  (Click Button, Adjust Slider, Navigate Route)              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Event Handlers                              │
│  onClick, onChange, onNavigate                              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Business Logic / Calculations                      │
│  - State updates                                            │
│  - Value transformations                                    │
│  - Risk score calculations                                  │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              API Calls (if needed)                           │
│  - useEffect hooks trigger API calls                        │
│  - Axios client makes HTTP requests                         │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Transform Response Data                            │
│  - Map API response to component state                      │
│  - Normalize data structure                                 │
│  - Calculate derived values                                 │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Update Component State (setState)                    │
│  - useState hook updates                                    │
│  - Context updates (CityProvider)                           │
│  - Re-render triggered                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Component Re-render                              │
│  - React reconciliation                                     │
│  - Virtual DOM diff                                         │
│  - DOM updates                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              UI Update to User                               │
│  - New values displayed                                     │
│  - Charts re-render                                         │
│  - Animations trigger                                       │
└─────────────────────────────────────────────────────────────┘
```

### API Data Flow

```
┌──────────────────────────────────────────────────────┐
│  useEffect Hook (on component mount)                 │
│  - Dependencies: [city, selectedZone, etc]           │
└────────────────────┬─────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────┐
│  API Call via Axios                                  │
│  GET /status, POST /simulate, etc.                   │
└────────────────────┬─────────────────────────────────┘
                     ▼
         ┌───────────────────────────┐
         |  Network Request Sent      |
         └───────────────────┬────────┘
                             ▼
              ┌──────────────────────────┐
              │ Backend Response (JSON)  │
              └──────┬───────────────────┘
                     ▼
┌──────────────────────────────────────────────────────┐
│  Response Handler                                    │
│  - Success: 200 response                             │
│  - Error: Catch error, use mock data                │
└────────────────────┬─────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────┐
│  Transform Data                                      │
│  - Parse JSON                                        │
│  - Validate structure                                │
│  - Calculate derived fields                          │
└────────────────────┬─────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────┐
│  Update State                                        │
│  setData(transformedResponse)                        │
│  - Triggers re-render                                │
│  - Component receives new props                      │
└──────────────────────────────────────────────────────┘
```

### WebSocket Real-Time Flow

```
┌─────────────────────────────────────────────────┐
│  WebSocket Connection Established                │
│  ws://localhost:5000 (same as REST API)          │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Dashboard Component Mounts                      │
│  - useEffect: subscribe to RISK_UPDATE events   │
└────────────────────┬────────────────────────────┘
                     ▼
         ┌───────────────────────────────┐
         │ Server broadcasts RISK_UPDATE  │
         │ { risk_score, crisis_level... } │
         └────────────────┬────────────────┘
                          ▼
┌─────────────────────────────────────────────────┐
│  Client Receives Event                          │
│  WebSocket onmessage handler                    │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Parse Event Data                               │
│  Extract relevant fields                        │
│  Validate data structure                        │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Update Dashboard State                         │
│  setRiskScore, setCrisisLevel, etc.             │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Re-render Dashboard                            │
│  Gauges update, badges change, alerts appear    │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Animation Transitions                          │
│  CSS/Framer Motion animations                   │
└─────────────────────────────────────────────────┘

Fallback (if WebSocket fails):
├── Polling Timer started (30s interval)
├── setInterval: fetch /status every 30s
├── Merge with WebSocket data if reconnected
└── Show warning to user if disconnected
```

---

## State Management

### State Management Strategy

The application uses **React Hooks** for state management with **Context API** for global state sharing.

#### 1. Component-Level State (useState)

```typescript
// Dashboard.tsx - Local component state
const [riskScore, setRiskScore] = useState<number>(0);
const [crisisLevel, setCrisisLevel] = useState<string>('LOW');
const [cascadeEffects, setCascadeEffects] = useState<CascadeEffects>({});
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);

// Simulate.tsx - Scenario state
const [trafficReduction, setTrafficReduction] = useState<number>(50);
const [industrialCut, setIndustrialCut] = useState<number>(50);
const [heatwaveLevel, setHeatwaveLevel] = useState<number>(3);
const [scenarios, setScenarios] = useState<Scenario[]>([]);
const [compareMode, setCompareMode] = useState<boolean>(false);
const [selectedScenario, setSelectedScenario] = useState<number>(0);
```

#### 2. Global State (Context API)

```typescript
// CityContext.tsx
interface CityContextType {
  city: {
    name: string;
    state: string;
    lat: number;
    lng: number;
  };
  setCity: (city: CityContextType['city']) => void;
}

// Usage in components
const { city, setCity } = useCity();
```

#### 3. Side Effects & Data Fetching (useEffect)

```typescript
// Dashboard.tsx - Fetch status on mount
useEffect(() => {
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/status');
      setRiskScore(response.data.risk_score);
      setCrisisLevel(response.data.crisis_level);
      // ... process other data
    } catch (error) {
      console.error('Error fetching status:', error);
      setError('Failed to fetch data');
      // Fall back to mock data
      setRiskScore(mockStatus.risk_score);
    } finally {
      setLoading(false);
    }
  };
  
  fetchStatus();
  
  // WebSocket listener
  websocket.on('RISK_UPDATE', (data) => {
    setRiskScore(data.risk_score);
    setCrisisLevel(data.crisis_level);
  });
  
  return () => {
    websocket.off('RISK_UPDATE');
  };
}, [city]); // Re-fetch when city changes
```

#### 4. localStorage for Persistence

```typescript
// Preferences stored in localStorage
const WelcomeDialog = () => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('welcomeDismissed') === 'true';
  });
  
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('welcomeDismissed', 'true');
  };
}
```

### State Shape Reference

```typescript
// Dashboard State Shape
{
  riskScore: number;
  crisisLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  cascadeEffects: {
    aqi_impact: number;
    water_stress: number;
    health_risk: number;
    traffic_disruption: number;
  };
  triggered_systems: string[];
  time_to_impact: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  latest_data: {
    aqi: number;
    traffic_index: number;
    water_quality: number;
    industrial_emissions: number;
  };
  loading: boolean;
  error: string | null;
}

// Simulate State Shape
{
  trafficReduction: number;  // 0-100
  industrialCut: number;      // 0-100
  heatwaveLevel: number;      // 0-5
  beforeRisk: number;
  afterRisk: number;
  improvement: number;
  scenarios: Scenario[];
  compareMode: boolean;
  selectedScenario: number;
}

// Zones State Shape
{
  zones: Zone[];
  selectedZoneId: string | null;
  expandedZones: Set<string>;
  zoneForecasts: Map<string, Forecast>;
  loading: boolean;
}
```

---

## Routing System

### Router Configuration (React Router v7)

```typescript
// routes.ts - Complete routing setup
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
    // Landing page - no layout
  },
  {
    path: '/app',
    Component: RootLayout,
    // Main application shell with header & nav
    children: [
      {
        index: true,
        Component: Dashboard,
        // /app - Dashboard (default)
      },
      {
        path: 'simulate',
        Component: Simulate,
        // /app/simulate
      },
      {
        path: 'forecast',
        Component: Forecast,
        // /app/forecast
      },
      {
        path: 'recommendations',
        Component: Recommendations,
        // /app/recommendations
      },
      {
        path: 'zones',
        Component: Zones,
        // /app/zones
      },
      {
        path: 'history',
        Component: History,
        // /app/history
      },
      {
        path: 'ecology',
        Component: Ecology,
        // /app/ecology
      },
    ],
  },
]);
```

### Route Navigation Flow

```
User Input (click nav item)
           ▼
Navigate(path) function
           ▼
React Router processes route change
           ▼
Old component unmounts (cleanup useEffect)
           ▼
New component mounts
           ▼
Data fetching (useEffect runs)
           ▼
Component renders with fetched data
           ▼
Navigation complete
```

### The `Outlet` Pattern

```typescript
// RootLayout.tsx - Parent layout component
export function RootLayout() {
  return (
    <div>
      <Header />
      <Navigation />
      
      {/* All child routes render here */}
      <Outlet />
      
      <Footer /> {/* Optional */}
    </div>
  );
}

// This allows:
// /app              → RootLayout + Dashboard outlet
// /app/simulate     → RootLayout + Simulate outlet
// /app/forecast     → RootLayout + Forecast outlet
// etc.
```

---

## API Integration

### Axios Configuration

```typescript
// api.ts - Centralized API client
import axios from 'axios';
import { API_BASE } from './config';

const api = axios.create({
  baseURL: API_BASE,              // http://localhost:5000
  timeout: 10000,                  // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Global error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    // Use mock data as fallback
    return fallbackToMock(error);
  }
);

export default api;
```

### API Endpoints

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/status` | GET | Current city status | { risk_score, crisis_level, cascade_effects, timing } |
| `/forecast` | GET | 7-day ML forecast | { aqi_forecast, water_stress, confidence_bands, peaks } |
| `/recommendations` | GET | Policy strategies | { strategies[6], baseline_risk, efficiency_scores } |
| `/zones` | GET | All zones data | { zones[6], risk_scores, threat_levels } |
| `/zones/:id` | GET | Zone details | { zone, forecast, recommendations, population } |
| `/history` | GET | Historical trends | { 7_day_data, trends, averages } |
| `/simulate` | POST | Single scenario | { before_risk, after_risk, improvement_pct } |
| `/simulate/compare` | POST | Compare scenarios | { scenarios_ranked[5], best_scenario } |

#### API Call Examples

```typescript
// Dashboard
const fetchStatus = () => {
  return api.get('/status');
  // Response: { risk_score, crisis_level, cascade_effects, ... }
};

// Simulate
const runSimulation = (params) => {
  return api.post('/simulate', {
    traffic_reduction: 50,
    industrial_cut: 60,
    heatwave_level: 3,
  });
};

const compareScenarios = (scenarios) => {
  return api.post('/simulate/compare', {
    scenarios: [
      { traffic_reduction: 50, industrial_cut: 60, heatwave_level: 3 },
      { traffic_reduction: 80, industrial_cut: 40, heatwave_level: 3 },
      // ... up to 5 scenarios
    ]
  });
};

// Zones
const fetchZones = () => {
  return api.get('/zones');
  // Response: { zones: [...] }
};

const fetchZoneDetail = (zoneId) => {
  return api.get(`/zones/${zoneId}`);
  // Response: { zone, forecast, recommendations, population }
};
```

### Mock Data Fallback

```typescript
// When backend is down, use mock data
if (process.env.NODE_ENV === 'development' || error) {
  return useData(mockStatus);  // Dashboard
  return useData(mockForecast); // Forecast
  return useData(mockRecommendations); // Recommendations
  // ... etc
}
```

---

## Real-Time Features

### WebSocket Integration

```typescript
// websocketService.ts - WebSocket management
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  
  connect(url: string) {
    try {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('CONNECTED', null);
      };
      
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        // Emit event from server
        if (data.type === 'RISK_UPDATE') {
          this.emit('RISK_UPDATE', data.payload);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('ERROR', error);
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('DISCONNECTED', null);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.attemptReconnect();
    }
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        this.connect('ws://localhost:5000');
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached. Switching to polling.');
      this.emit('MAX_RECONNECT_FAILED', null);
    }
  }
  
  on(event: string, callback: Function) {
    // Event listener
  }
  
  off(event: string) {
    // Remove listener
  }
  
  emit(event: string, data: any) {
    // Emit event
  }
}

export const websocket = new WebSocketService();
```

### Dashboard Real-Time Updates

```typescript
// Dashboard.tsx - Real-time risk updates
useEffect(() => {
  // Subscribe to WebSocket updates
  websocket.on('RISK_UPDATE', (data) => {
    console.log('Risk updated:', data);
    setRiskScore(data.risk_score);
    setCrisisLevel(data.crisis_level);
    setCascadeEffects(data.cascade_effects);
  });
  
  websocket.on('DISCONNECTED', () => {
    console.warn('WebSocket disconnected, falling back to polling');
    setConnectionStatus('polling');
    
    // Start polling every 30 seconds
    const pollInterval = setInterval(() => {
      fetchStatus();
    }, 30000);
    
    return () => clearInterval(pollInterval);
  });
  
  websocket.on('CONNECTED', () => {
    console.log('WebSocket reconnected');
    setConnectionStatus('live');
  });
  
  return () => {
    websocket.off('RISK_UPDATE');
    websocket.off('DISCONNECTED');
    websocket.off('CONNECTED');
  };
}, []);
```

### Polling Fallback

```typescript
// Fallback when WebSocket unavailable
useEffect(() => {
  const pollInterval = setInterval(() => {
    api.get('/status')
      .then(response => {
        setRiskScore(response.data.risk_score);
        // ... update state
      })
      .catch(error => {
        console.error('Polling error:', error);
        // Use mock data
      });
  }, 30000); // Poll every 30 seconds
  
  return () => clearInterval(pollInterval);
}, [city]);
```

---

## UI Component Library

### Radix UI Setup

```typescript
// All 40+ Radix UI components are available
// Organized in: src/app/components/ui/

// Tree structure:
// ui/
// ├── accordion.tsx
// ├── alert-dialog.tsx
// ├── alert.tsx
// ├── badge.tsx
// ├── button.tsx
// ├── card.tsx
// ├── chart.tsx
// ├── checkbox.tsx
// ├── dialog.tsx
// ├── input.tsx
// ├── label.tsx
// ├── progress.tsx
// ├── select.tsx
// ├── slider.tsx
// ├── table.tsx
// ├── tabs.tsx
// ├── toggle.tsx
// ├── tooltip.tsx
// └── ... (40+ total)
```

### Common Component Patterns

```typescript
// Button Component
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg">Click</Button>
{/* Variants: default, destructive, outline, secondary, ghost */}
{/* Sizes: default, sm, lg, icon */}

// Card Component
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Input Component
import { Input } from '@/components/ui/input';

<Input type="text" placeholder="Enter value" />

// Slider Component
import { Slider } from '@/components/ui/slider';

<Slider 
  min={0} 
  max={100} 
  step={1} 
  value={[value]} 
  onValueChange={(val) => setValue(val[0])}
/>

// Select Component
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';

<Select value={selected} onValueChange={setSelected}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>

// Dialog Component
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>Dialog content</DialogContent>
</Dialog>

// Tooltip Component
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Tooltip text</TooltipContent>
</Tooltip>

// Badge Component
import { Badge } from '@/components/ui/badge';

<Badge variant="secondary">CRITICAL</Badge>
{/* Variants: default, secondary, destructive, outline */}

// Progress Component
import { Progress } from '@/components/ui/progress';

<Progress value={75} className="w-full" />

// Table Component
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableCell>Header</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Styling & Theme System

### Tailwind CSS Configuration

```javascript
// tailwind.config.js - Complete theme setup
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        rust: 'hsl(var(--rust))',    // Custom accent color
        // ... more colors
      },
      spacing: {
        // Custom spacing values
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    // ... other plugins
  ],
};
```

### CSS Variables (Dark Theme)

```css
/* index.css - Theme variables */
:root {
  --background: 0 0% 3%;           /* #050505 - Almost black */
  --foreground: 0 0% 98%;          /* #FAFAFA - Almost white */
  --card: 210 40% 9.8%;            /* #0F1419 - Slate 900 */
  --card-foreground: 0 0% 98%;     /* #FAFAFA */
  --muted: 210 40% 20%;            /* #334155 - Slate 600 */
  --muted-foreground: 210 40% 60%; /* #94A3B8 - Slate 400 */
  --border: 210 40% 15%;           /* #1E293B - Slate 800 */
  --rust: 0 84% 60%;               /* #EF4444 - Red-500 */
  
  /* Crisis level colors */
  --crisis-critical: 0 84% 60%;    /* Red (#EF4444) */
  --crisis-high: 25 95% 53%;       /* Orange (#F97316) */
  --crisis-moderate: 48 96% 53%;   /* Yellow (#EAB308) */
  --crisis-safe: 142 71% 45%;      /* Green (#22C55E) */
}

@media (prefers-color-scheme: light) {
  :root {
    --background: 0 0% 100%;       /* White */
    --foreground: 0 0% 0%;         /* Black */
    /* ... light theme variables */
  }
}
```

### Color Coding System

```
Crisis Levels:
┌─────────────┬──────────┬────────────┬──────────────┐
│ Level       │ Color    │ Hex        │ Usage        │
├─────────────┼──────────┼────────────┼──────────────┤
│ CRITICAL    │ Red      │ #EF4444    │ Extreme risk │
│ HIGH        │ Orange   │ #F97316    │ High risk    │
│ MODERATE    │ Yellow   │ #EAB308    │ Medium risk  │
│ LOW/SAFE    │ Green    │ #22C55E    │ Safe         │
└─────────────┴──────────┴────────────┴──────────────┘

Components Usage:
┌─────────────┬──────────────────────────────────────┐
│ Component   │ Color Purpose                        │
├─────────────┼──────────────────────────────────────┤
│ Badge       │ Status indicator                     │
│ Border      │ Risk level emphasis                  │
│ Background  │ Card emphasis                        │
│ Icon        │ Visual priority                      │
│ Progress    │ Risk gauge fill                      │
└─────────────┴──────────────────────────────────────┘
```

### Responsive Design

```typescript
// Mobile-first approach with Tailwind
<div className="
  p-4                    /* Mobile: 1rem padding */
  md:p-6                 /* Tablet: 1.5rem padding */
  lg:p-8                 /* Desktop: 2rem padding */
  
  grid grid-cols-1       /* Mobile: 1 column */
  md:grid-cols-2         /* Tablet: 2 columns */
  lg:grid-cols-4         /* Desktop: 4 columns */
  
  gap-4 md:gap-6 lg:gap-8
">
  Content
</div>

// Breakpoints:
// md: 768px (tablet)
// lg: 1024px (desktop)
// xl: 1280px (large desktop)
// 2xl: 1536px (very large)
```

---

## Performance Optimization

### Code Splitting & Lazy Loading

```typescript
// routes.ts - Code splitting for each page
import { lazy } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Simulate = lazy(() => import('./pages/Simulate'));
const Forecast = lazy(() => import('./pages/Forecast'));
// ... lazy load all pages

// Reduces initial bundle size
// Pages load on-demand when route accessed
```

### Memoization & Rendering Optimization

```typescript
// ComponentThatReceivesProps.tsx
import { memo } from 'react';

const ZoneCard = memo(({ zone, onClick }) => {
  return (
    <Card onClick={onClick}>
      {/* Prevents re-render unless props change */}
    </Card>
  );
});

export default ZoneCard;
```

### useCallback for Event Handlers

```typescript
// Dashboard.tsx
import { useCallback } from 'react';

const Dashboard = () => {
  const handleRiskUpdate = useCallback((newRisk) => {
    setRiskScore(newRisk);
  }, []);
  
  // Prevents function recreation on every render
  // Useful when passing to child components
};
```

### useMemo for Expensive Calculations

```typescript
// Recommendations.tsx
import { useMemo } from 'react';

const Recommendations = ({ strategies }) => {
  const sortedStrategies = useMemo(() => 
    strategies.sort((a, b) => 
      b.efficiency_score - a.efficiency_score
    ),
    [strategies]
  );
  
  // Calculation only runs when strategies change
};
```

### Chart Performance

```typescript
// Recharts optimization
<LineChart data={data} debounce={300}>
  {/* Debounce prevents excessive re-renders */}
  <Line 
    dataKey="aqi" 
    isAnimationActive={false}
    {/* Disable animations for slower machines */}
  />
</LineChart>
```

### Image Optimization

```typescript
// Use WebP format with fallbacks
<picture>
  <source srcSet="/image.webp" type="image/webp" />
  <img src="/image.png" alt="Description" loading="lazy" />
</picture>

// Lazy load images below fold
<img loading="lazy" src="/satellite.jpg" alt="Satellite" />
```

### Bundle Analysis

```terminal
# Check bundle size
npm run build
# Output: dist/ folder shows bundle size

# Expected sizes:
# main.js:    ~500KB (with dependencies)
# vendor.js:  ~1.2MB (Radix UI + charts)
# css:        ~100KB (Tailwind)
# Total:      ~1.8MB (gzipped: ~600KB)
```

---

## File Organization

### Complete Directory Structure

```
frontend/
├── README.md                         # Project overview
├── IMPLEMENTATION.md                 # Implementation checklist
├── SYSTEM_DESIGN.md                  # This file
├── FEATURES.md                       # Feature descriptions
├── ATTRIBUTIONS.md                   # Library & tool credits
├── guidelines/
│   └── Guidelines.md                 # Design & coding guidelines
├── src/
│   ├── main.tsx                      # Vite entry point
│   ├── App.tsx                       # Root component
│   ├── app/
│   │   ├── config.ts                 # API configuration
│   │   ├── api.ts                    # Axios client + mock data
│   │   ├── routes.ts                 # React Router configuration
│   │   ├── utils.ts                  # Utility functions
│   │   ├── constants/                # Constants & enums
│   │   ├── context/
│   │   │   └── CityContext.tsx       # Global city state
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Landing page
│   │   │   ├── Dashboard.tsx         # Main dashboard
│   │   │   ├── Simulate.tsx          # Scenario simulator
│   │   │   ├── Forecast.tsx          # ML forecasts
│   │   │   ├── Recommendations.tsx   # Policy strategies
│   │   │   ├── Zones.tsx             # Zone risk map
│   │   │   ├── History.tsx           # Historical trends
│   │   │   └── Ecology.tsx           # Environmental data
│   │   ├── components/
│   │   │   ├── RootLayout.tsx        # Main layout shell
│   │   │   ├── ErrorBoundary.tsx     # Error handling
│   │   │   ├── LoadingSpinner.tsx    # Loading indicator
│   │   │   ├── WelcomeDialog.tsx     # Onboarding
│   │   │   ├── PageHeader.tsx        # Page titles
│   │   │   ├── PageTransition.tsx    # Route animations
│   │   │   ├── IndiaMapSelector.tsx  # City picker
│   │   │   ├── SatelliteMapSelector.tsx
│   │   │   ├── analytics/            # Chart components
│   │   │   ├── scenario/             # Scenario features
│   │   │   ├── timeline/             # Timeline components
│   │   │   ├── xai/                  # Explainability
│   │   │   ├── network/              # Network vis
│   │   │   ├── figma/                # Figma embeds
│   │   │   └── ui/                   # Radix UI components (40+)
│   │   ├── data/                     # Type definitions
│   │   └── services/                 # Service classes
│   └── styles/
│       ├── index.css                 # Global styles
│       ├── fonts.css                 # Font definitions
│       └── theme.css                 # Dark theme
├── package.json                      # Dependencies
├── vite.config.ts                    # Vite build config
├── tsconfig.json                     # TypeScript config
├── tsconfig.node.json                # TS config for tooling
├── postcss.config.mjs                # PostCSS config
├── tailwind.config.js                # Tailwind theme
├── index.html                        # HTML entry
├── .gitignore
└── Dockerfile                        # Docker configuration
```

---

## Development Workflow

### Install & Setup

```bash
# Clone repository
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# http://localhost:5173

# Build for production
npm run build
# Output: dist/

# Preview production build
npm run preview
```

### Common Development Tasks

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check

# Run tests (if configured)
npm run test

# Build Docker image
docker build -t citysentinel-frontend .

# Run in Docker
docker run -p 3000:3000 citysentinel-frontend
```

### Debugging Tips

```typescript
// Enable Redux DevTools (if using Redux)
// F12 → Redux tab

// React DevTools Browser Extension
// https://github.com/facebook/react-devtools

// Console logging
console.log('Debug:', state);
console.error('Error:', error);
console.warn('Warning:', message);

// Component inspection
// Right-click → "Inspect"
// Components tab in DevTools
```

---

## Summary: Key Takeaways

| Aspect | Technology | Details |
|--------|-----------|---------|
| **Framework** | React 18 | Modern UI library with hooks |
| **Bundler** | Vite | Fast development & production builds |
| **Routing** | React Router v7 | Client-side routing with Data mode |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with dark theme |
| **Components** | Radix UI | 40+ unstyled, accessible components |
| **Charts** | Recharts | Data visualization library |
| **Icons** | Lucide React | Beautiful icon library |
| **HTTP** | Axios | Promise-based HTTP client |
| **Real-time** | WebSocket | Live data updates with fallback |
| **State** | React Hooks + Context | useState, useEffect, useContext |
| **Animation** | Framer Motion | Smooth transitions & effects |
| **Notifications** | Sonner | Toast notifications |
| **Language** | TypeScript | Static type checking |
| **Build** | Tailwind + PostCSS | CSS processing & optimization |

---

## Next Steps for Developers

1. **Clone Repository** - Get the frontend code
2. **Install Dependencies** - `npm install`
3. **Start Dev Server** - `npm run dev`
4. **Review Components** - Explore `src/app/components/`
5. **Read Guidelines** - Check `guidelines/Guidelines.md`
6. **Run Backend** - Start REST API & WebSocket server
7. **Test Features** - Use application and verify functionality
8. **Build & Deploy** - `npm run build` → deploy to server

---

**Document Version:** 1.0  
**Last Updated:** April 2, 2026  
**Maintained By:** Development Team  
**Status:** Complete
