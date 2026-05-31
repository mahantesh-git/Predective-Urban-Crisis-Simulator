import axios from 'axios';
import { API_BASE } from './config';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


const getMockLabels = (days: number, startOffset = 0) => {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + startOffset);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  });
};

const getMockForecastLabels = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return `Day ${i + 1} (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  });
};

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
  labels: getMockForecastLabels(),
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
  explainable_ai: {
    model_confidence_pct: 88.5,
    shap_contributions: {
      aqi: [
        { feature: 'Traffic Density', impact: 18.4 },
        { feature: 'Industrial Emissions', impact: 15.2 },
        { feature: 'Wind Speed', impact: -12.3 }
      ],
      water_stress: [
        { feature: 'Industrial Effluent', impact: 24.1 },
        { feature: 'Recent Rainfall', impact: -15.8 },
        { feature: 'Water Treatment', impact: -8.3 }
      ]
    }
  },
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
  labels: getMockLabels(7, -6), // Last 7 days including today
  aqi_trend: [145, 152, 158, 165, 170, 175, 178],
  water_quality_trend: [0.55, 0.58, 0.62, 0.66, 0.68, 0.70, 0.72],
  traffic_trend: [0.45, 0.48, 0.52, 0.58, 0.61, 0.63, 0.65],
  industry_trend: [198, 205, 215, 225, 232, 238, 245],
  avg_aqi: 163.3,
  avg_water_quality: 0.64,
  trend: 'WORSENING',
};


export const getStatus = async (cityId?: string) => {
  try {
    const response = await api.get('/status', { params: { cityId } });
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

    // Transform backend response → frontend interface
    return {
      risk_score: d.risk_score,
      crisis_level: d.crisis_level,
      triggered_systems: d.triggered_systems || [],
      cascade_effects: {
        aqi_impact: d.cascade_effects?.aqi_risk != null
          ? Math.round(d.cascade_effects.aqi_risk * d.latest_data?.aqi)
          : (d.cascade_effects?.aqi_impact ?? d.latest_data?.aqi ?? 0),
        water_stress: d.cascade_effects?.water_risk ?? d.cascade_effects?.water_stress ?? 0,
        health_risk: d.cascade_effects?.health_risk ?? 0,
        traffic_disruption: d.cascade_effects?.traffic_risk ?? d.cascade_effects?.traffic_disruption ?? 0,
      },
      latest_data: {
        aqi: d.latest_data?.aqi ?? 0,
        traffic_index: ((d.latest_data?.traffic ?? d.latest_data?.traffic_index ?? 0) / 100),
        water_quality: ((d.latest_data?.water_quality ?? 0) / 100),
        industrial_emissions: Math.round((d.latest_data?.industry_emission ?? d.latest_data?.industrial_emissions ?? 0) * 3),
      },
    };
  } catch (error) {
    console.warn('Backend offline or error, using mock status:', error);
    return mockStatus;
  }
};

export const getForecast = async (days: number = 7, cityId?: string) => {
  try {
    const response = await api.get('/forecast', { params: { days, cityId } });
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
      explainable_ai: d.explainable_ai,
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
      ...d,
      strategies,
    };
  } catch (error) {
    console.warn('Backend offline or error, using mock recommendations:', error);
    return {
      ...mockRecommendations,
      crisis_level: 'HIGH',
      triggered_systems: ['HEALTH', 'WATER', 'AIR_QUALITY'],
    };
  }
};

export const getZones = async (cityId?: string) => {
  try {
    const response = await api.get('/zones', { params: { cityId } });
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');
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

export const getZoneDetail = async (zoneId: string, cityId?: string) => {
  try {
    const response = await api.get(`/zones/${zoneId}`, { params: { cityId } });
    const d = response.data;
    if (!d || d.success === false || d.error) throw new Error('Backend error');

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
  cityId?: string;
}) => {
  try {
    const response = await api.post('/simulate', params);
    const d = response.data;
    if (!d || d.success === false) throw new Error('Simulation failed');

    const transform = (node: any) => ({
      ...node,
      cascade_effects: {
        aqi_impact: node.cascade_effects?.aqi_risk != null
          ? Math.max(0, Math.round(node.cascade_effects.aqi_risk * (d.adjusted_data?.aqi || 178)))
          : Math.max(0, (node.cascade_effects?.aqi_impact ?? 0)),
        water_stress: Math.max(0, node.cascade_effects?.water_risk ?? node.cascade_effects?.water_stress ?? 0),
        health_risk: Math.max(0, node.cascade_effects?.health_risk ?? 0),
        traffic_disruption: Math.max(0, node.cascade_effects?.traffic_risk ?? node.cascade_effects?.traffic_disruption ?? 0),
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
          aqi_impact: Math.max(0, Math.round(178 * (1 - reduction))),
          water_stress: Math.max(0, 0.72 - (params.waterConservation * 0.004)),
          health_risk: Math.max(0, 0.85 - reduction),
          traffic_disruption: Math.max(0, 0.65 - (params.trafficReduction * 0.006))
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

export const compareScenarios = async (scenarios: any[], cityId?: string) => {
  try {
    const response = await api.post('/simulate/compare', { scenarios, cityId });
    return response.data;
  } catch (error) {
    console.warn('Backend offline', error);
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



export const getHistoryRaw = async (cityId: string, days = 7) => {
  try {
    const response = await api.get('/history', { params: { cityId, days } });
    return response.data;
  } catch (error) {
    console.warn('History fetch failed, using mock data:', error);
    // Generate simple mock history for the last 7 days
    const labels: string[] = [];
    const aqi: number[] = [];
    const risk_scores: number[] = [];
    const water_quality: number[] = [];
    const traffic: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      aqi.push(120 + Math.round(Math.random() * 80));
      risk_scores.push(parseFloat((0.45 + Math.random() * 0.35).toFixed(3)));
      water_quality.push(parseFloat((55 + Math.random() * 30).toFixed(1)));
      traffic.push(parseFloat((35 + Math.random() * 40).toFixed(1)));
    }
    return {
      success: true,
      days: 7,
      trend_direction: 'STABLE',
      chart_data: { labels, aqi, risk_scores, water_quality, traffic },
      summary: { avg_aqi: 160, avg_risk: 0.62, peak_risk_day: labels[3] },
    };
  }
};

export default api;

