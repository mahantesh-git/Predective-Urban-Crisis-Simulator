import { useEffect, useState } from 'react';
import { getRecommendations } from '../../../api';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Target, TrendingDown, DollarSign, Trophy, Lightbulb,
  ChevronDown, ChevronUp, Zap, Droplets, Wind, Car,
  ShieldCheck, AlertTriangle,
} from 'lucide-react';

interface CascadeImpact {
  aqi_risk?: number;
  water_risk?: number;
  health_risk?: number;
  traffic_risk?: number;
}

interface Strategy {
  rank: number;
  id: string;
  name: string;
  category: string;
  description: string;
  cost_proxy: string;
  baseline_risk: number;
  projected_risk: number;
  risk_reduction: number;
  efficiency_score: number;
  cascade_impact: CascadeImpact;
  expected_systems_resolved: string[];
}

interface RecommendationsData {
  baseline_risk: number;
  crisis_level: string;
  triggered_systems: string[];
  strategies?: Strategy[];
  recommendations?: Strategy[];
}

interface SimulationRecommendationsProps {
  cityId: string;
  simulatedRiskScore: number;
  simulatedCrisisLevel: string;
  triggeredSystems: string[];
}


const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  TRAFFIC:  { label: 'Traffic',  color: 'bg-purple-500/15 text-purple-400 border-purple-400/30', icon: Car },
  INDUSTRY: { label: 'Industry', color: 'bg-orange-500/15 text-orange-400 border-orange-400/30', icon: Wind },
  HEATWAVE: { label: 'Heat',     color: 'bg-red-500/15 text-red-400 border-red-400/30',          icon: Zap },
  COMBINED: { label: 'Combined', color: 'bg-blue-500/15 text-blue-400 border-blue-400/30',       icon: ShieldCheck },
  WATER:    { label: 'Water',    color: 'bg-cyan-500/15 text-cyan-400 border-cyan-400/30',       icon: Droplets },
};

const COST_COLOR: Record<string, string> = {
  LOW:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  HIGH:   'bg-red-500/15 text-red-400 border-red-500/30',
};

function buildExplainability(strategy: Strategy): string[] {
  const ci = strategy.cascade_impact || {};
  const reasons: string[] = [];
  const b = strategy.baseline_risk;

  if (strategy.category === 'TRAFFIC' || strategy.category === 'COMBINED') {
    const pct = strategy.id.includes('40') ? 40 : strategy.id.includes('20') ? 20 : 30;
    reasons.push(`Reduces vehicle density by ${pct}%, directly cutting particulate emissions that drive AQI risk.`);
  }
  if (strategy.category === 'INDUSTRY' || strategy.category === 'COMBINED') {
    const pct = strategy.id.includes('35') ? 35 : 20;
    reasons.push(`Caps industrial output by ${pct}%, lowering SO₂/NOₓ that cascade into health and water contamination.`);
  }
  if (strategy.category === 'HEATWAVE') {
    reasons.push(`Urban greening lowers surface temperatures, reducing the heat multiplier applied to all cascade risk nodes.`);
  }
  if ((ci.aqi_risk ?? 0) > 0.5)
    reasons.push(`Air quality risk is ${((ci.aqi_risk ?? 0) * 100).toFixed(0)}% — this intervention is the highest-leverage lever.`);
  if ((ci.water_risk ?? 0) > 0.5)
    reasons.push(`Water contamination is elevated at ${((ci.water_risk ?? 0) * 100).toFixed(0)}% — industrial cuts prevent acid runoff.`);
  if ((ci.health_risk ?? 0) > 0.5)
    reasons.push(`Public health risk is ${((ci.health_risk ?? 0) * 100).toFixed(0)}% — reducing air pollutants directly lowers respiratory load.`);
  if ((ci.traffic_risk ?? 0) > 0.55)
    reasons.push(`Traffic disruption is ${((ci.traffic_risk ?? 0) * 100).toFixed(0)}% — intervention breaks the congestion-emission loop.`);
  if (strategy.efficiency_score > 0.06)
    reasons.push(`High efficiency score (${(strategy.efficiency_score * 100).toFixed(1)}) — best risk-reduction per implementation cost.`);
  if (b > 0.7)
    reasons.push(`Current baseline risk is CRITICAL (${(b * 100).toFixed(0)}%). Immediate high-impact interventions are prioritised.`);

  return reasons.length
    ? reasons
    : [`This strategy reduces overall urban crisis risk by ${(strategy.risk_reduction * 100).toFixed(1)} percentage points.`];
}


export function SimulationRecommendations({
  cityId,
  simulatedRiskScore,
}: SimulationRecommendationsProps) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    getRecommendations(cityId)
      .then(setData)
      .catch((e) => console.error('Failed to load recommendations:', e))
      .finally(() => setLoading(false));
  }, [cityId, simulatedRiskScore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <div className="w-6 h-6 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm font-medium">Generating AI recommendations…</span>
      </div>
    );
  }

  if (!data) return null;

  const strategies: Strategy[] = data.recommendations ?? data.strategies ?? [];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-emerald-400" />
        AI Policy Recommendations
      </h3>

      <div className={`space-y-4 pr-2 ${strategies.length > 3 ? 'max-h-[600px] overflow-y-auto custom-scrollbar' : ''}`}>
        {strategies.map((strategy, index) => {
        const catMeta = CATEGORY_META[strategy.category] || CATEGORY_META['COMBINED'];
        const CatIcon = catMeta.icon;
        const isExpanded = expandedId === strategy.id;
        const reasons = buildExplainability(strategy);

        return (
          <Card key={strategy.id || index} className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      #{index + 1}
                    </span>
                    <h4 className="text-base font-bold text-white">{strategy.name}</h4>
                  </div>
                  <p className="text-sm text-slate-400 max-w-2xl">{strategy.description}</p>
                </div>
                
                <div className="flex flex-col gap-2 items-end">
                  <Badge variant="outline" className={catMeta.color}>
                    <CatIcon className="w-3 h-3 mr-1" />
                    {catMeta.label}
                  </Badge>
                  <Badge variant="outline" className={COST_COLOR[strategy.cost_proxy] || ''}>
                    {strategy.cost_proxy} Cost
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Projected Risk
                  </p>
                  <p className="text-xl font-bold text-emerald-400">
                    {(strategy.projected_risk * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Risk Reduction
                  </p>
                  <p className="text-xl font-bold text-emerald-400">
                    {(strategy.risk_reduction * 100).toFixed(1)} pts
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Efficiency Score
                  </p>
                  <p className="text-xl font-bold text-blue-400">
                    {(strategy.efficiency_score * 100).toFixed(1)}
                  </p>
                </div>
              </div>

              {strategy.expected_systems_resolved && strategy.expected_systems_resolved.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-500">Resolves:</span>
                  <div className="flex gap-2 flex-wrap">
                    {strategy.expected_systems_resolved.map((sys) => (
                      <Badge key={sys} variant="outline" className="text-xs bg-slate-800 border-slate-700">
                        {sys.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setExpandedId(isExpanded ? null : strategy.id)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {isExpanded ? 'Hide' : 'Show'} Explainability
              </button>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <h5 className="text-sm font-semibold text-white mb-2">Why was this recommended?</h5>
                  <ul className="space-y-2">
                    {reasons.map((r, i) => (
                      <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
