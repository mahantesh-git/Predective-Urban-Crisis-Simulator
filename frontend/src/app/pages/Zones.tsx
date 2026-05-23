import { useEffect, useState } from 'react';
import { getZones, getZoneDetail } from '../api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { MapPin, AlertTriangle, Users, TrendingUp, Map } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageTransition } from '../components/PageTransition';
import { PageHeader } from '../components/PageHeader';
import { useCity } from '../context/CityContext';
import { VulnerabilityRadarCore } from '../components/analytics/VulnerabilityRadarCore';

interface Zone {
  id: string;
  name: string;
  description?: string;
  type?: string;
  alert_level: string;
  risk_score: number;
  evacuation_priority: boolean;
  primary_threat: string;
  population: number;
}

interface ZonesData {
  zones: Zone[];
}

export function Zones() {
  const { city } = useCity();
  const [zonesData, setZonesData] = useState<ZonesData | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneDetail, setZoneDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadZones();
  }, [city.id]);

  const loadZones = async () => {
    try {
      const data = await getZones(city.id);
      setZonesData(data);
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadZoneDetail = async (zoneId: string) => {
    setDetailLoading(true);
    setSelectedZone(zoneId);
    try {
      const data = await getZoneDetail(zoneId, city.id);
      setZoneDetail(data);
    } catch (error) {
      console.error('Failed to load zone detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!zonesData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'WARNING':
        return 'bg-orange-500';
      case 'WATCH':
        return 'bg-yellow-500';
      case 'SAFE':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getAlertBorderColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-red-500';
      case 'WARNING':
        return 'border-orange-500';
      case 'WATCH':
        return 'border-yellow-500';
      case 'SAFE':
        return 'border-green-500';
      default:
        return 'border-slate-500';
    }
  };

  return (
    <PageTransition>
      <div className={`space-y-6 transition-opacity duration-500 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <PageHeader
          title="Zone Risk Map"
          subtitle="Monitor risk levels and evacuation priorities by geographic zone"
          icon={Map}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zonesData.zones.map((zone) => (
            <Sheet key={zone.id}>
              <SheetTrigger asChild>
                <Card
                  className={`bg-card border-2 ${getAlertBorderColor(
                    zone.alert_level
                  )} p-6 cursor-pointer hover:scale-105 transition-transform shadow-sm flex flex-col justify-between h-full`}
                  onClick={() => loadZoneDetail(zone.id)}
                >
                  {zone.evacuation_priority && (
                    <div className="mb-4 p-2 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-semibold text-red-500">EVACUATION PRIORITY</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-card-foreground">{zone.name}</h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getAlertColor(zone.alert_level)} border-0 text-white text-xs`}
                      >
                        {zone.alert_level}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk</p>
                      <p className="text-2xl font-bold text-card-foreground">{(zone.risk_score * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">Primary Threat</span>
                      <span className="text-card-foreground font-semibold">{zone.primary_threat.replace(/_/g, ' ')}</span>
                    </div>
                    {zone.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{zone.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Population
                      </span>
                      <span className="text-card-foreground font-semibold">{zone.population?.toLocaleString() ?? 'N/A'}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-4 bg-background border-border text-foreground hover:bg-muted">
                    View Zone Forecast
                  </Button>
                </Card>
              </SheetTrigger>

              <SheetContent className="bg-slate-950/95 backdrop-blur-3xl border-l border-slate-800 text-white w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-white text-2xl font-black tracking-tight mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    {zone.name} - Detailed Forecast
                  </SheetTitle>
                </SheetHeader>

                {detailLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  </div>
                ) : (
                  zoneDetail && (
                    <div className="mt-6 space-y-8 animate-in fade-in duration-500">
                      <Card className="bg-slate-900/50 border-slate-800 p-8 shadow-2xl rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                        <div className="grid grid-cols-2 gap-8 relative z-10">
                          
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Risk</p>
                            <p className="text-2xl font-black text-white mt-1 drop-shadow-md">{(zone.risk_score * 100).toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Alert Level</p>
                            <Badge variant="outline" className={`${getAlertColor(zone.alert_level)} border-0 text-white font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-lg`}>
                              {zone.alert_level}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Population</p>
                            <p className="text-xl font-bold text-white mt-1">{zone.population.toLocaleString()}</p>
                          </div>
                        </div>
                      </Card>

                      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
                        <VulnerabilityRadarCore data={zone as any} zoneName={zone.name} />
                      </div>

                      <Card className="bg-slate-900/50 border border-slate-800 p-8 shadow-2xl rounded-2xl">
                        <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-rust" />
                          Zone Risk Forecast
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart
                            data={(zoneDetail?.labels || []).map((label: string, index: number) => ({
                              name: label,
                              risk: (zoneDetail?.forecast_7day?.[index] ?? 0) * 100,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                            <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--card-foreground)',
                              }}
                              formatter={(value: any) => `${value.toFixed(1)}%`}
                            />
                            <Line
                              type="monotone"
                              dataKey="risk"
                              stroke="#D95C3C"
                              strokeWidth={3}
                              dot={{ fill: '#D95C3C', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Card>

                      {zone.evacuation_priority && (
                        <Card className="bg-red-500/5 border-2 border-red-500 p-6 shadow-sm">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                            <div>
                              <h4 className="text-lg font-semibold text-red-500">Evacuation Priority Zone</h4>
                              <p className="text-sm text-foreground/80 mt-2">
                                This zone has been marked for priority evacuation. Residents should prepare emergency
                                supplies and monitor official channels for evacuation orders. Emergency services are on
                                standby.
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}

                      <Card className="bg-background border-border p-6 shadow-sm">
                        <h4 className="text-sm font-semibold text-card-foreground mb-3">Recommended Actions</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="text-rust mt-1">•</span>
                            <span>Monitor air quality levels and limit outdoor activities</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-rust mt-1">•</span>
                            <span>Ensure adequate water supplies and conservation measures</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-rust mt-1">•</span>
                            <span>Stay informed through official emergency channels</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-rust mt-1">•</span>
                            <span>Prepare emergency kits with essential supplies</span>
                          </li>
                        </ul>
                      </Card>
                    </div>
                  )
                )}
              </SheetContent>
            </Sheet>
          ))}
        </div>

        <Card className="bg-card border-border shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rust"></div>
          <h3 className="text-lg font-semibold text-card-foreground mb-2">Zone Management System</h3>
          <p className="text-sm text-muted-foreground font-medium tracking-wide">
            Each zone is continuously monitored with real-time sensor data. Risk scores are calculated using multiple
            factors including air quality, water availability, population density, and infrastructure resilience. Click
            on any zone card to view detailed forecasts and specific threat analysis.
          </p>
        </Card>
      </div>
    </PageTransition>
  );
}


