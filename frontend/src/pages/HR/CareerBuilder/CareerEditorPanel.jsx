import React, { useState } from 'react';
import {
    Plus,
    Trash2,
    Layout,
    Type,
    Image as ImageIcon,
    CheckCircle,
    PlusCircle,
    Grid,
    List,
    Eye,
    ChevronDown,
    Palette,
    Settings,
    MessageSquare,
    HelpCircle,
    Zap
} from 'lucide-react';

export default function CareerEditorPanel({
    config,
    selectedBlockId,
    onAddBlock,
    onUpdateBlock,
    onRemoveBlock
}) {
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

    const availableBlocks = [
        { type: 'hero', name: 'Hero Section', icon: <Layout className="w-5 h-5" />, desc: 'Large banner with title & CTA' },
        { type: 'openings', name: 'Current Openings', icon: <PlusCircle className="w-5 h-5" />, desc: 'Job listings grid/list' },
        { type: 'highlights', name: 'Highlights', icon: <Zap className="w-5 h-5" />, desc: 'Key features/metrics cards' },
        { type: 'company-info', name: 'Company Info', icon: <ImageIcon className="w-5 h-5" />, desc: 'About us text & media' },
        { type: 'testimonials', name: 'Testimonials', icon: <MessageSquare className="w-5 h-5" />, desc: 'Employee or client quotes' },
        { type: 'faq', name: 'FAQ Section', icon: <HelpCircle className="w-5 h-5" />, desc: 'Frequently asked questions' },
    ];

    const selectedBlock = config?.sections?.find(s => s.id === selectedBlockId);

    const updateContent = (updates) => {
        if (!selectedBlock) return;
        onUpdateBlock(selectedBlockId, { ...selectedBlock.content, ...updates });
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-100 w-80 font-sans shadow-xl z-20">
            {/* Header / Add Section */}
            <div className="p-4 border-b border-gray-50 bg-white z-20">
                <div className="relative">
                    <button
                        onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold text-sm active:scale-95"
                    >
                        <span className="flex items-center gap-2"><Plus size={16} /> Add New Section</span>
                        <ChevronDown size={14} className={`transition-transformDuration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isAddMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsAddMenuOpen(false)}></div>
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 max-h-[400px] overflow-y-auto">
                                <div className="p-2 space-y-1">
                                    {availableBlocks.map(block => (
                                        <button
                                            key={block.type}
                                            onClick={() => {
                                                onAddBlock(block.type);
                                                setIsAddMenuOpen(false);
                                            }}
                                            className="w-full text-left p-3 rounded-xl hover:bg-gray-50 flex items-start gap-3 transition-colors group"
                                        >
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                {block.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{block.name}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1">{block.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Block Settings Content */}
            {!selectedBlock ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
                        <Settings size={32} />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">No Selection</h3>
                    <p className="text-xs text-gray-500">Select a section from the left sidebar or preview to edit settings.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="p-4 border-b border-gray-50 sticky top-0 bg-white/95 backdrop-blur z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {selectedBlock.type}
                            </span>
                        </div>
                        <h2 className="text-lg font-black text-gray-900">Customization</h2>
                    </div>

                    <div className="p-5 space-y-6">
                        {/* GLOBAL: Title */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Section Heading</label>
                            <input
                                type="text"
                                value={selectedBlock.content?.title || ''}
                                onChange={(e) => updateContent({ title: e.target.value })}
                                className="w-full px-3 py-2.5 bg-gray-50 rounded-lg border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none hover:bg-gray-100 transition-all font-medium text-sm"
                                placeholder="e.g., Our Openings"
                            />
                        </div>

                        {/* ================= HERO SETTINGS ================= */}
                        {selectedBlock.type === 'hero' && (
                            <>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Headline Text</label>
                                    <textarea
                                        value={selectedBlock.content?.subtitle || ''}
                                        onChange={(e) => updateContent({ subtitle: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 rounded-lg border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none hover:bg-gray-100 transition-all font-medium text-sm h-24 resize-none"
                                        placeholder="Subtitle..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Button Label</label>
                                    <input
                                        type="text"
                                        value={selectedBlock.content?.ctaText || ''}
                                        onChange={(e) => updateContent({ ctaText: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 rounded-lg border-none text-sm font-medium"
                                    />
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Background Style</label>
                                    <div className="flex p-1 bg-gray-100 rounded-lg">
                                        {['gradient', 'image'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => updateContent({ bgType: type })}
                                                className={`flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${selectedBlock.content?.bgType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {selectedBlock.content?.bgType === 'gradient' ? (
                                        <input
                                            type="text"
                                            value={selectedBlock.content?.bgColor || ''}
                                            onChange={(e) => updateContent({ bgColor: e.target.value })}
                                            className="w-full text-xs font-mono px-3 py-2 bg-gray-50 rounded-lg border-none"
                                            placeholder="Tailwind gradient classes"
                                        />
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => updateContent({ imageUrl: reader.result });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <span className="text-xs font-bold text-gray-500">
                                                {selectedBlock.content?.imageUrl ? 'Change Image' : 'Upload Image'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ================= OPENINGS SETTINGS ================= */}
                        {selectedBlock.type === 'openings' && (
                            <>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Layout Mode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => updateContent({ layout: 'grid' })}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border font-bold text-sm transition-all ${selectedBlock.content?.layout === 'grid' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <Grid size={14} /> Grid
                                        </button>
                                        <button
                                            onClick={() => updateContent({ layout: 'list' })}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border font-bold text-sm transition-all ${selectedBlock.content?.layout === 'list' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <List size={14} /> List
                                        </button>
                                    </div>
                                </div>

                                {selectedBlock.content?.layout === 'grid' && (
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grid Columns</label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            {[2, 3, 4].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => updateContent({ gridColumns: num })}
                                                    className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${Number(selectedBlock.content?.gridColumns || 3) === num ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                                >
                                                    {num} cols
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Card Appearance</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['rounded', 'sharp', 'shadow', 'border'].map(style => (
                                            <button
                                                key={style}
                                                onClick={() => updateContent({ cardStyle: style })}
                                                className={`py-2 px-2 text-xs font-bold capitalize rounded-lg border transition-all ${selectedBlock.content?.cardStyle === style ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Background</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={selectedBlock.content?.cardBackground || '#ffffff'}
                                                onChange={(e) => updateContent({ cardBackground: e.target.value })}
                                                className="w-6 h-6 rounded overflow-hidden cursor-pointer border-none p-0"
                                            />
                                            <span className="text-xs font-mono text-gray-400">{selectedBlock.content?.cardBackground}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Apply Button</label>
                                    <input
                                        type="text"
                                        placeholder="Button Text"
                                        value={selectedBlock.content?.applyButtonText || 'Apply Now'}
                                        onChange={e => updateContent({ applyButtonText: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border-none mb-2"
                                    />
                                    <div className="grid grid-cols-3 gap-1">
                                        {['filled', 'outline', 'soft'].map(btnStyle => (
                                            <button
                                                key={btnStyle}
                                                onClick={() => updateContent({ applyButtonStyle: btnStyle })}
                                                className={`py-1.5 text-[10px] font-bold uppercase rounded border ${selectedBlock.content?.applyButtonStyle === btnStyle ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500'}`}
                                            >
                                                {btnStyle}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Display Fields</label>
                                    {[
                                        ['showDept', 'Department'],
                                        ['showExperience', 'Experience'],
                                        ['showPostedDate', 'Posted Date'],
                                        ['showDescription', 'Description'],
                                        ['showLocation', 'Location']
                                    ].map(([key, label]) => (
                                        <label key={key} className="flex items-center justify-between cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{label}</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${selectedBlock.content?.[key] !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBlock.content?.[key] !== false}
                                                    onChange={(e) => updateContent({ [key]: e.target.checked })}
                                                    className="hidden"
                                                />
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${selectedBlock.content?.[key] !== false ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ================= HIGHLIGHTS SETTINGS ================= */}
                        {selectedBlock.type === 'highlights' && (
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Highlight Cards</label>
                                {selectedBlock.content?.cards?.map((card, idx) => (
                                    <div key={card.id || idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative group">
                                        <button
                                            onClick={() => {
                                                const newCards = [...(selectedBlock.content.cards || [])];
                                                newCards.splice(idx, 1);
                                                updateContent({ cards: newCards });
                                            }}
                                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <input
                                            value={card.title}
                                            onChange={e => {
                                                const newCards = [...(selectedBlock.content.cards || [])];
                                                newCards[idx] = { ...card, title: e.target.value };
                                                updateContent({ cards: newCards });
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-bold mb-2 pr-6"
                                            placeholder="Card Title"
                                        />
                                        <textarea
                                            value={card.description}
                                            onChange={e => {
                                                const newCards = [...(selectedBlock.content.cards || [])];
                                                newCards[idx] = { ...card, description: e.target.value };
                                                updateContent({ cards: newCards });
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                            rows={2}
                                            placeholder="Description"
                                        />
                                        <select
                                            value={card.icon || 'Zap'}
                                            onChange={e => {
                                                const newCards = [...(selectedBlock.content.cards || [])];
                                                newCards[idx] = { ...card, icon: e.target.value };
                                                updateContent({ cards: newCards });
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs mt-2"
                                        >
                                            {['Zap', 'Users', 'Globe', 'Star', 'Heart', 'Shield', 'Award', 'Coffee'].map(icon => (
                                                <option key={icon} value={icon}>{icon}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const newCards = [...(selectedBlock.content.cards || [])];
                                        newCards.push({ id: Date.now(), title: "New Feature", description: "Describe it here", icon: "Star" });
                                        updateContent({ cards: newCards });
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 font-bold text-xs hover:border-blue-400 hover:text-blue-500 transition-colors"
                                >
                                    + Add Card
                                </button>
                            </div>
                        )}

                        {/* ================= FAQ SETTINGS ================= */}
                        {selectedBlock.type === 'faq' && (
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Questions</label>
                                {selectedBlock.content?.faqs?.map((faq, idx) => (
                                    <div key={faq.id || idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative">
                                        <button
                                            onClick={() => {
                                                const newFaqs = [...(selectedBlock.content.faqs || [])];
                                                newFaqs.splice(idx, 1);
                                                updateContent({ faqs: newFaqs });
                                            }}
                                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <input
                                            value={faq.question}
                                            onChange={e => {
                                                const newFaqs = [...(selectedBlock.content.faqs || [])];
                                                newFaqs[idx] = { ...faq, question: e.target.value };
                                                updateContent({ faqs: newFaqs });
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-bold mb-2 pr-6"
                                            placeholder="Question"
                                        />
                                        <textarea
                                            value={faq.answer}
                                            onChange={e => {
                                                const newFaqs = [...(selectedBlock.content.faqs || [])];
                                                newFaqs[idx] = { ...faq, answer: e.target.value };
                                                updateContent({ faqs: newFaqs });
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                            rows={2}
                                            placeholder="Answer"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const newFaqs = [...(selectedBlock.content.faqs || [])];
                                        newFaqs.push({ id: Date.now(), question: "New Question?", answer: "Answer here." });
                                        updateContent({ faqs: newFaqs });
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 font-bold text-xs hover:border-blue-400 hover:text-blue-500 transition-colors"
                                >
                                    + Add Question
                                </button>
                            </div>
                        )}

                        {/* ================= COMPANY INFO SETTINGS ================= */}
                        {selectedBlock.type === 'company-info' && (
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content</label>
                                <textarea
                                    value={selectedBlock.content?.description || ''}
                                    onChange={(e) => updateContent({ description: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border-none text-sm h-32"
                                    placeholder="Company description..."
                                />
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Stats Items</label>
                                    {selectedBlock.content?.stats?.map((stat, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                value={stat.value}
                                                onChange={e => {
                                                    const newStats = [...(selectedBlock.content.stats || [])];
                                                    newStats[idx] = { ...stat, value: e.target.value };
                                                    updateContent({ stats: newStats });
                                                }}
                                                className="w-1/3 bg-gray-50 rounded px-2 py-1 text-sm border-none"
                                                placeholder="Value (e.g. 50+)"
                                            />
                                            <input
                                                value={stat.label}
                                                onChange={e => {
                                                    const newStats = [...(selectedBlock.content.stats || [])];
                                                    newStats[idx] = { ...stat, label: e.target.value };
                                                    updateContent({ stats: newStats });
                                                }}
                                                className="flex-1 bg-gray-50 rounded px-2 py-1 text-sm border-none"
                                                placeholder="Label (e.g. Employees)"
                                            />
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const newStats = [...(selectedBlock.content.stats || [])];
                                            newStats.push({ value: "100+", label: "New Stat" });
                                            updateContent({ stats: newStats });
                                        }}
                                        className="text-xs text-blue-600 font-bold hover:underline"
                                    >
                                        + Add Stat
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ================= TESTIMONIALS SETTINGS ================= */}
                        {selectedBlock.type === 'testimonials' && (
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Testimonial Cards</label>
                                {selectedBlock.content?.testimonials?.map((t, idx) => (
                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative group">
                                        <button
                                            onClick={() => {
                                                const newTests = [...(selectedBlock.content.testimonials || [])];
                                                newTests.splice(idx, 1);
                                                updateContent({ testimonials: newTests });
                                            }}
                                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <div className="flex gap-2 mb-2">
                                            <img src={t.image} alt="" className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    value={t.name}
                                                    onChange={e => {
                                                        const newTests = [...(selectedBlock.content.testimonials || [])];
                                                        newTests[idx] = { ...t, name: e.target.value };
                                                        updateContent({ testimonials: newTests });
                                                    }}
                                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-bold"
                                                    placeholder="Name"
                                                />
                                                <input
                                                    value={t.role}
                                                    onChange={e => {
                                                        const newTests = [...(selectedBlock.content.testimonials || [])];
                                                        newTests[idx] = { ...t, role: e.target.value };
                                                        updateContent({ testimonials: newTests });
                                                    }}
                                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                                    placeholder="Role"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            value={t.quote}
                                            onChange={e => {
                                                const newTests = [...(selectedBlock.content.testimonials || [])];
                                                newTests[idx] = { ...t, quote: e.target.value };
                                                updateContent({ testimonials: newTests });
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                            rows={2}
                                            placeholder="Quote..."
                                        />
                                        <input
                                            value={t.image}
                                            onChange={e => {
                                                const newTests = [...(selectedBlock.content.testimonials || [])];
                                                newTests[idx] = { ...t, image: e.target.value };
                                                updateContent({ testimonials: newTests });
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] mt-2 text-gray-400 font-mono"
                                            placeholder="Image URL (http...)"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const newTests = [...(selectedBlock.content.testimonials || [])];
                                        newTests.push({ name: "New Person", role: "Role", quote: "Great place!", image: "https://i.pravatar.cc/150" });
                                        updateContent({ testimonials: newTests });
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 font-bold text-xs hover:border-blue-400 hover:text-blue-500 transition-colors"
                                >
                                    + Add Testimonial
                                </button>
                            </div>
                        )}

                        <div className="pt-8 mt-4 border-t border-gray-100">
                            <button
                                onClick={() => onRemoveBlock(selectedBlockId)}
                                className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Trash2 size={16} /> Remove Section
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
