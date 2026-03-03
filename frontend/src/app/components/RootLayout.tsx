import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { Activity, Zap, TrendingUp, Target, Map, Clock, Leaf, MapPin, ChevronDown } from 'lucide-react';
import { WelcomeDialog } from './WelcomeDialog';
import { AnimatePresence } from 'motion/react';
import React from 'react';
import { useCity } from '../context/CityContext';
import { IndiaMapSelector as _IndiaMapSelector } from './IndiaMapSelector';
import { SatelliteMapSelector } from './SatelliteMapSelector';

export function RootLayout() {
  const location = useLocation();
  const { city } = useCity();
  const [mapOpen, setMapOpen] = useState(false);

  const navItems = [
    { path: '/app', label: 'Dashboard', icon: Activity },
    { path: '/app/simulate', label: 'Simulate', icon: Zap },
    { path: '/app/forecast', label: 'Forecast', icon: TrendingUp },
    { path: '/app/recommendations', label: 'Recommendations', icon: Target },
    { path: '/app/zones', label: 'Zones', icon: Map },
    { path: '/app/ecology', label: 'Ecology', icon: Leaf },
    { path: '/app/history', label: 'History', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      <WelcomeDialog />

      {/* Satellite Map Modal */}
      <SatelliteMapSelector isOpen={mapOpen} onClose={() => setMapOpen(false)} />

      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="w-full px-[15px] py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rust rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-card-foreground tracking-tight">CitySentinel <span className="text-rust">AI</span></h1>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Urban Crisis Intelligence</p>
              </div>
            </div>

            {/* Right: City Selector + Status */}
            <div className="flex items-center gap-4">
              {/* City Selector — opens India Map Modal */}
              <button
                onClick={() => setMapOpen(true)}
                className="flex items-center gap-2 bg-muted/60 hover:bg-muted border border-border rounded-full px-3 py-1.5 transition-all hover:border-rust/40 group"
                title="Select city on map"
              >
                <MapPin className="w-3.5 h-3.5 text-rust flex-shrink-0" />
                <div className="flex flex-col leading-none text-left">
                  <span className="text-xs font-bold text-card-foreground tracking-wide">{city.name}</span>
                  <span className="text-[10px] text-muted-foreground tracking-wide">{city.state}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-rust transition-colors" />
              </button>

              {/* Live indicator */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium tracking-wide text-muted-foreground">LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b border-border shrink-0">
        <div className="w-full px-[15px]">
          <div className="flex gap-1 overflow-x-auto hide-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${isActive
                    ? 'text-rust border-b-2 border-rust'
                    : 'text-muted-foreground hover:text-primary'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area with AnimatePresence */}
      <main className="flex-1 w-full px-[15px] py-8 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* Keying by pathname triggers unmount/remount on route change */}
          <React.Fragment key={location.pathname}>
            <Outlet />
          </React.Fragment>
        </AnimatePresence>
      </main>
    </div>
  );
}