import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { AlertCircle, MapPin } from 'lucide-react';
import { useCity } from '../context/CityContext';

export function Home() {
    const navigate = useNavigate();
    const { city } = useCity();

    return (
        <main className="min-h-screen bg-[#EAE3D6] flex flex-col justify-between font-sans selection:bg-[#C05A1A] selection:text-white">
            {/* Navbar Minimal */}
            <nav className="p-[15px] flex justify-between items-center text-[#4B2E1E]">
                <div className="font-serif font-bold text-xl tracking-tight">
                    CitySentinel <span className="text-[#C05A1A]">AI</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-[#4b2e1e]/10 shadow-sm backdrop-blur-sm">
                        <MapPin className="w-3.5 h-3.5 text-[#C05A1A]" />
                        <span className="text-xs font-bold tracking-wide">{city.name}</span>
                        <span className="text-xs text-[#6B4A34]">· {city.state}, India</span>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="flex-1 flex items-center justify-center text-center px-[15px] -mt-16">
                <div className="w-full flex flex-col items-center">

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="mb-8 flex flex-col items-center gap-3"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-200 bg-red-50 text-red-700 text-sm font-medium shadow-sm transition-all hover:bg-red-100 cursor-default">
                            <AlertCircle className="w-4 h-4" />
                            Active Monitoring — Crisis Protocol Engaged
                        </span>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#4b2e1e]/20 bg-white/60 text-[#4B2E1E] text-xs font-medium tracking-wide">
                            <MapPin className="w-3.5 h-3.5 text-[#C05A1A]" />
                            {city.name} Metropolitan Area · {city.state}, India
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="text-6xl md:text-7xl lg:text-8xl font-serif font-medium text-[#4B2E1E] leading-[1.1] tracking-tight"
                    >
                        The city is <span className="text-[#C05A1A] italic">corroding.</span><br />
                        What will you do?
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="mt-8 text-lg md:text-xl text-[#6B4A34] max-w-2xl mx-auto leading-relaxed font-light"
                    >
                        {city.name} is on the edge. CitySentinel uses predictive Monte Carlo simulations and zone-level forecasting to reveal the layers of urban crisis before they strike.
                    </motion.p>

                </div>
            </section>

            {/* Scroll Indicator / Entry CTA */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="pb-16 flex justify-center"
            >
                <button
                    onClick={() => navigate('/app')}
                    className="group flex flex-col items-center gap-3 text-sm tracking-[0.2em] font-medium text-[#6B4A34] hover:text-[#C05A1A] transition-colors duration-300"
                >
                    <span>ENTER DASHBOARD</span>
                    <div className="w-px h-12 bg-[#6B4A34]/30 group-hover:bg-[#C05A1A] transition-colors relative overflow-hidden">
                        <motion.div
                            className="w-full h-full bg-current absolute top-0 left-0"
                            animate={{ y: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        />
                    </div>
                </button>
            </motion.div>
        </main>
    );
}
