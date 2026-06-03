import React from 'react';
import { Card } from '../ui/card';

interface ShapContribution {
    feature: string;
    impact: number;
}

interface ShapleyBarChartProps {
    title: string;
    contributions: ShapContribution[];
    confidencePct?: number;
}

export function ShapleyBarChart({ title, contributions, confidencePct }: ShapleyBarChartProps) {
    
    const maxImpact = Math.max(...contributions.map(c => Math.abs(c.impact)), 1);

    return (
        <Card className="p-5 bg-card border-border shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-widest">{title} XAI Drivers</h4>
                {confidencePct && (
                    <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                        Model Confidence: {confidencePct}%
                    </span> 
                )}
            </div>

            <div className="space-y-3 mt-1">
                {contributions.map((item, idx) => {
                    const isNegative = item.impact < 0;
                    
                    const widthPct = Math.min((Math.abs(item.impact) / maxImpact) * 100, 100);

                    return (
                        <div key={idx} className="relative flex items-center h-8">
                            {}
                            <div className="absolute left-0 w-1/3 text-xs font-medium text-muted-foreground truncate pr-4 text-right">
                                {item.feature}
                            </div>

                            {}
                            <div className="absolute left-1/3 w-px h-full bg-border -ml-px z-0"></div>

                            {}
                            <div className="absolute left-1/3 w-2/3 h-full flex items-center">
                                {isNegative ? (
                                    
                                    <div className="w-1/2 flex justify-end pr-1 z-10">
                                        <div
                                            className="h-4 bg-emerald-500 rounded-l-sm transition-all duration-500"
                                            style={{ width: `${widthPct}%` }}
                                        />
                                    </div>
                                ) : (
                                    
                                    <div className="w-1/2 flex justify-start pl-1 z-10 offset-1/2 ml-[50%]">
                                        <div
                                            className="h-4 bg-red-500 rounded-r-sm transition-all duration-500"
                                            style={{ width: `${widthPct}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {}
                            <div className="absolute right-0 w-12 text-xs font-bold text-card-foreground text-right pl-2">
                                {item.impact > 0 ? '+' : ''}{item.impact.toFixed(1)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {}
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground mt-2 border-t border-border pt-3">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Reduces Risk</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Increases Risk</span>
            </div>
        </Card>
    );
}
