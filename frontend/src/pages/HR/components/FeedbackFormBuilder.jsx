import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Settings2, CheckCircle2, AlertCircle } from 'lucide-react';

const FIELD_TYPES = [
    { value: 'text', label: 'Short Answer' },
    { value: 'paragraph', label: 'Detailed Paragraph' },
    { value: 'rating', label: 'Rating (1-5)' },
    { value: 'yes_no', label: 'Yes / No' },
    { value: 'dropdown', label: 'Dropdown Selection' }
];

export default function FeedbackFormBuilder({ onSave, initialData, onCancel }) {
    const [name, setName] = useState(initialData?.name || '');
    const [fields, setFields] = useState(initialData?.fields || [
        { label: 'Overall Impression', type: 'paragraph', required: true }
    ]);

    const addField = () => {
        setFields([...fields, { label: '', type: 'text', required: false, options: [] }]);
    };

    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index, updates) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const handleSave = () => {
        if (!name) return alert('Please provide a name for this form.');
        if (fields.length === 0) return alert('Please add at least one field.');
        onSave({ name, fields });
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Evaluation Form Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Technical Interview Feedback"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-700"
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Questionnaire Designer</h3>
                    <button
                        onClick={addField}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={14} /> Add Criterion
                    </button>
                </div>

                <div className="space-y-3">
                    {fields.map((field, idx) => (
                        <div key={idx} className="group relative bg-white border border-slate-200 p-5 rounded-2xl hover:border-indigo-300 transition-all shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                <div className="md:col-span-6 space-y-2">
                                    <input
                                        placeholder="Enter evaluation criteria/question..."
                                        value={field.label}
                                        onChange={(e) => updateField(idx, { label: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-700 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateField(idx, { type: e.target.value, options: e.target.value === 'dropdown' ? ['Excellent', 'Good', 'Average', 'Poor'] : [] })}
                                        className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-500 outline-none"
                                    >
                                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2 flex items-center justify-center pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateField(idx, { required: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Required</span>
                                    </label>
                                </div>
                                <div className="md:col-span-1 flex justify-end pt-2">
                                    <button onClick={() => removeField(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {field.type === 'dropdown' && (
                                    <div className="md:col-span-12 mt-2 pl-4 border-l-2 border-indigo-100 space-y-2">
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Dropdown Options (Comma Separated)</span>
                                        <input
                                            value={field.options.join(', ')}
                                            onChange={(e) => updateField(idx, { options: e.target.value.split(',').map(o => o.trim()).filter(o => o) })}
                                            className="w-full px-3 py-2 bg-indigo-50/30 border-none rounded-lg text-xs font-semibold text-indigo-700 outline-none"
                                            placeholder="Excellent, Good, Needs Improvement..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all tracking-tight"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all tracking-tight"
                >
                    Finalize Form Structure
                </button>
            </div>
        </div>
    );
}
