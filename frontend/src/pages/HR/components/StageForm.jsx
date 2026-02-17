import React, { useState, useEffect } from 'react';
import { Type, Users, Clock, Globe, FileText, ChevronDown, ListChecks, Calendar, ClipboardCheck, X, Settings2, Plus, Check, Monitor, Building, Shuffle, AlertCircle } from 'lucide-react';
import api from '../../../utils/api';
import { Modal, Select } from 'antd';
import FeedbackFormBuilder from './FeedbackFormBuilder';

const STAGE_TYPES = [
    { value: 'Screening', label: 'Screening Round (Review)', icon: ListChecks, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { value: 'Interview', label: 'Interview Round (Interactive)', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    { value: 'Assessment', label: 'Assessment Round (Test)', icon: ClipboardCheck, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
    { value: 'HR', label: 'HR Round', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'Discussion', label: 'Discussion Round', icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
];

const INTERVIEW_MODES = [
    { value: 'Online', label: 'Online Remote', icon: Monitor },
    { value: 'Office', label: 'Office Presence', icon: Building },
    { value: 'Hybrid', label: 'Hybrid Format', icon: Shuffle }
];

export default function StageForm({ initialData, onSubmit, onCancel, isLocked = false }) {
    const [employees, setEmployees] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [showBuilder, setShowBuilder] = useState(false);

    // Determine initial feedback mode
    const getInitialFeedbackMode = () => {
        if (initialData?.feedbackTemplateId) return 'existing';
        return 'none';
    };
    const [feedbackMode, setFeedbackMode] = useState(getInitialFeedbackMode());

    const [formData, setFormData] = useState({
        stageName: '',
        stageType: 'Interview',
        assignedInterviewer: '',
        mode: 'Online',
        durationMinutes: 30,
        evaluationNotes: '',
        feedbackTemplateId: null,
        ...initialData
    });

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await api.get('/feedback/templates');
                if (res.data.success) {
                    setTemplates(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch templates:', err);
            }
        };
        fetchTemplates();
    }, []);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await api.get('/employees?status=Active');
                if (res.data.success) {
                    setEmployees(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch employees:', err);
            }
        };
        fetchEmployees();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'durationMinutes' ? parseInt(value) || 0 : value
        }));
    };

    const handleInterviewerChange = (value) => {
        setFormData(prev => ({
            ...prev,
            assignedInterviewer: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const currentType = STAGE_TYPES.find(t => t.value === formData.stageType) || STAGE_TYPES[1];

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar p-1">
            {/* Header Card */}
            <div className={`p-6 rounded-3xl border ${currentType.border} flex items-center gap-5 relative overflow-hidden ${currentType.bg} transition-colors duration-300`}>
                <div className={`w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center ${currentType.color} ring-4 ring-white/50 shrink-0`}>
                    <currentType.icon size={28} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{currentType.label.split('(')[0]}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{currentType.label.split('(')[1]?.replace(')', '') || 'Standard Round'}</p>
                </div>
                {/* Decoration */}
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/40 to-transparent pointer-events-none"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                {/* Stage Name */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Type size={12} /> Stage Name
                    </label>
                    <input
                        type="text"
                        name="stageName"
                        value={formData.stageName}
                        onChange={handleChange}
                        disabled={isLocked}
                        placeholder="e.g. Technical Deep Dive"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all placeholder:text-slate-300"
                        required
                    />
                </div>

                {/* Stage Type */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <ListChecks size={12} /> Stage Type
                    </label>
                    <div className="relative">
                        <select
                            name="stageType"
                            value={formData.stageType}
                            onChange={handleChange}
                            disabled={isLocked}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm appearance-none transition-all cursor-pointer"
                        >
                            {STAGE_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Assign Interviewer */}
                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Users size={12} /> Assign Interviewer (Default)
                    </label>
                    <Select
                        showSearch
                        allowClear
                        placeholder="Search & Select Interviewer..."
                        value={formData.assignedInterviewer || undefined}
                        onChange={handleInterviewerChange}
                        className="w-full h-[50px] custom-antd-select font-bold"
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={employees.map(emp => ({
                            label: `${emp.firstName} ${emp.lastName}`,
                            value: emp._id
                        }))}
                    />
                    <p className="text-[10px] text-slate-400 font-medium ml-1">Optional. You can also assign interviewers later.</p>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Clock size={12} /> Duration (Minutes)
                    </label>
                    <div className="relative group">
                        <input
                            type="number"
                            name="durationMinutes"
                            value={formData.durationMinutes}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300 group-hover:text-indigo-300 transition-colors">MIN</span>
                    </div>
                </div>

                {/* Mode */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Globe size={12} /> Mode
                    </label>
                    <div className="relative">
                        <select
                            name="mode"
                            value={formData.mode}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm appearance-none transition-all cursor-pointer"
                        >
                            {INTERVIEW_MODES.map(mode => (
                                <option key={mode.value} value={mode.value}>{mode.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Evaluation Architecture */}
                <div className="md:col-span-2 space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={12} /> Evaluation Architecture
                        </label>
                        {formData.feedbackTemplateId && (
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                                <Check size={10} /> Configured
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            type="button"
                            onClick={() => setFeedbackMode('existing')}
                            className={`p-4 rounded-2xl border-2 transition-all group relative overflow-hidden text-left hover:-translate-y-1 duration-300 ${feedbackMode === 'existing'
                                    ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100 ring-2 ring-indigo-600 ring-offset-2'
                                    : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50 hover:shadow-md'
                                }`}
                        >
                            <div className="relative z-10">
                                <span className={`block mb-3 p-2 rounded-lg w-fit ${feedbackMode === 'existing' ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'} transition-colors`}>
                                    <ListChecks size={18} />
                                </span>
                                <h4 className="text-xs font-black uppercase tracking-wide text-slate-800 mb-1">Select Template</h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight">Use an existing form from the library.</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowBuilder(true)}
                            className={`p-4 rounded-2xl border-2 transition-all group relative overflow-hidden text-left hover:-translate-y-1 duration-300 ${feedbackMode === 'new'
                                    ? 'border-purple-600 bg-purple-50 shadow-lg shadow-purple-100 ring-2 ring-purple-600 ring-offset-2'
                                    : 'border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50 hover:shadow-md'
                                }`}
                        >
                            <div className="relative z-10">
                                <span className={`block mb-3 p-2 rounded-lg w-fit ${feedbackMode === 'new' ? 'bg-purple-200 text-purple-700' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-500'} transition-colors`}>
                                    <Settings2 size={18} />
                                </span>
                                <h4 className="text-xs font-black uppercase tracking-wide text-slate-800 mb-1">Create Custom</h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight">Build a new evaluation form.</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setFeedbackMode('none'); setFormData(prev => ({ ...prev, feedbackTemplateId: null })); }}
                            className={`p-4 rounded-2xl border-2 transition-all group relative overflow-hidden text-left hover:-translate-y-1 duration-300 ${feedbackMode === 'none'
                                    ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-400 ring-offset-2 opacity-70'
                                    : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-md'
                                }`}
                        >
                            <div className="relative z-10">
                                <span className={`block mb-3 p-2 rounded-lg w-fit ${feedbackMode === 'none' ? 'bg-slate-300 text-slate-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'} transition-colors`}>
                                    <X size={18} />
                                </span>
                                <h4 className="text-xs font-black uppercase tracking-wide text-slate-800 mb-1">No Feedback</h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight">Manual scoring only.</p>
                            </div>
                        </button>
                    </div>

                    {feedbackMode === 'existing' && (
                        <div className="relative mt-4 animate-in fade-in slide-in-from-top-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={12} className="text-indigo-500" />
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Active Evaluation Template
                                </label>
                            </div>

                            <div className="relative">
                                <select
                                    name="feedbackTemplateId"
                                    value={formData.feedbackTemplateId || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-900 appearance-none shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                                >
                                    <option value="">Select a form...</option>
                                    {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                            </div>

                            {formData.feedbackTemplateId && (
                                <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1.5 ml-1">
                                    <Check size={12} /> Template linked successfully.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-4 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/90 backdrop-blur-md p-4 -mx-4 -mb-4 z-20">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 border border-slate-200 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 hover:text-slate-700 transition-all uppercase tracking-wider text-xs shadow-sm"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-[2] px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                >
                    <Check size={16} strokeWidth={3} /> Save Configuration
                </button>
            </div>

            <Modal
                title={null}
                open={showBuilder}
                onCancel={() => setShowBuilder(false)}
                footer={null}
                width={800}
                centered
                className="rounded-[2rem] overflow-hidden"
                wrapClassName="backdrop-blur-sm"
            >
                <div className="p-2">
                    <FeedbackFormBuilder
                        initialData={templates.find(t => t._id === formData.feedbackTemplateId)}
                        onCancel={() => setShowBuilder(false)}
                        onSave={async (d) => {
                            const res = await api.post('/feedback/templates', d);
                            if (res.data.success) {
                                // Add to local templates list
                                setTemplates(p => {
                                    // Check if exists
                                    const exists = p.find(t => t._id === res.data.data._id);
                                    if (exists) return p.map(t => t._id === res.data.data._id ? res.data.data : t);
                                    return [...p, res.data.data];
                                });

                                setFormData(p => ({ ...p, feedbackTemplateId: res.data.data._id }));
                                setFeedbackMode('existing'); // Switch to existing visualization
                                setShowBuilder(false);
                            }
                        }}
                    />
                </div>
            </Modal>
        </form>
    );
}
