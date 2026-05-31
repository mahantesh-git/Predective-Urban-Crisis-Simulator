import { useState, useEffect } from 'react';
import { simulate, compareScenarios } from '../api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Zap, TrendingDown, Trophy, Plus, X, Droplets, TreePine, Car, Factory, ThermometerSun, ShieldCheck } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PageHeader } from '../components/PageHeader';
import { useCity } from '../context/CityContext';
import { CascadingRiskGraph } from '../components/network/CascadingRiskGraph';

import { SimulationRecommendations } from '../components/features/scenario/SimulationRecommendations';

interface SimulationResult {
  baseline: {
    risk_score: number;
    crisis_level: string;
    triggered_systems: string[];
    cascade_effects?: any;
    time_to_impact?: number;
    confidence_interval?: { lower: number; upper: number };
  };
  result: {
    risk_score: number;
    crisis_level: string;
    triggered_systems: string[];
    cascade_effects?: any;
    time_to_impact?: number;
    confidence_interval?: { lower: number; upper: number };
  };
  delta: {
    risk_reduction: number;
    percentage_improvement: string | number;
  };
  adjusted_data?: any;
}

interface Scenario {
  id: string;
  label: string;
  trafficReduction: number;
  industrialCut: number;
  heatwaveLevel: number;
  waterConservation: number;
  greenSpaceExpansion: number;
}

export function Simulate() {
  const { city } = useCity();
  const [trafficReduction, setTrafficReduction] = useState(50);
  const [industrialCut, setIndustrialCut] = useState(50);
  const [heatwaveLevel, setHeatwaveLevel] = useState(2);
  const [waterConservation, setWaterConservation] = useState(30);
  const [greenSpaceExpansion, setGreenSpaceExpansion] = useState(20);

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: '1',
      label: 'Eco-Balanced Plan',
      trafficReduction: 40,
      industrialCut: 30,
      heatwaveLevel: 2,
      waterConservation: 50,
      greenSpaceExpansion: 40
    },
  ]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  const getLevel = (score: number) => {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MODERATE';
    return 'LOW';
  };

  const getCrisisColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
      case 'HIGH':
        return 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]';
      case 'MODERATE':
        return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]';
      case 'LOW':
        return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      default:
        return 'bg-slate-500';
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const data = await simulate({
        trafficReduction,
        industrialCut,
        heatwaveLevel,
        waterConservation,
        greenSpaceExpansion,
        cityId: city.id,
      } as any);

      const rawBaseline = data.baseline?.risk_score || 0;
      const rawResult = data.result?.risk_score || 0;

      // Re-derive triggered_systems from SCALED cascade values (same 0.60 threshold as backend)
      const CRISIS_THRESHOLD = 0.60;
      const deriveTriggered = (node: any): string[] => {
        const fx = node?.cascade_effects;
        if (!fx) return [];
        const systems: string[] = [];
        const aqiRisk = Math.min((fx.aqi_impact || 0) / 500, 1);
        const waterRisk = Math.min(fx.water_stress || 0, 1);
        const healthRisk = Math.min(fx.health_risk || 0, 1);
        const trafficRisk = Math.min(fx.traffic_disruption || 0, 1);
        if (aqiRisk >= CRISIS_THRESHOLD) systems.push('AIR_QUALITY');
        if (waterRisk >= CRISIS_THRESHOLD) systems.push('WATER_SUPPLY');
        if (healthRisk >= CRISIS_THRESHOLD) systems.push('PUBLIC_HEALTH');
        if (trafficRisk >= CRISIS_THRESHOLD) systems.push('TRAFFIC_NETWORK');
        return systems;
      };

      const scaledResult = {
        ...data,
        baseline: {
          ...data.baseline,
          risk_score: Math.min(rawBaseline, 1),
          crisis_level: getLevel(Math.min(rawBaseline, 1)),
          triggered_systems: deriveTriggered(data.baseline),
        },
        result: {
          ...data.result,
          risk_score: Math.min(rawResult, 1),
          crisis_level: getLevel(Math.min(rawResult, 1)),
          triggered_systems: deriveTriggered(data.result),
          confidence_interval: data.result?.confidence_interval ? {
            lower: Math.max(0, Math.min(1, data.result.confidence_interval.lower)),
            upper: Math.max(0, Math.min(1, data.result.confidence_interval.upper)),
          } : undefined
        }
      };

      // Recalculate delta based on RAW scaled values to avoid saturation at 100%
      scaledResult.delta = {
        risk_reduction: Math.max(0, rawBaseline - rawResult),
        percentage_improvement: rawBaseline > 0
          ? (((rawBaseline - rawResult) / rawBaseline) * 100).toFixed(1)
          : "0.0"
      };

      setResult(scaledResult);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    setComparingLoading(true);
    try {
      const data = await compareScenarios(scenarios, city.id);

      const scaledData = {
        ...data,
        comparison: data.comparison.map((row: any) => {
          // Store raw for internal logic if needed, but here we just need correct display levels
          const scaledRisk = Math.min(row.risk_score, 1);
          return {
            ...row,
            risk_score: scaledRisk,
            crisis_level: getLevel(scaledRisk),
          };
        })
      };

      setComparisonResult(scaledData);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setComparingLoading(false);
    }
  };

  const addScenario = () => {
    if (scenarios.length < 5) {
      setScenarios([
        ...scenarios,
        {
          id: Date.now().toString(),
          label: `Scenario ${scenarios.length + 1}`,
          trafficReduction: 50,
          industrialCut: 50,
          heatwaveLevel: 2,
          waterConservation: 30,
          greenSpaceExpansion: 20,
        },
      ]);
    }
  };

  const removeScenario = (id: string) => {
    if (scenarios.length > 1) {
      setScenarios(scenarios.filter((s) => s.id !== id));
    }
  };

  const updateScenario = (id: string, field: string, value: any) => {
    setScenarios(
      scenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const getRiskGradient = (score: number) => {
    if (score > 0.75) return 'from-red-500 to-red-900';
    if (score > 0.55) return 'from-orange-500 to-orange-900';
    if (score > 0.35) return 'from-yellow-500 to-yellow-900';
    return 'from-emerald-500 to-emerald-900';
  };

  return (
    <PageTransition>
      <div className="space-y-8 w-full">
        <PageHeader
          title="Crisis Control & Policy Simulator"
          subtitle={`Test high-impact urban policies and simulate ecological restoration outcomes for ${city.name} in real-time.`}
          icon={Zap}
        />

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="bg-slate-950 border border-slate-800 p-1 rounded-xl mb-8">
            <TabsTrigger
              value="single"
              className="px-8 py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-950 transition-all font-bold"
            >
              Rapid Simulation
            </TabsTrigger>
            <TabsTrigger
              value="compare"
              className="px-8 py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-950 transition-all font-bold"
            >
              Multi-Scenario Comparison
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Policy Controls Panel */}
              <Card className="xl:col-span-5 bg-slate-900/50 backdrop-blur-xl border-slate-800 p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldCheck className="w-24 h-24 text-emerald-500" />
                </div>

                <h3 className="text-xl font-bold text-white mb-8 border-b border-slate-800 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-500" />
                    Policy Parameter Injection
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase tracking-tighter">
                    TARGET: {city.name}
                  </Badge>
                </h3>

                <div className="space-y-3">
                  {/* Traffic Control */}
                  <div className="p-3 rounded-xl border border-slate-800/40 bg-slate-900/40 hover:bg-slate-800/60 transition-all group/slider flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-md"><Car className="w-4 h-4 text-emerald-400" /></div>
                        <label className="text-xs font-bold text-slate-200 tracking-wider uppercase">Traffic Volume</label>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{trafficReduction}%</span>
                    </div>
                    <Slider value={[trafficReduction]} onValueChange={(v) => setTrafficReduction(v[0])} max={100} step={1} className="cursor-pointer py-1" rangeClassName="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" thumbClassName="border-emerald-400 hover:border-emerald-300 w-4 h-4" />
                  </div>

                  {/* Industrial Emissions */}
                  <div className="p-3 rounded-xl border border-slate-800/40 bg-slate-900/40 hover:bg-slate-800/60 transition-all group/slider flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-md"><Factory className="w-4 h-4 text-emerald-400" /></div>
                        <label className="text-xs font-bold text-slate-200 tracking-wider uppercase">Industrial Cuts</label>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{industrialCut}%</span>
                    </div>
                    <Slider value={[industrialCut]} onValueChange={(v) => setIndustrialCut(v[0])} max={100} step={1} className="cursor-pointer py-1" rangeClassName="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" thumbClassName="border-emerald-400 hover:border-emerald-300 w-4 h-4" />
                  </div>

                  {/* Water Conservation */}
                  <div className="p-3 rounded-xl border border-slate-800/40 bg-slate-900/40 hover:bg-slate-800/60 transition-all group/slider flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-md"><Droplets className="w-4 h-4 text-emerald-400" /></div>
                        <label className="text-xs font-bold text-slate-200 tracking-wider uppercase">Water Protocol</label>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{waterConservation}%</span>
                    </div>
                    <Slider value={[waterConservation]} onValueChange={(v) => setWaterConservation(v[0])} max={100} step={1} className="cursor-pointer py-1" rangeClassName="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" thumbClassName="border-emerald-400 hover:border-emerald-300 w-4 h-4" />
                  </div>

                  {/* Green Space */}
                  <div className="p-3 rounded-xl border border-slate-800/40 bg-slate-900/40 hover:bg-slate-800/60 transition-all group/slider flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-md"><TreePine className="w-4 h-4 text-emerald-400" /></div>
                        <label className="text-xs font-bold text-slate-200 tracking-wider uppercase">Urban Greenery</label>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{greenSpaceExpansion}%</span>
                    </div>
                    <Slider value={[greenSpaceExpansion]} onValueChange={(v) => setGreenSpaceExpansion(v[0])} max={100} step={1} className="cursor-pointer py-1" rangeClassName="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" thumbClassName="border-emerald-400 hover:border-emerald-300 w-4 h-4" />
                  </div>

                  {/* External Factor: Heatwave */}
                  <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all group/slider flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-md"><ThermometerSun className="w-4 h-4 text-emerald-400" /></div>
                        <label className="text-xs font-bold text-emerald-400/80 tracking-wider uppercase">Heatwave Stressor</label>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">LVL {heatwaveLevel}</span>
                    </div>
                    <Slider value={[heatwaveLevel]} onValueChange={(v) => setHeatwaveLevel(v[0])} max={5} step={1} className="cursor-pointer py-1" rangeClassName="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" thumbClassName="border-emerald-400 hover:border-emerald-300 w-4 h-4" />
                  </div>
                </div>

                <Button
                  onClick={runSimulation}
                  disabled={loading}
                  className="w-full mt-6 h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-4 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                      COMPUTING CASCADE...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap className="w-6 h-6 fill-current" />
                      GENERATE IMPACT SIMULATION
                    </div>
                  )}
                </Button>
              </Card>

              {/* Simulation Result Panel */}
              <div className="xl:col-span-7 space-y-6">
                {!result ? (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 p-12 text-center">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                      <Zap className="w-10 h-10 text-slate-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-400 mb-2">Simulation Ready</h4>
                    <p className="text-slate-500 max-w-md">Configure your policy parameters and execute the simulation engine to visualize the projected urban resilience outcome.</p>
                  </div>
                ) : (
                  <div className="h-full animate-in zoom-in-95 fade-in duration-500 flex flex-col">
                    <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-slate-900 border border-slate-800">
                          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-950 font-bold text-xs">Overview</TabsTrigger>
                          <TabsTrigger value="network" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-950 font-bold text-xs">Network Map</TabsTrigger>
                          <TabsTrigger value="recommendations" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-950 font-bold text-xs">Recommendations</TabsTrigger>
                        </TabsList>
                        {/* Restoration Summary Mini */}
                        <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-emerald-400">Risk reduced by {result.delta.percentage_improvement}%</span>
                        </div>
                      </div>

                      <TabsContent value="overview" className="space-y-4 m-0 outline-none flex-1">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Baseline Status */}
                          <Card className="bg-slate-900 border-slate-800 p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                              <TrendingDown className="w-24 h-24 text-white" />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Current Baseline (No Action)</h4>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-end gap-1 mb-2">
                                  <span className="text-4xl font-black text-white">{(result.baseline.risk_score * 100).toFixed(0)}</span>
                                  <span className="text-xl font-bold text-slate-600 pb-1">%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${getRiskGradient(result.baseline.risk_score)} transition-all duration-1000`}
                                    style={{ width: `${result.baseline.risk_score * 100}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Alert Level:</span>
                                <Badge className={`${getCrisisColor(result.baseline.crisis_level)} border-0 text-slate-950 font-black px-2 py-0.5 text-[10px]`}>
                                  {result.baseline.crisis_level}
                                </Badge>
                              </div>

                              <div className="pt-3 border-t border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Triggered Response Systems:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.baseline.triggered_systems.slice(0, 3).map(sys => (
                                    <Badge key={sys} variant="outline" className="bg-slate-950/50 border-slate-700 text-slate-300 text-[9px] py-0 px-1.5">
                                      {sys.replace(/_/g, ' ')}
                                    </Badge>
                                  ))}
                                  {result.baseline.triggered_systems.length > 3 && (
                                    <Badge variant="outline" className="bg-slate-950/50 border-slate-700 text-slate-400 text-[9px] py-0 px-1.5">
                                      +{result.baseline.triggered_systems.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>

                          {/* Projected Result */}
                          <Card className="bg-slate-900 border-emerald-500/30 p-6 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden group border-2">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Trophy className="w-24 h-24 text-emerald-500" />
                            </div>
                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Projected Goal</h4>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-end gap-1 mb-2">
                                  <span className="text-4xl font-black text-emerald-400">{(result.result.risk_score * 100).toFixed(0)}</span>
                                  <span className="text-xl font-bold text-emerald-900/60 pb-1">%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-1000"
                                    style={{ width: `${result.result.risk_score * 100}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Alert Level:</span>
                                <Badge className={`${getCrisisColor(result.result.crisis_level)} border-0 text-slate-950 font-black px-2 py-0.5 text-[10px]`}>
                                  {result.result.crisis_level}
                                </Badge>
                                {result.result.confidence_interval && (
                                  <Badge variant="outline" className="border-emerald-500/20 text-emerald-500/60 text-[9px] font-mono py-0 px-1.5">
                                    ±{((result.result.confidence_interval.upper - result.result.risk_score) * 100).toFixed(1)}% CI
                                  </Badge>
                                )}
                              </div>

                            </div>
                          </Card>
                        </div>

                        {/* Impact Breakdown */}
                        <Card className="bg-slate-950 border-slate-800 p-5 overflow-hidden relative">
                          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 shadow-[0_0_15px_#10b981]"></div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                              Delta Analysis
                            </h4>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Air Quality (AQI)</p>
                              <p className="text-xl font-black text-white">{result.adjusted_data?.aqi.toFixed(0)}</p>
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[9px] mt-1 bg-emerald-500/5 py-0"> IMPROVED </Badge>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Water Stress</p>
                              <p className="text-xl font-black text-white">{result.result.cascade_effects?.water_risk != null ? (result.result.cascade_effects.water_risk * 100).toFixed(1) : (result.result.cascade_effects?.water_stress * 100).toFixed(1)}%</p>
                              <Badge variant="outline" className="border-cyan-500/30 text-cyan-500 text-[9px] mt-1 bg-cyan-500/5 py-0"> MITIGATED </Badge>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Response Window</p>
                              <p className="text-xl font-black text-white">
                                {result.result.time_to_impact != null ? `${result.result.time_to_impact}` : '0'} Days
                              </p>
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[9px] mt-1 bg-emerald-500/5 py-0">
                                {(result.result.time_to_impact || 0) > (result.baseline.time_to_impact || 0) ? 'EXPANDED' : 'CRITICAL'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">System Stability</p>
                              <p className="text-xl font-black text-emerald-400">
                                +{(Number(result.delta.percentage_improvement) / 5).toFixed(1)}x
                              </p>
                              <p className="text-[9px] text-slate-500 font-bold mt-1">RESILIENCE FACTOR</p>
                            </div>
                          </div>
                        </Card>                      </TabsContent>


                      <TabsContent value="network" className="m-0 outline-none flex-1 flex flex-col min-h-[400px]">
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden pt-4">
                          <CascadingRiskGraph
                            baseline={result.baseline.cascade_effects}
                            simulated={result.result.cascade_effects}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="recommendations" className="m-0 outline-none flex-1">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                          <SimulationRecommendations
                            cityId={city.id}
                            simulatedRiskScore={result.result.risk_score}
                            simulatedCrisisLevel={result.result.crisis_level}
                            triggeredSystems={result.result.triggered_systems}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-6 mt-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scenarios.map((scenario) => (
                <Card key={scenario.id} className="bg-slate-950 border-slate-800 p-6 relative group overflow-hidden shadow-lg rounded-xl flex flex-col">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40" />
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/60">
                    <Input
                      value={scenario.label}
                      onChange={(e) => updateScenario(scenario.id, 'label', e.target.value)}
                      className="bg-transparent border-0 text-white font-bold p-0 focus-visible:ring-0 text-base shadow-none w-full"
                    />
                    {scenarios.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScenario(scenario.id)}
                        className="text-slate-500 hover:text-red-400 hover:bg-slate-900 h-8 w-8 p-0 rounded-lg shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Traffic</span>
                        <span className="text-emerald-400">{scenario.trafficReduction}%</span>
                      </div>
                      <Slider
                        value={[scenario.trafficReduction]}
                        onValueChange={(value) => updateScenario(scenario.id, 'trafficReduction', value[0])}
                        max={100}
                        step={1}
                        className="h-1.5 cursor-pointer"
                        rangeClassName="bg-emerald-500"
                        thumbClassName="w-3 h-3 border-emerald-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Industry</span>
                        <span className="text-emerald-400">{scenario.industrialCut}%</span>
                      </div>
                      <Slider
                        value={[scenario.industrialCut]}
                        onValueChange={(value) => updateScenario(scenario.id, 'industrialCut', value[0])}
                        max={100}
                        step={1}
                        className="h-1.5 cursor-pointer"
                        rangeClassName="bg-emerald-500"
                        thumbClassName="w-3 h-3 border-emerald-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Water</span>
                        <span className="text-emerald-400">{scenario.waterConservation}%</span>
                      </div>
                      <Slider
                        value={[scenario.waterConservation]}
                        onValueChange={(value) => updateScenario(scenario.id, 'waterConservation', value[0])}
                        max={100}
                        step={1}
                        className="h-1.5 cursor-pointer"
                        rangeClassName="bg-emerald-500"
                        thumbClassName="w-3 h-3 border-emerald-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Greenery</span>
                        <span className="text-emerald-400">{scenario.greenSpaceExpansion}%</span>
                      </div>
                      <Slider
                        value={[scenario.greenSpaceExpansion]}
                        onValueChange={(value) => updateScenario(scenario.id, 'greenSpaceExpansion', value[0])}
                        max={100}
                        step={1}
                        className="h-1.5 cursor-pointer"
                        rangeClassName="bg-emerald-500"
                        thumbClassName="w-3 h-3 border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center bg-slate-900/40 px-3 py-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                      <ThermometerSun className="w-3.5 h-3.5" />
                      Heatwave Lvl {scenario.heatwaveLevel}
                    </div>
                    <Slider
                      value={[scenario.heatwaveLevel]}
                      onValueChange={(value) => updateScenario(scenario.id, 'heatwaveLevel', value[0])}
                      max={5}
                      step={1}
                      className="w-20 cursor-pointer"
                      rangeClassName="bg-orange-500"
                      thumbClassName="w-3 h-3 border-orange-400"
                    />
                  </div>
                </Card>
              ))}

              {scenarios.length < 5 && (
                <button
                  onClick={addScenario}
                  className="group h-[300px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all bg-slate-900/20"
                >
                  <div className="w-12 h-12 bg-slate-900/50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 border border-slate-800/50 transition-colors">
                    <Plus className="w-6 h-6 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest group-hover:text-emerald-400 transition-colors">Append Scenario ({scenarios.length}/5)</span>
                </button>
              )}
            </div>

            <Button
              onClick={runComparison}
              disabled={comparingLoading}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all mt-4"
            >
              {comparingLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  COMPARING ECOLOGICAL FUTURES...
                </div>
              ) : (
                <div className="flex items-center gap-2 uppercase tracking-wide">
                  <Zap className="w-4 h-4 fill-current" />
                  Run Cross-Scenario Stress Test
                </div>
              )}
            </Button>

            {comparisonResult && (
              <Card className="bg-slate-950 border-slate-800 p-6 shadow-xl animate-in zoom-in-95 duration-500 mt-8 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-800 pb-4 flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Optimal Strategy Ranking
                </h3>

                {/* Summary Bar */}
                <div className="flex flex-wrap items-center gap-4 mb-5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Winner:</span>
                    <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-bold text-[10px] px-2">{comparisonResult.winner}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scenarios:</span>
                    <span className="text-sm font-black text-white">{comparisonResult.total_scenarios}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Baseline Risk:</span>
                    <span className="text-sm font-black text-white">{(comparisonResult.baseline_risk * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {comparisonResult.comparison.map((row: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl flex flex-col gap-3 transition-all ${index === 0
                        ? 'bg-emerald-500/10 border border-emerald-500/50'
                        : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      {/* Top Row: rank + label + score */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${index === 0 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-200">{row.label}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${getCrisisColor(row.crisis_level)} border-0 text-white font-bold text-[9px] px-1.5 py-0 uppercase`}>{row.crisis_level}</Badge>
                              {index === 0 && <Badge className="bg-yellow-500/10 text-yellow-500 font-bold text-[9px] px-1.5 py-0 uppercase border border-yellow-500/20">Recommended AI Path</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-end justify-end gap-0.5 mb-1">
                            <span className="text-xl font-bold text-white">{(row.risk_score * 100).toFixed(0)}</span>
                            <span className="text-xs font-bold text-slate-500 pb-1">%</span>
                          </div>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase">↓ {row.percentage_improvement}% REDUCTION</p>
                        </div>
                      </div>

                      {/* Policy Parameters */}
                      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-800/60">
                        <div className="text-center p-1.5 rounded-md bg-slate-900/80">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Traffic Cut</p>
                          <p className="text-sm font-black text-emerald-400">{row.policy?.trafficReduction ?? 0}%</p>
                        </div>
                        <div className="text-center p-1.5 rounded-md bg-slate-900/80">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Industry Cut</p>
                          <p className="text-sm font-black text-emerald-400">{row.policy?.industrialCut ?? 0}%</p>
                        </div>
                        <div className="text-center p-1.5 rounded-md bg-slate-900/80">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Heatwave</p>
                          <p className="text-sm font-black text-orange-400">Lvl {row.policy?.heatwaveLevel ?? 0}</p>
                        </div>
                        <div className="text-center p-1.5 rounded-md bg-slate-900/80">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Water</p>
                          <p className="text-sm font-black text-emerald-400">{row.policy?.waterConservation ?? 0}%</p>
                        </div>
                        <div className="text-center p-1.5 rounded-md bg-slate-900/80">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Greenery</p>
                          <p className="text-sm font-black text-emerald-400">{row.policy?.greenSpaceExpansion ?? 0}%</p>
                        </div>
                      </div>

                      {/* Triggered Systems */}
                      {row.triggered_systems?.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Triggered Systems:</p>
                          <div className="flex flex-wrap gap-1">
                            {row.triggered_systems.slice(0, 4).map((sys: string) => (
                              <Badge key={sys} variant="outline" className="bg-slate-950/50 border-slate-700 text-slate-400 text-[9px] py-0 px-1.5">
                                {sys.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                            {row.triggered_systems.length > 4 && (
                              <Badge variant="outline" className="bg-slate-950/50 border-slate-700 text-slate-500 text-[9px] py-0 px-1.5">
                                +{row.triggered_systems.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* AI Policy Recommendations for the Winner */}
                {comparisonResult.comparison.length > 0 && (
                  <div className="mt-6 border-t border-slate-800 pt-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">
                      Strategic Interventions for {comparisonResult.winner}
                    </h4>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                      <SimulationRecommendations
                        cityId={city.id}
                        simulatedRiskScore={comparisonResult.comparison[0].risk_score}
                        simulatedCrisisLevel={comparisonResult.comparison[0].crisis_level}
                        triggeredSystems={comparisonResult.comparison[0].triggered_systems}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
