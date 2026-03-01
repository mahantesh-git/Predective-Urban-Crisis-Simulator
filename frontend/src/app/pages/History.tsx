import { useEffect, useState } from 'react';
import { getHistory } from '../api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Clock, History as HistoryIcon } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PageHeader } from '../components/PageHeader';
import { CrisisReplaySlider } from '../components/timeline/CrisisReplaySlider';
import { useCity } from '../context/CityContext';

interface HistoryData {
  labels: string[];
  aqi_trend: number[];
  water_quality_trend: number[];
  traffic_trend: number[];
  industry_trend: number[];
  avg_aqi: number;
  avg_water_quality: number;
  trend: string;
}

export function History() {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  const { city } = useCity();

  useEffect(() => {
    loadHistory();
  }, [city.id]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory(city.id);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!history) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Prepare data for multi-series chart with guards
  const labels = history?.labels || [];
  const chartData = labels.map((label, index) => ({
    name: label,
    aqi: history?.aqi_trend?.[index] ?? 0,
    water: (history?.water_quality_trend?.[index] ?? 0) * 100,
    traffic: (history?.traffic_trend?.[index] ?? 0) * 100,
    emissions: history?.industry_trend?.[index] ?? 0,
  }));

  return (
    <PageTransition>
      <div className={`space-y-6 transition-opacity duration-500 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-start justify-between">
          <PageHeader
            title="Historical Trends"
            subtitle="7-day historical data and pattern analysis"
            icon={HistoryIcon}
          />
          <div className="flex items-center gap-2 pt-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground font-medium text-sm">Last 7 days</span>
          </div>
        </div>

        {/* Trend Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Average AQI</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{(history?.avg_aqi ?? 0).toFixed(1)}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Average Water Quality</p>
                <p className="text-3xl font-bold text-card-foreground mt-2">{((history?.avg_water_quality ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Trend</p>
                <Badge
                  variant="outline"
                  className={`mt-2 ${history?.trend === 'WORSENING'
                    ? 'bg-red-500/10 text-red-500 border-red-500'
                    : 'bg-green-500/10 text-green-600 border-green-500'
                    }`}
                >
                  {history?.trend || 'STABLE'}
                </Badge>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${history.trend === 'WORSENING' ? 'bg-red-500/10' : 'bg-green-500/10'
                  }`}
              >
                {history?.trend === 'WORSENING' ? (
                  <TrendingUp className="w-6 h-6 text-red-500" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-green-600" />
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Timeline Replay Component */}
        <CrisisReplaySlider data={history} />

        {/* Multi-series Area Chart */}
        <Card className="bg-card border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-card-foreground mb-6">All Metrics - 7 Day Trend</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--card-foreground)',
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                }}
              />
              <Area
                type="monotone"
                dataKey="aqi"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorAqi)"
                name="AQI"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="water"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorWater)"
                name="Water Quality %"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="traffic"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorTraffic)"
                name="Traffic %"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="emissions"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorEmissions)"
                name="Emissions (kg/h)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Individual Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Air Quality Index (AQI) Trend
            </h3>
            <div className="space-y-2">
              {(history?.labels || []).map((label, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${((history?.aqi_trend?.[index] ?? 0) / 300) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-card-foreground font-bold w-12 text-right">{history?.aqi_trend?.[index] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Water Quality Trend
            </h3>
            <div className="space-y-2">
              {(history?.labels || []).map((label, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(history?.water_quality_trend?.[index] ?? 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-card-foreground font-bold w-12 text-right">
                      {((history?.water_quality_trend?.[index] ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              Traffic Disruption Trend
            </h3>
            <div className="space-y-2">
              {(history?.labels || []).map((label, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(history?.traffic_trend?.[index] ?? 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-card-foreground font-bold w-12 text-right">
                      {((history?.traffic_trend?.[index] ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Industrial Emissions Trend
            </h3>
            <div className="space-y-2">
              {(history?.labels || []).map((label, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${((history?.industry_trend?.[index] ?? 0) / 300) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-card-foreground font-bold w-12 text-right">{history?.industry_trend?.[index] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {history?.trend === 'WORSENING' && (
          <Card className="bg-red-500/5 border-2 border-red-500 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold text-red-500">Worsening Trend Detected</h4>
                <p className="text-sm text-foreground/80 mt-2 font-medium">
                  Historical analysis indicates conditions are deteriorating across multiple metrics. Immediate policy
                  intervention is recommended. Review the Recommendations page for actionable strategies to reverse this
                  trend.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
