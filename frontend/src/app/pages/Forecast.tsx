import { useEffect, useState } from 'react';
import { getForecast, getStatus } from '../api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Cloud, CalendarDays } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PageHeader } from '../components/PageHeader';
import { useCity } from '../context/CityContext';
import { ShapleyBarChart } from '../components/xai/ShapleyBarChart';

interface ForecastData {
  mode: string;
  labels: string[];
  aqi_forecast: number[];
  water_stress_forecast: number[];
  confidence_bands: {
    aqi: { lower: number[]; upper: number[] };
    water: { lower: number[]; upper: number[] };
  };
  crisis_probability?: number;
  crisis_status?: string;
  time_to_impact_days?: string;
  affected_zones?: string[];
  recommended_policies?: string[];
  explainable_ai?: {
    model_confidence_pct: number;
    shap_contributions: {
      aqi: { feature: string; impact: number }[];
      water_stress: { feature: string; impact: number }[];
    };
  };
}

const RANGES = [
  { label: '7 Days', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
];

export function Forecast() {
  const { city } = useCity();
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);
  const [currentAqi, setCurrentAqi] = useState<number>(city.baseAqi);

  useEffect(() => {
    setLoading(true);
    loadForecast(selectedDays);
  }, [city.id, selectedDays]);

  const loadForecast = async (days: number) => {
    try {
      
      
      const [raw, statusData] = await Promise.all([
        getForecast(days, city.id),
        getStatus(city.id),
      ]);

      
      const liveAqi = Math.max(
        0,
        Math.round(city.baseAqi + ((statusData?.latest_data?.aqi || city.baseAqi) - city.baseAqi))
      );
      setCurrentAqi(liveAqi);

      
      
      
      const rawAqiForecast: number[] = raw.aqi_forecast || [];
      const prophetMean = rawAqiForecast.length > 0
        ? rawAqiForecast.reduce((a: number, b: number) => a + b, 0) / rawAqiForecast.length
        : city.baseAqi;

      
      const scaleAqi = (v: number) => Math.max(0, Math.round(liveAqi + (v - prophetMean)));
      const scaleWater = (v: number) => Math.max(0, Math.min(v, 1));

      const scaled: ForecastData = {
        ...raw,
        aqi_forecast: rawAqiForecast.map(scaleAqi),
        water_stress_forecast: (raw.water_stress_forecast || []).map(scaleWater),
        confidence_bands: {
          aqi: {
            lower: (raw.confidence_bands?.aqi?.lower || []).map(scaleAqi),
            upper: (raw.confidence_bands?.aqi?.upper || []).map(scaleAqi),
          },
          water: {
            lower: (raw.confidence_bands?.water?.lower || []).map(scaleWater),
            upper: (raw.confidence_bands?.water?.upper || []).map(scaleWater),
          },
        },
      };
      setForecast(scaled);
    } catch (error) {
      console.error('Failed to load forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  
  const thinLabels = (labels: string[], maxTicks = 12) => {
    if (labels.length <= maxTicks) return labels;
    const step = Math.ceil(labels.length / maxTicks);
    return labels.map((l, i) => (i % step === 0 ? l : ''));
  };

  const aqiData = forecast
    ? forecast.labels.map((label, i) => ({
      name: label,
      aqi: forecast.aqi_forecast[i],
      lower: forecast.confidence_bands.aqi.lower[i],
      upper: forecast.confidence_bands.aqi.upper[i],
    }))
    : [];

  const waterData = forecast
    ? forecast.labels.map((label, i) => ({
      name: label,
      water: forecast.water_stress_forecast[i] * 100,
      lower: forecast.confidence_bands.water.lower[i] * 100,
      upper: forecast.confidence_bands.water.upper[i] * 100,
    }))
    : [];

  const peakAqi = forecast ? Math.max(...forecast.aqi_forecast) : 0;
  const peakWater = forecast ? Math.max(...forecast.water_stress_forecast) : 0;
  const thinnedLabels = forecast ? thinLabels(forecast.labels) : [];

  return (
    <PageTransition>
      <div className={`space-y-6 transition-opacity duration-500 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <PageHeader
            title={`Forecast — ${city.name}`}
            subtitle={`ML-powered predictions for ${city.state} · ${city.tagline}`}
            icon={CalendarDays}
          />
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            {forecast && (
              <Badge
                variant="outline"
                className={`${forecast.mode === 'ml_service'
                  ? 'bg-blue-500/10 text-blue-700 border-blue-500'
                  : 'bg-card text-muted-foreground'}`}
              >
                {forecast.mode === 'ml_service' ? 'ML Service Active' : 'Mock Data'}
              </Badge>
            )}
          </div>
        </div>

        <Card className="bg-card border-border p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Forecast Range</span>
            <div className="flex gap-2 flex-wrap">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  onClick={() => setSelectedDays(r.days)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${selectedDays === r.days
                    ? 'bg-rust text-white border-rust shadow-sm'
                    : 'bg-muted text-muted-foreground border-border hover:border-rust/50 hover:text-card-foreground'
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rust"></div>
              <p className="text-sm text-muted-foreground">Loading {selectedDays}-day forecast…</p>
            </div>
          </div>
        )}

        {!loading && forecast && (
          <>
            {}
            <Card className="bg-card border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Cloud className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-card-foreground">Air Quality Index (AQI) Forecast</h3>
                <span className="ml-auto text-sm text-muted-foreground">Current AQI: {currentAqi}</span>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={aqiData}>
                  <defs>
                    <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => {
                      const idx = aqiData.findIndex(d => d.name === val);
                      return thinnedLabels[idx] || '';
                    }}
                    interval={0}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                    labelFormatter={(l) => l}
                  />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confidenceBand)" fillOpacity={1} />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#0f172a" fillOpacity={1} />
                  <Area type="monotone" dataKey="aqi" stroke="#ef4444" strokeWidth={2} fill="url(#colorAqi)" dot={selectedDays <= 14 ? { fill: '#ef4444', r: 3 } : false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span>Predicted AQI</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded-full"></div><span>Confidence Band</span></div>
              </div>

              {forecast.explainable_ai?.shap_contributions?.aqi && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <ShapleyBarChart
                    title="AQI"
                    contributions={forecast.explainable_ai.shap_contributions.aqi}
                    confidencePct={forecast.explainable_ai.model_confidence_pct}
                  />
                </div>
              )}
            </Card>

            {}
            <Card className="bg-card border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-rust" />
                <h3 className="text-lg font-semibold text-card-foreground">Water Stress Forecast</h3>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={waterData}>
                  <defs>
                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="confidenceBandWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => {
                      const idx = waterData.findIndex(d => d.name === val);
                      return thinnedLabels[idx] || '';
                    }}
                    interval={0}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                  />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confidenceBandWater)" fillOpacity={1} />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#0f172a" fillOpacity={1} />
                  <Area type="monotone" dataKey="water" stroke="#f97316" strokeWidth={2} fill="url(#colorWater)" dot={selectedDays <= 14 ? { fill: '#f97316', r: 3 } : false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rust rounded-full"></div><span>Predicted Water Stress</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded-full"></div><span>Confidence Band</span></div>
              </div>

              {}
              {forecast.explainable_ai?.shap_contributions?.water_stress && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <ShapleyBarChart
                    title="Water Contamination"
                    contributions={forecast.explainable_ai.shap_contributions.water_stress}
                  />
                </div>
              )}
            </Card>

            {}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card border-border p-4 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Peak AQI Expected</p>
                <p className="text-2xl font-bold text-red-500 mt-2">{peakAqi}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  {forecast.labels[forecast.aqi_forecast.indexOf(peakAqi)]}
                </p>
              </Card>

              <Card className="bg-card border-border p-4 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Peak Water Stress</p>
                <p className="text-2xl font-bold text-rust mt-2">{(peakWater * 100).toFixed(0)}%</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  {forecast.labels[forecast.water_stress_forecast.indexOf(peakWater)]}
                </p>
              </Card>

              <Card className="bg-card border-border p-4 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Forecast Window</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{selectedDays} days</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  {city.name}
                </p>
              </Card>
            </div>

            {}
            <div className="mt-8 mb-4 flex items-center gap-2">
              <h3 className="text-xl font-bold text-card-foreground">Crisis Intelligence</h3>
              <Badge variant="outline" className="bg-rust/10 text-rust border-rust ml-2">Smart City ML</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border border-red-500/30 p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">Crisis Probability</p>
                <p className="text-3xl font-black text-red-500">{((forecast.crisis_probability || 0) * 100).toFixed(0)}%</p>
                <p className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-1">
                  Status: <span className="text-card-foreground font-bold">{forecast.crisis_status || 'NOMINAL'}</span>
                </p>
              </Card>

              <Card className="bg-card border-border p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">Time-to-Impact</p>
                <p className="text-xl font-bold text-card-foreground mt-1">{forecast.time_to_impact_days || 'N/A'}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Estimated days until critical thresholds are breached based on current trajectory.</p>
              </Card>

              <Card className="bg-card border-border p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">Affected Zones</p>
                <div className="flex flex-wrap gap-2">
                  {(forecast.affected_zones || []).map((zone, i) => (
                    <Badge key={i} variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700">{zone}</Badge>
                  ))}
                  {(!forecast.affected_zones || forecast.affected_zones.length === 0) && (
                    <span className="text-sm text-muted-foreground">No critical zones identified.</span>
                  )}
                </div>
              </Card>

              <Card className="bg-card border-border p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">Policy Actions</p>
                <ul className="space-y-2">
                  {(forecast.recommended_policies || []).map((policy, i) => (
                    <li key={i} className="text-sm text-card-foreground font-medium flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span className="leading-snug">{policy}</span>
                    </li>
                  ))}
                  {(!forecast.recommended_policies || forecast.recommended_policies.length === 0) && (
                    <li className="text-sm text-muted-foreground">Maintain current environmental baselines.</li>
                  )}
                </ul>
              </Card>
            </div>

            {}
            <div className="mt-12 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-card-foreground">Zonal Risk Heatmap — Temporal Propagation</h3>
                <Badge variant="outline" className="text-xs bg-slate-800 text-slate-400 border-slate-700 uppercase">Affected Zone Forecast</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Intensity-based simulation of cascading risks across key urban zones over the {selectedDays}-day window.</p>

              <Card className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 p-7 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rust/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>

                <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-[900px]">
                    {}
                    <div className="flex mb-6 border-b border-slate-800/50 pb-2">
                      <div className="w-56 shrink-0 text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Urban Zones</div>
                      <div className="flex-1 flex justify-between px-4">
                        {thinnedLabels.map((l, i) => l && (
                          <span key={i} className="text-[10px] font-bold text-slate-400/80 uppercase tracking-tighter w-0 overflow-visible whitespace-nowrap text-center">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>

                    {}
                    <div className="space-y-3">
                      {['Industrial Zone North', 'Downtown Core', 'Residential Ring East', 'Waterfront District', 'Tech Park South'].map((zone, idx) => {
                        const aqiWeight = [0.85, 0.65, 0.35, 0.25, 0.45][idx];
                        const waterWeight = [0.15, 0.35, 0.65, 0.75, 0.55][idx];

                        return (
                          <div key={zone} className="flex items-center group">
                            <div className="w-56 shrink-0 flex items-center gap-3 pr-4">
                              <div className={`w-1.5 h-6 rounded-full ${['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-blue-500', 'bg-emerald-500'][idx]} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                              <span className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors truncate">
                                {zone}
                              </span>
                            </div>

                            <div className="flex-1 flex gap-1.5 h-10 px-2">
                              {forecast.aqi_forecast.map((aqi, dayIdx) => {
                                const water = forecast.water_stress_forecast[dayIdx] * 100;
                                const combinedRisk = (aqi / 320) * aqiWeight + (water / 85) * waterWeight;

                                let bgColor = 'bg-slate-800/40';
                                let borderColor = 'border-transparent';
                                let glow = '';

                                if (combinedRisk > 1.25) {
                                  bgColor = 'bg-red-600';
                                  borderColor = 'border-red-400/50';
                                  glow = 'shadow-[0_0_15px_rgba(220,38,38,0.5)]';
                                } else if (combinedRisk > 0.85) {
                                  bgColor = 'bg-orange-500';
                                  borderColor = 'border-orange-300/50';
                                } else if (combinedRisk > 0.55) {
                                  bgColor = 'bg-amber-400';
                                  borderColor = 'border-amber-200/50';
                                } else if (combinedRisk > 0.25) {
                                  bgColor = 'bg-emerald-500';
                                  borderColor = 'border-emerald-300/50';
                                } else {
                                  bgColor = 'bg-emerald-900/30';
                                }

                                return (
                                  <div
                                    key={dayIdx}
                                    className={`flex-1 min-w-[4px] rounded-[6px] border ${borderColor} transition-all duration-300 hover:scale-[1.3] hover:z-20 cursor-crosshair ${bgColor} ${glow} group/cell relative`}
                                  >
                                    <div className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 bg-white/10 rounded-[6px] transition-opacity"></div>
                                    <div className="opacity-0 group-hover/cell:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-950 border border-slate-800 text-[9px] font-black text-white rounded whitespace-nowrap z-30 pointer-events-none shadow-2xl">
                                      {(combinedRisk * 100).toFixed(0)}% INTENSITY
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {}
                <div className="mt-10 flex items-center justify-between border-t border-slate-800/60 pt-6">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Stratification Index</p>
                  <div className="flex items-center gap-6">
                    {[
                      { label: 'Nominal', color: 'bg-emerald-900/40' },
                      { label: 'Low', color: 'bg-emerald-500' },
                      { label: 'Moderate', color: 'bg-amber-400' },
                      { label: 'High', color: 'bg-orange-500' },
                      { label: 'Critical', color: 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]' }
                    ].map((step) => (
                      <div key={step.label} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full ${step.color} border border-white/10`}></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
