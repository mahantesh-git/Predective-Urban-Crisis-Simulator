import { useEffect, useState } from 'react';
import { getStatus, getDeforestationRisk } from '../api';
import { WS_URL } from '../config';
import { AlertTriangle, Droplets, Heart, Car, Clock, TrendingUp, Activity, TreePine } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PageHeader } from '../components/PageHeader';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { useCity } from '../context/CityContext';

interface StatusData {
  risk_score: number;
  crisis_level: string;
  cascade_effects: {
    aqi_impact: number;
    water_stress: number;
    health_risk: number;
    traffic_disruption: number;
  };
  triggered_systems: string[];
  time_to_impact: number;
  confidence_interval: { lower: number; upper: number };
  latest_data: {
    aqi: number;
    traffic_index: number;
    water_quality: number;
    industrial_emissions: number;
  };
}

export function Dashboard() {
  const { city } = useCity();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [forestRisk, setForestRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Map city to state to fetch right risk
  const CITY_STATE: Record<string, string> = {
    bengaluru: 'Karnataka',
    'new-delhi': 'Delhi',
    mumbai: 'Maharashtra',
    chennai: 'Tamil Nadu',
    hyderabad: 'Telangana',
    kolkata: 'West Bengal',
    pune: 'Maharashtra',
    ahmedabad: 'Gujarat',
    jaipur: 'Rajasthan',
    lucknow: 'Uttar Pradesh',
  };

  useEffect(() => {
    loadStatus();

    // WebSocket connection for real-time updates
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'RISK_UPDATE') {
            setStatus((prev) => prev ? { ...prev, risk_score: data.risk_score } : prev);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.warn('WebSocket not available:', error);
    }

    // Polling fallback
    const interval = setInterval(loadStatus, 30000);

    return () => {
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [city.id]);

  const loadStatus = async () => {
    try {
      const [data, deforData] = await Promise.all([
        getStatus(),
        getDeforestationRisk(),
      ]);

      const stateName = CITY_STATE[city.id] || 'Maharashtra';
      const stateRisk = deforData.scores?.find((s: any) => s.state === stateName) || deforData.scores?.[0];
      setForestRisk(stateRisk);

      // Apply city-specific risk multipliers
      const m = city.riskMultiplier;

      const rawLower = data.confidence_interval?.lower || 0;
      const rawUpper = data.confidence_interval?.upper || 0;
      const rawRisk = data.risk_score || 0;

      const scaledRisk = Math.min(rawRisk * m, 1);
      const lowerOffset = rawRisk - rawLower;
      const upperOffset = rawUpper - rawRisk;

      const scaledData = {
        ...data,
        risk_score: scaledRisk,
        confidence_interval: {
          lower: Math.max(scaledRisk - lowerOffset * m, 0),
          upper: Math.min(scaledRisk + upperOffset * m, 1),
        },
        cascade_effects: {
          aqi_impact: Math.round(city.baseAqi + ((data.cascade_effects?.aqi_impact || 98) - 98) * m),
          water_stress: Math.min((data.cascade_effects?.water_stress || 0) * m, 1),
          health_risk: Math.min((data.cascade_effects?.health_risk || 0) * m, 1),
          traffic_disruption: Math.min((data.cascade_effects?.traffic_disruption || 0) * m, 1),
        },
        latest_data: {
          ...data.latest_data,
          aqi: Math.round(city.baseAqi + ((data.latest_data?.aqi || 98) - 98) * m),
        }
      };

      // Recompute crisis level
      const getLevel = (score: number) => {
        if (score >= 0.8) return 'CRITICAL';
        if (score >= 0.6) return 'HIGH';
        if (score >= 0.4) return 'MODERATE';
        return 'LOW';
      };

      scaledData.crisis_level = getLevel(scaledData.risk_score);

      setStatus(scaledData);
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevel = (score: number) => {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MODERATE';
    return 'LOW';
  };

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const getCrisisColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MODERATE':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getCrisisTextColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-500';
      case 'HIGH':
        return 'text-orange-500';
      case 'MODERATE':
        return 'text-yellow-500';
      case 'LOW':
        return 'text-green-500';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Standardized Header */}
        <div className="flex items-start justify-between">
          <PageHeader
            title={`${city.name} City Overview`}
            subtitle={`Real-time crisis monitoring · ${city.state}, ${city.country}`}
            icon={Activity}
          />
          <div className="flex flex-col items-end gap-3 pt-2">
            <Badge variant="outline" className={`${getCrisisColor(status?.crisis_level || 'UNKNOWN')} border-0 text-white px-4 py-2 text-lg font-bold shadow-sm`}>
              {status?.crisis_level || 'UNKNOWN'}
            </Badge>
            {wsConnected && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                WebSocket Active
              </div>
            )}
          </div>
        </div>

        {/* Risk Score Gauge */}
        <Card className="bg-card border-border p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-card-foreground">Overall Risk Score</h3>
              <span className={`text-3xl font-bold ${getCrisisTextColor(status?.crisis_level || 'UNKNOWN')}`}>
                {((status?.risk_score ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={status.risk_score * 100} className="h-4" />
            <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
              <span>Confidence: {((status?.confidence_interval?.lower ?? 0) * 100).toFixed(0)}% - {((status?.confidence_interval?.upper ?? 0) * 100).toFixed(0)}%</span>
              <div className="flex items-center gap-2">

              </div>
            </div>
          </div>
        </Card>

        {/* Cascade Effects Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Air Quality</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{status?.cascade_effects?.aqi_impact ?? 'N/A'}</p>
                <p className={`text-xs mt-1 font-semibold ${getCrisisTextColor(getLevel(status?.cascade_effects?.aqi_impact / 500))}`}>
                  {getLevel(status?.cascade_effects?.aqi_impact / 500)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Water Stress</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{((status?.cascade_effects?.water_stress ?? 0) * 100).toFixed(0)}%</p>
                <p className={`text-xs mt-1 font-semibold ${getCrisisTextColor(getLevel(status.cascade_effects.water_stress))}`}>
                  {getLevel(status.cascade_effects.water_stress)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Droplets className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Health Risk</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{((status?.cascade_effects?.health_risk ?? 0) * 100).toFixed(0)}%</p>
                <p className={`text-xs mt-1 font-semibold ${getCrisisTextColor(getLevel(status.cascade_effects.health_risk))}`}>
                  {getLevel(status.cascade_effects.health_risk)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Traffic Status</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{((status?.cascade_effects?.traffic_disruption ?? 0) * 100).toFixed(0)}%</p>
                <p className={`text-xs mt-1 font-semibold ${getCrisisTextColor(getLevel(status.cascade_effects.traffic_disruption))}`}>
                  {getLevel(status.cascade_effects.traffic_disruption)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Forest Risk</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{Math.round(forestRisk?.risk_score || 0)}/100</p>
                <p className={`text-xs mt-1 font-semibold ${getCrisisTextColor(getLevel((forestRisk?.risk_score || 0) / 100))}`}>
                  {forestRisk?.risk_level || getLevel((forestRisk?.risk_score || 0) / 100)}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <TreePine className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Triggered Systems & Latest Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Triggered Alert Systems
            </h3>
            <div className="flex flex-wrap gap-3">
              {(status?.triggered_systems || []).map((system) => (
                <Badge key={system} className="bg-red-50 text-destructive border-red-200 shadow-sm px-3 py-1 font-medium hover:bg-red-100">
                  {system.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#4B2E1E]" />
              Latest Sensor Readings
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AQI</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{status?.latest_data?.aqi ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Traffic Density</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{((status?.latest_data?.traffic_index ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Water Contamination</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{((status?.latest_data?.water_quality ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industrial Emissions</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{status?.latest_data?.industrial_emissions ?? 'N/A'} <span className="text-sm font-normal text-muted-foreground lowercase">kg/h</span></p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
