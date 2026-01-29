import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import CareerPreview from './CareerPreview';
import CareerEditorPanel from './CareerEditorPanel';
import CareerLayerPanel from './CareerLayerPanel';
import api from '../../../utils/api';
import { message } from 'antd';

export default function CareerBuilder() {
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [lastPublished, setLastPublished] = useState(null);
    const [config, setConfig] = useState({
        sections: [],
        theme: { primaryColor: '#4F46E5' }
    });
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter jobs for the preview
    const filteredJobs = jobs.filter(job =>
        (job.jobTitle?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.department?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        fetchConfig();
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await api.get('/hrms/requirements');
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
            const res = await api.get('/hrms/hr/career/customize');
            if (res.data) {
                setConfig(res.data);
                if (res.data.lastPublishedAt) setLastPublished(res.data.lastPublishedAt);
                if (res.data.sections?.length > 0) {
                    setSelectedBlockId(res.data.sections[0].id);
                }
            } else {
                // Default Config
                const defaults = {
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
                                cardStyle: "rounded",
                                cardBackground: "#ffffff",
                                showDept: true,
                                showExperience: true,
                                showPostedDate: true,
                                showDescription: true,
                                applyButtonText: "Apply Now",
                                applyButtonStyle: "filled",
                                applyButtonColor: "#2563EB", // blue-600
                                gap: 8
                            }
                        }
                    ],
                    theme: { primaryColor: '#4F46E5' }
                };
                setConfig(defaults);
                setSelectedBlockId(defaults.sections[0].id);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            message.error("Failed to load configuration");
        } finally {
            setLoading(false);
        }
    };



    const handlePublish = async () => {
        try {
            setPublishing(true);

            // Atomic Publish: Send config directly to publish endpoint
            // This ensures exactly what is in the editor goes live immediately
            const res = await api.post('/hrms/hr/career/publish', config);

            if (res.data && res.data.success) {
                message.success("Career Page Published Live!");
                setLastPublished(new Date());
            }
        } catch (error) {
            console.error("Publish error:", error);
            const errMsg = error.response?.data?.error || "Failed to publish page";
            message.error(errMsg);
        } finally {
            setPublishing(false);
        }
    };

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

    const getDefaultContentForType = (type) => {
        switch (type) {
            case 'hero': return { title: "New Hero Section", subtitle: "Welcome to our careers page.", bgType: "gradient", ctaText: "Check Jobs" };
            case 'openings': return {
                title: "Open Positions",
                layout: "grid",
                gridColumns: 3,
                cardStyle: "rounded",
                showDept: true,
                applyButtonText: "Apply Now",
                applyButtonStyle: "filled",
                applyButtonColor: "#2563EB"
            };
            case 'highlights': return {
                title: "Why Join Us?", cards: [
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
                title: "What our team says", cards: [
                    { id: 1, name: "John Doe", role: "Developer", quote: "Great place to work!", image: "" }
                ]
            };
            case 'company-info': return { title: "About Us", description: "We are a great company." };
            default: return { title: "New Section" };
        }
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Builder...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
            {/* Top Toolbar */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight">Career Page Builder</h1>
                        <div className="flex items-center gap-2">
                            {lastPublished && (
                                <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    Last Live: {new Date(lastPublished).toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const tenantId = localStorage.getItem('tenantId');
                            if (tenantId) {
                                window.open(`/jobs/${tenantId}`, '_blank');
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 font-bold hover:bg-gray-50 rounded-lg transition-all text-sm"
                    >
                        <ArrowLeft size={16} className="rotate-180" />
                        View Live Page
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50 text-sm"
                    >
                        {publishing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        Publish Live
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT: Navigation / Layers */}
                <CareerLayerPanel
                    sections={config.sections}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={setSelectedBlockId}
                    onReorder={reorderBlocks}
                    onRemoveBlock={removeBlock}
                />

                {/* CENTER: Canvas / Preview */}
                <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col items-center">
                    {/* Device Frame Wrapper for aesthetics */}
                    <div className="w-full h-full p-8 overflow-y-auto scrollbar-hide">
                        <div className="min-h-full transition-all duration-300 mx-auto max-w-[1400px]">
                            {/* Pass jobs to preview for live data */}
                            <CareerPreview
                                config={config}
                                selectedBlockId={selectedBlockId}
                                onSelectBlock={setSelectedBlockId}
                                jobs={filteredJobs} // Pass FILTERED jobs
                                searchTerm={searchTerm}
                                onSearch={setSearchTerm}
                                isBuilder={true}
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Editor Panel */}
                <CareerEditorPanel
                    config={config}
                    selectedBlockId={selectedBlockId}
                    onAddBlock={addBlock}
                    onUpdateBlock={updateBlock}
                    onRemoveBlock={removeBlock}
                />
            </div>
        </div>
    );
}
