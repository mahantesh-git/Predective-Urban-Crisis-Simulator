import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { CityProfile } from '../data/cities';

/**
 * Converts geographic lat/lng to SVG x,y coordinates for India map.
 * India roughly spans: lat 8–37°N, lng 68–98°E
 */
function geoToSVG(lat: number, lng: number) {
    const minLat = 7.5, maxLat = 37.5;
    const minLng = 67.5, maxLng = 98.5;
    const svgW = 400, svgH = 500;
    const x = ((lng - minLng) / (maxLng - minLng)) * svgW;
    // Invert Y: lat increases up, SVG y increases down
    const y = ((maxLat - lat) / (maxLat - minLat)) * svgH;
    return { x, y };
}

interface IndiaMapSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

// A simplified SVG path for India's outline
// Source: simplified GeoJSON to SVG path of India's border
const INDIA_SVG_PATH = `
M 184,12 L 192,8 L 200,10 L 208,6 L 220,12 L 228,8 L 236,14 L 238,22
L 242,28 L 248,30 L 256,26 L 268,24 L 278,30 L 284,38 L 290,36 L 296,44
L 298,52 L 306,58 L 312,62 L 318,60 L 328,64 L 336,72 L 340,82 L 344,90
L 350,92 L 358,98 L 362,108 L 360,118 L 366,126 L 372,134 L 374,144
L 370,154 L 376,162 L 382,170 L 384,180 L 378,190 L 380,200 L 388,208
L 390,220 L 386,232 L 378,240 L 374,252 L 376,264 L 370,274 L 362,280
L 356,292 L 350,300 L 342,308 L 332,316 L 322,322 L 312,328 L 302,332
L 292,328 L 284,320 L 276,326 L 268,334 L 260,340 L 252,348 L 244,356
L 238,366 L 232,376 L 228,388 L 224,400 L 220,412 L 218,424 L 216,436
L 212,444 L 206,452 L 202,460 L 200,468 L 198,476 L 194,484 L 192,490
L 188,484 L 186,476 L 184,468 L 182,456 L 180,444 L 178,430 L 176,418
L 172,408 L 168,398 L 162,392 L 156,384 L 150,376 L 144,368 L 138,358
L 132,348 L 124,340 L 118,330 L 112,322 L 104,314 L 98,308 L 90,300
L 84,292 L 80,282 L 76,270 L 72,258 L 70,246 L 68,234 L 72,222 L 78,214
L 80,202 L 82,190 L 84,178 L 80,168 L 78,158 L 82,148 L 88,140 L 94,132
L 100,124 L 106,116 L 108,106 L 104,96 L 108,86 L 116,80 L 120,70
L 120,60 L 124,52 L 130,44 L 136,38 L 144,34 L 150,26 L 158,22 L 166,18
L 174,14 L 184,12 Z
M 290,402 L 294,398 L 310,406 L 316,412 L 310,420 L 300,416 L 290,410 L 290,402 Z
M 202,488 L 206,494 L 200,498 L 196,494 Z
`;

export function IndiaMapSelector({ isOpen, onClose }: IndiaMapSelectorProps) {
    const { city, setCityById, allCities } = useCity();
    const [hovered, setHovered] = useState<CityProfile | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const handleSelect = (c: CityProfile) => {
        setCityById(c.id);
        onClose();
    };

    const handleMouseMove = (e: React.MouseEvent<SVGCircleElement>, c: CityProfile) => {
        const rect = e.currentTarget.closest('svg')!.getBoundingClientRect();
        setTooltipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 40,
        });
        setHovered(c);
    };

    // Risk color based on city riskMultiplier
    const getDotColor = (c: CityProfile) => {
        if (c.riskMultiplier >= 1.2) return '#ef4444'; // red — critical
        if (c.riskMultiplier >= 1.0) return '#f97316'; // orange — high
        if (c.riskMultiplier >= 0.9) return '#eab308'; // yellow — moderate
        return '#22c55e'; // green — low
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.93, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.93, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl mx-4"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold font-serif text-card-foreground">Select City</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Click a city on the map to activate it</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex gap-0">
                            {/* India Map */}
                            <div className="flex-1 p-4 relative bg-muted/20">
                                <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-4">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Critical</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />High</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Moderate</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Low</span>
                                </div>
                                <svg
                                    viewBox="0 0 400 500"
                                    className="w-full max-h-[400px]"
                                    style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.3))' }}
                                >
                                    {/* India outline */}
                                    <path
                                        d={INDIA_SVG_PATH}
                                        fill="hsl(var(--muted))"
                                        stroke="hsl(var(--border))"
                                        strokeWidth="1.5"
                                    />

                                    {/* City dots */}
                                    {allCities.map((c) => {
                                        const { x, y } = geoToSVG(c.lat, c.lng);
                                        const isActive = c.id === city.id;
                                        const color = getDotColor(c);

                                        return (
                                            <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => handleSelect(c)}>
                                                {/* Pulse ring for active city */}
                                                {isActive && (
                                                    <circle
                                                        cx={x} cy={y} r="14"
                                                        fill="none"
                                                        stroke={color}
                                                        strokeWidth="1.5"
                                                        opacity="0.4"
                                                    >
                                                        <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                                                        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                                                    </circle>
                                                )}
                                                {/* Outer glow */}
                                                <circle cx={x} cy={y} r={isActive ? 9 : 7} fill={color} opacity="0.2" />
                                                {/* Main dot */}
                                                <circle
                                                    cx={x} cy={y} r={isActive ? 7 : 5}
                                                    fill={color}
                                                    stroke={isActive ? 'white' : 'transparent'}
                                                    strokeWidth={isActive ? 2 : 0}
                                                    onMouseMove={(e) => handleMouseMove(e, c)}
                                                    onMouseLeave={() => setHovered(null)}
                                                />
                                                {/* City label for active */}
                                                {isActive && (
                                                    <text
                                                        x={x + 10} y={y + 4}
                                                        fontSize="9"
                                                        fill="hsl(var(--card-foreground))"
                                                        fontWeight="bold"
                                                        style={{ pointerEvents: 'none' }}
                                                    >
                                                        {c.name}
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}

                                    {/* Tooltip */}
                                    {hovered && (
                                        <g transform={`translate(${tooltipPos.x - 50},${tooltipPos.y})`} style={{ pointerEvents: 'none' }}>
                                            <rect rx="4" ry="4" width="100" height="30" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
                                            <text x="8" y="13" fontSize="9" fill="hsl(var(--card-foreground))" fontWeight="bold">{hovered.name}</text>
                                            <text x="8" y="24" fontSize="8" fill="hsl(var(--muted-foreground))">{hovered.state}</text>
                                        </g>
                                    )}
                                </svg>
                            </div>

                            {/* City List Sidebar */}
                            <div className="w-52 border-l border-border overflow-y-auto max-h-[480px]">
                                <div className="sticky top-0 bg-card px-3 py-2 border-b border-border">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                                        {allCities.length} Cities
                                    </p>
                                </div>
                                {allCities.map((c) => {
                                    const isActive = c.id === city.id;
                                    const color = getDotColor(c);
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => handleSelect(c)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left text-sm border-b border-border/50 ${isActive
                                                ? 'bg-rust/8 text-rust'
                                                : 'hover:bg-muted/50 text-card-foreground'
                                                }`}
                                        >
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                            <div className="min-w-0">
                                                <div className={`text-xs font-semibold truncate ${isActive ? 'text-rust' : ''}`}>{c.name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{c.state}</div>
                                            </div>
                                            {isActive && (
                                                <span className="ml-auto text-[9px] bg-rust/10 text-rust rounded-full px-1.5 py-0.5 font-medium flex-shrink-0">
                                                    ●
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
