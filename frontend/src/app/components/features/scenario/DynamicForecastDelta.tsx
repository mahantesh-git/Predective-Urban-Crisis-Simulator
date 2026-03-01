import React from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity } from 'lucide-react';

interface ForecastData {
    labels: string[];
    aqi_forecast: number[];
}

interface DynamicForecastDeltaProps {
    baselineForecast: ForecastData | null;
    scenarioForecast: ForecastData | null;
    metricLabel: string;
}

export function DynamicForecastDelta({ baselineForecast, scenarioForecast, metricLabel }: DynamicForecastDeltaProps) {
    if (!baselineForecast || !scenarioForecast) return null;

    const chartData = baselineForecast.labels.map((label, index) => ({
        name: label,
        baseline: baselineForecast.aqi_forecast[index] || 0,
        scenario: scenarioForecast.aqi_forecast[index] || 0,
    }));

    return (
        <Card className="bg-slate-950 border-emerald-500/30 p-6 shadow-sm overflow-hidden relative group border-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    ML Forecast Recalculation
                </h4>
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/10 text-[10px] uppercase font-black tracking-widest px-2 py-0.5">
                    {metricLabel} DELTA
                </Badge>
            </div>

            <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                            itemStyle={{ fontWeight: 'bold' }}
                            labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', paddingBottom: '4px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />

                        <Line
                            type="monotone"
                            name={`Baseline ${metricLabel}`}
                            dataKey="baseline"
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Line
                            type="monotone"
                            name={`Scenario ${metricLabel}`}
                            dataKey="scenario"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', r: 3 }}
                            activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-slate-500 font-medium text-center mt-3">
                Dashed red line represents original ML forecast trajectory. Solid green line represents dynamically shifted inference vector based on policy injection.
            </p>
        </Card>
    );
}
