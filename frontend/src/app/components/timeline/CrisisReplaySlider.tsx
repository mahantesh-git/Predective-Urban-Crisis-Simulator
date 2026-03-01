import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { History as HistoryIcon, Play, Pause, AlertTriangle } from 'lucide-react';

interface HistoryData {
    labels: string[];
    aqi_trend: number[];
    water_quality_trend: number[];
    traffic_trend: number[];
    industry_trend: number[];
}

interface CrisisReplaySliderProps {
    data: HistoryData;
}

export function CrisisReplaySlider({ data }: CrisisReplaySliderProps) {
    const maxDays = data.labels.length - 1;
    const [dayIndex, setDayIndex] = useState(maxDays);
    const [isPlaying, setIsPlaying] = useState(false);

    // Playback effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setDayIndex((prev) => {
                    if (prev >= maxDays) {
                        setIsPlaying(false);
                        return maxDays;
                    }
                    return prev + 1;
                });
            }, 1000); // 1 second per day
        }
        return () => clearInterval(interval);
    }, [isPlaying, maxDays]);

    const togglePlay = () => {
        if (dayIndex === maxDays && !isPlaying) {
            setDayIndex(0); // Reset to beginning if at the end
        }
        setIsPlaying(!isPlaying);
    };

    if (!data || data.labels.length === 0) return null;

    const currentDay = data.labels[dayIndex];
    const aqi = data.aqi_trend[dayIndex];
    const water = data.water_quality_trend[dayIndex] * 100;
    const traffic = data.traffic_trend[dayIndex] * 100;
    const industry = data.industry_trend[dayIndex];

    // Calculate an ad-hoc risk score for the day
    const rawRisk = (aqi / 350) * 0.4 + (water / 100) * 0.25 + (traffic / 100) * 0.15;
    const risk = Math.min(Math.max(rawRisk, 0), 1) * 100;

    const getRiskColor = (score: number) => {
        if (score > 75) return 'text-red-500';
        if (score > 55) return 'text-orange-500';
        if (score > 35) return 'text-amber-500';
        return 'text-emerald-500';
    };

    return (
        <Card className="bg-slate-900 border-slate-800 p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <HistoryIcon className="w-48 h-48 text-white" />
            </div>

            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl">
                        <HistoryIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white tracking-tight">Crisis Timeline Replay</h4>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">Historical State Playback</p>
                    </div>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5 px-4 justify-center py-1.5 font-bold tracking-widest uppercase">
                    {currentDay}
                </Badge>
            </div>

            {/* T-7 Metrics Display */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 relative z-10">
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">State Risk</p>
                    <p className={`text-2xl font-black ${getRiskColor(risk)}`}>{risk.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">AQI</p>
                    <p className="text-2xl font-black text-slate-200">{aqi.toFixed(0)}</p>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Water Stress</p>
                    <p className="text-2xl font-black text-slate-200">{water.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Traffic</p>
                    <p className="text-2xl font-black text-slate-200">{traffic.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Industry</p>
                    <p className="text-2xl font-black text-slate-200">{industry}</p>
                </div>
            </div>

            {/* Playback Controls & Timeline */}
            <div className="flex items-center gap-6 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
                <button
                    onClick={togglePlay}
                    className="w-12 h-12 flex items-center justify-center shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all outline-none"
                >
                    {isPlaying ? <Pause className="fill-current w-5 h-5 ml-0.5" /> : <Play className="fill-current w-5 h-5 ml-1" />}
                </button>

                <div className="flex-1 px-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-3 px-1">
                        <span>{data.labels[0]} (T-7)</span>
                        <span>{data.labels[maxDays]} (Today)</span>
                    </div>
                    <Slider
                        value={[dayIndex]}
                        onValueChange={(val) => {
                            setDayIndex(val[0]);
                            setIsPlaying(false);
                        }}
                        max={maxDays}
                        step={1}
                        className="cursor-pointer"
                        rangeClassName="bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                        thumbClassName="w-5 h-5 border-2 border-slate-900 bg-blue-400 hover:scale-110 transition-transform shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                    />

                    <div className="flex justify-between mt-3 px-1">
                        {data.labels.map((_, i) => (
                            <div
                                key={i}
                                className={`w-1 h-1.5 rounded-full transition-colors ${i <= dayIndex ? 'bg-blue-500/50' : 'bg-slate-700'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {risk > 75 && (
                <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 font-medium">
                        <strong className="text-red-500 font-bold uppercase tracking-wider block mb-1">State Alert Archive</strong>
                        At this point in timeline, multi-system cascading failures breached critical capacity thresholds.
                    </p>
                </div>
            )}
        </Card>
    );
}
