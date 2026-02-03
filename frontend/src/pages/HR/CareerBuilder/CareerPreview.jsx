import React from 'react';
import CareerBlockHero from './blocks/CareerBlockHero';
import CareerBlockHighlights from './blocks/CareerBlockHighlights';
import CareerBlockCompanyInfo from './blocks/CareerBlockCompanyInfo';
import CareerBlockFaq from './blocks/CareerBlockFaq';
import CareerBlockTestimonials from './blocks/CareerBlockTestimonials';
import CareerBlockOpenings from './blocks/CareerBlockOpenings';

const blockComponents = {
    'hero': CareerBlockHero,
    'highlights': CareerBlockHighlights,
    'company-info': CareerBlockCompanyInfo,
    'faq': CareerBlockFaq,
    'testimonials': CareerBlockTestimonials,
    'openings': CareerBlockOpenings
};

export default function CareerPreview({
    config,
    selectedBlockId,
    onSelectBlock,
    isBuilder = true,
    jobs,
    searchTerm,
    onSearch,
    myApplications,
    onApply,
    previewMode = 'desktop'
}) {
    if (!config || !config.sections) return null;

    const isMobile = previewMode === 'mobile';

    return (
        <div className={`${isBuilder && !isMobile ? 'flex-1 overflow-y-auto bg-gray-100 p-8' : ''}`}>
            <div className={`relative ${isBuilder ? (isMobile ? 'w-full bg-white min-h-full' : 'mx-auto bg-white shadow-2xl min-h-full max-w-5xl rounded-3xl') : 'w-full'}`}>
                {/* Device Header - UI Polish for Builder (Only show on Desktop) */}
                {isBuilder && !isMobile && (
                    <div className="h-12 bg-gray-900 rounded-t-3xl flex items-center px-6 gap-2 border-b border-gray-800">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="ml-4 flex-1 bg-gray-800 rounded-lg h-6 flex items-center px-3 text-[10px] text-gray-500 font-mono">
                            https://careers.gitakshmi.com/{config.tenantId}
                        </div>
                    </div>
                )}

                {config.sections.map((section) => {
                    const Component = blockComponents[section.type];
                    if (!Component) return null;

                    return (
                        <div
                            key={section.id}
                            onClick={() => isBuilder && onSelectBlock(section.id)}
                            className={`relative group ${isBuilder ? 'cursor-pointer' : ''} ${isBuilder && selectedBlockId === section.id ? 'ring-4 ring-blue-500 ring-inset z-20 shadow-2xl' : ''}`}
                        >
                            {isBuilder && (
                                <div className={`absolute top-4 left-4 z-30 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${selectedBlockId === section.id ? 'opacity-100' : ''}`}>
                                    {section.type} section
                                </div>
                            )}
                            <Component
                                content={section.content}
                                jobs={jobs}
                                searchTerm={searchTerm}
                                onSearch={onSearch}
                                myApplications={myApplications}
                                onApply={onApply}
                                previewMode={previewMode}
                            />
                        </div>
                    );
                })}

                {/* Builder Footer */}
                {isBuilder && (
                    <footer className="bg-white border-t border-gray-100 py-12">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Powered by Gitakshmi HRMS</p>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
}
