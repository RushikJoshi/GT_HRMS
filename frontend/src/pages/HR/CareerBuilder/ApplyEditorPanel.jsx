import React, { useState } from 'react';
import { Settings, Trash2, Plus, GripVertical, X } from 'lucide-react';

export default function ApplyEditorPanel({ config, selectedSectionId, onUpdateSection }) {

    // Find the currently selected section
    const currentSection = config.sections.find(s => s.id === selectedSectionId);

    if (!selectedSectionId || !currentSection) {
        return (
            <div className="w-80 bg-white border-l border-gray-200 p-8 flex flex-col items-center justify-center text-center shrink-0">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                    <Settings size={32} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">No Section Selected</h3>
                <p className="text-xs text-gray-500">Select a section from the left or click on the preview to edit properties.</p>
            </div>
        );
    }

    const handleAddField = () => {
        const newField = {
            id: `field_${Date.now()}`,
            label: "New Field",
            type: "text",
            required: false,
            width: "full",
            placeholder: "",
            helpText: ""
        };
        const updatedFields = [...(currentSection.fields || []), newField];
        onUpdateSection(selectedSectionId, { fields: updatedFields });
    };

    const updateField = (fieldId, updates) => {
        const updatedFields = currentSection.fields.map(f =>
            f.id === fieldId ? { ...f, ...updates } : f
        );
        onUpdateSection(selectedSectionId, { fields: updatedFields });
    };

    const removeField = (fieldId) => {
        const updatedFields = currentSection.fields.filter(f => f.id !== fieldId);
        onUpdateSection(selectedSectionId, { fields: updatedFields });
    };

    return (
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 h-full overflow-hidden text-gray-800 font-sans z-30 shadow-xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                    <h2 className="text-sm font-black text-gray-900 tracking-tight">Edit Section</h2>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Properties</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Section Title */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Section Title</label>
                    <input
                        type="text"
                        value={currentSection.title}
                        onChange={(e) => onUpdateSection(selectedSectionId, { title: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                <div className="h-px bg-gray-100"></div>

                {/* Fields List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fields</label>
                        <button
                            onClick={handleAddField}
                            className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                        >
                            <Plus size={12} /> Add Field
                        </button>
                    </div>

                    <div className="space-y-4">
                        {currentSection.fields?.map((field, idx) => (
                            <div key={field.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4 group hover:border-blue-300 hover:shadow-md transition-all">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                                    <span className="text-xs font-bold text-gray-400">Field #{idx + 1}</span>
                                    <button onClick={() => removeField(field.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                                </div>

                                {/* ID Row */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase flex justify-between">
                                        System ID <span className="text-[9px] text-blue-500 normal-case">(fatherName, dob, mobile)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={field.id}
                                        onChange={(e) => updateField(field.id, { id: e.target.value })}
                                        className="w-full bg-slate-100 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-600 focus:border-blue-500 outline-none"
                                        placeholder="system_key"
                                    />
                                </div>

                                {/* Label & Type Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Label</label>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Type</label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                                        >
                                            <option value="text">Text Input</option>
                                            <option value="textarea">Text Area</option>
                                            <option value="email">Email</option>
                                            <option value="tel">Phone</option>
                                            <option value="file">File Upload</option>
                                            <option value="select">Dropdown</option>
                                            <option value="date">Date</option>
                                            <option value="url">URL</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Width & Required Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Width</label>
                                        <select
                                            value={field.width}
                                            onChange={(e) => updateField(field.id, { width: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                                        >
                                            <option value="full">Full Width</option>
                                            <option value="half">Half (1/2)</option>
                                            <option value="third">Third (1/3)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                            <span className="text-xs font-bold text-gray-600">Required</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Placeholder */}
                                {['text', 'email', 'tel', 'url', 'textarea'].includes(field.type) && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Placeholder</label>
                                        <input
                                            type="text"
                                            value={field.placeholder || ''}
                                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                                            placeholder="e.g. Enter your name..."
                                        />
                                    </div>
                                )}

                                {/* Options for Select */}
                                {field.type === 'select' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Options (comma separated)</label>
                                        <input
                                            type="text"
                                            value={field.options?.join(', ') || ''}
                                            onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                                            placeholder="Option A, Option B, Option C"
                                        />
                                    </div>
                                )}

                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
