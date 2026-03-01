import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Car, Cloud, Droplets, Heart } from 'lucide-react';

interface CascadeEffects {
    aqi_impact?: number;
    water_stress?: number;
    health_risk?: number;
    traffic_disruption?: number;
}

interface CascadingRiskGraphProps {
    baseline?: CascadeEffects;
    simulated?: CascadeEffects;
}

// Layout configuration
const NODES = [
    { id: 'traffic', label: 'Traffic Density', icon: Car, x: 100, y: 80 },
    { id: 'aqi', label: 'Air Quality (AQI)', icon: Cloud, x: 300, y: 80 },
    { id: 'water', label: 'Water Stress', icon: Droplets, x: 100, y: 220 },
    { id: 'health', label: 'Health Risk', icon: Heart, x: 300, y: 220 },
];

const EDGES = [
    { source: 'traffic', target: 'aqi', weight: 0.50 },
    { source: 'traffic', target: 'health', weight: 0.20 },
    { source: 'aqi', target: 'water', weight: 0.15 },
    { source: 'aqi', target: 'health', weight: 0.45 },
    { source: 'water', target: 'health', weight: 0.35 },
];

export function CascadingRiskGraph({ baseline, simulated }: CascadingRiskGraphProps) {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Normalize data for nodes
    const getNodeIntensity = (id: string, data: CascadeEffects | undefined) => {
        if (!data) return 0;
        switch (id) {
            case 'traffic': return data.traffic_disruption || 0;
            case 'aqi': return Math.min((data.aqi_impact || 0) / 400, 1);
            case 'water': return data.water_stress || 0;
            case 'health': return data.health_risk || 0;
            default: return 0;
        }
    };

    const getDisplayValue = (id: string, data: CascadeEffects | undefined) => {
        if (!data) return 'N/A';
        switch (id) {
            case 'traffic': return `${((data.traffic_disruption || 0) * 100).toFixed(0)}%`;
            case 'aqi': return (data.aqi_impact || 0).toFixed(0);
            case 'water': return `${((data.water_stress || 0) * 100).toFixed(0)}%`;
            case 'health': return `${((data.health_risk || 0) * 100).toFixed(0)}%`;
            default: return 'N/A';
        }
    };

    const getColor = (intensity: number) => {
        if (intensity > 0.75) return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' };
        if (intensity > 0.55) return { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.1)', text: '#f97316' };
        if (intensity > 0.35) return { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
        return { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.1)', text: '#10b981' };
    };

    return (
        <Card className="bg-card border-border p-6 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-widest">
                    Risk Cascade Propagation Graph
                </h4>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-card border-border">Interactive SVG</Badge>
                </div>
            </div>

            <div className="relative w-full aspect-[4/3] max-w-lg mx-auto bg-slate-950/20 rounded-xl border border-border/50 overflow-hidden">
                <svg viewBox="0 0 400 300" className="w-full h-full">
                    <defs>
                        <marker id="arrowhead-default" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                        </marker>
                        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                        </marker>
                    </defs>

                    {/* Draw Edges */}
                    {EDGES.map((edge, i) => {
                        const src = NODES.find(n => n.id === edge.source)!;
                        const tgt = NODES.find(n => n.id === edge.target)!;
                        const isHovered = hoveredNode === src.id || hoveredNode === tgt.id;

                        const isTrafficHealth = edge.source === 'traffic' && edge.target === 'health';
                        const isAqiWater = edge.source === 'aqi' && edge.target === 'water';

                        let d = `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
                        let txtX = (src.x + tgt.x) / 2;
                        let txtY = (src.y + tgt.y) / 2 - 8;

                        if (isTrafficHealth) {
                            // Curve to the right
                            d = `M ${src.x} ${src.y} Q 260 150 ${tgt.x} ${tgt.y}`;
                            txtX = 230;
                            txtY = 145;
                        } else if (isAqiWater) {
                            // Curve to the left
                            d = `M ${src.x} ${src.y} Q 140 150 ${tgt.x} ${tgt.y}`;
                            txtX = 170;
                            txtY = 145;
                        }

                        return (
                            <g key={i}>
                                <path
                                    d={d}
                                    fill="none"
                                    stroke={isHovered ? '#ef4444' : '#334155'}
                                    strokeWidth={isHovered ? 2.5 : 1.5}
                                    strokeOpacity={isHovered ? 0.8 : 0.4}
                                    markerEnd={`url(#arrowhead-${isHovered ? 'active' : 'default'})`}
                                    className="transition-all duration-300"
                                />
                                {(isHovered || edge.weight > 0.3) && (
                                    <text
                                        x={txtX} y={txtY}
                                        fill={isHovered ? '#f1f5f9' : '#64748b'}
                                        fontSize="10"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        className="transition-all duration-300"
                                    >
                                        W: {edge.weight.toFixed(2)}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Draw Nodes */}
                    {NODES.map((node) => {
                        const intensity = getNodeIntensity(node.id, simulated || baseline);
                        const { stroke, fill, text } = getColor(intensity);
                        const isHovered = hoveredNode === node.id;

                        return (
                            <g
                                key={node.id}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className="cursor-pointer transition-all duration-300"
                                style={{ transform: `translate(${node.x}px, ${node.y}px) scale(${isHovered ? 1.1 : 1})` }}
                            >
                                {/* Outer Glow */}
                                <circle r="35" fill={fill} className="animate-pulse" opacity="0.5" />
                                {/* Main Node */}
                                <circle r="25" fill="#0f172a" stroke={stroke} strokeWidth={isHovered ? 3 : 2} />
                                {/* Icon Placeholder (Since Lucide icons cannot be easily embedded in pure SVG without mapping paths, we use initials) */}
                                <text x="0" y="-2" fill={text} fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                                    {node.id.substring(0, 3).toUpperCase()}
                                </text>
                                <text x="0" y="10" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                                    {getDisplayValue(node.id, simulated || baseline)}
                                </text>

                                {/* Label Box */}
                                <rect x="-40" y="32" width="80" height="18" rx="4" fill="#1e293b" opacity="0.9" />
                                <text x="0" y="44" fill="#f8fafc" fontSize="9" fontWeight="600" textAnchor="middle">
                                    {node.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
                Hover over nodes to isolate directed dependencies and propagation weights.
            </p>
        </Card>
    );
}
