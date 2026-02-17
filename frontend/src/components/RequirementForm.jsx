import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import {
    Briefcase, Users, Clock, MapPin, Shield, Eye, EyeOff, Plus, Trash2, Check,
    ArrowRight, ArrowLeft, Building2, Calendar, ChevronRight, Search, Type,
    List, Layers, Save, X, AlertTriangle, FileText, Globe, Lock, Zap, Settings, ClipboardCheck
} from 'lucide-react';
import { Modal } from 'antd';
import StageForm from '../pages/HR/components/StageForm';

const COMMON_SKILLS = [
    // Development & IT
    'React', 'Node.js', 'Python', 'Java', 'SQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes',
    'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'HTML', 'CSS', 'Tailwind',
    'PHP', 'Laravel', 'Swift', 'Kotlin', 'Flutter', 'Dart', 'Ruby', 'Rails', 'Angular', 'Vue.js',
    'Git', 'CI/CD', 'REST API', 'GraphQL', 'Next.js', 'Express.js', 'Django', 'Spring Boot',
    'Cybersecurity', 'Linux', 'Cloud Computing', 'Azure', 'GCP', 'DevOps', 'Microservices',

    // Design & Creative
    'Graphic Design', 'Photoshop', 'Illustrator', 'Figma', 'Canva', 'UI/UX Design', 'InDesign',
    'Video Editing', 'Premiere Pro', 'After Effects', 'Animation', '3D Modeling', 'Blender',
    'Photography', 'Photo Editing', 'Typography', 'Logo Design', 'Branding', 'Adobe Creative Suite',
    'Sketch', 'Prototyping', 'User Research', 'Wireframing',

    // Marketing & Content
    'Content Writing', 'Copywriting', 'SEO', 'Social Media Marketing', 'Digital Marketing',
    'Email Marketing', 'Google Analytics', 'Blogging', 'Technical Writing', 'Storytelling',
    'Public Relations', 'SEM', 'PPC', 'Content Strategy', 'Brand Management', 'Market Research',
    'Affiliate Marketing', 'Influencer Marketing', 'Video Marketing',

    // Business & Management
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Strategic Planning', 'Business Analysis',
    'Product Management', 'CRM', 'Salesforce', 'Sales', 'Negotiation', 'Customer Service',
    'Change Management', 'Risk Management', 'Operations Management', 'B2B Sales', 'Account Management',
    'Business Development', 'Team Management', 'Stakeholder Management',

    // Data & Analytics
    'Data Analysis', 'Microsoft Excel', 'Power BI', 'Tableau', 'Machine Learning',
    'Artificial Intelligence', 'Deep Learning', 'Statistics', 'R', 'Data Visualization', 'Big Data',
    'Data Mining', 'SQL Server', 'PostgreSQL',

    // Soft Skills & General
    'Communication', 'Time Management', 'Teamwork', 'Problem Solving', 'Critical Thinking',
    'Adaptability', 'Creativity', 'Emotional Intelligence', 'Decision Making', 'Public Speaking',
    'Mentoring', 'Conflict Resolution', 'Networking',

    // HR & Finance
    'Recruitment', 'Human Resources', 'Accounting', 'Financial Analysis', 'Payroll', 'Compliance',
    'Talent Acquisition', 'Employee Relations', 'Bookkeeping', 'QuickBooks', 'Auditing', 'Taxation'
];

export default function RequirementForm({ onClose, onSuccess, initialData, isEdit, isModal = true }) {
    // --- State ---
    const [step, setStep] = useState(1);
    const [positions, setPositions] = useState([]);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [saving, setSaving] = useState(false);
    const [publicFields, setPublicFields] = useState(new Set([
        'jobTitle', 'department', 'vacancy', 'description',
        'workMode', 'jobType', 'experience', 'salary'
    ]));

    const [formData, setFormData] = useState({
        // Core
        jobTitle: '',
        department: '',
        positionId: '',
        vacancy: 1,

        // Config
        workMode: 'On-site',
        jobType: 'Full Time',
        priority: 'Medium',
        visibility: 'External',
        expYears: '',
        expMonths: '',

        // Salary
        salaryMin: '',
        salaryMax: '',
        isSalaryOverride: false,

        // Details
        description: '',
        responsibilities: [],
        requiredSkills: [], // Array of strings
        optionalSkills: [],

        // Custom
        customFields: []
    });

    // Workflow State
    const [workflow, setWorkflow] = useState([
        { name: 'Shortlisted', type: 'screening' },
        { name: 'Interview', type: 'interview', interviewType: 'Technical', interviewer: '', description: '' }
    ]);

    const [customFieldDefs, setCustomFieldDefs] = useState([]);
    const [removedCoreFields, setRemovedCoreFields] = useState(new Set());
    const [expandCustomFields, setExpandCustomFields] = useState(true);
    const [pipelineTemplates, setPipelineTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Stage Config State
    const [showStageModal, setShowStageModal] = useState(false);
    const [editingStageIdx, setEditingStageIdx] = useState(-1);
    const [editingStageData, setEditingStageData] = useState(null);

    // --- On Mount ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Positions, Open Requirements, Custom Fields, and Pipeline Templates
                const [posRes, reqRes, cfRes, pipeRes] = await Promise.all([
                    api.get('/hrms/positions'),
                    api.get('/requirements/list?status=Open&limit=1000'),
                    api.get('/hrms/custom-fields'),
                    api.get('/pipeline/templates')
                ]);

                if (posRes.data.success) {
                    let validPositions = posRes.data.data.filter(p => p.status !== 'Cancelled');

                    // If NOT in edit mode, filter out positions that already have an OPEN Job Opening
                    if (!isEdit) {
                        const openRequirements = reqRes.data.requirements || [];
                        const busyPositionIds = new Set(openRequirements.map(r => {
                            const pid = r.positionId;
                            return String((pid && typeof pid === 'object') ? pid._id : pid);
                        }));

                        validPositions = validPositions.filter(p => !busyPositionIds.has(String(p._id)));
                    }

                    setPositions(validPositions);
                }

                if (cfRes.data) {
                    setCustomFieldDefs(cfRes.data);
                    // Initialize formData.customFields with active global definitions if not editing
                    if (!isEdit) {
                        const activeGlobalFields = cfRes.data
                            .filter(d => d.isActive)
                            .map(d => ({
                                label: d.label,
                                key: d.key,
                                value: d.defaultValue || '',
                                type: d.type,
                                isPublic: d.isPublic,
                                isAdHoc: false
                            }));
                        setFormData(prev => ({ ...prev, customFields: activeGlobalFields }));
                    }
                }

                if (pipeRes.data) {
                    setPipelineTemplates(pipeRes.data);
                    // Select default template if it exists
                    const defPipe = pipeRes.data.find(p => p.isDefault);
                    if (defPipe && !isEdit) {
                        setSelectedTemplateId(defPipe._id);
                        const mappedWorkflow = defPipe.stages
                            .filter(s => !['Applied', 'Finalized', 'Rejected'].includes(s.stageName))
                            .map(s => ({
                                name: s.stageName,
                                type: s.stageType.toLowerCase(),
                                ...s
                            }));
                        setWorkflow(mappedWorkflow);
                    }
                }

            } catch (err) {
                console.error("Error fetching initial data", err);
            }
        };

        fetchData();
    }, [isEdit]);

    // Load Initial Data (Edit Mode)
    useEffect(() => {
        if (initialData) {
            // Populate form
            setFormData({
                jobTitle: initialData.jobTitle || '',
                department: initialData.department || '',
                positionId: initialData.positionId || '',
                vacancy: initialData.vacancy || 1,
                workMode: initialData.workMode || 'On-site',
                jobType: initialData.jobType || 'Full Time',
                priority: initialData.priority || 'Medium',
                visibility: initialData.visibility || 'External',
                expYears: initialData.minExperienceMonths ? Math.floor(initialData.minExperienceMonths / 12) : '',
                expMonths: initialData.minExperienceMonths ? initialData.minExperienceMonths % 12 : '',
                salaryMin: initialData.salaryMin || '',
                salaryMax: initialData.salaryMax || '',
                isSalaryOverride: initialData.isSalaryOverride || false,
                description: initialData.description || '',
                responsibilities: initialData.responsibilities || '',
                requiredSkills: initialData.requiredSkills || [],
                optionalSkills: initialData.optionalSkills || [],
                customFields: initialData.customFields || []
            });

            if (initialData.detailedWorkflow && initialData.detailedWorkflow.length > 0) {
                const editable = initialData.detailedWorkflow
                    .filter(s => !['Applied', 'Finalized', 'Rejected', 'Selected', 'Offer', 'Hired'].includes(s.stageName))
                    .map(s => ({
                        name: s.stageName,
                        type: s.stageType === 'Assessment' ? 'assessment' : (s.stageType === 'Interview' ? 'interview' : 'screening'),
                        ...s
                    }));
                setWorkflow(editable);
            } else if (initialData.workflow) {
                // Filter out immutable stages for editing
                const editable = initialData.workflow
                    .filter(s => !['Applied', 'Finalized', 'Rejected', 'Selected', 'Offer', 'Hired'].includes(s))
                    .map(stage => {
                        if (typeof stage === 'string') return { name: stage, type: 'screening' };
                        return stage;
                    });
                if (editable.length > 0) setWorkflow(editable);
            }

            // Also set selectedPosition for context if available
            if (initialData.positionId) {
                // We depend on positions being loaded. 
                // We'll set this once positions are fetched or assume logic handles it.
            }
        }
    }, [initialData]);

    // Update Selected Position Context when positions load or ID changes
    useEffect(() => {
        if (formData.positionId && positions.length > 0) {
            const pos = positions.find(p => p._id === formData.positionId);
            setSelectedPosition(pos);

            // Auto-fill if NOT Editing (fresh creation)
            if (!isEdit && pos) {
                setFormData(prev => ({
                    ...prev,
                    jobTitle: pos.jobTitle,
                    department: pos.department,
                    salaryMin: pos.baseSalaryRange?.min || 0,
                    salaryMax: pos.baseSalaryRange?.max || 0
                }));
            }
        }
    }, [formData.positionId, positions, isEdit]);


    // --- Actions ---

    // --- Helpers ---
    const togglePublic = (field) => {
        const newSet = new Set(publicFields);
        if (newSet.has(field)) newSet.delete(field);
        else newSet.add(field);
        setPublicFields(newSet);
    };

    const toggleFieldRemoval = (field) => {
        const newSet = new Set(removedCoreFields);
        if (newSet.has(field)) newSet.delete(field);
        else newSet.add(field);
        setRemovedCoreFields(newSet);
    };

    const PublicToggle = ({ field, isCustom = false, customIndex = -1 }) => {
        let isPublic = false;
        if (isCustom) {
            isPublic = formData.customFields[customIndex]?.isPublic ?? true;
        } else {
            isPublic = publicFields.has(field);
        }

        return (
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    if (isCustom) {
                        setFormData(prev => {
                            const newFields = [...prev.customFields];
                            if (newFields[customIndex]) {
                                newFields[customIndex] = { ...newFields[customIndex], isPublic: !isPublic };
                            }
                            return { ...prev, customFields: newFields };
                        });
                    } else {
                        togglePublic(field);
                    }
                }}
                className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${isPublic ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
            >
                {isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                {isPublic ? 'Public' : 'Hidden'}
            </button>
        );
    };

    const LabelWithToggle = ({ label, field, required = false, icon = null, hideRemove = false }) => (
        <div className="flex justify-between items-center mb-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                {icon && <span className="p-1 rounded bg-indigo-50 text-indigo-600">{icon}</span>}
                {label}
                {required && <span className="text-rose-500 font-black text-xs leading-none transform translate-y-0.5 ml-1">REQUIRED</span>}
            </label>
            <div className="flex items-center gap-2">
                <PublicToggle field={field} />
                {!hideRemove && !required && (
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); toggleFieldRemoval(field); }}
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100 group/del"
                        title="Remove field from form"
                    >
                        <Trash2 size={12} className="group-hover/del:scale-110 transition-transform" />
                    </button>
                )}
            </div>
        </div>
    );

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

    // --- Actions ---

    const handleNext = () => {
        // ... (existing validation logic)
        // Validation per step
        if (step === 1) {
            if (!formData.positionId) return alert("Please select a Position to continue.");
            // Check status (Frontend check)
            if (selectedPosition && ['Filled', 'Cancelled', 'Inactive'].includes(selectedPosition.status)) {
                return alert(`Position is ${selectedPosition.status}. Cannot open recruitment.`);
            }
        }

        if (step === 2) {
            if (formData.vacancy < 1) return alert("Vacancy must be at least 1.");

            // Salary Logic with Override
            const jobMin = Number(formData.salaryMin);
            const jobMax = Number(formData.salaryMax);

            if (jobMin > jobMax) return alert("Min Salary cannot extend Max Salary.");

            if (!formData.isSalaryOverride && selectedPosition) {
                const posMin = selectedPosition.baseSalaryRange?.min || 0;
                const posMax = selectedPosition.baseSalaryRange?.max || 0;

                if (jobMin < posMin || jobMax > posMax) {
                    return alert(`Salary range is outside Approved Position Budget (₹${posMin.toLocaleString()} - ₹${posMax.toLocaleString()}).\n\nPlease enable 'Manual Override' to proceed.`);
                }
            }

            // Custom Fields Validation (Global Required fields)
            const activeDefs = customFieldDefs.filter(d => d.isActive && d.isRequired);
            for (const def of activeDefs) {
                const field = formData.customFields.find(f => f.key === def.key || f.label === def.label);
                // Check if value exists and is not empty (for string)
                if (!field || field.value === undefined || field.value === null || (typeof field.value === 'string' && field.value.trim() === '')) {
                    return alert(`"${def.label}" is a required field.`);
                }
            }
        }

        if (step === 3) {
            // If External, Description is mandatory
            if (formData.visibility !== 'Internal') {
                if (!formData.description || formData.description.trim().length < 50) {
                    return alert("Role Overview must be at least 50 characters for public postings.");
                }

                const cleanedResp = (Array.isArray(formData.responsibilities) ? formData.responsibilities : [])
                    .map(r => r.trim())
                    .filter(r => r.length > 0);

                if (cleanedResp.length < 1) {
                    return alert("At least 1 Key Responsibility must be defined for public postings.");
                }

                if (formData.requiredSkills.length < 1) {
                    return alert("At least 1 Required Skill must be added.");
                }


            }
        }

        setStep(prev => prev + 1);
    };

    // ... (existing handleBack, updateField, submit)
    const handleBack = () => setStep(prev => prev - 1);

    // --- Inputs Helper ---
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- Submit ---
    const submit = async () => {
        setSaving(true);
        try {
            const totalMonths = (parseInt(formData.expYears) || 0) * 12 + (parseInt(formData.expMonths) || 0);

            // Construct Workflow
            const fullWorkflow = ['Applied', ...workflow.map(w => w.name), 'Finalized'];

            // Clean Arrays
            const cleanResp = [...new Set(
                (Array.isArray(formData.responsibilities) ? formData.responsibilities : [])
                    .map(r => String(r).trim())
                    .filter(r => r.length > 0)
            )];

            const cleanSkills = [...new Set(
                (Array.isArray(formData.requiredSkills) ? formData.requiredSkills : [])
                    .map(s => String(s).trim())
                    .filter(s => s.length > 0)
            )];

            // Clean Custom Fields (Remove empty ad-hoc)
            const cleanCustom = formData.customFields.filter(f => f.label && f.type);

            const payload = {
                ...formData,
                responsibilities: cleanResp,
                requiredSkills: cleanSkills,
                minExperienceMonths: totalMonths,
                maxExperienceMonths: totalMonths,
                workflow: fullWorkflow,
                detailedWorkflow: [
                    { stageName: 'Applied', stageType: 'Applied', positionIndex: 0, isLocked: true },
                    ...workflow.map((w, idx) => ({
                        ...w, // Spread all fields (interviewerIds, mode, duration, etc.)
                        stageName: w.name || w.stageName,
                        stageType: (w.stageType || (w.type === 'assessment' ? 'Assessment' : (w.type === 'interview' ? 'Interview' : 'Screening'))).charAt(0).toUpperCase() + (w.stageType || w.type || 'interview').slice(1).toLowerCase(),
                        positionIndex: idx + 1,
                        evaluationNotes: w.evaluationNotes || w.description || w.notes || '',
                        mode: w.mode || 'Online',
                        durationMinutes: w.durationMinutes || 30,
                        // 🚀 FRONTEND NORMALIZER: Never send empty strings for ObjectIds
                        // Handle both key variants (Id vs non-Id) used in different parts of the app
                        assignedInterviewerId: (w.assignedInterviewerId === "" || w.assignedInterviewer === "" || !w.assignedInterviewerId && !w.assignedInterviewer) ? null : (w.assignedInterviewerId || w.assignedInterviewer),
                        feedbackTemplateId: (w.feedbackTemplateId === "" || w.feedbackTemplateId === "null" || !w.feedbackTemplateId) ? null : w.feedbackTemplateId
                    })),
                    { stageName: 'Finalized', stageType: 'Finalized', positionIndex: workflow.length + 1, isLocked: true }
                ],
                publicFields: Array.from(publicFields),
                customFields: cleanCustom
            };

            console.log("Submitting Clean Payload:", payload);

            // Form Data for file handling
            const submitData = new FormData();
            Object.keys(payload).forEach(key => {
                // Serialize arrays/objects to JSON string for backend parsing
                if (['customFields', 'publicFields', 'workflow', 'detailedWorkflow', 'requiredSkills', 'optionalSkills', 'responsibilities', 'qualifications', 'benefits'].includes(key)) {
                    submitData.append(key, JSON.stringify(payload[key]));
                } else if (payload[key] !== undefined && payload[key] !== null) {
                    submitData.append(key, payload[key]);
                }
            });

            if (isEdit) {
                await api.put(`/requirements/${initialData._id}`, submitData);
            } else {
                await api.post('/requirements/create', submitData);
            }

            alert("Job Opening Saved Successfully!");
            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (err) {
            console.error(err);
            alert(`Failed: ${err.response?.data?.message || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // ... (other render steps)

    // Helper to add ad-hoc custom field
    const addAdHocCustomField = () => {
        setFormData(prev => ({
            ...prev,
            customFields: [
                ...prev.customFields,
                { label: '', value: '', type: 'text', isPublic: true, isAdHoc: true }
            ]
        }));
    };

    const removeCustomField = (index) => {
        setFormData(prev => ({
            ...prev,
            customFields: prev.customFields.filter((_, i) => i !== index)
        }));
    };

    const handleCustomFieldChange = (def, value, isPublic = null) => {
        setFormData(prev => {
            const newFields = [...prev.customFields];
            const idx = newFields.findIndex(f => f.key === def.key || (f.label === def.label && !f.isAdHoc));

            const fieldEntry = {
                label: def.label,
                key: def.key,
                value: value,
                type: def.type,
                isPublic: isPublic !== null ? isPublic : (idx >= 0 ? newFields[idx].isPublic : def.isPublic)
            };

            if (idx >= 0) {
                newFields[idx] = { ...newFields[idx], ...fieldEntry }; // Merge to keep other props
            } else {
                newFields.push(fieldEntry);
            }
            return { ...prev, customFields: newFields };
        });
    };

    const renderCustomFields = () => {
        // We merged Global Definitions and Ad-Hoc fields
        const activeDefs = customFieldDefs.filter(d => d.isActive);

        // Get Ad-Hoc fields (those not in activeDefs)
        const adHocFields = formData.customFields.filter(f => f.isAdHoc);

        return (
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                <div
                    className="flex justify-between items-center mb-2"
                >
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors flex-1"
                        onClick={() => setExpandCustomFields(!expandCustomFields)}
                    >
                        <div className={`transform transition-transform duration-200 ${expandCustomFields ? 'rotate-90' : ''}`}>
                            <ChevronRight size={16} className="text-slate-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Additional Specifications</h3>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    <button
                        onClick={(e) => { e.preventDefault(); addAdHocCustomField(); if (!expandCustomFields) setExpandCustomFields(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                        <Plus size={14} /> Add Field
                    </button>
                </div>

                {expandCustomFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* 1. Global Defined Fields */}
                        {activeDefs.map(def => {
                            // Find in formData or init
                            let fieldIndex = formData.customFields.findIndex(f => f.key === def.key || (f.label === def.label && !f.isAdHoc));
                            let val = fieldIndex >= 0 ? formData.customFields[fieldIndex].value : def.defaultValue || '';

                            return (
                                <div key={def._id} className="space-y-1 relative group p-1 rounded-lg hover:bg-slate-50/50">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                            {def.label}
                                            {def.isRequired && <span className="text-rose-500">*</span>}
                                        </label>

                                        {/* Public Toggle */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // If not in state, init it
                                                if (fieldIndex === -1) {
                                                    handleCustomFieldChange(def, val, !def.isPublic); // Toggle default
                                                } else {
                                                    const newFields = [...formData.customFields];
                                                    newFields[fieldIndex] = { ...newFields[fieldIndex], isPublic: !newFields[fieldIndex].isPublic };
                                                    setFormData(prev => ({ ...prev, customFields: newFields }));
                                                }
                                            }}
                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${(fieldIndex >= 0 ? formData.customFields[fieldIndex].isPublic : def.isPublic)
                                                ? 'bg-indigo-100 text-indigo-600'
                                                : 'bg-slate-100 text-slate-400'
                                                }`}
                                        >
                                            {(fieldIndex >= 0 ? formData.customFields[fieldIndex].isPublic : def.isPublic) ? <Eye size={10} /> : <EyeOff size={10} />}
                                        </button>
                                    </div>

                                    {/* Render Input based on Ref */}
                                    {renderFieldInput(def, val, (v) => handleCustomFieldChange(def, v))}
                                </div>
                            );
                        })}

                        {/* 2. Ad-Hoc Fields */}
                        {adHocFields.map((field, idx) => {
                            // Correct index in main array
                            const mainIndex = formData.customFields.indexOf(field);

                            return (
                                <div key={`adhoc-${idx}`} className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl relative group">
                                    <button
                                        onClick={() => removeCustomField(mainIndex)}
                                        className="absolute -top-2 -right-2 bg-white text-rose-500 p-1 rounded-full shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-rose-50"
                                    >
                                        <X size={12} />
                                    </button>

                                    {/* Config Row */}
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Field Name"
                                            value={field.label}
                                            onChange={e => {
                                                const newFields = [...formData.customFields];
                                                newFields[mainIndex].label = e.target.value;
                                                setFormData(prev => ({ ...prev, customFields: newFields }));
                                            }}
                                            className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold focus:border-indigo-500 outline-none"
                                        />
                                        <select
                                            value={field.type}
                                            onChange={e => {
                                                const newFields = [...formData.customFields];
                                                newFields[mainIndex].type = e.target.value;
                                                newFields[mainIndex].value = ''; // Reset value on type change
                                                setFormData(prev => ({ ...prev, customFields: newFields }));
                                            }}
                                            className="w-24 bg-white border border-slate-200 rounded px-1 py-1 text-xs outline-none"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="textarea">Long Text</option>
                                            <option value="checkbox">Yes/No</option>
                                        </select>

                                        {/* Public Toggle Ad-Hoc */}
                                        <div onClick={() => {
                                            const newFields = [...formData.customFields];
                                            newFields[mainIndex].isPublic = !newFields[mainIndex].isPublic;
                                            setFormData(prev => ({ ...prev, customFields: newFields }));
                                        }} className={`cursor-pointer w-6 h-6 flex items-center justify-center rounded ${field.isPublic ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                            {field.isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                                        </div>
                                    </div>

                                    {/* Value Input */}
                                    {renderFieldInput({ type: field.type, options: [] }, field.value, (v) => {
                                        const newFields = [...formData.customFields];
                                        newFields[mainIndex].value = v;
                                        setFormData(prev => ({ ...prev, customFields: newFields }));
                                    })}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Helper Renderer
    const renderFieldInput = (def, val, onChange) => {
        const baseClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm";

        if (def.type === 'text') return <input type="text" value={val} onChange={e => onChange(e.target.value)} className={baseClass} placeholder={def.placeholder || 'Enter value...'} />;
        if (def.type === 'number') return <input type="number" value={val} onChange={e => onChange(e.target.value)} className={baseClass} />;
        if (def.type === 'textarea') return <textarea value={val} onChange={e => onChange(e.target.value)} rows={3} className={`${baseClass} resize-none`} />;
        if (def.type === 'date') return <input type="date" value={val} onChange={e => onChange(e.target.value)} className={baseClass} />;

        if (def.type === 'checkbox') return (
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-white transition-colors group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm ${val ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                    {val && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" checked={!!val} onChange={e => onChange(e.target.checked)} className="hidden" />
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Yes, enable this option</span>
            </label>
        );

        if (def.type === 'dropdown' || def.type === 'multiSelect') return (
            <div className="relative">
                <select
                    multiple={def.type === 'multiSelect'}
                    value={def.type === 'multiSelect' ? (Array.isArray(val) ? val : []) : val}
                    onChange={e => {
                        const v = def.type === 'multiSelect' ? Array.from(e.target.selectedOptions, o => o.value) : e.target.value;
                        onChange(v);
                    }}
                    className={`${baseClass} appearance-none ${def.type === 'multiSelect' ? 'h-32' : ''}`}
                >
                    {!def.type === 'multiSelect' && <option value="">Select an option...</option>}
                    {def.options && def.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {!def.type === 'multiSelect' && <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />}
            </div>
        );
        return null;
    };





    const renderStep1_Position = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-indigo-100">
                    <Building2 size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Select Position</h2>
                <p className="text-slate-500 font-medium">Choose a position from the approved manpower plan to start recruitment.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {positions.map(pos => {
                    const isSelected = formData.positionId === pos._id;
                    return (
                        <div
                            key={pos._id}
                            onClick={() => {
                                updateField('positionId', pos._id);
                            }}
                            className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${isSelected
                                ? 'border-indigo-600 bg-indigo-50/30 shadow-xl shadow-indigo-100 ring-2 ring-indigo-600 ring-offset-2'
                                : 'border-slate-100 bg-white hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1'
                                }`}
                        >
                            {isSelected && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform">
                                    <Check size={14} strokeWidth={3} />
                                </div>
                            )}

                            <div className="mb-4">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`font-black text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{pos.jobTitle}</h3>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${pos.status === 'Open' || pos.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${pos.status === 'Open' || pos.status === 'Approved' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                    {pos.status}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    <Building2 size={12} className="text-slate-400" /> {pos.department}
                                </span>
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    <MapPin size={12} className="text-slate-400" /> {pos.location || 'HQ'}
                                </span>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                                    <Users size={16} className="text-indigo-500" />
                                    <span>{pos.vacancy} <span className="text-slate-400 font-normal">Vacancies</span></span>
                                </div>
                                <ArrowRight size={16} className={`transition-transform duration-300 ${isSelected ? 'text-indigo-600 translate-x-1' : 'text-slate-300 group-hover:text-indigo-400'}`} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {positions.length === 0 && (
                <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Positions Found</h3>
                    <p className="text-slate-400 max-w-xs mx-auto text-sm">There are no approved positions available for recruitment at the moment.</p>
                </div>
            )}
        </div>
    );

    // Creatable Select Component (Dropdown + Custom Input)
    const CreatableSelect = ({ value, onChange, options, icon: Icon }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [tempValue, setTempValue] = useState('');
        const [showInput, setShowInput] = useState(false);
        const wrapperRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                    setIsOpen(false);
                    setShowInput(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleSelect = (val) => {
            onChange(val);
            setIsOpen(false);
            setShowInput(false);
        };

        const handleCustomAdd = () => {
            if (tempValue.trim()) {
                onChange(tempValue.trim());
                setTempValue('');
                setShowInput(false);
                setIsOpen(false);
            }
        };

        return (
            <div className="relative" ref={wrapperRef}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 hover:border-slate-300 transition-all font-bold text-slate-700 shadow-sm flex items-center justify-between cursor-pointer group"
                >
                    <div className="flex items-center gap-2">
                        {Icon && <Icon size={14} className="text-indigo-400 group-hover:text-indigo-500" />}
                        <span>{value || 'Select option...'}</span>
                    </div>
                    <ChevronRight className={`transition-transform duration-300 text-slate-400 ${isOpen ? 'rotate-90' : 'rotate-0'}`} size={16} />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                            {options.map((opt) => {
                                const optVal = typeof opt === 'string' ? opt : opt.value;
                                const optLabel = typeof opt === 'string' ? opt : opt.label;
                                return (
                                    <div
                                        key={optVal}
                                        onClick={() => handleSelect(optVal)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${value === optVal ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                            }`}
                                    >
                                        {optLabel}
                                        {value === optVal && <Check size={14} strokeWidth={3} />}
                                    </div>
                                );
                            })}
                        </div>

                        {!showInput ? (
                            <button
                                onClick={() => setShowInput(true)}
                                className="w-full mt-2 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={12} /> Add Custom Option
                            </button>
                        ) : (
                            <div className="mt-2 p-2 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-2 animate-in zoom-in-95">
                                <input
                                    autoFocus
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    placeholder="Enter custom..."
                                    className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
                                />
                                <button
                                    onClick={handleCustomAdd}
                                    className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                                >
                                    <Check size={14} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => setShowInput(false)}
                                    className="text-slate-400 p-1.5 hover:bg-white hover:text-slate-600 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderStep2_Config = () => {
        const CORE_FIELD_DATA = {
            priority: { label: 'Urgency / Priority', icon: <Shield size={14} /> },
            workMode: { label: 'Work Mode', icon: <MapPin size={14} /> },
            jobType: { label: 'Job Type', icon: <Briefcase size={14} /> },
            visibility: { label: 'Posting Type', icon: <Globe size={14} /> },
            experience: { label: 'Required Experience', icon: <Calendar size={14} /> },
            salary: { label: 'Salary Compensation', icon: <Lock size={14} /> },
            remarks: { label: 'Other / Remarks', icon: <FileText size={14} /> }
        };

        const removedFields = Array.from(removedCoreFields);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="md:col-span-2 text-center mb-2 relative">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-blue-100">
                        <Settings size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Hiring Configuration</h2>
                    <p className="text-slate-500 font-medium">Define the core parameters and visibility for this opening.</p>

                    {removedFields.length > 0 && (
                        <div className="absolute right-0 top-0">
                            <div className="relative group/addmenu">
                                <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm">
                                    <Plus size={14} /> Add Config Field
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 hidden group-hover/addmenu:block animate-in fade-in zoom-in-95 z-50">
                                    {removedFields.map(key => (
                                        <div
                                            key={key}
                                            onClick={() => toggleFieldRemoval(key)}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group/item"
                                        >
                                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-400 group-hover/item:text-indigo-600 transition-colors">
                                                {CORE_FIELD_DATA[key].icon}
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 group-hover/item:text-slate-900">{CORE_FIELD_DATA[key].label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vacancy - Always Visible & Required */}
                <div className="space-y-1">
                    <LabelWithToggle label="Total Vacancy" field="vacancy" required icon={<Users size={14} />} hideRemove />
                    <input
                        type="number" min="1"
                        value={formData.vacancy}
                        onChange={e => updateField('vacancy', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all"
                    />
                </div>

                {/* Priority */}
                {!removedCoreFields.has('priority') && (
                    <div className="space-y-1 animate-in zoom-in-95 duration-300">
                        <LabelWithToggle label="Urgency / Priority" field="priority" icon={<Shield size={14} />} />
                        <CreatableSelect
                            value={formData.priority}
                            onChange={val => updateField('priority', val)}
                            options={[
                                { value: 'High', label: 'High Urgency' },
                                { value: 'Medium', label: 'Medium Priority' },
                                { value: 'Low', label: 'Low Priority' }
                            ]}
                        />
                    </div>
                )}

                {/* Work Mode */}
                {!removedCoreFields.has('workMode') && (
                    <div className="space-y-1 animate-in zoom-in-95 duration-300">
                        <LabelWithToggle label="Work Mode" field="workMode" icon={<MapPin size={14} />} />
                        <CreatableSelect
                            value={formData.workMode}
                            onChange={val => updateField('workMode', val)}
                            options={[
                                { value: 'On-site', label: 'On-site (Office)' },
                                { value: 'Remote', label: 'Remote (WFH)' },
                                { value: 'Hybrid', label: 'Hybrid Check-in' }
                            ]}
                        />
                    </div>
                )}

                {/* Job Type */}
                {!removedCoreFields.has('jobType') && (
                    <div className="space-y-1 animate-in zoom-in-95 duration-300">
                        <LabelWithToggle label="Job Type" field="jobType" icon={<Briefcase size={14} />} />
                        <CreatableSelect
                            value={formData.jobType}
                            onChange={val => updateField('jobType', val)}
                            options={[
                                'Full Time', 'Contract', 'Internship', 'Freelance'
                            ]}
                        />
                    </div>
                )}

                {/* Posting Type / Visibility */}
                {!removedCoreFields.has('visibility') && (
                    <div className="space-y-1 animate-in zoom-in-95 duration-300">
                        <LabelWithToggle label="Posting Type" field="visibility" icon={<Globe size={14} />} />
                        <CreatableSelect
                            value={formData.visibility}
                            onChange={val => updateField('visibility', val)}
                            options={[
                                { value: 'External', label: 'External (Public)' },
                                { value: 'Internal', label: 'Internal Only' },
                                { value: 'Both', label: 'Both (Public + Internal)' }
                            ]}
                        />
                    </div>
                )}

                {/* Experience */}
                {!removedCoreFields.has('experience') && (
                    <div className="md:col-span-2 space-y-1 animate-in zoom-in-95 duration-300 border-t border-slate-100 pt-6 mt-2">
                        <LabelWithToggle label="Required Experience" field="experience" icon={<Calendar size={14} />} />
                        <div className="flex gap-4">
                            <div className="relative flex-1 group">
                                <input type="number" placeholder="0"
                                    value={formData.expYears}
                                    onChange={e => updateField('expYears', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all"
                                />
                                <span className="absolute right-4 top-3.5 text-xs font-black text-slate-400 group-hover:text-indigo-400 transition-colors">YRS</span>
                            </div>
                            <div className="relative flex-1 group">
                                <input type="number" placeholder="0" max="11"
                                    value={formData.expMonths}
                                    onChange={e => updateField('expMonths', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all"
                                />
                                <span className="absolute right-4 top-3.5 text-xs font-black text-slate-400 group-hover:text-indigo-400 transition-colors">MOS</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Salary */}
                {!removedCoreFields.has('salary') && (
                    <div className="md:col-span-2 pt-6 border-t border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <LabelWithToggle label="Salary Compensation" field="salary" icon={<Lock size={14} />} />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 shadow-sm shadow-amber-900/5">
                                <Lock size={12} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Locked to Position Budget</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 font-bold text-slate-400 group-hover:text-amber-500 transition-colors">₹</span>
                                <input type="number" placeholder="Min"
                                    value={formData.salaryMin}
                                    readOnly={true}
                                    className="w-full pl-8 pr-4 py-3 border rounded-xl outline-none font-bold bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200 shadow-inner"
                                />
                            </div>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 font-bold text-slate-400 group-hover:text-amber-500 transition-colors">₹</span>
                                <input type="number" placeholder="Max"
                                    value={formData.salaryMax}
                                    readOnly={true}
                                    className="w-full pl-8 pr-4 py-3 border rounded-xl outline-none font-bold bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200 shadow-inner"
                                />
                            </div>
                        </div>
                        {selectedPosition && (
                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 font-medium ml-1">
                                <Check size={12} className="text-emerald-500" />
                                Verified against Position Master: <span className="font-bold text-slate-600">{selectedPosition.positionId}</span>
                            </p>
                        )}
                    </div>
                )}

                {/* Other / Remarks */}
                {!removedCoreFields.has('remarks') && (
                    <div className="md:col-span-2 space-y-1 pt-4 border-t border-slate-100 animate-in zoom-in-95 duration-300">
                        <LabelWithToggle label="Other / Remarks" field="remarks" icon={<FileText size={14} />} />
                        <textarea
                            value={formData.remarks || ''}
                            onChange={e => updateField('remarks', e.target.value)}
                            rows={3}
                            placeholder="Any specific notes or requirements not covered above..."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all resize-none placeholder:font-normal"
                        />
                    </div>
                )}

                {/* Active Custom Fields */}
                {renderCustomFields()}
            </div>
        );
    };

    const renderStep3_Details = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-purple-100">
                    <FileText size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Job Description</h2>
                <p className="text-slate-500 font-medium">Define the role in detail. Structured for clarity.</p>
            </div>

            {/* Role Overview */}
            <div className="space-y-2">
                <LabelWithToggle label="Role Overview / Description" field="description" required icon={<FileText size={14} />} />
                <div className="relative group">
                    <textarea
                        value={formData.description}
                        onChange={e => updateField('description', e.target.value)}
                        rows={6}
                        maxLength={2000}
                        placeholder="Briefly describe the role's mission and scope..."
                        className="w-full p-5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none text-sm text-slate-700 leading-relaxed font-medium shadow-sm hover:shadow-md"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-300 group-focus-within:text-purple-400">
                        {formData.description?.length || 0}/2000
                    </div>
                </div>
            </div>

            {/* Responsibilities */}
            <div className="space-y-3">
                <LabelWithToggle label="Key Daily Tasks" field="responsibilities" required icon={<List size={14} />} />
                <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
                    <div className="space-y-1">
                        {Array.isArray(formData.responsibilities) && formData.responsibilities.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-center group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                    {idx + 1}
                                </div>
                                <input
                                    value={item}
                                    onChange={e => {
                                        const newResp = [...formData.responsibilities];
                                        newResp[idx] = e.target.value;
                                        setFormData(prev => ({ ...prev, responsibilities: newResp }));
                                    }}
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 font-semibold"
                                    placeholder="Responsibility..."
                                />
                                <button
                                    onClick={() => {
                                        const newResp = formData.responsibilities.filter((_, i) => i !== idx);
                                        setFormData(prev => ({ ...prev, responsibilities: newResp }));
                                    }}
                                    className="text-slate-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    {/* Add New Line */}
                    <div className="flex gap-3 items-center p-3 mt-1 border-t border-slate-100">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Plus size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder="Type a new task and press Enter..."
                            onKeyDown={e => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    e.preventDefault();
                                    setFormData(prev => ({
                                        ...prev,
                                        responsibilities: [...(prev.responsibilities || []), e.currentTarget.value.trim()]
                                    }));
                                    e.currentTarget.value = '';
                                }
                            }}
                            className="bg-transparent outline-none text-sm font-medium flex-1 placeholder:text-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Required Skills */}
            <div className="space-y-1">
                <LabelWithToggle label="Required Skills" field="requiredSkills" required icon={<Zap size={14} />} />
                <div className="flex flex-wrap gap-2 p-4 bg-white border border-slate-200 rounded-2xl min-h-[60px] shadow-sm">
                    {formData.requiredSkills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-200">
                            {skill}
                            <button onClick={() => {
                                const newSkills = formData.requiredSkills.filter((_, i) => i !== idx);
                                setFormData(prev => ({ ...prev, requiredSkills: newSkills }));
                            }} className="hover:text-indigo-100 hover:bg-white/20 rounded-full p-0.5 transition-colors"><X size={12} /></button>
                        </span>
                    ))}
                    <div className="relative flex-1 min-w-[150px]">
                        <input
                            onKeyDown={e => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    e.preventDefault();
                                    const val = e.currentTarget.value.trim();
                                    if (!formData.requiredSkills.includes(val)) {
                                        setFormData(prev => ({ ...prev, requiredSkills: [...prev.requiredSkills, val] }));
                                    }
                                    e.currentTarget.value = '';
                                }
                            }}
                            placeholder="Type skill & Press Enter..."
                            className="w-full bg-transparent outline-none text-sm font-medium h-full py-1.5 pl-2"
                            list="common-skills"
                        />
                        <datalist id="common-skills">
                            {COMMON_SKILLS.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>
                </div>
            </div>

            {/* Optional Skills */}
            <div className="space-y-1">
                <LabelWithToggle label="Preferred Skills (Optional)" field="optionalSkills" icon={<Type size={14} />} />
                <div className="flex flex-wrap gap-2 p-4 bg-white border border-slate-200 rounded-2xl min-h-[60px] shadow-sm">
                    {formData.optionalSkills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200">
                            {skill}
                            <button onClick={() => {
                                const newSkills = formData.optionalSkills.filter((_, i) => i !== idx);
                                setFormData(prev => ({ ...prev, optionalSkills: newSkills }));
                            }} className="hover:text-slate-900 hover:bg-slate-200 rounded-full p-0.5 transition-colors"><X size={12} /></button>
                        </span>
                    ))}
                    <input
                        onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (!formData.optionalSkills.includes(val)) {
                                    setFormData(prev => ({ ...prev, optionalSkills: [...prev.optionalSkills, val] }));
                                }
                                e.currentTarget.value = '';
                            }
                        }}
                        placeholder="Type skill & Press Enter..."
                        className="bg-transparent outline-none text-sm font-medium flex-1 min-w-[150px] py-1.5 pl-2"
                    />
                </div>
            </div>

            {/* AI Helper Button */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                    disabled={isGeneratingAI}
                    onClick={handleAIGenerate}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all border shadow-sm ${isGeneratingAI
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 hover:shadow-md'
                        }`}
                >
                    <Zap size={14} className={`${isGeneratingAI ? 'animate-pulse text-slate-400' : 'fill-indigo-600'}`} />
                    {isGeneratingAI ? 'AI is Thinking...' : '✨ Auto-Generate with AI'}
                </button>
            </div>
        </div>
    );

    const renderStep4_Pipeline = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-inner ring-1 ring-emerald-100">
                    <Layers size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Recruitment Pipeline</h2>
                <p className="text-slate-500 font-medium">Design the stages candidates pass through.</p>
            </div>

            <div className="max-w-3xl mx-auto mb-8 p-6 bg-white rounded-[2rem] border border-indigo-100 shadow-xl shadow-indigo-50 flex items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex-1 relative z-10">
                    <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
                        <Zap size={16} className="text-indigo-500 fill-indigo-500" /> Auto-Configuration
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Select a template to instantly build your pipeline.</p>
                </div>
                <div className="relative flex-1">
                    <select
                        value={selectedTemplateId}
                        onChange={e => {
                            const templateId = e.target.value;
                            setSelectedTemplateId(templateId);
                            const template = pipelineTemplates.find(t => t._id === templateId);
                            if (template) {
                                const mappedWorkflow = template.stages
                                    .filter(s => !['Applied', 'Finalized', 'Rejected'].includes(s.stageName))
                                    .map(s => ({
                                        name: s.stageName,
                                        type: s.stageType.toLowerCase(),
                                        ...s
                                    }));
                                setWorkflow(mappedWorkflow);
                            }
                        }}
                        className="w-full pl-4 pr-10 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 focus:ring-4 focus:ring-indigo-100 outline-none shadow-sm appearance-none cursor-pointer hover:bg-indigo-50 transition-colors"
                    >
                        <option value="">Custom Pipeline</option>
                        {pipelineTemplates.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-indigo-400 pointer-events-none" size={16} />
                </div>
            </div>

            <div className="max-w-2xl mx-auto space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-200 -z-10 rounded-full"></div>

                {/* Fixed Start */}
                <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 bg-white border-4 border-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 z-10 relative">
                        <span className="font-black text-lg">A</span>
                        {/* Status Dot */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1 p-5 bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="block font-black text-emerald-900 text-sm uppercase tracking-wider mb-1">Applied</span>
                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-100/50 px-2 py-1 rounded-md">System Default Gateway</span>
                            </div>
                            <Lock size={14} className="text-emerald-300" />
                        </div>
                    </div>
                </div>

                {workflow.map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-6 group relative">
                        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 z-10 ring-4 ring-white transition-transform group-hover:scale-110 duration-300">
                            <span className="font-black text-lg">{idx + 1}</span>
                        </div>

                        <div className="flex-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-200 transition-all duration-300 group-hover:-translate-y-1">
                            <div className="p-4 flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-slate-800 text-base mb-2">{stage.name || stage.stageName}</h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">
                                            {stage.type || stage.stageType || 'Round'}
                                        </span>
                                        {stage.mode && (
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                <Globe size={10} /> {stage.mode}
                                            </span>
                                        )}
                                        {stage.durationMinutes && (
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                <Clock size={10} /> {stage.durationMinutes}m
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingStageIdx(idx);
                                            setEditingStageData({
                                                ...stage,
                                                stageName: stage.name || stage.stageName,
                                                stageType: stage.type || stage.stageType
                                            });
                                            setShowStageModal(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                    >
                                        <Settings size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newFlow = [...workflow];
                                            newFlow.splice(idx, 1);
                                            setWorkflow(newFlow);
                                        }}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Optional: Summary of interviewer IDs */}
                            {(stage.interviewerIds?.length > 0 || stage.evaluationNotes || stage.feedbackTemplateId) && (
                                <div className="mx-4 mb-4 px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100 grid grid-cols-2 gap-3">
                                    {stage.interviewerIds?.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Users size={12} className="text-indigo-400" />
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">{stage.interviewerIds.length} Interviewers</span>
                                        </div>
                                    )}
                                    {stage.feedbackTemplateId && (
                                        <div className="flex items-center gap-2">
                                            <ClipboardCheck size={12} className="text-emerald-500" />
                                            <span className="text-[10px] text-emerald-600 font-black uppercase">Feedback Active</span>
                                        </div>
                                    )}
                                    {stage.evaluationNotes && (
                                        <div className="flex items-center gap-2 col-span-2 border-t border-slate-100 pt-2 mt-1">
                                            <FileText size={12} className="text-slate-400" />
                                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-xs italic">"{stage.evaluationNotes}"</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <button
                    onClick={() => {
                        setEditingStageIdx(-1);
                        setEditingStageData({ stageName: '', stageType: 'Interview', mode: 'Online', durationMinutes: 30 });
                        setShowStageModal(true);
                    }}
                    className="ml-[30px] pl-[40px] w-[calc(100%-30px)] py-4 text-slate-400 hover:text-indigo-600 transition-all duration-300 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-4 group relative"
                >
                    <div className="absolute left-0 w-14 h-14 bg-slate-50 border-2 border-dashed border-slate-300 text-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-500 group-hover:bg-white rounded-2xl flex items-center justify-center transition-all z-10">
                        <Plus size={24} />
                    </div>
                    <span className="group-hover:translate-x-2 transition-transform">Inject New Pipeline Round</span>
                </button>

                {/* Fixed End */}
                <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 bg-white border-4 border-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-100 z-10 relative">
                        <span className="font-black text-lg">✓</span>
                        {/* Status Dot */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1 p-5 bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="block font-black text-slate-600 text-sm uppercase tracking-wider mb-1">Finalized / Offer</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100/50 px-2 py-1 rounded-md">Automation Termination Point</span>
                            </div>
                            <Lock size={14} className="text-slate-300" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stage Detail Modal */}
            <Modal
                title={null}
                open={showStageModal}
                onCancel={() => setShowStageModal(false)}
                footer={null}
                width={700}
                centered
                className="rounded-3xl overflow-hidden"
            >
                <div className="p-2">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Stage Configuration</h2>
                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest italic">Enterprise Pipeline Management</p>
                        </div>
                    </div>
                    <StageForm
                        initialData={editingStageData}
                        onCancel={() => setShowStageModal(false)}
                        onSubmit={data => {
                            const newFlow = [...workflow];
                            const formattedStage = {
                                ...data,
                                name: data.stageName,
                                type: data.stageType.toLowerCase()
                            };

                            if (editingStageIdx >= 0) {
                                newFlow[editingStageIdx] = formattedStage;
                            } else {
                                newFlow.push(formattedStage);
                            }
                            setWorkflow(newFlow);
                            setShowStageModal(false);
                        }}
                    />
                </div>
            </Modal>
        </div>
    );

    const renderStep5_Review = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-200 ring-4 ring-white">
                    <ClipboardCheck size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Ready to Publish?</h2>
                <p className="text-slate-500 font-medium">Review the details below. Once published, candidates can start applying.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 relative group">
                {/* Header Gradient */}
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500"></div>
                <div className="absolute top-0 inset-x-0 h-40 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                <div className="relative pt-10 px-8 pb-8">
                    {/* Main Title Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-indigo-900/10 mb-8 border border-white/50 backdrop-blur-sm -mt-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                        {formData.visibility} Opening
                                    </span>
                                    {selectedPosition && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                            <Check size={10} strokeWidth={3} /> Position Validated
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                    {selectedPosition?.jobTitle || 'New Position'}
                                </h1>
                                <p className="text-slate-500 font-bold mt-1 flex items-center gap-2 text-sm">
                                    <Building2 size={14} className="text-indigo-500" /> {selectedPosition?.department || 'Department'}
                                    <span className="text-slate-300">•</span>
                                    <MapPin size={14} className="text-indigo-500" /> {selectedPosition?.location || 'HQ'}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Compensation Range</p>
                                <div className="text-2xl md:text-3xl font-black text-indigo-600 tracking-tight">
                                    ₹{formData.salaryMin}L - ₹{formData.salaryMax}L
                                </div>
                                <p className="text-xs font-bold text-slate-500 mt-1">Per Annum</p>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
                            {[
                                { label: 'Work Mode', value: formData.workMode, icon: <MapPin size={16} /> },
                                { label: 'Job Type', value: formData.jobType, icon: <Briefcase size={16} /> },
                                { label: 'Experience', value: `${formData.expYears}Y ${formData.expMonths}M`, icon: <Calendar size={16} /> },
                                { label: 'Vacancies', value: formData.vacancy, icon: <Users size={16} /> },
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                                    <div className="text-slate-400 mb-2">{stat.icon}</div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-sm font-bold text-slate-800">{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <List size={16} className="text-indigo-500" /> Work Summary
                            </h4>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Role Overview</p>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 border-l-4 border-l-indigo-500">
                                        {formData.description || 'No description provided.'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Key Responsibilities</p>
                                    <ul className="space-y-2">
                                        {formData.responsibilities.length > 0 ? formData.responsibilities.map((r, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-slate-700 font-medium items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                                                <span className="flex-1">{r}</span>
                                            </li>
                                        )) : <li className="text-slate-400 italic text-sm">No specific tasks defined.</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Layers size={16} className="text-indigo-500" /> Pipeline & Skills
                            </h4>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Configured Stages</p>
                                    <div className="flex flex-col gap-2 relative">
                                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-indigo-100 -z-10"></div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs ring-2 ring-white z-10">A</div>
                                            <span className="text-xs font-bold text-slate-600">Applied</span>
                                        </div>
                                        {workflow.map((w, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-200 z-10">{i + 1}</div>
                                                <span className="text-xs font-bold text-slate-800">{w.name}</span>
                                                <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-bold">{w.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Required Skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.requiredSkills.length > 0 ? formData.requiredSkills.map((s, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                                                {s}
                                            </span>
                                        )) : <span className="text-slate-400 italic text-xs">No skills required.</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning Footer */}
                <div className="px-8 py-4 bg-amber-50 border-t border-amber-100 border-b border-b-slate-100 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">Final Review</p>
                        <p className="text-xs text-amber-900/70 font-medium">
                            Please verify all details. Once published, the Job ID and core position details will be locked.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStepIndicator = () => {
        const steps = [
            { id: 1, label: 'Position' },
            { id: 2, label: 'Config' },
            { id: 3, label: 'Details' },
            { id: 4, label: 'Pipeline' },
            { id: 5, label: 'Review' }
        ];

        return (
            <div className="w-full max-w-6xl mx-auto px-6 mb-8">
                <div className="relative flex justify-between items-center z-0">
                    {/* Connecting Line Background */}
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>

                    {/* Active Progress Line */}
                    <div
                        className="absolute top-1/2 left-0 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>

                    {steps.map((s) => {
                        const isActive = step === s.id;
                        const isCompleted = step > s.id;

                        return (
                            <div key={s.id} className="group flex flex-col items-center gap-2 cursor-pointer" onClick={() => step > s.id && setStep(s.id)}>
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 border-[3px] z-10 
                                    ${isActive
                                            ? 'bg-indigo-600 border-white text-white shadow-[0_0_0_4px_rgba(79,70,229,0.2)] scale-110'
                                            : isCompleted
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-400 group-hover:border-indigo-300'
                                        }`}
                                >
                                    {isCompleted ? <Check size={16} strokeWidth={3} /> : s.id}
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors duration-300 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full bg-white font-sans ${isModal ? 'max-h-[85vh] h-screen' : 'min-h-screen'}`}>
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-20 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {isEdit ? 'Update Recruitment Drive' : 'Create Job Opening'}
                    </h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 text-indigo-600">Step {step} of 5</p>
                </div>
                {isModal && (
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                )}
            </div>

            {/* Stepper */}
            <div className="pt-8 pb-4">
                {renderStepIndicator()}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                <div className="max-w-[1400px] mx-auto min-h-[500px]">
                    {step === 1 && renderStep1_Position()}
                    {step === 2 && renderStep2_Config()}
                    {step === 3 && renderStep3_Details()}
                    {step === 4 && renderStep4_Pipeline()}
                    {step === 5 && renderStep5_Review()}
                </div>
            </div>

            {/* Footer / Controls */}
            <div className="px-8 py-6 border-t border-slate-100 bg-white/80 backdrop-blur-lg flex items-center justify-between sticky bottom-0 z-20">
                <button
                    onClick={handleBack}
                    disabled={step === 1}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-slate-500 disabled:opacity-30 hover:bg-slate-100 hover:text-slate-800 transition-all border border-transparent hover:border-slate-200"
                >
                    <ArrowLeft size={18} /> Back
                </button>

                <div className="flex items-center gap-4">
                    {step < 5 ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] ring-4 ring-indigo-50"
                        >
                            Next Step <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={submit}
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:grayscale ring-4 ring-emerald-50"
                        >
                            {saving ? 'Creating...' : 'Confirm & Publish'} <Check size={18} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
