import React, { useState, useEffect } from 'react';
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
    X
} from 'lucide-react';

export default function RequirementForm({ onClose, onSuccess, initialData, isEdit, isModal = true }) {
    const [formData, setFormData] = useState({
        jobTitle: '',
        department: '',
        positionId: '',
        vacancy: 1,
        description: '',
        priority: 'Medium',
        workMode: 'On-site',
        jobType: 'Full Time',
        expYears: '',
        expMonths: '',
        salaryMin: '',
        salaryMax: '',
        visibility: 'External'
    });

    const [customFields, setCustomFields] = useState([]);
    const [step, setStep] = useState(1); // 1 = Details, 2 = Hiring Stages

    const [publicFields, setPublicFields] = useState(new Set([
        'jobTitle', 'department', 'vacancy', 'description',
        'workMode', 'jobType', 'experience', 'salary'
    ]));

    const [workflow, setWorkflow] = useState([
        { name: 'Shortlisted', type: 'screening' },
        { name: 'Interview', type: 'interview', interviewType: 'Technical', interviewer: '', description: '' }
    ]);

    const [saving, setSaving] = useState(false);
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> d95d0294dd92ce8de49ae09613362e7c0eb72566
    const [positions, setPositions] = useState([]);

    useEffect(() => {
        api.get('/hrms/positions').then(res => {
            if (res.data.success) setPositions(res.data.data);
        }).catch(err => console.error("Error fetching positions", err));
    }, []);

    // Prevent double-click save on step transition
<<<<<<< HEAD
>>>>>>> main
=======
>>>>>>> d95d0294dd92ce8de49ae09613362e7c0eb72566
    const [canSave, setCanSave] = useState(false);

    useEffect(() => {
        if (step === 2) {
            setCanSave(false);
            const timer = setTimeout(() => setCanSave(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                jobTitle: initialData.jobTitle || '',
                department: initialData.department || '',
                vacancy: initialData.vacancy || 1,
                description: initialData.description || '',
                priority: initialData.priority || 'Medium',
                workMode: initialData.workMode || 'On-site',
                jobType: initialData.jobType || 'Full Time',
                expYears: initialData.minExperienceMonths ? Math.floor(initialData.minExperienceMonths / 12) : '',
                expMonths: initialData.minExperienceMonths ? initialData.minExperienceMonths % 12 : '',
                salaryMin: initialData.salaryMin || '',
                salaryMax: initialData.salaryMax || '',
                visibility: initialData.visibility || 'External'
            });
            if (initialData.customFields && Array.isArray(initialData.customFields)) {
                setCustomFields(initialData.customFields);
            }
            if (initialData.publicFields && Array.isArray(initialData.publicFields)) {
                setPublicFields(new Set(initialData.publicFields));
            }
            if (initialData.workflow && Array.isArray(initialData.workflow)) {
                const editable = initialData.workflow
                    .filter(s => s !== 'Applied' && s !== 'Finalized' && s !== 'Rejected' && s !== 'Selected')
                    .map(stage => {
                        if (typeof stage === 'string') {
                            return { name: stage, type: stage.toLowerCase().includes('interview') ? 'interview' : 'screening' };
                        }
                        return stage;
                    });
                if (editable.length > 0) setWorkflow(editable);
            }
        }
    }, [initialData]);

    const addCustomField = () => {
        setCustomFields([...customFields, { label: '', value: '', type: 'text', isPublic: true }]);
    };

    const removeCustomField = (index) => {
        const newFields = [...customFields];
        newFields.splice(index, 1);
        setCustomFields(newFields);
    };

    const updateCustomField = (index, field, val) => {
        const newFields = [...customFields];
        newFields[index][field] = val;
        setCustomFields(newFields);
    };

    const togglePublic = (key) => {
        const newSet = new Set(publicFields);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setPublicFields(newSet);
    };

    const addStage = () => {
        setWorkflow([...workflow, {
            name: 'New Round',
            type: 'interview',
            interviewType: 'Technical',
            interviewer: '',
            description: ''
        }]);
    };

    const updateStage = (index, field, val) => {
        const newWorkflow = [...workflow];
        newWorkflow[index] = { ...newWorkflow[index], [field]: val };
        setWorkflow(newWorkflow);
    };

    const removeStage = (index) => {
        const newWorkflow = [...workflow];
        newWorkflow.splice(index, 1);
        setWorkflow(newWorkflow);
    };

    async function submit(e) {
        e.preventDefault();
        if (step === 1) {
            if (!formData.jobTitle || !formData.department || !formData.vacancy) {
                alert('Please fill in Job Title, Department and Vacancy');
                return;
            }
            setStep(2);
            return;
        }

        setSaving(true);
        const validCustomFields = customFields.filter(f => f.label.trim() !== '' && f.value.trim() !== '');
        const fullWorkflow = ['Applied', ...workflow.filter(w => w.name && w.name.trim() !== '').map(w => w.name), 'Finalized'];
        const detailedWorkflow = workflow.filter(w => w.name && w.name.trim() !== '');
        const totalMonths = (parseInt(formData.expYears) || 0) * 12 + (parseInt(formData.expMonths) || 0);

        const payload = {
            ...formData,
            minExperienceMonths: totalMonths,
            maxExperienceMonths: totalMonths,
            customFields: validCustomFields,
            publicFields: Array.from(publicFields),
            workflow: fullWorkflow,
            detailedWorkflow: detailedWorkflow
        };

        try {
            if (isEdit) {
                await api.put(`/requirements/${initialData._id}`, payload);
            } else {
                const res = await api.post('/requirements/create', payload);
                if (res.data && res.data.jobOpeningId) {
                    alert(`Job created successfully\nJob ID: ${res.data.jobOpeningId}`);
                } else {
                    alert('Job created successfully');
                }
            }
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Failed to save';
            alert(`Failed: ${msg}`);
        } finally {
            setSaving(false);
        }
    }

    const LabelWithToggle = ({ label, fieldKey, required, id, icon: Icon }) => (
        <div className="flex justify-between items-center mb-2 px-1">
            <div className="flex items-center gap-2">
                {Icon && <Icon size={14} className="text-slate-400" />}
                <label htmlFor={id} className="text-[12px] font-bold text-slate-700 cursor-pointer tracking-tight">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            </div>
            <button
                type="button"
                onClick={() => togglePublic(fieldKey)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${publicFields.has(fieldKey)
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
            >
                {publicFields.has(fieldKey) ? <Eye size={10} /> : <EyeOff size={10} />}
                {publicFields.has(fieldKey) ? 'Public' : 'Hidden'}
            </button>
        </div>
    );

    const FormContent = (
        <form onSubmit={submit} className="flex flex-col h-full font-sans">
            {/* Header / Stepper */}
            <div className={`px-10 py-8 border-b border-slate-100 bg-white sticky top-0 z-10 ${isModal ? 'rounded-t-[2rem]' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tighter">
                                {isEdit ? 'Update Recruitment' : 'Job Information'}
                            </h2>
                            {initialData?.jobOpeningId && (
                                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-3 py-1 rounded-lg border border-slate-200 uppercase tracking-widest font-bold">
                                    REF: {initialData.jobOpeningId}
                                </span>
                            )}
                        </div>
                        {!isModal && (
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                Step {step}: {step === 1 ? 'Fundamental Details' : 'Hiring Workflow Design'}
                            </p>
<<<<<<< HEAD
<<<<<<< HEAD
                        )}
=======
                        </div>
                        {/* Step Indicator */}
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                            <span className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                        </div>
                    </div>
                </div>
            )}

            {step === 1 ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Link to Position Master (Optional)</label>
                        <select
                            value={formData.positionId}
                            onChange={e => {
                                const posId = e.target.value;
                                const selectedPos = positions.find(p => p._id === posId);
                                if (selectedPos) {
                                    setFormData({
                                        ...formData,
                                        positionId: posId,
                                        jobTitle: selectedPos.jobTitle,
                                        department: selectedPos.department
                                    });
                                } else {
                                    setFormData({ ...formData, positionId: posId });
                                }
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white mb-4"
                        >
                            <option value="">-- No Position Linked --</option>
                            {positions.map(p => (
                                <option key={p._id} value={p._id}>{p.positionId} - {p.jobTitle} ({p.department})</option>
                            ))}
                        </select>

                        <LabelWithToggle label="Job Title" fieldKey="jobTitle" required id="jobTitle" />
                        <input
                            id="jobTitle"
                            required
                            value={formData.jobTitle}
                            onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            placeholder="e.g. Senior Developer"
                        />
>>>>>>> main
=======
                        )}
>>>>>>> d95d0294dd92ce8de49ae09613362e7c0eb72566
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                            <button
                                type="button"
                                onClick={() => step === 2 && setStep(1)}
                                className={`flex items-center gap-2.5 px-6 py-2 rounded-xl text-xs font-bold transition-all ${step === 1 ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-500'}`}
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-white'}`}>1</div>
                                Core Details
                            </button>
                            <button
                                type="button"
                                onClick={() => step === 1 && formData.jobTitle && formData.department && setStep(2)}
                                className={`flex items-center gap-2.5 px-6 py-2 rounded-xl text-xs font-bold transition-all ${step === 2 ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-500'}`}
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-white'}`}>2</div>
                                Hiring Pipeline
                            </button>
                        </div>
                        {isModal && (
                            <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${isModal ? 'p-10' : 'p-12'}`}>
                {step === 1 ? (
                    <div className="mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 animate-in fade-in slide-in-from-bottom-3 duration-700">
                        {/* Core Info */}
                        <div className="md:col-span-2 group">
                            <LabelWithToggle label="Job Title" fieldKey="jobTitle" required id="jobTitle" icon={Type} />
                            <input
                                id="jobTitle"
                                required
                                autoFocus
                                value={formData.jobTitle}
                                onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all hover:border-slate-300 placeholder:text-slate-300 text-lg tracking-tight"
                                placeholder="e.g. Senior Software Architect"
                            />
                        </div>

                        <div className="space-y-1">
                            <LabelWithToggle label="Department" fieldKey="department" required icon={Building2} />
                            <select
                                required
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all appearance-none hover:border-slate-300 cursor-pointer"
                            >
                                <option value="">Select Department</option>
                                <option value="HR">HR & Management</option>
                                <option value="IT">IT & Engineering</option>
                                <option value="Sales">Sales & Marketing</option>
                                <option value="Marketing">Creative & Media</option>
                                <option value="Finance">Finance & Legal</option>
                                <option value="Operations">Operations</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <LabelWithToggle label="Vacancy" fieldKey="vacancy" required icon={Users} />
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.vacancy}
                                onChange={e => setFormData({ ...formData, vacancy: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all hover:border-slate-300"
                            />
                        </div>

                        <div className="space-y-1">
                            <LabelWithToggle label="Job Type" fieldKey="jobType" icon={Clock} />
                            <select
                                value={formData.jobType}
                                onChange={e => setFormData({ ...formData, jobType: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all appearance-none hover:border-slate-300 cursor-pointer"
                            >
                                <option value="Full Time">Full Time</option>
                                <option value="Part Time">Part Time</option>
                                <option value="Contract">Contractual</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <LabelWithToggle label="Work Mode" fieldKey="workMode" icon={MapPin} />
                            <select
                                value={formData.workMode}
                                onChange={e => setFormData({ ...formData, workMode: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all appearance-none hover:border-slate-300 cursor-pointer"
                            >
                                <option value="On-site">On-site (Office)</option>
                                <option value="Remote">Remote (WFH)</option>
                                <option value="Hybrid">Hybrid (Flexible)</option>
                            </select>
                        </div>

                        {/* Experience */}
                        <div className="space-y-1">
                            <LabelWithToggle label="Experience" fieldKey="experience" icon={Calendar} />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="Years"
                                        value={formData.expYears}
                                        onChange={e => setFormData({ ...formData, expYears: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all hover:border-slate-300"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yrs</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="Months"
                                        value={formData.expMonths}
                                        onChange={e => setFormData({ ...formData, expMonths: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all hover:border-slate-300"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mos</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <LabelWithToggle label="Priority Level" fieldKey="priority" icon={Shield} />
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all appearance-none hover:border-slate-300 cursor-pointer"
                            >
                                <option value="High">Urgent Priority</option>
                                <option value="Medium">Medium Priority</option>
                                <option value="Low">Low Priority</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[12px] font-bold text-slate-700 mb-2 px-1 flex items-center gap-2 tracking-tight">
                                <Search size={14} className="text-slate-400" />
                                Job Posting Type
                            </label>
                            <select
                                value={formData.visibility}
                                onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all appearance-none hover:border-slate-300 cursor-pointer"
                            >
                                <option value="External">External (Public Career Page)</option>
                                <option value="Internal">Internal (Employee Referral Only)</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <LabelWithToggle label="Annual Salary Range" fieldKey="salary" />
                            <div className="grid grid-cols-2 gap-6">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-bold">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="Min Salary"
                                        value={formData.salaryMin}
                                        onChange={e => setFormData({ ...formData, salaryMin: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all hover:border-slate-300"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Minimum</div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-bold">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="Max Salary"
                                        value={formData.salaryMax}
                                        onChange={e => setFormData({ ...formData, salaryMax: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all hover:border-slate-300"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Maximum</div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <LabelWithToggle label="Job Description & Responsibilities" fieldKey="description" icon={List} />
                            <textarea
                                rows="6"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition-all hover:border-slate-300 resize-none leading-relaxed"
                                placeholder="Outline the role's mission, key responsibilities, and required qualifications..."
                            />
                        </div>

                        {/* Ad-hoc Details */}
                        <div className="md:col-span-2 mt-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Additional Specifications</h3>
                                </div>
                                <button type="button" onClick={addCustomField} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5">
                                    <Plus size={14} /> Add Parameter
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {customFields.map((field, index) => (
                                    <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                        <button
                                            type="button"
                                            onClick={() => updateCustomField(index, 'isPublic', !field.isPublic)}
                                            className={`p-2.5 rounded-xl transition-all border ${field.isPublic ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                                            title={field.isPublic ? "Visible" : "Hidden"}
                                        >
                                            {field.isPublic ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>

                                        <select
                                            value={field.type || 'text'}
                                            onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                                            className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        >
                                            <option value="text">Short Text</option>
                                            <option value="number">Numeric</option>
                                            <option value="date">Calendar</option>
                                            <option value="textarea">Paragraph</option>
                                            <option value="dropdown">Options List</option>
                                        </select>

                                        <input
                                            type="text"
                                            placeholder="Label (e.g. Notice Period)"
                                            list="adhoc-suggestions"
                                            value={field.label}
                                            onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                                            className="flex-1 min-w-[150px] px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all"
                                        />

                                        <input
                                            type={field.type === 'dropdown' ? 'text' : field.type || 'text'}
                                            placeholder={field.type === 'dropdown' ? "Options (comma separated)" : "Requirement Value"}
                                            value={field.value}
                                            onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                                            className="flex-[2] min-w-[200px] px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 outline-none focus:bg-white transition-all shadow-inner"
                                        />

                                        <button type="button" onClick={() => removeCustomField(index)} className="p-2.5 text-slate-200 hover:text-rose-500 group-hover:text-slate-300 transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {customFields.length === 0 && (
                                    <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optional Supplemental Parameters</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-right-3 duration-700 pb-10">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Hiring Pipeline Architecture</h3>
                            <p className="text-base text-slate-500 font-medium">Define the sequential stages from initial application to final selection.</p>
                        </div>

                        <div className="space-y-6 relative">
                            {/* Decorative Line */}
                            <div className="absolute left-[2.45rem] top-10 bottom-10 w-0.5 bg-slate-100 hidden md:block"></div>

                            {/* Start Stage */}
                            <div className="relative flex items-center gap-6 p-6 bg-emerald-50/40 rounded-[2rem] border border-emerald-100 shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-lg ring-4 ring-emerald-50 shadow-lg shadow-emerald-100/50 z-10">
                                    <Check size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Automated Initialization</p>
                                    <h4 className="text-lg font-extrabold text-slate-800 tracking-tight">Applied / Sourced</h4>
                                </div>
                            </div>

                            {/* Middle Stages */}
                            {workflow.map((stage, index) => (
                                <div key={index} className="relative group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/20 transition-all duration-500">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
                                                {index + 1}
                                            </div>
                                            <input
                                                type="text"
                                                value={stage.name || ''}
                                                autoFocus={stage.name === 'New Round'}
                                                onChange={(e) => updateStage(index, 'name', e.target.value)}
                                                className="text-xl font-extrabold text-slate-900 bg-transparent border-none focus:ring-0 px-0 placeholder:text-slate-200 tracking-tighter"
                                                placeholder="Stage Title (e.g. Design Challenge)"
                                            />
                                        </div>
                                        <button onClick={() => removeStage(index)} className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Round Category</label>
                                            <select
                                                value={stage.type || ''}
                                                onChange={(e) => updateStage(index, 'type', e.target.value)}
                                                className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="Screening">🔍 Initial Screening</option>
                                                <option value="Interview">🗣️ Personal Interview</option>
                                                <option value="Assessment">📝 Written Assessment</option>
                                                <option value="Test">💻 Practical Test</option>
                                                <option value="Other">🏷️ Special Category</option>
                                            </select>
                                        </div>

                                        {stage.type?.toLowerCase().includes('interview') && (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Interview Format</label>
                                                <input
                                                    type="text"
                                                    value={stage.interviewType || ''}
                                                    onChange={(e) => updateStage(index, 'interviewType', e.target.value)}
                                                    className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all"
                                                    placeholder="e.g. Video Call / In-Person"
                                                />
                                            </div>
                                        )}

                                        {stage.type?.toLowerCase().includes('interview') && (
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Primary Evaluator Designation</label>
                                                <input
                                                    type="text"
                                                    value={stage.interviewer || ''}
                                                    onChange={(e) => updateStage(index, 'interviewer', e.target.value)}
                                                    className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all"
                                                    placeholder="e.g. Department Head / VP of Engineering"
                                                />
                                            </div>
                                        )}

                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Evaluation Scorecard Notes</label>
                                            <textarea
                                                rows="3"
                                                value={stage.description || ''}
                                                onChange={(e) => updateStage(index, 'description', e.target.value)}
                                                className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-600 outline-none focus:bg-white transition-all resize-none shadow-inner"
                                                placeholder="Briefly describe the success criteria for this specific stage..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button type="button" onClick={addStage} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all">
                                    <Plus size={24} />
                                </div>
                                <span className="font-extrabold text-sm uppercase tracking-widest">Append Pipeline Round</span>
                            </button>

                            {/* End Stage */}
                            <div className="relative flex items-center gap-6 p-6 bg-slate-50/60 rounded-[2rem] border border-slate-100">
                                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white ring-4 ring-slate-100 shadow-lg">
                                    <Save size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Automated Termination</p>
                                    <h4 className="text-lg font-extrabold text-slate-600 tracking-tight">Finalized (Offer / Rejection)</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Actions Footer */}
            <div className="px-10 py-8 border-t border-slate-100 bg-white flex items-center justify-between gap-6 sticky bottom-0 z-10">
                <button
                    type="button"
                    onClick={() => {
                        if (step === 2) setStep(1);
                        else onClose();
                    }}
                    className="px-8 py-4 font-bold text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2.5 active:scale-95 group"
                >
                    {step === 1 ? <Trash2 size={16} /> : <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />}
                    {step === 1 ? 'Discard Draft' : 'Previous Step'}
                </button>

                <div className="flex gap-6">
                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (!formData.jobTitle || !formData.department || !formData.vacancy) {
                                    alert('Please fill in Job Title, Department and Vacancy');
                                    return;
                                }
                                setStep(2);
                            }}
                            className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-3 group"
                        >
                            Next: Pipeline Design
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={saving || !canSave}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 active:scale-95 transition-all flex items-center gap-3 ${saving || !canSave ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {saving ? 'Processing...' : (isEdit ? 'Sync Configurations' : 'Launch Channel')}
                            <Check size={20} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>

            <datalist id="adhoc-suggestions">
                <option value="Notice Period" />
                <option value="Shift Timing" />
                <option value="Probation Period" />
                <option value="Bond/Agreement" />
                <option value="Qualification" />
            </datalist>
        </form>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xl animate-in fade-in duration-500">
                <div className="bg-white rounded-[3rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.15)] w-full max-w-6xl flex flex-col max-h-[92vh] overflow-hidden border border-white/20">
                    {FormContent}
                </div>
            </div>
        );
    }

    return FormContent;
}
