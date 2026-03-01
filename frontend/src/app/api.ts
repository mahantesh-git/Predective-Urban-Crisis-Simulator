import axios from 'axios';
import { API_BASE } from './config';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock data generators for when backend is offline
export const mockStatus = {
  risk_score: 0.78,
  crisis_level: 'HIGH',
  cascade_effects: {
    aqi_impact: 178,
    water_stress: 0.72,
    health_risk: 0.85,
    traffic_disruption: 0.65,
  },
  triggered_systems: ['HEALTH', 'WATER', 'AIR_QUALITY'],
  time_to_impact: 2,
  confidence_interval: {
    lower: 0.72 + (Math.random() * 0.04 - 0.02),
    upper: 0.84 + (Math.random() * 0.04 - 0.02)
  },
  latest_data: {
    aqi: 178,
    traffic_index: 0.65,
    water_quality: 0.72,
    industrial_emissions: 245,
  },
};

export const mockForecast = {
  mode: 'mock',
  labels: ['Day 1 (Feb 24)', 'Day 2 (Feb 25)', 'Day 3 (Feb 26)', 'Day 4 (Feb 27)', 'Day 5 (Feb 28)', 'Day 6 (Mar 1)', 'Day 7 (Mar 2)'],
  aqi_forecast: [178, 185, 192, 188, 175, 165, 158],
  water_stress_forecast: [0.72, 0.75, 0.78, 0.76, 0.73, 0.70, 0.68],
  confidence_bands: {
    aqi: { lower: [170, 177, 184, 180, 168, 158, 151], upper: [186, 193, 200, 196, 182, 172, 165] },
    water: { lower: [0.68, 0.71, 0.74, 0.72, 0.69, 0.66, 0.64], upper: [0.76, 0.79, 0.82, 0.80, 0.77, 0.74, 0.72] },
  },
  crisis_probability: 0.78,
  time_to_impact_days: '2 days (Simulated)',
  affected_zones: ['Downtown Core', 'Industrial District'],
  recommended_policies: ['Mandatory face masks', 'Halt construction'],
};

export const mockRecommendations = {
  baseline_risk: 0.78,
  strategies: [
    {
      label: 'Emergency Traffic Reduction',
      description: 'Implement 80% traffic reduction in high-risk zones with public transit subsidies',
      projected_risk: 0.45,
      improvement_pct: 42.3,
      efficiency_score: 0.92,
      cost: 'MEDIUM',
    },
    {
      label: 'Industrial Emission Cuts',
      description: 'Mandate 60% emission reduction for top polluting facilities',
      projected_risk: 0.52,
      improvement_pct: 33.3,
      efficiency_score: 0.85,
      cost: 'HIGH',
    },
    {
      label: 'Water Conservation Protocol',
      description: 'Activate citywide water rationing and restrict non-essential usage',
      projected_risk: 0.58,
      improvement_pct: 25.6,
      efficiency_score: 0.78,
      cost: 'LOW',
    },
    {
      label: 'Green Space Expansion',
      description: 'Rapid deployment of urban cooling stations and green corridors',
      projected_risk: 0.62,
      improvement_pct: 20.5,
      efficiency_score: 0.72,
      cost: 'HIGH',
    },
    {
      label: 'Public Health Alerts',
      description: 'Mass notification system for vulnerable populations with shelter locations',
      projected_risk: 0.65,
      improvement_pct: 16.7,
      efficiency_score: 0.68,
      cost: 'LOW',
    },
    {
      label: 'Air Quality Monitoring',
      description: 'Deploy additional AQI sensors and real-time public dashboards',
      projected_risk: 0.70,
      improvement_pct: 10.3,
      efficiency_score: 0.55,
      cost: 'MEDIUM',
    },
  ],
};

export const mockZones = {
  zones: [
    {
      zone_id: 'Z1',
      name: 'Downtown Core',
      alert_level: 'CRITICAL',
      risk_score: 0.92,
      evacuation_priority: true,
      primary_threat: 'AIR_QUALITY',
      population: 45000,
    },
    {
      zone_id: 'Z2',
      name: 'Industrial District',
      alert_level: 'WARNING',
      risk_score: 0.85,
      evacuation_priority: true,
      primary_threat: 'EMISSIONS',
      population: 23000,
    },
    {
      zone_id: 'Z3',
      name: 'Residential East',
      alert_level: 'WATCH',
      risk_score: 0.68,
      evacuation_priority: false,
      primary_threat: 'WATER_STRESS',
      population: 67000,
    },
    {
      zone_id: 'Z4',
      name: 'Suburbs North',
      alert_level: 'SAFE',
      risk_score: 0.35,
      evacuation_priority: false,
      primary_threat: 'NONE',
      population: 52000,
    },
    {
      zone_id: 'Z5',
      name: 'Riverside Area',
      alert_level: 'WARNING',
      risk_score: 0.78,
      evacuation_priority: false,
      primary_threat: 'WATER_QUALITY',
      population: 38000,
    },
    {
      zone_id: 'Z6',
      name: 'Tech Park West',
      alert_level: 'WATCH',
      risk_score: 0.55,
      evacuation_priority: false,
      primary_threat: 'TRAFFIC',
      population: 29000,
    },
  ],
};

export const mockHistory = {
  labels: ['Feb 17', 'Feb 18', 'Feb 19', 'Feb 20', 'Feb 21', 'Feb 22', 'Feb 23'],
  aqi_trend: [145, 152, 158, 165, 170, 175, 178],
  water_quality_trend: [0.55, 0.58, 0.62, 0.66, 0.68, 0.70, 0.72],
  traffic_trend: [0.45, 0.48, 0.52, 0.58, 0.61, 0.63, 0.65],
  industry_trend: [198, 205, 215, 225, 232, 238, 245],
  avg_aqi: 163.3,
  avg_water_quality: 0.64,
  trend: 'WORSENING',
};

// ─────────────────────────────────────────────────────────────────────────────
// API functions — with backend response transformation to frontend interfaces
// ─────────────────────────────────────────────────────────────────────────────

export const getStatus = async () => {
  try {
    const response = await api.get('/status');
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

    // Transform backend response → frontend interface
    return {
      risk_score: d.risk_score,
      crisis_level: d.crisis_level,
      confidence_interval: d.confidence_interval,
      time_to_impact: d.time_to_impact,
      triggered_systems: d.triggered_systems || [],
      cascade_effects: {
        // cascade aqi_risk is already 0-1 normalized; use it as display value too
        aqi_impact: d.cascade_effects?.aqi_risk != null
          ? Math.round(d.cascade_effects.aqi_risk * d.latest_data?.aqi)  // scale to AQI-like value
          : (d.cascade_effects?.aqi_impact ?? d.latest_data?.aqi ?? 0),
        water_stress: d.cascade_effects?.water_risk ?? d.cascade_effects?.water_stress ?? 0,
        health_risk: d.cascade_effects?.health_risk ?? 0,
        traffic_disruption: d.cascade_effects?.traffic_risk ?? d.cascade_effects?.traffic_disruption ?? 0,
      },
      latest_data: {
        aqi: d.latest_data?.aqi ?? 0,
        // backend traffic is 0-100, frontend expects 0-1 ratio
        traffic_index: ((d.latest_data?.traffic ?? d.latest_data?.traffic_index ?? 0) / 100),
        // backend water_quality is 0-100, frontend expects 0-1
        water_quality: ((d.latest_data?.water_quality ?? 0) / 100),
        // backend industry_emission is 0-100 index, scale to kg/h equivalent (×3 for realistic display)
        industrial_emissions: Math.round((d.latest_data?.industry_emission ?? d.latest_data?.industrial_emissions ?? 0) * 3),
      },
    };
  } catch (error) {
    console.warn('Backend offline or error, using mock status:', error);
    return mockStatus;
  }
};

export const getForecast = async (days: number = 7) => {
  try {
    const response = await api.get('/forecast', { params: { days } });
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

    // Backend water_stress_forecast is on 0-100 scale (same as water_quality).
    // Forecast.tsx multiplies by 100 for display → normalize to 0-1 here.
    const normWater = (v: number) => (v > 1 ? v / 100 : v);

    return {
      mode: d.mode,
      labels: d.labels,
      aqi_forecast: d.aqi_forecast,
      water_stress_forecast: (d.water_stress_forecast || []).map(normWater),
      confidence_bands: {
        aqi: d.confidence_bands?.aqi ?? { lower: [], upper: [] },
        water: {
          lower: (d.confidence_bands?.water?.lower || []).map(normWater),
          upper: (d.confidence_bands?.water?.upper || []).map(normWater),
        },
      },
      crisis_probability: d.crisis_probability,
      crisis_status: d.crisis_status,
      time_to_impact_days: d.time_to_impact_days,
      affected_zones: d.affected_zones,
      recommended_policies: d.recommended_policies,
    };
  } catch (error) {
    console.warn('Backend offline or error, using mock forecast:', error);
    return mockForecast;
  }
};

export const getScenarioForecast = async (params: { scenario_traffic_delta: number; scenario_industry_delta: number; days_ahead?: number; }) => {
  try {
    const response = await api.post('/forecast/scenario', params);
    const d = response.data;
    if (!d || d.success === false) throw new Error('ML API error');
    return d;
  } catch (error) {
    console.warn('Backend ML online prediction failed, returning mock delta:', error);
    // Return a mock shifted forecast representing the delta
    const mockShift = (params.scenario_traffic_delta * 0.4 + params.scenario_industry_delta * 0.3) * 100;
    return {
      mode: 'mock_scenario',
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
      aqi_forecast: mockForecast.aqi_forecast.map(v => Math.max(0, v + mockShift)),
      water_stress_forecast: mockForecast.water_stress_forecast.map(v => Math.max(0, v + (mockShift / 1000))),
      scenario_applied: true
    };
  }
};

export const getRecommendations = async (cityId?: string) => {
  try {
    const response = await api.get('/recommendations', { params: { cityId } });
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

    // Backend returns `recommendations[].name`, frontend expects `strategies[].label`
    const strategies = (d.recommendations || []).map((r: any) => ({
      label: r.name ?? r.label ?? 'Unknown Strategy',
      description: r.description ?? '',
      projected_risk: r.projected_risk ?? 0,
      improvement_pct: r.risk_reduction != null
        ? parseFloat((r.risk_reduction * 100).toFixed(1))
        : (r.improvement_pct ?? 0),
      efficiency_score: r.efficiency_score ?? 0,
      cost: r.cost_proxy ?? r.cost ?? 'MEDIUM',
    }));

    return {
      baseline_risk: d.baseline_risk,
      strategies,
    };
  } catch (error) {
    console.warn('Backend offline or error, using mock recommendations:', error);
    return mockRecommendations;
  }
};

export const getZones = async () => {
  try {
    const response = await api.get('/zones');
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

    // Transform backend zones[] to match frontend interface (zone_id, population, alert_level)
    const zones = (d.zones || []).map((z: any) => ({
      zone_id: z.id ?? z.zone_id,
      name: z.name,
      alert_level: z.alert_level,
      risk_score: z.risk_score,
      evacuation_priority: z.evacuation_priority ?? false,
      primary_threat: z.primary_threat ?? z.primary_threats?.[0] ?? 'UNKNOWN',
      population: z.population ?? null,
      pop_density_norm: z.pop_density_norm,
      hospital_cap_inv: z.hospital_cap_inv,
      historical_crises: z.historical_crises,
      infrastructure_stress: z.infrastructure_stress,
      socioeconomic_sensitivity: z.socioeconomic_sensitivity,
      vulnerability_score: z.vulnerability_score,
      vulnerability_label: z.vulnerability_label,
    }));

    return { zones };
  } catch (error) {
    console.warn('Backend offline or error, using mock zones:', error);
    return mockZones;
  }
};

export const getZoneDetail = async (zoneId: string) => {
  try {
    const response = await api.get(`/zones/${zoneId}`);
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

    // Backend: { zone, forecast: [{date, risk_score, ...}] }
    // Frontend: { zone_id, forecast_7day: number[], labels: string[] }
    const forecast = d.forecast || [];
    return {
      zone_id: zoneId,
      forecast_7day: forecast.map((f: any) => f.risk_score ?? f.risk ?? 0),
      labels: forecast.map((_: any, i: number) => `Day ${i + 1}`),
    };
  } catch (error) {
    console.warn('Backend offline for zone detail, using mock:', zoneId);
    return {
      zone_id: zoneId,
      forecast_7day: [0.65, 0.68, 0.72, 0.75, 0.73, 0.70, 0.68],
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    };
  }
};

export const getHistory = async (cityId?: string) => {
  try {
    const response = await api.get('/history', { params: { cityId } });
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

    // Backend: { chart_data: { labels, aqi, water_quality, traffic, industry_emission }, summary, trend_direction }
    // Frontend: { labels, aqi_trend, water_quality_trend, traffic_trend, industry_trend, avg_aqi, avg_water_quality, trend }
    // Note: backend water_quality and traffic are 0-100 scale; frontend multiplies by 100 for % display → divide by 100 here
    const c = d.chart_data || {};
    return {
      labels: c.labels ?? [],
      aqi_trend: c.aqi ?? [],
      water_quality_trend: (c.water_quality ?? []).map((v: number) => v / 100),
      traffic_trend: (c.traffic ?? []).map((v: number) => v / 100),
      industry_trend: c.industry_emission ?? [],
      avg_aqi: d.summary?.avg_aqi ?? 0,
      avg_water_quality: (d.summary?.avg_water_quality ?? 0) / 100,
      trend: d.trend_direction ?? 'STABLE',
    };
  } catch (error) {
    console.warn('Backend offline or error, using mock history:', error);
    return mockHistory;
  }
};

export const simulate = async (params: {
  trafficReduction: number;
  industrialCut: number;
  heatwaveLevel: number;
  waterConservation: number;
  greenSpaceExpansion: number;
}) => {
  try {
    const response = await api.post('/simulate', params);
    const d = response.data;
    if (!d || d.success === false) throw new Error('Simulation failed');

    const transform = (node: any) => ({
      ...node,
      cascade_effects: {
        aqi_impact: node.cascade_effects?.aqi_risk != null
          ? Math.round(node.cascade_effects.aqi_risk * (d.adjusted_data?.aqi || 178))
          : (node.cascade_effects?.aqi_impact ?? 0),
        water_stress: node.cascade_effects?.water_risk ?? node.cascade_effects?.water_stress ?? 0,
        health_risk: node.cascade_effects?.health_risk ?? 0,
        traffic_disruption: node.cascade_effects?.traffic_risk ?? node.cascade_effects?.traffic_disruption ?? 0,
      }
    });

    return {
      ...d,
      baseline: transform(d.baseline),
      result: transform(d.result),
    };
  } catch (error) {
    console.warn('Backend offline, using mock data:', error);
    const baselineRisk = 0.78;
    const reduction = (params.trafficReduction * 0.003 + params.industrialCut * 0.004) - (params.heatwaveLevel * 0.05);
    const newRisk = Math.max(0.2, Math.min(1.0, baselineRisk - reduction));
    return {
      baseline: {
        risk_score: baselineRisk,
        crisis_level: 'HIGH',
        triggered_systems: ['HEALTH', 'WATER', 'AIR_QUALITY'],
        time_to_impact: 1,
        cascade_effects: { aqi_impact: 178, water_stress: 0.72, health_risk: 0.85, traffic_disruption: 0.65 }
      },
      result: {
        risk_score: newRisk,
        crisis_level: newRisk > 0.7 ? 'HIGH' : newRisk > 0.5 ? 'MODERATE' : 'LOW',
        triggered_systems: newRisk > 0.7 ? ['HEALTH', 'AIR_QUALITY'] : newRisk > 0.5 ? ['AIR_QUALITY'] : [],
        time_to_impact: Math.round(14 * (1 - newRisk)),
        cascade_effects: {
          aqi_impact: Math.round(178 * (1 - reduction)),
          water_stress: Math.max(0.1, 0.72 - (params.waterConservation * 0.004)),
          health_risk: Math.max(0.1, 0.85 - reduction),
          traffic_disruption: Math.max(0.1, 0.65 - (params.trafficReduction * 0.006))
        }
      },
      delta: {
        risk_reduction: baselineRisk - newRisk,
        percentage_improvement: ((baselineRisk - newRisk) / baselineRisk * 100).toFixed(1),
      },
      adjusted_data: { aqi: 178 * (1 - reduction) }
    };
  }
};

export const compareScenarios = async (scenarios: any[]) => {
  try {
    const response = await api.post('/simulate/compare', { scenarios });
    return response.data;
  } catch (error) {
    console.warn('Backend offline, using mock data:', error);
    return {
      comparison: scenarios.map((scenario) => {
        const reduction = (scenario.trafficReduction * 0.003 + scenario.industrialCut * 0.004) - (scenario.heatwaveLevel * 0.05);
        const newRisk = Math.max(0.2, Math.min(1.0, 0.78 - reduction));
        return {
          label: scenario.label,
          risk_score: newRisk,
          percentage_improvement: ((0.78 - newRisk) / 0.78 * 100).toFixed(1),
          crisis_level: newRisk > 0.7 ? 'HIGH' : newRisk > 0.5 ? 'MODERATE' : 'LOW',
        };
      }).sort((a, b) => parseFloat(b.percentage_improvement) - parseFloat(a.percentage_improvement)),
    };
  }
};

// ── Deforestation API (goal15 data + India state deforestation) ───────────────

export const getDeforestationNational = async () => {
  try {
    const response = await api.get('/deforestation/national');
    return response.data;
  } catch {
    // Fallback: hardcoded from goal15_forest_shares.csv IND row
    return {
      source: 'fallback_goal15',
      years: [2001, 2005, 2009, 2013, 2017, 2021, 2023],
      total_forest_cover: [678333, 690899, 697898, 701673, 708273, 713789, 713789],
      total_tree_loss: [42000, 48500, 52300, 58100, 62800, 65400, 68420],
      total_reforestation: [35000, 38200, 42100, 45800, 48900, 51200, 52300],
      total_net_change: [-7000, -10300, -10200, -12300, -13900, -14200, -16120],
      avg_deforestation_rate: [0.12, 0.15, 0.16, 0.18, 0.19, 0.19, 0.198],
      // Goal 15 metadata
      goal15_forest_cover_2000_pct: 22.7,
      goal15_forest_cover_2020_pct: 24.3,
      goal15_trend_pct: 7.0,
    };
  }
};

export const getDeforestationRisk = async (year?: number) => {
  try {
    const params = year ? { year } : {};
    const response = await api.get('/deforestation/risk', { params });
    return response.data;
  } catch {
    return {
      source: 'fallback',
      scores: [
        { state: 'Jharkhand', risk_score: 78.2, risk_level: 'Critical', deforestation_rate_pct: 0.45, forest_cover_pct: 29.6, confidence: [75, 82] },
        { state: 'Assam', risk_score: 71.5, risk_level: 'Critical', deforestation_rate_pct: 0.38, forest_cover_pct: 34.2, confidence: [68, 74] },
        { state: 'Madhya Pradesh', risk_score: 62.4, risk_level: 'High', deforestation_rate_pct: 0.28, forest_cover_pct: 25.1, confidence: [59, 65] },
        { state: 'Maharashtra', risk_score: 55.8, risk_level: 'High', deforestation_rate_pct: 0.22, forest_cover_pct: 16.5, confidence: [52, 59] },
        { state: 'Karnataka', risk_score: 48.3, risk_level: 'Moderate', deforestation_rate_pct: 0.18, forest_cover_pct: 20.1, confidence: [45, 51] },
        { state: 'Odisha', risk_score: 44.1, risk_level: 'Moderate', deforestation_rate_pct: 0.15, forest_cover_pct: 33.2, confidence: [41, 47] },
        { state: 'Rajasthan', risk_score: 38.7, risk_level: 'Moderate', deforestation_rate_pct: 0.12, forest_cover_pct: 4.9, confidence: [35, 42] },
        { state: 'Kerala', risk_score: 25.2, risk_level: 'Low', deforestation_rate_pct: 0.06, forest_cover_pct: 54.4, confidence: [22, 28] },
      ],
    };
  }
};

export const getDeforestationOverview = async () => {
  try {
    const response = await api.get('/deforestation/overview');
    return response.data;
  } catch {
    return {
      year_range: [2001, 2023],
      total_states: 28,
      goal15_india_trend_pct: 7.0,
      goal15_world_trend_pct: -2.2,
      latest_year_summary: {
        year: 2023,
        total_forest_cover_sq_km: 713789,
        avg_forest_cover_pct: 21.7,
        avg_deforestation_rate_pct: 0.198,
      },
    };
  }
};

export default api;
