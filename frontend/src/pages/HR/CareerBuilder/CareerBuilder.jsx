import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Loader2, CheckCircle2, LayoutTemplate } from 'lucide-react';
import CareerPreview from './CareerPreview';
import CareerEditorPanel from './CareerEditorPanel';
import CareerLayerPanel from './CareerLayerPanel';

import api from '../../../utils/api';
import { message } from 'antd';

export default function CareerBuilder() {
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastPublished, setLastPublished] = useState(null);
    const [previewMode, setPreviewMode] = useState("desktop");

    // Core State
    const [config, setConfig] = useState({
        sections: [],
        theme: { primaryColor: '#4F46E5' }
    });

    const [selectedBlockId, setSelectedBlockId] = useState(null);

    // Live Data for Preview
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchConfig();
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await api.get('/requirements');
            if (res.data && res.data.requirements) {
                setJobs(res.data.requirements);
            } else if (Array.isArray(res.data)) {
                setJobs(res.data);
            }
        } catch (error) {
            console.error("Fetch jobs error:", error);
        }
    };

    const fetchConfig = async () => {
        try {
            setLoading(true);


            const res = await api.get('/hr/career/customize');



            if (res.data) {
                // Ensure defaulting if fields missing
                const configData = {
                    sections: res.data.sections || [],
                    theme: res.data.theme || { primaryColor: '#4F46E5' }
                };
                setConfig(configData);
                if (res.data.lastPublishedAt) setLastPublished(res.data.lastPublishedAt);

                // FORCE RESTORE 'openings' SECTION IF MISSING
                // User requirement: Must be visible by default for editing
                const hasOpenings = configData.sections.some(s => s.type === 'openings');
                if (!hasOpenings) {
                    configData.sections.push({
                        id: 'openings-default-' + Date.now(),
                        type: 'openings',
                        content: {
                            title: "Open Positions",
                            layout: "grid",
                            gridColumns: 3,
                            cardStyle: "rounded",
                            cardBackground: "#ffffff",
                            showDept: true,
                            showExperience: true,
                            showPostedDate: true,
                            showDescription: true,
                            applyButtonText: "Apply Now",
                            applyButtonStyle: "filled",
                            applyButtonColor: "#2563EB",
                            gap: 8,
                            enabled: true
                        },
                        order: 10
                    });
                }

                if (configData.sections.length > 0 && !selectedBlockId) {
                    setSelectedBlockId(configData.sections[0].id);
                }
            }
        } catch (error) {
            console.error("Fetch usage error:", error);
            message.warning("Could not load saved configuration. Loading defaults.");
            // Fallback to default if API fails
            setConfig({
                sections: [
                    {
                        id: 'hero-default',
                        type: 'hero',
                        content: {
                            title: "Join Our Amazing Team",
                            subtitle: "Innovate, grow, and build the future with us.",
                            bgType: "gradient",
                            bgColor: "from-[#4F46E5] via-[#9333EA] to-[#EC4899]",
                            ctaText: "Check Open Positions"
                        }
                    },
                    {
                        id: 'openings-default',
                        type: 'openings',
                        content: {
                            title: "Open Positions",
                            layout: "grid",
                            gridColumns: 3,
                            enabled: true
                        }
                    }
                ],
                theme: { primaryColor: '#4F46E5' }
            });
            if (!selectedBlockId) setSelectedBlockId('hero-default');
        } finally {
            setLoading(false);
        }
    };

    // ============= SAVE LOGIC =============

    const handleSaveSections = async () => {
        try {
            setSaving(true);

            // Clean payload (remove large assets if any slipped in)
            const cleanSections = config.sections.map(s => {
                // Clone and remove unwanted props
                const { preview, ...rest } = s;
                return rest;
            });

            await api.post('/career/sections/save', {
                sections: cleanSections,
                theme: config.theme
            });

            message.success("✅ Design saved to draft");
        } catch (error) {
            console.error("Save error:", error);
            message.error("Failed to save design: " + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };



    const handlePublish = async () => {
        try {
            setPublishing(true);

            if (config.sections.length === 0) {
                message.warning("⚠️ Page is empty. Add some sections!");
                return;
            }


            // 1. Force Save Current State First (Both SEO and Sections)
            const cleanSections = config.sections.map(s => {
                const { preview, ...rest } = s;
                return rest;
            });

            await Promise.all([
                api.post('/career/sections/save', { sections: cleanSections, theme: config.theme })
            ]);

            // 2. Trigger Publish

            if (res.data && res.data.success) {
                message.success("🎉 Career Page Published Live!");
                setLastPublished(new Date());

                // Removed auto-redirect as per user request
                // The user can manually navigate to the public page
            } else {
                throw new Error("Publish response missing success flag");
            }
        } catch (error) {
            console.error("Publish error:", error);
            message.error("Publish failed: " + (error.response?.data?.error || error.message));
        } finally {
            setPublishing(false);
        }
    };

    // ============= EDITOR LOGIC =============

    const addBlock = (type) => {
        const newBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content: getDefaultContentForType(type)
        };
        setConfig(prev => ({
            ...prev,
            sections: [...prev.sections, newBlock]
        }));
        setSelectedBlockId(newBlock.id);
    };

    const updateBlock = (id, content) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === id ? { ...s, content } : s)
        }));
    };

    const removeBlock = (id) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== id)
        }));
        if (selectedBlockId === id) setSelectedBlockId(null);
    };

    const reorderBlocks = (fromIndex, toIndex) => {
        const newSections = [...config.sections];
        const [movedItem] = newSections.splice(fromIndex, 1);
        newSections.splice(toIndex, 0, movedItem);
        setConfig(prev => ({ ...prev, sections: newSections }));
    };

    const getDefaultContentForType = (type) => {
        switch (type) {
            case 'hero': return {
                title: "Join Our Amazing Team",
                subtitle: "Innovate, grow, and build the future with us.",
                bgType: "gradient",
                bgColor: "from-[#4F46E5] via-[#9333EA] to-[#EC4899]",
                ctaText: "Check Open Positions"
            };
            case 'openings': return {
                title: "Open Positions",
                layout: "grid",
                gridColumns: 3,
                cardStyle: "rounded",
                cardBackground: "#ffffff",
                showDept: true,
                showExperience: true,
                showPostedDate: true,
                showDescription: true,
                applyButtonText: "Apply Now",
                applyButtonStyle: "filled",
                applyButtonColor: "#2563EB",
                gap: 8
            };
            case 'highlights': return {
                title: "Why Join Us?",
                cards: [
                    { id: 1, title: "Feature 1", description: "Description here" },
                    { id: 2, title: "Feature 2", description: "Description here" }
                ]
            };
            case 'faq': return {
                title: "Frequently Asked Questions",
                items: [
                    { id: 1, question: "What is the interview process?", answer: "We have a 3-step process..." },
                    { id: 2, question: "Do you offer remote work?", answer: "Yes, we are remote-first!" }
                ]
            };
            case 'testimonials': return {
                title: "What our team says",
                cards: [
                    { id: 1, name: "John Doe", role: "Developer", quote: "Great place to work!", image: "" }
                ]
            };
            case 'company-info': return {
                title: "About Us",
                description: "We are a great company committed to excellence and innovation."
            };
            default: return { title: "New Section" };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Loading Builder...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <LayoutTemplate size={20} className="text-blue-600" />
                            Career Page Builder
                        </h1>
                        {lastPublished && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                    Last Live: {new Date(lastPublished).toLocaleTimeString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">


                    <button
                        onClick={handleSaveSections}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all text-sm"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save Draft
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold shadow-lg shadow-gray-200 hover:bg-black hover:shadow-xl transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                    >
                        {publishing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        {publishing ? 'Publishing...' : 'Publish Live'}
                    </button>
                </div>
            </header>

            {/* Workspace */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel */}
                <CareerLayerPanel
                    sections={config.sections}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={setSelectedBlockId}
                    onReorder={reorderBlocks}
                    onRemoveBlock={removeBlock}
                />

                {/* Canvas */}
                <div className="flex-1 bg-gray-200/50 relative overflow-hidden flex flex-col items-center">
                    <style>{`
                        .mobile-preview {
                            width: 390px;
                            height: 844px;
                            margin: 20px auto;
                            border: 12px solid #1a1a1a;
                            border-radius: 40px;
                            box-shadow: 0 20px 50px rgba(0,0,0,0.15);
                            overflow-y: auto;
                            overflow-x: hidden;
                            background: white;
                            position: relative;
                            scrollbar-width: none;
                        }
                        .mobile-preview::-webkit-scrollbar {
                            display: none;
                        }
                        .mobile-preview::before {
                            content: '';
                            position: sticky;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 150px;
                            height: 25px;
                            background: #1a1a1a;
                            border-bottom-left-radius: 20px;
                            border-bottom-right-radius: 20px;
                            z-index: 100;
                        }
                        .desktop-preview {
                            width: 100%;
                            border: none;
                            box-shadow: none;
                        }
                    `}</style>
                    <div className="w-full h-full p-8 overflow-y-auto scrollbar-hide flex justify-center">
                        <div className={`transition-all duration-500 ease-in-out ${previewMode === "mobile" ? "mobile-preview" : "desktop-preview max-w-[1440px] mx-auto"}`}>
                            <CareerPreview
                                config={config}
                                selectedBlockId={selectedBlockId}
                                onSelectBlock={setSelectedBlockId}
                                jobs={jobs.filter(j => j.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()))}
                                searchTerm={searchTerm}
                                onSearch={setSearchTerm}
                                isBuilder={true}
                                previewMode={previewMode}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <CareerEditorPanel
                    config={config}
                    selectedBlockId={selectedBlockId}
                    onAddBlock={addBlock}
                    onUpdateBlock={updateBlock}
                    onRemoveBlock={removeBlock}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                />
            </div>
        </div>
    );
}
