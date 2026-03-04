import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { CityProfile } from '../data/cities';

// Risk color based on city riskMultiplier
function getDotColor(c: CityProfile) {
    if (c.riskMultiplier >= 1.2) return '#ef4444'; // red — critical
    if (c.riskMultiplier >= 1.0) return '#f97316'; // orange — high
    if (c.riskMultiplier >= 0.9) return '#eab308'; // yellow — moderate
    return '#22c55e'; // green — low
}

function getRiskLabel(c: CityProfile) {
    if (c.riskMultiplier >= 1.2) return 'CRITICAL';
    if (c.riskMultiplier >= 1.0) return 'HIGH';
    if (c.riskMultiplier >= 0.9) return 'MODERATE';
    return 'LOW';
}

interface SatelliteMapSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SatelliteMapSelector({ isOpen, onClose }: SatelliteMapSelectorProps) {
    const { city, setCityById, allCities } = useCity();
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<any[]>([]);
    const leafletRef = useRef<any>(null);

    // Initialize the Leaflet map
    useEffect(() => {
        if (!isOpen) return;

        // Dynamically import Leaflet to avoid SSR issues
        const initMap = async () => {
            if (typeof window === 'undefined') return;

            const L = (await import('leaflet')).default;
            leafletRef.current = L;

            // Wait a tick to let the DOM fully render
            setTimeout(() => {
                if (!mapContainerRef.current) return;
                if (mapRef.current) return; // already initialized

                // Create map centered on India
                const map = L.map(mapContainerRef.current, {
                    center: [22.5, 82],
                    zoom: 5,
                    zoomControl: true,
                });

                // Satellite tile layer (ESRI World Imagery)
                L.tileLayer(
                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    {
                        attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics',
                        maxZoom: 18,
                    }
                ).addTo(map);

                // Labels layer on top of satellite
                L.tileLayer(
                    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
                    {
                        attribution: '',
                        maxZoom: 18,
                        opacity: 0.7,
                    }
                ).addTo(map);

                mapRef.current = map;

                // Add markers for all cities
                addMarkers(L, map, allCities, city.id, setCityById, onClose);
            }, 100);
        };

        initMap();

        // Cleanup on close
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markersRef.current = [];
        };
    }, [isOpen]);

    // Update markers when selected city changes
    useEffect(() => {
        if (!mapRef.current || !leafletRef.current) return;
        const L = leafletRef.current;
        // Clear and re-add markers to update active state
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        addMarkers(L, mapRef.current, allCities, city.id, setCityById, onClose);
    }, [city.id]);

    function addMarkers(
        L: any,
        map: any,
        cities: CityProfile[],
        activeCityId: string,
        onSelect: (id: string) => void,
        close: () => void,
    ) {
        cities.forEach((c) => {
            const isActive = c.id === activeCityId;
            const color = getDotColor(c);
            const riskLabel = getRiskLabel(c);
            const size = isActive ? 20 : 14;

            const icon = L.divIcon({
                className: '',
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
                html: `
                    <div style="
                        width: ${size}px;
                        height: ${size}px;
                        background: ${color};
                        border-radius: 50%;
                        border: ${isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.5)'};
                        box-shadow: 0 0 ${isActive ? 16 : 8}px ${color}${isActive ? 'cc' : '80'};
                        cursor: pointer;
                        position: relative;
                        ${isActive ? 'animation: pulse-ring 1.5s infinite;' : ''}
                    "></div>
                    ${isActive ? `<style>@keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 ${color}66} 50%{box-shadow:0 0 0 8px ${color}00}}</style>` : ''}
                `,
            });

            const marker = L.marker([c.lat, c.lng], { icon });

            const popupContent = `
                <div style="font-family: 'Inter', sans-serif; min-width: 180px;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="
                            width:8px;height:8px;border-radius:50%;
                            background:${color};display:inline-block;flex-shrink:0;
                        "></span>
                        <strong style="font-size:14px;color:#1a1a1a;">${c.name}</strong>
                        <span style="
                            font-size:9px;background:${color}20;color:${color};
                            padding:2px 6px;border-radius:999px;font-weight:700;
                            border:1px solid ${color}40;
                        ">${riskLabel}</span>
                    </div>
                    <p style="color:#666;font-size:11px;margin:0 0 4px;">${c.state} · ${c.population_millions}M pop.</p>
                    <p style="color:#888;font-size:10px;margin:0 0 8px;font-style:italic;">${c.tagline}</p>
                    <button onclick="window.__selectCity && window.__selectCity('${c.id}')" style="
                        width:100%;padding:5px 10px;background:${color};color:white;
                        border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;
                    ">
                        ${isActive ? '✓ Active City' : 'Select City'}
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent, { maxWidth: 220, minWidth: 180 });

            // Also select on marker click directly
            marker.on('click', () => {
                onSelect(c.id);
                close();
            });

            marker.addTo(map);
            markersRef.current.push(marker);
        });

        // Register global callback for popup button
        (window as any).__selectCity = (id: string) => {
            onSelect(id);
            close();
        };
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                        style={{ width: '90vw', maxWidth: '1100px', height: '85vh', maxHeight: '700px' }}
                    >
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 z-[2000] flex items-center justify-between px-5 py-3 bg-card/95 backdrop-blur-sm border-b border-border">
                            <div>
                                <h2 className="text-base font-bold font-serif text-card-foreground">Select City</h2>
                                <p className="text-[10px] text-muted-foreground">Click a marker or use the list to select a city. Zoom and pan freely.</p>
                            </div>

                            {/* Risk Legend */}
                            <div className="hidden sm:flex items-center gap-4 text-[10px] text-muted-foreground mx-4">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_6px_#ef4444]" />Critical</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-[0_0_6px_#f97316]" />High</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block shadow-[0_0_6px_#eab308]" />Moderate</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shadow-[0_0_6px_#22c55e]" />Low</span>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Map Container */}
                        <div className="absolute inset-0 top-[56px]">
                            <div ref={mapContainerRef} className="w-full h-full" />
                        </div>

                        {/* City List Overlay (bottom right) */}
                        <div className="absolute bottom-3 right-3 z-[2000] bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl overflow-hidden" style={{ width: '190px', maxHeight: '340px' }}>
                            <div className="px-3 py-2 border-b border-border">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{allCities.length} Cities</p>
                            </div>
                            <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                                {allCities.map((c) => {
                                    const isActive = c.id === city.id;
                                    const color = getDotColor(c);
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setCityById(c.id);
                                                // Fly map to that city
                                                if (mapRef.current) {
                                                    mapRef.current.flyTo([c.lat, c.lng], 10, { duration: 1.2 });
                                                }
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left border-b border-border/40 ${isActive ? 'bg-rust/10' : 'hover:bg-muted/60'}`}
                                        >
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                                            <div className="min-w-0 flex-1">
                                                <div className={`text-xs font-semibold truncate ${isActive ? 'text-rust' : 'text-card-foreground'}`}>{c.name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{c.state}</div>
                                            </div>
                                            {isActive && <span className="text-rust text-[10px] flex-shrink-0">●</span>}
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
