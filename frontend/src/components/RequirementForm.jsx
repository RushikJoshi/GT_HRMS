import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import {
    Briefcase,
    Users,
    Clock,
    MapPin,
    Shield,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    Check,
    ArrowRight,
    ArrowLeft,
    Building2,
    Calendar,
    ChevronRight,
    Search,
    Type,
    List,
    Layers,
    Save,
    X,
    Zap,
    AlertTriangle,
    Settings,
    Globe,
    Lock,
    Target,
    FileText,
    GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import StageModal from './StageModal';
import FeedbackTemplateBuilder from './FeedbackTemplateBuilder';

const COMMON_SKILLS = [
    'JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'NoSQL', 'Project Management',
    'Communication', 'Teamwork', 'Problem Solving', 'Leadership', 'Agile', 'Docker'
];

export default function RequirementForm({ onClose, onSuccess, initialData, isEdit, isModal = true }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Pipeline & Feedback State
    const [showStageModal, setShowStageModal] = useState(false);
    const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
    const [templateBuilderData, setTemplateBuilderData] = useState(null);
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await api.get('/feedback/templates');
                setTemplates(res.data);
            } catch (e) {
                console.error("Failed to load templates", e);
            }
        };
        fetchTemplates();
    }, []);

    const [formData, setFormData] = useState({
        positionId: '',
        jobTitle: '',
        department: '',
        jobType: 'Full-Time',
        workMode: 'On-site',
        location: '',
        vacancy: 1,
        priority: 'Medium',
        salaryMin: '',
        salaryMax: '',
        experienceMin: 0,
        experienceMax: 5,
        hiringManager: '',
        interviewPanel: [],
        description: '',
        responsibilities: [],
        requiredSkills: [],
        optionalSkills: [],
        education: '',
        certifications: [],
        keywords: [],
        visibility: 'External'
    });


    // Custom fields state
    const [customFields, setCustomFields] = useState([]);

    // State for managing built-in field visibility
    const [fieldVisibility, setFieldVisibility] = useState({
        vacancy: { visible: true, isPublic: true },
        jobType: { visible: true, isPublic: true },
        workMode: { visible: true, isPublic: true },
        location: { visible: true, isPublic: true },
        salaryMin: { visible: true, isPublic: false },
        salaryMax: { visible: true, isPublic: false },
        experienceMin: { visible: true, isPublic: true },
        experienceMax: { visible: true, isPublic: true },
        priority: { visible: true, isPublic: false },
        visibility: { visible: true, isPublic: true },
        probationPeriod: { visible: true, isPublic: true },
        noticePeriod: { visible: true, isPublic: true },
        hiringManager: { visible: true, isPublic: false }
    });

    // State for dropdown options
    const [dropdownOptions, setDropdownOptions] = useState({
        jobType: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'],
        workMode: ['On-site', 'Remote', 'Hybrid'],
        priority: ['Low', 'Medium', 'High', 'Urgent'],
        visibility: ['External (Public Portal)', 'Internal Only', 'Both (External + Internal)']
    });


    const [workflow, setWorkflow] = useState([
        { id: 'stage_applied', stageName: 'Applied', stageType: 'System', isSystemStage: true, locked: true },
        { id: 'stage_screening', stageName: 'Sourcing', stageType: 'Screening', mode: 'Online', durationMinutes: 15 },
        { id: 'stage_tech_1', stageName: 'Technical Interview', stageType: 'Interview', mode: 'Online', durationMinutes: 45 },
        { id: 'stage_hr', stageName: 'Final HR Round', stageType: 'Interview', mode: 'In-person', durationMinutes: 30 },
        { id: 'stage_finalized', stageName: 'Finalized', stageType: 'System', isSystemStage: true, locked: true }
    ]);

    const [pipelineTemplates, setPipelineTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');


    const [draftId, setDraftId] = useState(null);

    // Load data
    useEffect(() => {
        api.get('/positions').then(res => {
            if (res.data.success) setPositions(res.data.data);
        }).catch(err => console.error("Error fetching positions", err));
    }, []);
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));

            if (initialData.pipelineStages && Array.isArray(initialData.pipelineStages) && initialData.pipelineStages.length > 0) {
                const mappedStages = initialData.pipelineStages
                    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                    .map(stg => ({
                        ...stg,
                        id: stg.stageId || stg.id || `stage_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        assignedInterviewer: (stg.assignedInterviewers && stg.assignedInterviewers.length > 0)
                            ? (stg.assignedInterviewers[0]?._id || stg.assignedInterviewers[0])
                            : stg.assignedInterviewer,
                        locked: stg.isSystemStage
                    }));
                setWorkflow(mappedStages);
            }
        }
    }, [initialData]);

    // --- AI Generation ---
    const handleAIGenerate = async () => {
        if (!formData.jobTitle) {
            return alert("Please enter a Job Title (Step 1) so AI knows what to generate for.");
        }

        setIsGeneratingAI(true);
        try {
            const res = await api.post('/ai/generate-job-description', {
                jobTitle: formData.jobTitle,
                department: formData.department
            });

            if (res.data.success) {
                const { description, responsibilities, requiredSkills, optionalSkills } = res.data.data;

                setFormData(prev => ({
                    ...prev,
                    description: description || prev.description,
                    responsibilities: (responsibilities && responsibilities.length > 0) ? responsibilities : prev.responsibilities,
                    requiredSkills: (requiredSkills && requiredSkills.length > 0) ? requiredSkills : prev.requiredSkills,
                    optionalSkills: (optionalSkills && optionalSkills.length > 0) ? optionalSkills : prev.optionalSkills
                }));
                alert("✨ AI has generated fresh content for this role!");
            }
        } catch (err) {
            console.error("AI Generation Error:", err);
            alert("Failed to generate content with AI. Please try again.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleNext = async () => {
        if (step === 1 && !formData.positionId) return alert("Position Selection is required.");
        if (step === 2 && !formData.jobTitle) return alert("Job Title is required.");

        // PERSIST DRAFT TO BACKEND
        try {
            let dataPayload = formData;

            if (step === 4) {
                dataPayload = {
                    pipelineStages: workflow.map((stg, idx) => ({
                        stageId: stg.stageId || stg.id,
                        stageName: stg.stageName,
                        stageType: stg.stageType,
                        mode: stg.mode,
                        durationMinutes: stg.durationMinutes,
                        assignedInterviewers: stg.assignedInterviewer ? [stg.assignedInterviewer] : [],
                        feedbackFormId: stg.feedbackFormId,
                        evaluationCriteria: stg.evaluationCriteria || [],
                        orderIndex: idx + 1,
                        isSystemStage: stg.isSystemStage || false
                    }))
                };
            }

            const stepPayload = {
                step,
                draftId,
                data: dataPayload
            };
            console.log('[DEBUG] Saving Draft Payload:', JSON.stringify(stepPayload, null, 2));

            const res = await api.post('/requirements/draft', stepPayload);
            if (res.data.success) {
                setDraftId(res.data.draftId);
            }
        } catch (err) {
            console.error("Failed to save draft:", err);
            // Show detailed error to user
            const errMsg = err.response?.data?.message || err.message || "Unknown error saving draft";
            alert(`Failed to save draft: ${errMsg}`);
        }

        if (step < 5) setStep(step + 1);
    };

    const handlePositionChange = async (posId) => {
        const pos = positions.find(p => p._id === posId);
        if (pos) {
            setFormData(prev => ({
                ...prev,
                positionId: posId,
                jobTitle: pos.jobTitle,
                department: pos.department,
                salaryMin: pos.baseSalaryRange?.min || '',
                salaryMax: pos.baseSalaryRange?.max || '',
                vacancy: ((pos.budgetedCount || 1) - (pos.currentCount || 0))
            }));
            setSelectedPosition(pos);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const updateField = (field, val) => {
        setFormData(prev => ({ ...prev, [field]: val }));
        if (field === 'positionId' && val) handlePositionChange(val);
    };

    const submit = async () => {
        if (!draftId) return alert("Cannot publish without a valid draft session.");
        setSaving(true);
        try {
            // Step 5 Submit actually calls the PUBLISH API
            const res = await api.post('/requirements/publish', { draftId });
            if (res.data.success) {
                alert("🎉 Job Opening Published Successfully!");
                onSuccess?.(res.data.job);
                onClose?.();
            }
        } catch (err) {
            console.error("Publish Error:", err);
            alert(err.response?.data?.message || "Failed to publish job.");
        } finally {
            setSaving(false);
        }
    };



    // --- Sub-renderers ---
    const renderStep1_Position = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-indigo-100">
                    <Building2 size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Select Position</h2>
                <p className="text-slate-500 font-medium font-sans">Choose a position from the approved manpower plan to start recruitment.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
                {positions.length > 0 ? positions.map(pos => {
                    const isSelected = formData.positionId === pos._id;
                    return (
                        <div key={pos._id} onClick={() => updateField('positionId', pos._id)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative group ${isSelected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h4 className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors uppercase">{pos.jobTitle}</h4>
                                    <span className="text-[10px] font-black text-slate-400 gap-1.5 flex items-center mt-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div> {pos.department}
                                    </span>
                                    {/* Position ID */}
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">ID:</span>
                                        <span className="text-[10px] font-bold text-slate-700">{pos.positionCode || pos._id?.slice(-6)}</span>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-slate-50'}`}>
                                    {isSelected && <Check size={16} strokeWidth={3} />}
                                </div>
                            </div>

                            {/* Salary Range */}
                            {(pos.salaryMin || pos.salaryMax) && (
                                <div className="mb-3 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Salary Range</div>
                                    <div className="text-sm font-extrabold text-emerald-700">
                                        ₹{pos.salaryMin?.toLocaleString() || '0'} - ₹{pos.salaryMax?.toLocaleString() || '0'}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                <div className="flex items-center gap-1.5"><Users size={14} className="text-indigo-500" /> {pos.vacancies || 0} Openings</div>
                                <div className="flex items-center gap-1.5"><MapPin size={14} className="text-rose-500" /> {pos.location || 'HQ'}</div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-2 p-10 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active positions in manpower plan.</p>
                        <button className="mt-4 text-indigo-600 font-black text-[10px] uppercase underline">Create New Position Master</button>
                    </div>
                )}

                <div className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative group border-slate-100 bg-white hover:border-indigo-200 shadow-sm col-span-1 md:col-span-2 ${!formData.positionId && formData.jobTitle ? 'border-indigo-600 bg-indigo-50/20' : ''}`} onClick={() => updateField('positionId', '')}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h4 className="font-extrabold text-slate-900 text-base">Custom Ad-hoc Posting</h4>
                            <p className="text-xs text-slate-500 font-medium">Create a job opening without linking to a master position.</p>
                        </div>
                    </div>
                    {!formData.positionId && (
                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <input type="text" value={formData.jobTitle} onChange={e => updateField('jobTitle', e.target.value)} placeholder="Entry Level Title (e.g. Intern)" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                            <select value={formData.department} onChange={e => updateField('department', e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all">
                                <option value="IT">IT & Architecture</option>
                                <option value="HR">Human Resources</option>
                                <option value="Marketing">Creative Marketing</option>
                                <option value="Sales">Business Development</option>
                                <option value="Operations">Operations</option>
                                <option value="Finance">Finance & Accounts</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Helper functions for field management
    const toggleFieldVisibility = (fieldName) => {
        setFieldVisibility(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], visible: !prev[fieldName].visible }
        }));
    };

    const toggleFieldPublic = (fieldName) => {
        setFieldVisibility(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], isPublic: !prev[fieldName].isPublic }
        }));
    };

    const addDropdownOption = (fieldName, newOption) => {
        setDropdownOptions(prev => ({
            ...prev,
            [fieldName]: [...prev[fieldName], newOption]
        }));
    };

    const updateDropdownOption = (fieldName, index, value) => {
        setDropdownOptions(prev => {
            const newOptions = [...prev[fieldName]];
            newOptions[index] = value;
            return { ...prev, [fieldName]: newOptions };
        });
    };

    const deleteDropdownOption = (fieldName, index) => {
        setDropdownOptions(prev => {
            if (prev[fieldName].length > 1) {
                return {
                    ...prev,
                    [fieldName]: prev[fieldName].filter((_, idx) => idx !== index)
                };
            }
            return prev;
        });
    };

    const addCustomField = () => {
        setCustomFields([...customFields, {
            id: Date.now(),
            label: '',
            type: 'text',
            isPublic: true,
            options: ['Option 1', 'Option 2', 'Option 3'],
            value: ''
        }]);
    };

    const updateCustomField = (id, key, value) => {
        setCustomFields(customFields.map(field =>
            field.id === id ? { ...field, [key]: value } : field
        ));
    };

    const deleteCustomField = (id) => {
        setCustomFields(customFields.filter(field => field.id !== id));
    };

    const addCustomDropdownOption = (fieldId) => {
        setCustomFields(customFields.map(field => {
            if (field.id === fieldId) {
                return {
                    ...field,
                    options: [...field.options, `Option ${field.options.length + 1}`]
                };
            }
            return field;
        }));
    };

    const updateCustomDropdownOption = (fieldId, optionIndex, newValue) => {
        setCustomFields(customFields.map(field => {
            if (field.id === fieldId) {
                const newOptions = [...field.options];
                newOptions[optionIndex] = newValue;
                return { ...field, options: newOptions };
            }
            return field;
        }));
    };

    const deleteCustomDropdownOption = (fieldId, optionIndex) => {
        setCustomFields(customFields.map(field => {
            if (field.id === fieldId && field.options.length > 1) {
                return {
                    ...field,
                    options: field.options.filter((_, idx) => idx !== optionIndex)
                };
            }
            return field;
        }));
    };

    // State to track which field's options are being edited
    const [editingFieldOptions, setEditingFieldOptions] = useState(null);

    const renderStep2_Config = () => {
        // ... existing functions ...

        const renderFieldWithControls = (fieldName, label, inputElement, isDropdown = false) => {
            if (!fieldVisibility[fieldName]?.visible) return null;

            const isEditingOptions = editingFieldOptions === fieldName;

            return (
                <div className="relative group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex-1">{label}</label>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={fieldVisibility[fieldName]?.isPublic}
                                    onChange={() => toggleFieldPublic(fieldName)}
                                    className="w-3 h-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-[9px] font-bold text-slate-500">Public</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => toggleFieldVisibility(fieldName)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                                title="Hide Field"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    {inputElement}

                    {isDropdown && (
                        <div className="mt-2">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newOption = prompt('Enter new option:');
                                        if (newOption && newOption.trim()) {
                                            addDropdownOption(fieldName, newOption.trim());
                                        }
                                    }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <Plus size={12} /> Add Option
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditingFieldOptions(isEditingOptions ? null : fieldName)}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg transition-all"
                                >
                                    <Settings size={12} /> {isEditingOptions ? 'Done' : 'Manage Options'}
                                </button>
                            </div>

                            {/* Option Manager UI */}
                            {isEditingOptions && (
                                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Options</p>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                                        {dropdownOptions[fieldName].map((option, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 shadow-sm group/opt">
                                                <span>{option}</span>
                                                {dropdownOptions[fieldName].length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteDropdownOption(fieldName, idx)}
                                                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                                        title="Delete Option"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center pt-1">At least one option required</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-amber-100">
                        <Settings size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Hiring Setup</h2>
                    <p className="text-slate-500 font-medium font-sans">Define the core parameters and key stakeholders for this role.</p>
                </div>

                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Job Title - Read Only from Step 1 */}
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border-2 border-indigo-100">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">Job Title (From Position)</label>
                        <div className="text-2xl font-black text-slate-900">{formData.jobTitle || 'Not Selected'}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{formData.department || 'Department'}</div>
                    </div>

                    {/* Grid Layout for Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vacancy */}
                        {renderFieldWithControls('vacancy', 'Number of Vacancies',
                            <input
                                type="number"
                                value={formData.vacancy || ''}
                                onChange={e => updateField('vacancy', e.target.value)}
                                placeholder="e.g., 5"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}

                        {/* Job Type */}
                        {renderFieldWithControls('jobType', 'Job Type',
                            <select
                                value={formData.jobType || 'Full-Time'}
                                onChange={e => updateField('jobType', e.target.value)}
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            >
                                {dropdownOptions.jobType.map((opt, idx) => (
                                    <option key={idx} value={opt.split(' ')[0]}>{opt}</option>
                                ))}
                            </select>,
                            true
                        )}

                        {/* Work Mode */}
                        {renderFieldWithControls('workMode', 'Work Mode',
                            <select
                                value={formData.workMode || 'On-site'}
                                onChange={e => updateField('workMode', e.target.value)}
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            >
                                {dropdownOptions.workMode.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                            </select>,
                            true
                        )}

                        {/* Location */}
                        {renderFieldWithControls('location', 'Work Location',
                            <input
                                type="text"
                                value={formData.location || ''}
                                onChange={e => updateField('location', e.target.value)}
                                placeholder="e.g., Mumbai, Ahmedabad"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}

                        {/* Salary Min */}
                        {renderFieldWithControls('salaryMin', 'Minimum Salary (Annual)',
                            <input
                                type="number"
                                value={formData.salaryMin || ''}
                                onChange={e => updateField('salaryMin', e.target.value)}
                                placeholder="e.g., 300000"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}

                        {/* Salary Max */}
                        {renderFieldWithControls('salaryMax', 'Maximum Salary (Annual)',
                            <input
                                type="number"
                                value={formData.salaryMax || ''}
                                onChange={e => updateField('salaryMax', e.target.value)}
                                placeholder="e.g., 500000"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}

                        {/* Experience Min */}
                        {renderFieldWithControls('experienceMin', 'Minimum Experience (Years)',
                            <input
                                type="number"
                                value={formData.experienceMin || ''}
                                onChange={e => updateField('experienceMin', e.target.value)}
                                placeholder="e.g., 2"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}

                        {/* Experience Max */}
                        {renderFieldWithControls('experienceMax', 'Maximum Experience (Years)',
                            <input
                                type="number"
                                value={formData.experienceMax || ''}
                                onChange={e => updateField('experienceMax', e.target.value)}
                                placeholder="e.g., 5"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}

                        {/* Priority */}
                        {renderFieldWithControls('priority', 'Priority Level',
                            <select
                                value={formData.priority || 'Medium'}
                                onChange={e => updateField('priority', e.target.value)}
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            >
                                {dropdownOptions.priority.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                            </select>,
                            true
                        )}

                        {/* Visibility */}
                        {renderFieldWithControls('visibility', 'Job Visibility',
                            <select
                                value={formData.visibility || 'External'}
                                onChange={e => updateField('visibility', e.target.value)}
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="External">External (Public Portal)</option>
                                <option value="Internal">Internal Only</option>
                                <option value="Both">Both (External + Internal)</option>
                            </select>,
                            true
                        )}

                        {/* Probation Period */}
                        {renderFieldWithControls('probationPeriod', 'Probation Period (Months)',
                            <input
                                type="number"
                                value={formData.probationPeriod || ''}
                                onChange={e => updateField('probationPeriod', e.target.value)}
                                placeholder="e.g., 3"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}

                        {/* Notice Period */}
                        {renderFieldWithControls('noticePeriod', 'Notice Period (Days)',
                            <input
                                type="number"
                                value={formData.noticePeriod || ''}
                                onChange={e => updateField('noticePeriod', e.target.value)}
                                placeholder="e.g., 30"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        )}
                    </div>



                    {/* Custom Fields Section */}
                    <div className="border-t-2 border-dashed border-slate-200 pt-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Custom Fields</h3>
                                <p className="text-xs text-slate-500 font-medium">Add additional fields for this job posting</p>
                            </div>
                            <button
                                type="button"
                                onClick={addCustomField}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
                            >
                                <Plus size={16} />
                                Add Field
                            </button>
                        </div>

                        {customFields.length === 0 ? (
                            <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                <p className="text-slate-400 font-medium text-sm">No custom fields added yet. Click "Add Field" to create one.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {customFields.map((field, index) => (
                                    <div key={field.id} className="p-5 bg-white border-2 border-slate-200 rounded-2xl space-y-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Field Label */}
                                                <input
                                                    type="text"
                                                    value={field.label}
                                                    onChange={e => updateCustomField(field.id, 'label', e.target.value)}
                                                    placeholder="Field Label"
                                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                />

                                                {/* Field Type */}
                                                <select
                                                    value={field.type}
                                                    onChange={e => updateCustomField(field.id, 'type', e.target.value)}
                                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="text">Text</option>
                                                    <option value="number">Number</option>
                                                    <option value="dropdown">Dropdown</option>
                                                    <option value="radio">Radio Button</option>
                                                    <option value="checkbox">Checkbox</option>
                                                </select>

                                                {/* Public Checkbox */}
                                                <label className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.isPublic}
                                                        onChange={e => updateCustomField(field.id, 'isPublic', e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                                                    />
                                                    <span className="text-sm font-bold text-slate-700">Public Field</span>
                                                </label>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                type="button"
                                                onClick={() => deleteCustomField(field.id)}
                                                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        {/* Dropdown/Radio Options */}
                                        {(field.type === 'dropdown' || field.type === 'radio') && (
                                            <div className="pl-4 border-l-2 border-indigo-200 space-y-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Options</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => addCustomDropdownOption(field.id)}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                                                    >
                                                        + Add Option
                                                    </button>
                                                </div>
                                                {field.options.map((option, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={option}
                                                            onChange={e => updateCustomDropdownOption(field.id, optIdx, e.target.value)}
                                                            placeholder={`Option ${optIdx + 1}`}
                                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        {field.options.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteCustomDropdownOption(field.id, optIdx)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    const renderStep3_Details = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-rose-100">
                    <List size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Role Requirements</h2>
                <p className="text-slate-500 font-medium font-sans">Define the mission and required skillsets for this position.</p>
            </div>

            <div className="max-w-5xl mx-auto space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block flex items-center gap-2">
                            <Type size={14} className="text-indigo-500" /> Role Overview
                        </label>
                        <textarea value={formData.description} onChange={e => updateField('description', e.target.value)} rows={5} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 transition-all" placeholder="High-level mission for this role..." />

                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block flex items-center gap-2">
                            <Target size={14} className="text-rose-500" /> Responsibilities
                        </label>
                        <div className="space-y-2">
                            {formData.responsibilities.map((task, i) => (
                                <div key={i} className="flex gap-2">
                                    <input value={task} onChange={e => {
                                        const n = [...formData.responsibilities];
                                        n[i] = e.target.value;
                                        updateField('responsibilities', n);
                                    }} className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold" />
                                    <button onClick={() => updateField('responsibilities', formData.responsibilities.filter((_, idx) => idx !== i))} className="text-rose-500"><Trash2 size={14} /></button>
                                </div>
                            ))}
                            <button onClick={() => updateField('responsibilities', [...formData.responsibilities, 'New task...'])} className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">+ Add Task</button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block flex items-center gap-2">
                            <Zap size={14} className="text-amber-500" /> Required Skills & Stack
                        </label>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[100px]">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.requiredSkills.map(s => (
                                    <span key={s} className="px-2 py-1 bg-white border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                        {s} <X size={10} className="cursor-pointer" onClick={() => updateField('requiredSkills', formData.requiredSkills.filter(x => x !== s))} />
                                    </span>
                                ))}
                            </div>
                            <input type="text" placeholder="Skill & Enter" onKeyDown={e => {
                                if (e.key === 'Enter' && e.target.value) {
                                    if (!formData.requiredSkills.includes(e.target.value)) updateField('requiredSkills', [...formData.requiredSkills, e.target.value]);
                                    e.target.value = '';
                                }
                            }} className="w-full bg-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 outline-none" />
                        </div>

                        <div>
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Education & Certifications</label>
                            <input value={formData.education} onChange={e => updateField('education', e.target.value)} placeholder="Minimum Degree..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold mb-3" />
                            <div className="flex flex-wrap gap-2">
                                {formData.certifications.map(c => (
                                    <span key={c} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-100 flex items-center gap-1">
                                        {c} <X size={10} className="cursor-pointer" onClick={() => updateField('certifications', formData.certifications.filter(x => x !== c))} />
                                    </span>
                                ))}
                                <input placeholder="+ Add Certification & Enter" onKeyDown={e => {
                                    if (e.key === 'Enter' && e.target.value) {
                                        updateField('certifications', [...formData.certifications, e.target.value]);
                                        e.target.value = '';
                                    }
                                }} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Keywords for Matching</label>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                {formData.keywords.map(k => (
                                    <span key={k} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1">#{k} <X size={10} className="cursor-pointer" onClick={() => updateField('keywords', formData.keywords.filter(x => x !== k))} /></span>
                                ))}
                                <input placeholder="#Keyword & Enter" onKeyDown={e => {
                                    if (e.key === 'Enter' && e.target.value) {
                                        updateField('keywords', [...formData.keywords, e.target.value]);
                                        e.target.value = '';
                                    }
                                }} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-6">
                    <button onClick={handleAIGenerate} disabled={isGeneratingAI} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all ${isGeneratingAI ? 'bg-slate-100 text-slate-400 border-none animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}>
                        <Zap size={14} className={isGeneratingAI ? 'animate-spin' : 'fill-current'} />
                        {isGeneratingAI ? 'Processing AI Magic...' : '✨ Rewrite with AI Assistant'}
                    </button>
                </div>
            </div>
        </div>
    );


    const onDragEnd = (result) => {
        if (!result.destination) return;

        // We are dragging the subset (sliced 1 to -1)
        // so source.index 0 maps to workflow index 1
        const sourceIdx = result.source.index + 1;
        const destIdx = result.destination.index + 1;

        if (sourceIdx === destIdx) return;

        const newWorkflow = Array.from(workflow);
        const [moved] = newWorkflow.splice(sourceIdx, 1);
        newWorkflow.splice(destIdx, 0, moved);

        setWorkflow(newWorkflow);
    };

    const handleStageAdd = (stageData) => {
        // stageData: { name, feedbackTemplateId }
        // Find existing template to populate initial criteria if needed
        const template = templates.find(t => t._id === stageData.feedbackTemplateId);

        const newStage = {
            stageId: `stage_${Date.now()}`,
            stageName: stageData.name,
            feedbackFormId: stageData.feedbackTemplateId,
            // We use the template's structured criteria if available, else empty
            // Backend schema supports feedbackFormId reference
            evaluationCriteria: template ? template.criteria.map(c => c.label) : [],
            stageType: 'Interview',
            mode: 'Online',
            durationMinutes: 45,
            assignedInterviewer: '',
            isSystemStage: false
        };

        const newWorkflow = [...workflow];
        // Insert before Finalized (last element)
        newWorkflow.splice(newWorkflow.length - 1, 0, newStage);
        setWorkflow(newWorkflow);
        setShowStageModal(false);
    };

    const deleteStage = (index) => {
        setWorkflow(workflow.filter((_, idx) => idx !== index));
    };

    const openTemplateBuilder = (index) => {
        const stage = workflow[index];
        setTemplateBuilderData({
            stageIndex: index,
            // Ideally we fetch the full template details if ID exists
            // For now passing basic info or fetching
            initialTemplate: {
                templateName: stage.stageName + ' Feedback',
                criteria: [] // Placeholder, would need to fetch actual criteria if editing existing
            }
        });
        // If stage has feedbackFormId, we should fetch it?
        // User asked for "Feedback Form Builder".
        // Let's allow creating a new template for this stage.
        setShowTemplateBuilder(true);
    };

    const handleTemplateSave = async (data) => {
        try {
            // Save as new template
            const res = await api.post('/feedback/template', {
                templateName: data.templateName,
                criteria: data.criteria
            });

            const newTemplate = res.data;
            setTemplates([...templates, newTemplate]);

            // Link to stage
            if (templateBuilderData) {
                const idx = templateBuilderData.stageIndex;
                const newWorkflow = [...workflow];
                newWorkflow[idx].feedbackFormId = newTemplate._id;
                newWorkflow[idx].evaluationCriteria = data.criteria.map(c => c.label); // Legacy sync
                setWorkflow(newWorkflow);
            }
            setShowTemplateBuilder(false);
            setTemplateBuilderData(null);
        } catch (e) {
            console.error(e);
        }
    };

    const renderStep4_Pipeline = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-emerald-100">
                    <Layers size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Recruitment Pipeline</h2>
                <p className="text-slate-500 font-medium font-sans">Design the journey candidates take to join your team.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6 relative">
                {/* Decorative Center Line */}
                <div className="absolute left-[2.45rem] top-6 bottom-6 w-0.5 bg-slate-100 rounded-full z-0"></div>

                {/* System Stage: Applied */}
                <div className="flex items-center gap-6 p-4 bg-slate-50 border-2 border-slate-100 border-dashed rounded-2xl opacity-75 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-black">1</div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-700">Application Received</h4>
                        <p className="text-[10px] uppercase font-bold text-slate-400">System Stage • Locked</p>
                    </div>
                    <Lock size={16} className="text-slate-400" />
                </div>

                {/* Editable Stages */}
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="pipeline-stages" direction="horizontal">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex gap-6 overflow-x-auto pb-8 my-4 relative z-10 min-h-[400px]"
                            >
                                {workflow.map((stg, index) => {
                                    // Skip first (Applied) and last (Finalized) for rendering in draggable list
                                    if (index === 0 || index === workflow.length - 1) return null;

                                    // Draggable index logic
                                    // draggable index needs to be 0,1,2... for specific subset
                                    // We'll trust source.index matches render order

                                    // Actually, map index matches original array
                                    // We need to render ONLY the middle ones
                                    return (
                                        <Draggable key={stg.stageId || stg.id} draggableId={stg.stageId || stg.id} index={index - 1}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`w-80 flex-shrink-0 relative flex flex-col gap-4 group transition-all ${snapshot.isDragging ? 'rotate-2 scale-102 z-50' : ''}`}
                                                >
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="absolute top-4 right-4 text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing z-20"
                                                    >
                                                        <GripVertical size={20} />
                                                    </div>

                                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100 mt-3">
                                                        {index + 1}
                                                    </div>

                                                    <div className="flex-1 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex-1">
                                                                <input
                                                                    value={stg.stageName}
                                                                    onChange={e => {
                                                                        const newWorkflow = [...workflow];
                                                                        newWorkflow[index].stageName = e.target.value;
                                                                        setWorkflow(newWorkflow);
                                                                    }}
                                                                    className="text-lg font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-slate-300"
                                                                    placeholder="Stage Name"
                                                                />
                                                                <div className="flex items-center gap-4 mt-2">
                                                                    <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                                                                        <Clock size={12} className="text-indigo-500" />
                                                                        <input
                                                                            type="number"
                                                                            value={stg.durationMinutes || 30}
                                                                            onChange={e => {
                                                                                const newWorkflow = [...workflow];
                                                                                newWorkflow[index].durationMinutes = parseInt(e.target.value);
                                                                                setWorkflow(newWorkflow);
                                                                            }}
                                                                            className="w-8 bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold text-indigo-700"
                                                                        />
                                                                        <span className="text-[10px] font-bold text-indigo-400">min</span>
                                                                    </div>
                                                                    <select
                                                                        value={stg.mode || 'Online'}
                                                                        onChange={e => {
                                                                            const newWorkflow = [...workflow];
                                                                            newWorkflow[index].mode = e.target.value;
                                                                            setWorkflow(newWorkflow);
                                                                        }}
                                                                        className="bg-slate-50 border-none text-[10px] font-bold text-slate-600 rounded-lg py-1 pl-2 pr-6 focus:ring-0"
                                                                    >
                                                                        <option value="Online">Online</option>
                                                                        <option value="In-person">In-person</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => deleteStage(index)}
                                                                className="text-slate-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Interviewer</label>
                                                                <select
                                                                    value={stg.assignedInterviewer || ''}
                                                                    onChange={e => {
                                                                        const newWorkflow = [...workflow];
                                                                        newWorkflow[index].assignedInterviewer = e.target.value;
                                                                        setWorkflow(newWorkflow);
                                                                    }}
                                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300 transition-all"
                                                                >
                                                                    <option value="">Select Interviewer...</option>
                                                                    {employees.map(emp => (
                                                                        <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Feedback Form</label>
                                                                <button
                                                                    onClick={() => openTemplateBuilder(index)}
                                                                    className={`w-full text-left bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold flex items-center justify-between hover:bg-white hover:border-indigo-300 transition-all ${stg.feedbackFormId ? 'text-emerald-600 border-emerald-100' : 'text-slate-500'}`}
                                                                >
                                                                    {stg.feedbackFormId ? (templates.find(t => t._id === stg.feedbackFormId)?.templateName || 'Configured') : 'Select / Build Template'}
                                                                    <Settings size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <button
                    onClick={() => setShowStageModal(true)}
                    className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-3xl flex items-center justify-center gap-2 text-indigo-500 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all group relative z-10"
                >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={16} />
                    </div>
                    Add Interview Stage
                </button>

                {/* System Stage: Finalized */}
                <div className="flex items-center gap-6 p-4 bg-emerald-50 border-2 border-emerald-100 border-dashed rounded-2xl opacity-75 mt-8 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-emerald-200 flex items-center justify-center text-emerald-600 font-black">
                        {workflow.length}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-emerald-800">Hired / Finalized</h4>
                        <p className="text-[10px] uppercase font-bold text-emerald-500">System Stage • Locked</p>
                    </div>
                    <Lock size={16} className="text-emerald-400" />
                </div>
            </div>
        </div>
    );

    const renderStep5_Review = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-emerald-100">
                    <Check size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Final Review</h2>
                <p className="text-slate-500 font-medium font-sans">Verify all details before publishing the job opening.</p>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{formData.department} • {formData.jobType}</span>
                                <h3 className="text-3xl font-black text-slate-900 mt-1 uppercase leading-none">{formData.jobTitle}</h3>
                            </div>
                            <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase">
                                Priority: {formData.priority}
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">{formData.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-50">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Vacancies</p>
                                <p className="text-sm font-black text-slate-800">{formData.vacancy}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Experience</p>
                                <p className="text-sm font-black text-slate-800">{formData.experienceMin}-{formData.experienceMax} Yrs</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Location</p>
                                <p className="text-sm font-black text-slate-800">{formData.workMode}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Visibility</p>
                                <p className="text-sm font-black text-slate-800">{formData.visibility}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 italic">
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            "This job opening will be visible to {formData.visibility === 'Public' ? 'all external candidates on the career portal' : 'internal employees only'}.
                            Standard matching engine will be active for all applications."
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Layers size={14} className="text-indigo-500" /> Pipeline Journey
                        </h4>
                        <div className="space-y-4">
                            {workflow.map((stg, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 leading-tight">{stg.stageName}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{stg.mode} • {stg.durationMinutes}m</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                        <h4 className="text-sm font-black mb-2">Publishing Agreement</h4>
                        <p className="text-[10px] text-indigo-100 font-medium leading-relaxed mb-6">By clicking publish, this requirement will become live and candidates will be able to apply based on the visibility settings.</p>
                        <button
                            disabled={saving}
                            onClick={submit}
                            className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <Save size={16} />}
                            {saving ? 'Publishing...' : 'Confirm & Publish'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col h-full bg-white font-sans ${isModal ? 'max-h-[92vh] h-screen' : 'min-h-screen'}`}>
            {/* Nav Header */}
            <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-20">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{isEdit ? 'Sync Posting' : 'Launch Channel'}</h1>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Design Sequence {step}/5</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(s => (
                            <div key={s} className={`w-2 h-2 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-indigo-600' : 'bg-slate-200'}`}></div>
                        ))}
                    </div>
                    {isModal && <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition-all"><X size={20} /></button>}
                </div>
            </div>

            {/* Main scroll Area */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-[1400px] mx-auto">
                    {step === 1 && renderStep1_Position()}
                    {step === 2 && renderStep2_Config()}
                    {step === 3 && renderStep3_Details()}
                    {step === 4 && renderStep4_Pipeline()}
                    {step === 5 && renderStep5_Review()}
                </div>
            </div>

            {/* Footer Control */}
            <div className="px-12 py-8 border-t border-slate-50 bg-white/80 backdrop-blur-lg flex justify-between items-center sticky bottom-0 z-20">
                <button onClick={handleBack} disabled={step === 1} className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 disabled:opacity-0 transition-all flex items-center gap-2 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Last Step
                </button>

                {step < 5 ? (
                    <button onClick={handleNext} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all flex items-center gap-4 group active:scale-95 shadow-xl shadow-slate-200">
                        Continue Bridge
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                ) : (
                    <button onClick={submit} disabled={saving} className="px-12 py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:shadow-2xl hover:shadow-emerald-100 transition-all flex items-center gap-4 group active:scale-95 shadow-xl shadow-emerald-200">
                        {saving ? 'Transmitting...' : 'Initiate Channel'}
                        <Check size={20} strokeWidth={3} />
                    </button>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}} />

            {/* Stage Modal */}
            {showStageModal && (
                <StageModal
                    visible={showStageModal}
                    onCancel={() => setShowStageModal(false)}
                    onSave={handleStageAdd}
                    templates={templates}
                />
            )}

            {/* Feedback Template Builder Override */}
            {showTemplateBuilder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-2xl">
                        <FeedbackTemplateBuilder
                            initialTemplate={templateBuilderData?.initialTemplate}
                            onSave={handleTemplateSave}
                            onCancel={() => setShowTemplateBuilder(false)}
                        />
                    </div>
                </div>
            )}

        </div>
    );
}
