import { useEffect, useState } from 'react';
import { getDeforestationNational, getDeforestationRisk, getDeforestationOverview } from '../api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
    AreaChart, Area, BarChart, Bar, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Leaf, TreePine, TrendingDown, TrendingUp, Globe } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PageHeader } from '../components/PageHeader';
import { useCity } from '../context/CityContext';
import { Bird, Flower, ShieldCheck } from 'lucide-react';

// ── State → city mapping for highlighting ─────────────────────────────────────
const CITY_STATE: Record<string, string> = {
    bengaluru: 'Karnataka',
    delhi: 'Delhi',
    mumbai: 'Maharashtra',
    chennai: 'Tamil Nadu',
    hyderabad: 'Telangana',
    kolkata: 'West Bengal',
    pune: 'Maharashtra',
    ahmedabad: 'Gujarat',
    jaipur: 'Rajasthan',
    lucknow: 'Uttar Pradesh',
};

const RISK_COLOR: Record<string, string> = {
    Critical: '#ef4444',
    High: '#f97316',
    Moderate: '#f59e0b',
    Low: '#22c55e',
};

export function Ecology() {
    const { city } = useCity();
    const [national, setNational] = useState<any>(null);
    const [risk, setRisk] = useState<any[]>([]);
    const [overview, setOverview] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const cityState = CITY_STATE[city.id] ?? '';

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getDeforestationNational(),
            getDeforestationRisk(),
            getDeforestationOverview(),
        ]).then(([nat, rsk, ovr]) => {
            setNational(nat);
            setRisk((rsk.scores || []).slice(0, 10));
            setOverview(ovr);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // ── Chart data shapes ────────────────────────────────────────────────────────
    const nationalChartData = national
        ? (national.years || []).map((yr: number, i: number) => ({
            year: yr,
            forest_cover: Math.round((national.total_forest_cover?.[i] || 0) / 1000),
            tree_loss: Math.round((national.total_tree_loss?.[i] || 0) / 1000),
            reforestation: Math.round((national.total_reforestation?.[i] || 0) / 1000),
            net_change: Math.round((national.total_net_change?.[i] || 0) / 1000),
        }))
        : [];

    const riskChartData = risk.map((s) => ({
        state: s.state?.replace(' Pradesh', ' P.').replace('Karnataka', 'KA') || s.state,
        fullState: s.state,
        risk: Math.round(s.risk_score),
        fill: RISK_COLOR[s.risk_level] || '#94a3b8',
    }));

    const goal15CoverPct = national?.goal15_forest_cover_2020_pct ?? overview?.goal15_india_trend_pct ?? 24.3;
    const goal15Trend = national?.goal15_trend_pct ?? 7.0;
    const latestForestKm = national?.total_forest_cover?.at(-1) ?? 713789;
    const avgRate = overview?.latest_year_summary?.avg_deforestation_rate_pct ?? 0.198;

    const highlightRisk = risk.find((s) => s.state === cityState);

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <PageHeader
                        title="Ecological Health"
                        subtitle="India deforestation analysis · SDG Goal 15 · Forest cover 2001–2023"
                        icon={Leaf}
                    />
                    <div className="pt-2 flex gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500 ring-1 ring-green-500/30">
                            SDG Goal 15 Data
                        </Badge>
                        {highlightRisk && (
                            <Badge variant="outline" style={{ borderColor: RISK_COLOR[highlightRisk.risk_level] }}
                                className="text-card-foreground">
                                {city.name}: {highlightRisk.risk_level} Risk
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Summary stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-card border-border p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TreePine className="w-4 h-4 text-green-600" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forest Cover</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{goal15CoverPct}%</p>
                        <p className="text-xs text-muted-foreground mt-1">India land area (2020)</p>
                    </Card>

                    <Card className="bg-card border-border p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Goal 15 Trend</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-500">+{goal15Trend}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Since 2000 (IND)</p>
                    </Card>

                    <Card className="bg-card border-border p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Forest</p>
                        </div>
                        <p className="text-2xl font-bold text-card-foreground">{(latestForestKm / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-muted-foreground mt-1">sq km (2023)</p>
                    </Card>

                    <Card className="bg-card border-border p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Loss Rate</p>
                        </div>
                        <p className="text-2xl font-bold text-red-500">{avgRate}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Per year (2023)</p>
                    </Card>
                </div>

                {loading && (
                    <div className="flex items-center justify-center h-48">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                            <p className="text-sm text-muted-foreground">Loading deforestation data…</p>
                        </div>
                    </div>
                )}

                {!loading && (
                    <>
                        {/* National Forest Cover Trend */}
                        <Card className="bg-card border-border p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <TreePine className="w-5 h-5 text-green-600" />
                                <h3 className="text-lg font-semibold text-card-foreground">Total India Forest Cover (2001–2023)</h3>
                                <span className="ml-auto text-xs text-muted-foreground">Source: FSI India + SDG Goal 15</span>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={nationalChartData}>
                                    <defs>
                                        <linearGradient id="forestGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} unit="K km²" width={72} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                        formatter={(v: any) => [`${v}K km²`, 'Forest Cover']}
                                    />
                                    <Area type="monotone" dataKey="forest_cover" stroke="#22c55e" strokeWidth={2}
                                        fill="url(#forestGrad)" dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Tree Loss vs Reforestation */}
                        <Card className="bg-card border-border p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingDown className="w-5 h-5 text-red-500" />
                                <h3 className="text-lg font-semibold text-card-foreground">Tree Loss vs Reforestation (Thousand Ha)</h3>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={nationalChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} unit="K ha" width={60} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                        formatter={(v: any, name: string) => [`${v}K ha`, name === 'tree_loss' ? 'Tree Loss' : name === 'reforestation' ? 'Reforestation' : 'Net Change']}
                                    />
                                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                                    <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                                    <Line type="monotone" dataKey="tree_loss" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} name="Tree Loss" />
                                    <Line type="monotone" dataKey="reforestation" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} name="Reforestation" />
                                    <Line type="monotone" dataKey="net_change" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Net Change" />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* State Risk Bar Chart */}
                        <Card className="bg-card border-border p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingDown className="w-5 h-5 text-rust" />
                                <h3 className="text-lg font-semibold text-card-foreground">State Deforestation Risk Score</h3>
                                <span className="ml-auto text-xs text-muted-foreground">0 = safe · 100 = critical</span>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={riskChartData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                    <YAxis type="category" dataKey="state" stroke="#94a3b8" fontSize={11} width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                        formatter={(v: any, _: string, props: any) => [
                                            <div key="custom-tooltip">
                                                <div className="font-bold">{v} / 100</div>
                                                <div className="text-[10px] text-emerald-400 mt-1">Confidence: {props.payload.confidence}</div>
                                            </div>,
                                            props.payload.fullState
                                        ]}
                                    />
                                    <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                                        {riskChartData.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={entry.fullState === cityState ? '#a78bfa' : entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="text-xs text-muted-foreground mt-3">
                                {cityState ? (
                                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#a78bfa] mr-1"></span> <strong>{cityState}</strong> (selected city's state) highlighted in purple.</span>
                                ) : 'Select a city in the header to highlight your state.'}
                            </p>
                        </Card>

                        {/* Local Biodiversity Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-card border-border p-6 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Flower className="w-16 h-16 text-emerald-500" />
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Flower className="w-5 h-5 text-emerald-500" />
                                    <h3 className="text-lg font-semibold text-card-foreground">Local Flora</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {city.ecology.flora.map((item, i) => (
                                        <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-4 italic">
                                    Native and significant plant species contributing to {city.name}'s canopy.
                                </p>
                            </Card>

                            <Card className="bg-card border-border p-6 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Bird className="w-16 h-16 text-blue-500" />
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Bird className="w-5 h-5 text-blue-500" />
                                    <h3 className="text-lg font-semibold text-card-foreground">Local Fauna</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {city.ecology.fauna.map((item, i) => (
                                        <Badge key={i} variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-4 italic">
                                    Key wildlife and avian species monitored within city limits and buffer zones.
                                </p>
                            </Card>

                            <Card className="bg-card border-border p-6 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <ShieldCheck className="w-16 h-16 text-purple-500" />
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-5 h-5 text-purple-500" />
                                    <h3 className="text-lg font-semibold text-card-foreground">Active Conservation</h3>
                                </div>
                                <ul className="space-y-2">
                                    {city.ecology.conservation_projects.map((item, i) => (
                                        <li key={i} className="text-sm text-card-foreground flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </div>

                        {/* Goal 15 India Context */}
                        <Card className="bg-card border-border p-4 shadow-sm">
                            <div className="flex items-center gap-3 flex-wrap">
                                <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-card-foreground">SDG Goal 15 · India Context</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Forest cover improved from <strong>22.7%</strong> (2000) → <strong>24.3%</strong> (2020), a{' '}
                                        <strong className="text-green-500">+7.0%</strong> gain. Against a global average decline of{' '}
                                        <strong className="text-red-400">−2.2%</strong>. India's reforestation programs are working.
                                    </p>
                                </div>
                                <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-500/30 border shrink-0">
                                    ↑ Improving
                                </Badge>
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </PageTransition>
    );
}
