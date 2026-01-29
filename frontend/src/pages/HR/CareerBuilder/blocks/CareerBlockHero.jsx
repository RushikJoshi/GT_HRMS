import React from 'react';
import { Search } from 'lucide-react';

export default function CareerBlockHero({ content, onSearch, searchTerm }) {
    const {
        title = "Join Our Amazing Team",
        subtitle = "Innovate, grow, and build the future with us.",
        bgType = "gradient",
        bgColor = "from-[#4F46E5] via-[#9333EA] to-[#EC4899]",
        imageUrl = "",
        ctaText = "Check Open Positions",
        showSearchBar = true
    } = content || {};

    const heroStyle = bgType === 'image' && imageUrl
        ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : {};

    const handleSearch = (e) => {
        if (onSearch) onSearch(e.target.value);
    };

    return (
        <section className="relative">
            {/* Main Hero Content */}
            <div
                className={`relative pt-32 pb-44 overflow-hidden ${bgType === 'gradient' ? `bg-gradient-to-r ${bgColor}` : 'bg-gray-900'}`}
                style={heroStyle}
            >
                {bgType === 'image' && <div className="absolute inset-0 bg-black/50"></div>}

                {/* Decorative Circles (only for gradient) */}
                {bgType === 'gradient' && (
                    <>
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-400/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2"></div>
                    </>
                )}

                <div className="max-w-[90rem] mx-auto px-8 sm:px-12 lg:px-16 relative z-10">
                    <div className="text-center max-w-4xl mx-auto text-white">
                        <h1 className="text-5xl sm:text-7xl font-black mb-6 tracking-tight drop-shadow-sm">
                            {title}
                        </h1>
                        <p className="text-xl text-white/90 font-medium mb-10 leading-relaxed max-w-2xl mx-auto">
                            {subtitle}
                        </p>
                        <button
                            onClick={() => document.getElementById('search-filters')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-3.5 bg-white text-gray-900 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 text-lg"
                        >
                            {ctaText}
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Search Bar - Connected to Hero */}
            {showSearchBar && (
                <div className="relative z-20 -mt-16 px-8 sm:px-12 lg:px-16">
                    <div className="max-w-[85rem] mx-auto">
                        <div className="bg-white p-5 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border border-gray-100">
                            <div className="relative group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" size={24} />
                                <input
                                    type="text"
                                    placeholder="Search by job title or keyword..."
                                    value={searchTerm || ''}
                                    onChange={handleSearch}
                                    className="w-full pl-16 pr-8 py-5 bg-gray-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg font-medium outline-none text-gray-700 placeholder:text-gray-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
