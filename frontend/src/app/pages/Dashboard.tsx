import { useEffect, useState } from 'react';
import { getStatus, getHistoryRaw } from '../api';
import { WS_URL } from '../config';
import { Activity } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PageHeader } from '../components/PageHeader';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { useCity } from '../context/CityContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

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
  latest_data: {
    aqi: number;
    traffic_index: number;
    water_quality: number;
    industrial_emissions: number;
  };
}

interface HistoryChartPoint {
  label: string;
  aqi: number;
  risk_pct: number;
  water_quality: number;
  traffic: number;
}

export function Dashboard() {
  const { city } = useCity();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryChartPoint[]>([]);
  const [trendDirection, setTrendDirection] = useState<string>('STABLE');

  const loadStatus = async () => {
    try {
      const data = await getStatus(city.id);
      const rawRisk = data.risk_score || 0;
      const scaledRisk = Math.min(rawRisk, 1);

      const scaledCascade = {
        aqi_impact: Math.max(0, Math.round(city.baseAqi + ((data.cascade_effects?.aqi_impact || 98) - 98))),
        water_stress: Math.min(data.cascade_effects?.water_stress || 0, 1),
        health_risk: Math.min(data.cascade_effects?.health_risk || 0, 1),
        traffic_disruption: Math.min(data.cascade_effects?.traffic_disruption || 0, 1),
      };
      
      const CRISIS_THRESHOLD = 0.60;
      const scaledAqiRisk = Math.min(scaledCascade.aqi_impact / 500, 1);
      const triggered_systems: string[] = [];
      if (scaledAqiRisk >= CRISIS_THRESHOLD) triggered_systems.push('AIR_QUALITY');
      if (scaledCascade.water_stress >= CRISIS_THRESHOLD) triggered_systems.push('WATER_SUPPLY');
      if (scaledCascade.health_risk >= CRISIS_THRESHOLD) triggered_systems.push('PUBLIC_HEALTH');
      if (scaledCascade.traffic_disruption >= CRISIS_THRESHOLD) triggered_systems.push('TRAFFIC_NETWORK');

      const scaledData = {
        ...data,
        risk_score: scaledRisk,
        cascade_effects: scaledCascade,
        triggered_systems,
        latest_data: {
          ...data.latest_data,
          aqi: Math.max(0, Math.round(city.baseAqi + ((data.latest_data?.aqi || 98) - 98))),
        }
      };

      
      if (scaledRisk >= 0.8) scaledData.crisis_level = 'CRITICAL';
      else if (scaledRisk >= 0.6) scaledData.crisis_level = 'HIGH';
      else if (scaledRisk >= 0.4) scaledData.crisis_level = 'MODERATE';
      else scaledData.crisis_level = 'LOW';

      setStatus(scaledData);
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getHistoryRaw(city.id);
      if (data?.chart_data) {
        const { labels, aqi, risk_scores, water_quality, traffic } = data.chart_data as {
          labels: string[];
          aqi: number[];
          risk_scores: number[];
          water_quality: number[];
          traffic: number[];
        };
        const points: HistoryChartPoint[] = labels.map((label: string, i: number) => ({
          label,
          aqi: Math.max(0, aqi[i] ?? 0),
          risk_pct: Math.max(0, parseFloat(((risk_scores[i] ?? 0) * 100).toFixed(1))),
          water_quality: Math.max(0, parseFloat((water_quality[i] ?? 0).toFixed(1))),
          traffic: Math.max(0, parseFloat((traffic[i] ?? 0).toFixed(1))),
        }));
        setHistoryData(points);
        setTrendDirection((data.trend_direction as string) ?? 'STABLE');
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  useEffect(() => {
    loadStatus();
    loadHistory();

    
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
            
            if (data.cityId === city.id) {
              setStatus((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  risk_score: data.risk_score,
                  latest_data: {
                    ...prev.latest_data,
                    aqi: data.data?.aqi || prev.latest_data.aqi,
                    traffic_index: (data.data?.traffic ?? 0) / 100 || prev.latest_data.traffic_index,
                    water_quality: (data.data?.water_quality ?? 0) / 100 || prev.latest_data.water_quality,
                    industrial_emissions: Math.round((data.data?.industry_emission ?? 0) * 3) || prev.latest_data.industrial_emissions,
                  }
                };
              });
            }
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

    
    const interval = setInterval(loadStatus, 30000);

    return () => {
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [city.id]);

  const getLevel = (score: number) => {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MODERATE';
    return 'LOW';
  };

  if (!status) {
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
      <div className={`space-y-6 transition-opacity duration-500 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {}
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
          </div>
        </div>

        {}
        <Card className="bg-card border-border p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-card-foreground">Overall Risk Score</h3>
              <span className={`text-3xl font-bold ${getCrisisTextColor(status?.crisis_level || 'UNKNOWN')}`}>
                {((status?.risk_score ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={status.risk_score * 100} className="h-4" />
          </div>
        </Card>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Air Quality</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{(status?.latest_data?.aqi ?? 0).toFixed(1)}</p>
                <p className={`text-xs mt-1 font-semibold ${getCrisisTextColor(
                  status?.latest_data?.aqi >= 200 ? 'CRITICAL' :
                    status?.latest_data?.aqi >= 101 ? 'HIGH' :
                      status?.latest_data?.aqi >= 51 ? 'MODERATE' : 'LOW'
                )}`}>
                  {status?.latest_data?.aqi >= 200 ? 'CRITICAL' :
                    status?.latest_data?.aqi >= 101 ? 'HIGH' :
                      status?.latest_data?.aqi >= 51 ? 'MODERATE' : 'LOW'}
                </p>
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

            </div>
          </Card>
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Triggered Alert Systems
            </h3>
            <div className="flex flex-wrap gap-3">
              {(status?.triggered_systems && status.triggered_systems.length > 0) ? (
                status.triggered_systems.map((system) => (
                  <Badge key={system} className="bg-destructive/10 text-destructive border-destructive/20 shadow-sm px-3 py-1 font-medium hover:bg-destructive/20">
                    {system.replace(/_/g, ' ')}
                  </Badge>
                ))
              ) : (
                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-md border border-emerald-500/20 w-full">
                  <span className="text-sm font-medium">All systems nominal. No active alerts.</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              Latest Sensor Readings
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AQI</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{(status?.latest_data?.aqi ?? 0).toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Traffic Density</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{((status?.latest_data?.traffic_index ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Water Contamination</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{((status?.latest_data?.water_quality ?? 0) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industrial Emissions</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{(status?.latest_data?.industrial_emissions ?? 0)} <span className="text-sm font-normal text-muted-foreground lowercase">kg/h</span></p>
              </div>
            </div>
          </Card>
        </div>

        {}
        <Card className="bg-card border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              7-Day Urban Crisis Trend
            </h3>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trendDirection === 'WORSENING'
                ? 'bg-destructive/10 text-destructive'
                : trendDirection === 'IMPROVING'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-muted text-muted-foreground'
                }`}>
                {trendDirection}
              </span>
            </div>
          </div>

          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--card-foreground))', fontWeight: 600 }}
                  formatter={(value: number) => [value.toFixed(1), '']}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                <ReferenceLine yAxisId="right" y={60} stroke="hsl(var(--destructive))" strokeDasharray="4 2" label={{ value: 'Crisis 60%', fontSize: 10, fill: 'hsl(var(--destructive))' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="aqi"
                  name="AQI"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f97316' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="risk_pct"
                  name="Risk Score %"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="water_quality"
                  name="Water Quality"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  strokeDasharray="5 3"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="traffic"
                  name="Traffic Density"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#a855f7' }}
                  strokeDasharray="5 3"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              Loading historical data...
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
