
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api, { API_ROOT } from '../../utils/api'; // Centralized axios instance with auth & tenant headers
import { getNextStage, normalizeStatus } from './PipelineStatusManager';
import { useAuth } from '../../context/AuthContext';
import OfferLetterPreview from '../../components/OfferLetterPreview';
import AssignSalaryModal from '../../components/AssignSalaryModal';
import { DatePicker, Pagination, Select, Modal, TimePicker, notification, Dropdown, Menu } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications'; // Imports fixed
import dayjs from 'dayjs';
import { Eye, Download, Edit2, RefreshCw, IndianRupee, Upload, FileText, CheckCircle, Settings, Plus, Trash2, X, GripVertical, Star, XCircle, Clock, ShieldCheck, Lock, ChevronRight, ChevronDown, RotateCcw, UserCheck, UserX, PlusCircle, UserPlus, Info, Search, Calendar, Shield } from 'lucide-react';
import DynamicPipelineEngine from './DynamicPipelineEngine';
import InterviewScheduleModal from './modals/InterviewScheduleModal';
import JobBasedBGVModal from './modals/JobBasedBGVModal';

export default function Applicants({ internalMode = false, jobSpecific = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { jobId } = useParams(); // Get jobId from URL if in job-specific mode
    const [applicants, setApplicants] = useState([]);
    const [resumeUrl, setResumeUrl] = useState(null);
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    // Check if we're in "show all candidates" mode (via path or query param)
    const searchParams = new URLSearchParams(location.search);
    const showAllCandidates = location.pathname.endsWith('/all') || searchParams.get('view') === 'all';


    const [requirements, setRequirements] = useState([]);
    const [selectedRequirement, setSelectedRequirement] = useState(null); // Full requirement object
    const [selectedReqId, setSelectedReqId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [timeFilter, setTimeFilter] = useState('all'); // Added Time Filter State
    const [jobTypeFilter, setJobTypeFilter] = useState('all'); // Added Job Type Filter

    // Tab State: Dynamic based on Requirement Workflow
    // Start with default tabs for 'all' view
    const [activeTab, setActiveTab] = useState('Applied');
    const [workflowTabs, setWorkflowTabs] = useState(['Applied', 'Shortlisted', 'Interview', 'HR Round', 'Finalized', 'Rejected']);

    // Custom Rounds State - Load from localStorage or use defaults
    const [customRounds, setCustomRounds] = useState(() => {
        const saved = localStorage.getItem('hrms_custom_rounds');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return ['HR Round', 'Tech Round', 'Final Round'];
            }
        }
        return ['HR Round', 'Tech Round', 'Final Round'];
    });

    // Persist custom rounds to localStorage when they change
    useEffect(() => {
        localStorage.setItem('hrms_custom_rounds', JSON.stringify(customRounds));
    }, [customRounds]);



    // Workflow Editing State
    const [companyHolidays, setCompanyHolidays] = useState([]);

    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const year = new Date().getFullYear();
                const res = await api.get(`/holidays?year=${year}`);
                if (res.data) {
                    setCompanyHolidays(res.data.map(h => dayjs(h.date).format('YYYY-MM-DD')));
                }
            } catch (err) {
                console.error("Failed to fetch holidays", err);
            }
        };
        fetchHolidays();
    }, []);
    const [showWorkflowEditModal, setShowWorkflowEditModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState([]);
    const [newStageName, setNewStageName] = useState('');

    // Selection & Review State
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [selectedStatusForReview, setSelectedStatusForReview] = useState(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [isFinishingInterview, setIsFinishingInterview] = useState(false);

    // Finalize Modal State
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [finalizeModalVisible, setFinalizeModalVisible] = useState(false);
    const [candidateToFinalize, setCandidateToFinalize] = useState(null);

    // New Interview Round State
    const [addRoundModalVisible, setAddRoundModalVisible] = useState(false);
    const [newRoundName, setNewRoundName] = useState('');
    const [candidateForNewRound, setCandidateForNewRound] = useState(null);

    // BGV Initiation State (Package-Driven)
    const [showBGVModal, setShowBGVModal] = useState(false);
    const [bgvCandidate, setBgvCandidate] = useState(null);

    // Custom Other Round State
    const [addCustomRoundModalVisible, setAddCustomRoundModalVisible] = useState(false);
    const [customRoundType, setCustomRoundType] = useState('Game'); // 'Game', 'Assessment', 'Task', etc.
    const [customRoundName, setCustomRoundName] = useState('');
    const [customRoundDescription, setCustomRoundDescription] = useState('');
    const [gameRoundConfig, setGameRoundConfig] = useState({
        gameName: '',
        duration: 30,
        difficulty: 'Medium',
        gameType: 'Coding'
    });


    const openWorkflowEditor = () => {
        if (!selectedRequirement) return;
        // Ensure we have at least the basic structure if empty
        const current = selectedRequirement.workflow && selectedRequirement.workflow.length > 0
            ? [...selectedRequirement.workflow]
            : ['Applied', 'Shortlisted', 'Interview', 'Finalized'];
        setEditingWorkflow(current);
        setShowWorkflowEditModal(true);
    };

    const handleStageAdd = () => {
        if (newStageName.trim()) {
            // Insert before 'Finalized' if it exists to keep logical order, or just append
            const newList = [...editingWorkflow];
            const finalIdx = newList.indexOf('Finalized');
            if (finalIdx !== -1) {
                newList.splice(finalIdx, 0, newStageName.trim());
            } else {
                newList.push(newStageName.trim());
            }
            setEditingWorkflow(newList);
            setNewStageName('');
        }
    };

    const handleStageRemove = (index) => {
        const newList = [...editingWorkflow];
        newList.splice(index, 1);
        setEditingWorkflow(newList);
    };

    const saveWorkflowChanges = async () => {
        if (!selectedRequirement) return;
        try {
            setLoading(true);
            await api.put(`/requirements/${selectedRequirement._id}`, {
                workflow: editingWorkflow
            });

            // Refresh requirements to reflect changes
            const res = await api.get('/requirements');
            const data = res.data.requirements || res.data || [];
            setRequirements(data);

            // Update current selection
            const updatedReq = data.find(r => r._id === selectedRequirement._id);
            setSelectedRequirement(updatedReq);

            // Trigger tab recalc
            // logic in useEffect will handle it based on updated selectedRequirement

            setShowWorkflowEditModal(false);
            showToast('success', 'Success', 'Workflow updated successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Error', 'Failed to update workflow');
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        // Fetch Requirements for dropdown
        async function fetchReqs() {
            try {
                const res = await api.get('/requirements');
                if (res.data.requirements) {
                    setRequirements(res.data.requirements);
                } else {
                    setRequirements(res.data || []);
                }
            } catch (err) {
                console.error("Failed to load requirements", err);
            }
        }
        fetchReqs();
    }, []);

    // Handle auto-opening joining letter modal from salary assignment
    useEffect(() => {
        if (location.state?.openJoiningLetterFor && applicants.length > 0) {
            // Find the applicant
            const applicant = applicants.find(a => a._id === location.state.openJoiningLetterFor);
            if (applicant) {
                if (location.state.message) {
                    showToast('info', 'Info', location.state.message);
                }
                openJoiningModal(applicant);
            }
            // Clear the state to prevent re-triggering
            navigate('/hr/applicants', { replace: true });
        }
    }, [applicants, location.state]);

    // Auto-select job when in jobSpecific mode
    useEffect(() => {
        if (jobSpecific && jobId && requirements.length > 0) {
            const req = requirements.find(r => r._id === jobId);
            if (req) {
                setSelectedReqId(jobId);
                setSelectedRequirement(req);
                if (req.workflow && req.workflow.length > 0) {
                    setActiveTab(req.workflow[0]);
                } else {
                    setActiveTab('Applied');
                }
            }
        }
    }, [jobSpecific, jobId, requirements]);

    // Auto-select 'all' when in showAllCandidates mode
    useEffect(() => {
        if (showAllCandidates) {
            setSelectedReqId('all');
            setSelectedRequirement(null);
            setActiveTab('Applied');
        }
    }, [showAllCandidates]);


    // Handle Requirement Selection
    const handleRequirementChange = (reqId) => {
        setSelectedReqId(reqId);
        if (reqId === 'all') {
            setSelectedRequirement(null);
            // setWorkflowTabs handle by useEffect
            setActiveTab('all');
        } else {
            const req = requirements.find(r => r._id === reqId);
            setSelectedRequirement(req);

            // Set default active tab
            if (req && req.workflow && req.workflow.length > 0) {
                setActiveTab(req.workflow[0]);
            } else {
                setActiveTab('Applied');
            }
        }
    };

    // Dynamic Tab Calculation (Includes Custom/Ad-hoc Stages)
    useEffect(() => {
        const MASTER_STAGES = ['Applied', 'Shortlisted', 'Interview', 'HR Round', 'Finalized'];

        if (selectedReqId === 'all') {
            const globalStages = ['Applied', 'Finalized', 'Rejected'];
            setWorkflowTabs(globalStages);
            // Default to first stage instead of 'all'
            if (activeTab === 'all' || !globalStages.includes(activeTab)) {
                setActiveTab('Applied');
            }
        } else if (selectedRequirement) {
            let baseParams = selectedRequirement.workflow && selectedRequirement.workflow.length > 0
                ? [...selectedRequirement.workflow]
                : ['Applied', 'Shortlisted', 'Interview', 'HR Round', 'Finalized'];

            // Ensure HR Round is present if requested by user for this project
            if (!baseParams.includes('HR Round')) {
                const intIdx = baseParams.indexOf('Interview');
                if (intIdx > -1) baseParams.splice(intIdx + 1, 0, 'HR Round');
                else {
                    const finIdx = baseParams.indexOf('Finalized');
                    if (finIdx > -1) baseParams.splice(finIdx, 0, 'HR Round');
                    else baseParams.push('HR Round');
                }
            }

            // Find "Ad-hoc" statuses from current applicants for this job
            const relevantApplicants = applicants.filter(a => a.requirementId?._id === selectedReqId || a.requirementId === selectedReqId);
            const foundStatuses = [...new Set(relevantApplicants.map(a => a.status))];

            const extraStatuses = foundStatuses.filter(s =>
                !baseParams.includes(s) &&
                !['Selected', 'Rejected', 'Finalized', 'Offer Generated', 'Salary Assigned', 'Interview Scheduled', 'Interview Rescheduled', 'Interview Completed', 'New Round'].includes(s)
            );

            // Insert extra statuses before 'HR Round' if present, else before 'Finalized'
            let insertPos = baseParams.indexOf('HR Round');
            if (insertPos === -1) insertPos = baseParams.indexOf('Finalized');

            if (insertPos > -1) {
                baseParams.splice(insertPos, 0, ...extraStatuses);
            } else {
                baseParams.push(...extraStatuses);
            }

            // Ensure Finalized is always last
            if (!baseParams.includes('Finalized')) baseParams.push('Finalized');

            setWorkflowTabs(baseParams);
            if (!baseParams.includes(activeTab)) {
                setActiveTab(baseParams[0]);
            }
        }
    }, [selectedReqId, selectedRequirement, applicants]);

    // Custom Stage State
    const [isCustomStageModalVisible, setIsCustomStageModalVisible] = useState(false);
    const [customStageName, setCustomStageName] = useState('');
    const [candidateForCustomStage, setCandidateForCustomStage] = useState(null);

    const handleNextStage = (applicant) => {
        const currentIndex = workflowTabs.indexOf(activeTab);
        if (currentIndex !== -1 && currentIndex < workflowTabs.length - 1) {
            const nextStage = workflowTabs[currentIndex + 1];
            // If next is 'Finalized', we mark as 'Selected' (or specific logic)
            // But usually 'Finalized' is just a bucket. usage of 'Selected' status puts them there?
            // Let's assume 'Selected' if next is Finalized, otherwise the stage name.
            if (nextStage === 'Finalized') {
                handleStatusChangeRequest(applicant, 'Selected');
            } else {
                handleStatusChangeRequest(applicant, nextStage);
            }
        } else {
            // Fallback if no next stage (shouldn't happen if logic is correct)
            handleStatusChangeRequest(applicant, 'Selected');
        }
    };

    const handleAddCustomStage = async () => {
        if (!customStageName.trim() || !candidateForCustomStage) return;

        showConfirmToast({
            title: 'Add Custom Stage',
            description: `Move ${candidateForCustomStage.name} to "${customStageName}" ? `,
            okText: 'Confirm',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const success = await updateStatus(candidateForCustomStage, customStageName);
                if (success) {
                    setIsCustomStageModalVisible(false);
                    setCustomStageName('');
                    setCandidateForCustomStage(null);
                }
            }
        });
    };

    // --- NEW PIPELINE LOGIC FUNCTIONS ---

    // Add Virtual Interview Round (Frontend only simulation as requested)
    const handleAddInterviewRound = (app) => {
        setCandidateForNewRound(app);
        setAddRoundModalVisible(true);
    };

    // Add Custom Other Round with Game/Assessment
    const handleAddCustomRound = (app) => {
        setCandidateForNewRound(app);
        setAddCustomRoundModalVisible(true);
    };

    const renderHiringDropdown = (app) => {
        if (app.status === 'Finalized') return (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full w-full justify-center">
                <CheckCircle size={14} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-700 tracking-widest uppercase">Selected</span>
            </div>
        );

        // Rule: Finalize button ONLY in HR Round tab for Selected candidates
        if (activeTab === 'HR Round' && app.status === 'Selected') {
            return (
                <div className="w-full flex gap-2">
                    <button
                        onClick={() => { setCandidateToFinalize(app); setFinalizeModalVisible(true); }}
                        className="flex-1 h-10 rounded-full bg-blue-600 text-white text-[11px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 px-6"
                    >
                        <ShieldCheck size={16} strokeWidth={2.5} />
                        FINALIZE
                    </button>
                    <button
                        onClick={() => updateStatus(app, 'Rejected')}
                        className="flex-1 h-10 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-lg shadow-rose-100 hover:bg-rose-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 px-6"
                    >
                        <UserX size={16} strokeWidth={2.5} />
                        REJECT
                    </button>
                    <button
                        onClick={() => handleAddCustomRound(app)}
                        className="flex-1 h-10 rounded-full bg-amber-600 text-white text-[11px] font-black shadow-lg shadow-amber-100 hover:bg-amber-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 px-6"
                    >
                        <PlusCircle size={16} strokeWidth={2.5} />
                        OTHER ROUND
                    </button>
                </div>
            );
        }

        // Get candidate's current position in workflow
        const candidateStatusIndex = workflowTabs.indexOf(app.status);
        const activeTabIndex = workflowTabs.indexOf(activeTab);

        const menuItems = [
            {
                key: 'label',
                label: (
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                        Next Pipeline Step
                    </div>
                ),
                disabled: true,
            },
            // Show "Move to Shortlisted" only if candidate is still in Applied status
            ...(app.status === 'Applied' ? [{
                key: 'shortlist',
                icon: <UserCheck size={16} className="text-blue-500" />,
                label: <span className="font-bold text-slate-700">Move to Shortlisted</span>,
                onClick: () => updateStatus(app, 'Shortlisted'),
            }] : []),
            // Show "Move to Interview" only if candidate is in Shortlisted (not beyond)
            ...(app.status === 'Shortlisted' ? [{
                key: 'interview',
                icon: <Clock size={16} className="text-indigo-500" />,
                label: <span className="font-bold text-slate-700">Move to Interview</span>,
                onClick: () => updateStatus(app, 'Interview'),
            }] : []),
            // Show interview options if in Interview stage or custom rounds
            ...((app.status === 'Interview' || app.status.includes('Interview') || app.status.includes('Round')) ? [
                {
                    key: 'hr_round',
                    icon: <UserPlus size={16} className="text-purple-500" />,
                    label: <span className="font-bold text-slate-700">Move to HR Round</span>,
                    onClick: () => updateStatus(app, 'HR Round'),
                },
                {
                    key: 'add_round',
                    icon: <PlusCircle size={16} className="text-emerald-500" />,
                    label: <span className="font-bold text-emerald-600">Add Interview Round</span>,
                    onClick: () => handleAddInterviewRound(app),
                }
            ] : []),
            // Show "Mark as Selected" only if in HR Round and not already selected
            ...(app.status === 'HR Round' ? [{
                key: 'select',
                icon: <UserCheck size={16} className="text-emerald-500" />,
                label: <span className="font-bold text-emerald-600">Mark as Selected</span>,
                onClick: () => updateStatus(app, 'Selected'),
            }] : []),
            { type: 'divider', className: 'my-1 border-slate-50' },
            {
                key: 'reject',
                icon: <UserX size={16} className="text-rose-500" />,
                label: <span className="font-bold text-rose-600">Mark as Rejected</span>,
                onClick: () => updateStatus(app, 'Rejected'),
            },
            // Show "Move Back" only if candidate can actually move back
            ...(candidateStatusIndex > 0 ? [{
                key: 'back',
                icon: <RotateCcw size={16} className="text-slate-400" />,
                label: <span className="font-bold text-slate-500">Move Back</span>,
                onClick: () => {
                    const prevIdx = candidateStatusIndex - 1;
                    if (prevIdx >= 0) updateStatus(app, workflowTabs[prevIdx]);
                }
            }] : [])
        ];

        return (
            <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="p-2 rounded-2xl shadow-2xl border-none min-w-[220px]"
            >
                <button className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-600 text-[11px] font-black hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md transition-all flex items-center justify-between px-4 group">
                    <span>NEXT STEP</span>
                    <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                </button>
            </Dropdown>
        );
    };
    // Drag and Drop Refs
    const dragItem = React.useRef(null);
    const dragOverItem = React.useRef(null);

    const handleSort = () => {
        // duplicate items
        let _workflowItems = [...editingWorkflow];

        // remove and save the dragged item content
        const draggedItemContent = _workflowItems.splice(dragItem.current, 1)[0];

        // switch the position
        _workflowItems.splice(dragOverItem.current, 0, draggedItemContent);

        // reset the position ref
        dragItem.current = null;
        dragOverItem.current = null;

        // update the actual array
        setEditingWorkflow(_workflowItems);
    };

    // Cumulative Filtering Logic: Check if a candidate's status has reached or passed a specific tab
    // Cumulative Filtering Logic: Check if a candidate's status has reached or passed a specific tab
    const checkStatusPassage = (applicantStatus, targetTab, tabsArray) => {
        // Step 1: Normalize inputs
        const normalizedApp = normalizeStatus(applicantStatus);
        const normalizedTarget = normalizeStatus(targetTab);

        // Step 2: Handle Terminal/Special statuses
        if (normalizedTarget === 'Finalized') {
            return applicantStatus === 'Finalized' || applicantStatus === 'Selected';
        }

        // Candidates who are Finalized or Selected have passed all steps
        if (applicantStatus === 'Finalized' || applicantStatus === 'Selected') {
            return true; // Visible in all tabs
        }

        // Step 3: Index-based comparison for workflow stages
        const currentIdx = tabsArray.indexOf(normalizedApp);
        const targetIdx = tabsArray.indexOf(normalizedTarget);

        // If target exists in workflow, show if current status is at or beyond target
        if (targetIdx !== -1) {
            // If current status is not in workflow, but we aren't terminal, do exact match or default
            if (currentIdx === -1) {
                return normalizedApp === normalizedTarget;
            }
            return currentIdx >= targetIdx;
        }

        // Fallback to exact match
        return normalizedApp === normalizedTarget;
    };

    const getFilteredApplicants = () => {
        let filtered = applicants;

        // 1. Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.name.toLowerCase().includes(query) ||
                a.email.toLowerCase().includes(query) ||
                (a.mobile && a.mobile.includes(query))
            );
        }

        // 2. Filter by Requirement ID
        if (selectedReqId !== 'all') {
            filtered = filtered.filter(a => a.requirementId?._id === selectedReqId || a.requirementId === selectedReqId);
        }

        // 2.5 Filter by Internal Mode vs External Mode
        if (internalMode) {
            // Internal Page: Show Internal source candidates OR candidates for Internal-only jobs
            filtered = filtered.filter(a => a.source === 'Internal' || a.requirementId?.visibility === 'Internal');
        } else {
            // External Page: Show Non-Internal source candidates AND Exclude Internal-only jobs
            // This excludes candidates who applied via internal portal AND jobs that are strictly internal
            filtered = filtered.filter(a => a.source !== 'Internal' && a.requirementId?.visibility !== 'Internal');
        }

        // 3. Filter by Time Range
        if (timeFilter !== 'all') {
            const now = dayjs();
            let startDate;
            if (timeFilter === 'today') startDate = now.startOf('day');
            else if (timeFilter === 'week') startDate = now.subtract(7, 'days');
            else if (timeFilter === '15days') startDate = now.subtract(15, 'days');
            else if (timeFilter === 'month') startDate = now.subtract(1, 'month');

            if (startDate) {
                filtered = filtered.filter(a => dayjs(a.createdAt).isAfter(startDate));
            }
        }



        // 4. Filter by Active Tab (Stage)
        if (selectedReqId === 'all') {
            // Global Pipeline: Show all active in 'Applied', and only terminal in 'Finalized'
            if (activeTab === 'Finalized') return filtered.filter(a => a?.status === 'Finalized');
            if (activeTab === 'Rejected') return filtered.filter(a => a?.status === 'Rejected');
            return filtered.filter(a => a?.status !== 'Finalized' && a?.status !== 'Rejected');
        }

        // Specific Job Workflow: CUMULATIVE LOGIC (Show all who reached this stage)
        return filtered.filter(a => {
            // Exclude Rejected candidates from all rounds except Rejected tab
            if (a.status === 'Rejected' && activeTab !== 'Rejected') {
                return false;
            }

            // CUMULATIVE STAGE MATCHING (History-based)
            return checkStatusPassage(a.status, activeTab, workflowTabs);
        });
    };

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showCandidateModal, setShowCandidateModal] = useState(false);

    // File Upload State
    const fileInputRef = React.useRef(null);
    const [uploading, setUploading] = useState(false);

    const triggerFileUpload = (applicant) => {
        setSelectedApplicant(applicant);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedApplicant) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await api.post(`/requirements/applicants/${selectedApplicant._id}/upload-salary-excel`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('success', 'Success', "Excel uploaded successfully! Variables are now available for Letter Templates.");
            loadApplicants(); // Refresh incase we show status
        } catch (error) {
            console.error(error);
            showToast('error', 'Error', "Upload failed: " + (error.response?.data?.error || error.message));
        } finally {
            setUploading(false);
        }
    };
    // State moved to top
    const [offerData, setOfferData] = useState({
        joiningDate: '',
        location: '',
        templateId: '',
        position: '',
        probationPeriod: '3 months',
        templateContent: '',
        isWordTemplate: false,
        refNo: '',
        fatherName: '',
        salutation: '',
        address: '',
        issueDate: dayjs().format('YYYY-MM-DD'), // Default to today
        name: '',
        dearName: '',
        dateFormat: 'Do MMM. YYYY' // Default format
    });
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

    // Joining Letter State
    const [showJoiningModal, setShowJoiningModal] = useState(false);
    const [joiningTemplateId, setJoiningTemplateId] = useState('');
    const [joiningTemplates, setJoiningTemplates] = useState([]);
    const [joiningPreviewUrl, setJoiningPreviewUrl] = useState(null);
    const [showJoiningPreview, setShowJoiningPreview] = useState(false);
    const [joiningRefNo, setJoiningRefNo] = useState('');
    const [joiningIssueDate, setJoiningIssueDate] = useState(dayjs().format('YYYY-MM-DD'));

    // Salary Assignment State
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [showSalaryPreview, setShowSalaryPreview] = useState(false);


    // Review Modal State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 0, feedback: '', scorecard: {} });
    const [showEvaluationDrawer, setShowEvaluationDrawer] = useState(false);

    // Document Upload States
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentApplicant, setDocumentApplicant] = useState(null);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [documentName, setDocumentName] = useState('');
    const [documentFile, setDocumentFile] = useState(null);
    const [evalActiveRound, setEvalActiveRound] = useState(0);
    const [evaluationData, setEvaluationData] = useState({
        rounds: [
            {
                id: "screening",
                name: "HR Screening",
                categories: [
                    {
                        name: "Communication & Professionalism",
                        skills: [
                            { name: "Verbal Communication", rating: 0, comment: "" },
                            { name: "Clarity of Thought", rating: 0, comment: "" },
                            { name: "Professional Attitude", rating: 0, comment: "" },
                        ],
                    },
                ],
            },
            {
                id: "technical",
                name: "Technical Interview",
                categories: [
                    {
                        name: "Technical Skills",
                        skills: [
                            { name: "Problem Solving", rating: 0, comment: "" },
                            { name: "System Design", rating: 0, comment: "" },
                            { name: "Coding Skills", rating: 0, comment: "" },
                        ],
                    },
                ],
            },
            {
                id: "managerial",
                name: "Hiring Manager Round",
                categories: [
                    {
                        name: "Leadership & Ownership",
                        skills: [
                            { name: "Decision Making", rating: 0, comment: "" },
                            { name: "Culture Fit", rating: 0, comment: "" },
                        ],
                    },
                ],
            }
        ]
    });

    const [generating, setGenerating] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [templates, setTemplates] = useState([]);
    const [companyInfo, setCompanyInfo] = useState({
        name: 'Gitakshmi Technologies',
        tagline: 'TECHNOLOGIES',
        address: 'Ahmedabad, Gujarat - 380051',
        phone: '+91 1234567890',
        email: 'hr@gitakshmi.com',
        website: 'www.gitakshmi.com',
        refPrefix: 'GITK',
        signatoryName: 'HR Manager',
        logo: 'https://via.placeholder.com/150x60/4F46E5/FFFFFF?text=COMPANY+LOGO' // Placeholder logo
    });

    // Interview State
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [isReschedule, setIsReschedule] = useState(false);
    const [interviewData, setInterviewData] = useState({
        date: '',
        time: '',
        mode: 'Online',
        location: '',
        interviewerName: '',
        stage: '',
        notes: ''
    });

    const openScheduleModal = (applicant, reschedule = false) => {
        setSelectedApplicant(applicant);
        setIsReschedule(reschedule);
        // Pre-fill if rescheduling
        if (reschedule && applicant.interview) {
            setInterviewData({
                date: applicant.interview.date ? dayjs(applicant.interview.date).format('YYYY-MM-DD') : '',
                time: applicant.interview.time || '',
                mode: applicant.interview.mode || 'Online',
                location: applicant.interview.location || '',
                interviewerName: applicant.interview.interviewerName || '',
                stage: applicant.interview.stage || activeTab,
                notes: applicant.interview.notes || ''
            });
        } else {
            setInterviewData({
                date: dayjs().format('YYYY-MM-DD'),
                time: dayjs().format('h:mm a'),
                mode: 'Online',
                location: '',
                interviewerName: '',
                stage: activeTab === 'all' ? 'Interview Round' : activeTab,
                notes: ''
            });
        }
        setShowInterviewModal(true);
    };

    const handleInterviewSubmit = async (data) => {
        // Validation
        if (!data.date || !data.time) {
            showToast('error', 'Error', 'Please select Date and Time');
            return;
        }
        if (!data.mode) {
            showToast('error', 'Error', 'Please select Interview Mode');
            return;
        }

        // Conflict Detection
        const conflicts = applicants.filter(a =>
            a._id !== selectedApplicant._id &&
            a.interview?.date === data.date &&
            a.interview?.time === data.time
        );

        if (conflicts.length > 0) {
            if (!confirm(`Warning: There is already an interview scheduled at this time for ${conflicts[0].name}. Continue?`)) {
                return;
            }
        }

        setLoading(true);
        try {
            const url = isReschedule
                ? `/requirements/applicants/${selectedApplicant._id}/interview/reschedule`
                : `/requirements/applicants/${selectedApplicant._id}/interview/schedule`;

            const method = isReschedule ? 'put' : 'post';

            await api[method](url, {
                date: data.date,
                time: data.time,
                mode: data.mode,
                location: data.location,
                interviewerName: data.interviewerName,
                notes: data.notes,
                stage: data.stage
            });

            // Auto-move to next stage on initial schedule
            if (!isReschedule) {
                const currentIndex = workflowTabs.indexOf(activeTab);
                const nextStage = workflowTabs[currentIndex + 1];
                if (nextStage && nextStage !== 'Finalized') {
                    await api.patch(`/requirements/applicants/${selectedApplicant._id}/status`, { status: nextStage });
                }
            }

            showToast('success', 'Success', `Interview ${isReschedule ? 'rescheduled' : 'scheduled'} for ${selectedApplicant.name}`);
            setShowInterviewModal(false);
            loadApplicants();
        } catch (error) {
            console.error(error);
            showToast('error', 'Error', "Failed: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const markInterviewCompleted = async (applicant) => {
        showConfirmToast({
            title: 'Complete Interview',
            description: "Confirm interview completion? This will be logged in history.",
            okText: 'Yes, Complete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setLoading(true);
                try {
                    await api.put(`/requirements/applicants/${applicant._id}/interview/complete`);
                    // showToast('success', 'Success', "Interview Marked Completed");
                    loadApplicants();
                } catch (err) {
                    console.error(err);
                    showToast('error', 'Error', "Error: " + (err.response?.data?.message || err.message));
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const updateStatus = async (applicant, status, review = null) => {
        try {
            const payload = { status };
            if (review) {
                payload.rating = review.rating;
                payload.feedback = review.feedback;
                payload.scorecard = review.scorecard; // Added scorecard
                payload.stageName = activeTab;
            }
            await api.patch(`/requirements/applicants/${applicant._id}/status`, payload);
            showToast('success', 'Success', `Status updated to ${status}`);
            loadApplicants();
            return true;
        } catch (error) {
            showToast('error', 'Error', "Failed: " + error.message);
            return false;
        }
    };

    const handleStatusChangeRequest = (applicant, status) => {
        if (status === 'custom_add') {
            setCandidateForCustomStage(applicant);
            setIsCustomStageModalVisible(true);
            return;
        }

        showConfirmToast({
            title: 'Update Status',
            description: `Update status to ${status}? This will trigger an email.`,
            okText: 'Yes, Update',
            cancelText: 'Cancel',
            onConfirm: async () => {
                await updateStatus(applicant, status);
            }
        });
    };

    // NEW HANDLERS FOR INTERVIEW TAB ACTIONS (PART 3 & 4)
    const handleSelected = (applicant) => {
        showConfirmToast({
            title: 'Mark as Selected',
            description: `Move ${applicant.name} to HR Round?`,
            okText: 'Yes, Select',
            cancelText: 'Cancel',
            onConfirm: async () => {
                // Update status to "Selected" and move to HR Round
                const success = await updateStatus(applicant, 'Selected');
                if (success) {
                    // Show success message with green badge info
                    showToast('success', 'Selected', `${applicant.name} has been marked as Selected and moved to HR Round with green badge.`);
                }
            }
        });
    };

    const handleRejected = (applicant) => {
        showConfirmToast({
            title: 'Mark as Rejected',
            description: `Reject ${applicant.name}? This action cannot be undone.`,
            okText: 'Yes, Reject',
            cancelText: 'Cancel',
            onConfirm: async () => {
                // Update status to "Rejected"
                const success = await updateStatus(applicant, 'Rejected');
                if (success) {
                    showToast('error', 'Rejected', `${applicant.name} has been rejected and moved to Rejected tab.`);
                }
            }
        });
    };

    const handleMoveToRound = (applicant, roundName) => {
        showConfirmToast({
            title: 'Move to Another Round',
            description: `Move ${applicant.name} to "${roundName}"?`,
            okText: 'Yes, Move',
            cancelText: 'Cancel',
            onConfirm: async () => {
                // Update status to the selected round name
                const success = await updateStatus(applicant, roundName);
                if (success) {
                    showToast('success', 'Round Changed', `${applicant.name} has been moved to ${roundName}.`);
                }
            }
        });
    };

    const handleInitiateBGV = (applicant) => {
        setBgvCandidate(applicant);
        setShowBGVModal(true);
    };

    const   handleBGVSuccess = () => {
        setShowBGVModal(false);
        setBgvCandidate(null);
        loadApplicants(); // Refresh to show updated BGV status
    };

    const openReviewPrompt = (applicant, status) => {
        setSelectedApplicant(applicant);
        setSelectedStatusForReview(status);
        setReviewRating(0);
        setReviewFeedback('');
        setShowEvaluationDrawer(true);
    };

    const submitReviewAndStatus = async () => {
        if (!selectedApplicant || !selectedStatusForReview) return;

        setLoading(true);
        try {
            // 1. If finishing interview, mark it complete in DB first
            if (isFinishingInterview) {
                await api.put(`/requirements/applicants/${selectedApplicant._id}/interview/complete`);
            }

            // 2. Update status with review and full scorecard
            const success = await updateStatus(selectedApplicant, selectedStatusForReview, {
                rating: reviewRating,
                feedback: reviewFeedback,
                scorecard: evaluationData
            });

            if (success) {
                const status = selectedStatusForReview; // Save before clear
                const applicant = selectedApplicant;

                setShowEvaluationDrawer(false);
                setShowReviewModal(false);
                setIsFinishingInterview(false);
                setReviewRating(0);
                setReviewFeedback('');
                setSelectedStatusForReview('');
                setEvalActiveRound(0);

                // Trigger scheduling if appropriate
                if (status === 'Shortlisted' || status.includes('Interview')) {
                    openScheduleModal(applicant);
                }
            }
        } catch (error) {
            showToast('error', 'Error', "Failed to complete action: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    async function loadApplicants() {
        setLoading(true);
        try {
            // Uses centralized api instance - automatically includes Authorization & X-Tenant-ID headers
            const res = await api.get('/requirements/applicants');
            setApplicants(res.data || []);
        } catch (err) {
            console.error(err);
            showToast('error', 'Error', 'Failed to load applicants');
        } finally {
            setLoading(false);
        }
    }

    async function fetchTemplates() {
        // Fetch Offer Templates
        try {
            const offerRes = await api.get('/letters/templates?type=offer');
            setTemplates(offerRes.data || []);
        } catch (err) {
            console.error("Failed to load offer templates", err);
        }

        // Fetch Joining Templates (independently)
        try {
            const joiningRes = await api.get('/letters/templates?type=joining');
            setJoiningTemplates(joiningRes.data || []);
        } catch (err) {
            // Non-critical, just log
            console.warn("Failed to load joining templates (might be empty or missing permission)", err.message);
        }
    }


    // Unified data refresh function
    const refreshData = async () => {
        setLoading(true);
        await Promise.all([
            loadApplicants(),
            fetchTemplates()
        ]);
        setLoading(false);
    };

    useEffect(() => {
        // Load data on mount if user is authenticated
        // We check if user exists (context) OR if we have a token in local storage to avoid waiting for context if unnecessary
        const token = localStorage.getItem('token');
        if (user || token) {
            refreshData();
        }
    }, [user]); // Keep user as dependency to re-run if auth state changes

    // ==================== DOCUMENT HELPER FUNCTIONS ====================

    // Helper function to check if all documents are verified
    const areAllDocumentsVerified = (applicant) => {
        if (!applicant.customDocuments || applicant.customDocuments.length === 0) {
            return false; // No documents uploaded, so CTC button should be disabled
        }
        return applicant.customDocuments.every(doc => doc.verified === true);
    };

    // Open document upload modal
    const openDocumentModal = (applicant) => {
        setDocumentApplicant(applicant);
        setUploadedDocuments(applicant.customDocuments || []);
        setDocumentName('');
        setDocumentFile(null);
        setShowDocumentModal(true);
    };

    // Handle document file selection
    const handleDocumentFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                notification.error({ message: 'Error', description: 'Only PDF, JPG, and PNG files are allowed', placement: 'topRight' });
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                notification.error({ message: 'Error', description: 'File size must be less than 5MB', placement: 'topRight' });
                return;
            }

            setDocumentFile(file);
        }
    };

    // Add document to list
    const addDocumentToList = () => {
        if (!documentName.trim()) {
            notification.error({ message: 'Error', description: 'Please enter document name', placement: 'topRight' });
            return;
        }

        if (!documentFile) {
            notification.error({ message: 'Error', description: 'Please select a file', placement: 'topRight' });
            return;
        }

        const newDoc = {
            name: documentName.trim(),
            fileName: documentFile.name,
            fileSize: documentFile.size,
            fileType: documentFile.type,
            file: documentFile,
            verified: false,
            uploadedAt: new Date()
        };

        setUploadedDocuments(prev => [...prev, newDoc]);
        setDocumentName('');
        setDocumentFile(null);

        if (fileInput) fileInput.value = '';

        notification.success({ message: 'Success', description: 'Document added to list', placement: 'topRight' });
    };

    // View Resume
    const handleViewResume = async (resumeFilename) => {
        if (!resumeFilename) {
            notification.warning({ message: 'No Resume', description: 'This applicant does not have a resume file.', placement: 'topRight' });
            return;
        }
        try {
            const response = await api.get(`/hr/resume/${resumeFilename}`, { responseType: 'blob' });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            setResumeUrl(fileURL);
            setIsResumeModalOpen(true);
        } catch (error) {
            console.error("View Resume Error:", error);
            let description = 'Failed to access resume file.';

            if (error.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const json = JSON.parse(text);
                    if (json.message) description = json.message;
                    if (json.debug) console.warn("Resume Debug Info:", json.debug);
                } catch (e) { /* ignore json parse error */ }
            } else if (error.response?.data?.message) {
                description = error.response.data.message;
            }

            notification.error({ message: 'Error', description, placement: 'topRight' });
        }
    };

    // Remove document from list
    const removeDocumentFromList = (index) => {
        setUploadedDocuments(prev => prev.filter((_, idx) => idx !== index));
    };

    // Save all documents to backend
    const saveDocuments = async () => {
        if (uploadedDocuments.length === 0) {
            notification.error({ message: 'Error', description: 'Please add at least one document', placement: 'topRight' });
            return;
        }

        try {
            const formData = new FormData();

            uploadedDocuments.forEach((doc, index) => {
                if (doc.file) {
                    formData.append('documents', doc.file);
                    formData.append(`documentNames[${index}]`, doc.name);
                }
            });

            await api.post(
                `/requirements/applicants/${documentApplicant._id}/documents`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );

            notification.success({ message: 'Success', description: 'Documents uploaded successfully', placement: 'topRight' });
            setShowDocumentModal(false);
            loadApplicants();
        } catch (err) {
            console.error('Document upload error:', err);
            notification.error({ message: 'Error', description: err.response?.data?.message || 'Failed to upload documents', placement: 'topRight' });
        }
    };

    // Verify a specific document
    const verifyDocument = async (applicantId, documentIndex) => {
        try {
            await api.patch(
                `/requirements/applicants/${applicantId}/documents/${documentIndex}/verify`
            );

            notification.success({ message: 'Success', description: 'Document verified', placement: 'topRight' });
            loadApplicants();
        } catch (err) {
            console.error('Document verification error:', err);
            notification.error({ message: 'Error', description: 'Failed to verify document', placement: 'topRight' });
        }
    };

    // ==================== END DOCUMENT FUNCTIONS ====================

    // Ensure templates are fresh when opening the modal
    useEffect(() => {
        if (showModal) {
            fetchTemplates();
        }
    }, [showModal]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Applied': return 'bg-blue-100 text-blue-800';
            case 'Shortlisted': return 'bg-yellow-100 text-yellow-800';
            case 'Selected': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Applied': return 'bg-blue-50/50 text-blue-600 border-blue-100';
            case 'Shortlisted': return 'bg-indigo-50/50 text-indigo-600 border-indigo-100';
            case 'Interview Scheduled':
            case 'Interview Rescheduled':
            case 'New Round':
                return 'bg-amber-50/50 text-amber-600 border-amber-100';
            case 'Interview Completed': return 'bg-emerald-50/50 text-emerald-600 border-emerald-100';
            case 'Selected': return 'bg-emerald-500 text-white border-emerald-600';
            case 'Rejected': return 'bg-red-50/50 text-red-600 border-red-100';
            default: return 'bg-slate-50/50 text-slate-600 border-slate-100';
        }
    };

    const openOfferModal = (applicant) => {
        setSelectedApplicant(applicant);

        // Auto-generate a default reference number
        const currentYear = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const refNo = `${companyInfo.refPrefix || 'OFFER'}/${currentYear}/${randomNum}`;

        setOfferData({
            joiningDate: '',
            location: applicant.workLocation || 'Ahmedabad',
            templateId: '',
            position: applicant.requirementId?.jobTitle || '',
            probationPeriod: '3 months',
            templateContent: '',
            isWordTemplate: false,
            refNo: refNo,
            salutation: applicant.salutation || '',
            address: applicant.address || '',
            issueDate: dayjs().format('YYYY-MM-DD'),
            name: applicant.name,
            dearName: applicant.name, // Default to full name
            dateFormat: 'Do MMM. YYYY'
        });
        setPreviewPdfUrl(null);
        setShowModal(true);
        setShowPreview(false);
    };

    const handleOfferChange = (e) => {
        const { name, value } = e.target;
        setOfferData(prev => {
            const updates = { ...prev, [name]: value };

            // If template selected, save its content for preview
            if (name === 'templateId') {
                const selectedTemplate = templates.find(t => t._id === value);
                if (selectedTemplate) {
                    updates.templateContent = selectedTemplate.bodyContent;
                    updates.isWordTemplate = (selectedTemplate.templateType === 'WORD');
                    setPreviewPdfUrl(null); // Reset when template changes
                }
            }
            return updates;
        });
    };

    const handlePreview = async () => {
        if (!offerData.joiningDate) {
            notification.error({ message: 'Error', description: 'Please select a joining date first', placement: 'topRight' });
            return;
        }

        if (offerData.isWordTemplate) {
            setGenerating(true);
            try {
                const payload = {
                    applicantId: selectedApplicant._id,
                    templateId: offerData.templateId,
                    joiningDate: offerData.joiningDate,
                    location: offerData.location,
                    address: offerData.address,
                    refNo: offerData.refNo, // Pass the user-edited Ref No
                    salutation: offerData.salutation,
                    issueDate: offerData.issueDate,
                    // issueDate: offerData.issueDate,
                    name: offerData.name,
                    dearName: offerData.dearName,
                    dateFormat: offerData.dateFormat,
                    preview: true // Tell backend this is just a preview
                };

                const res = await api.post('/letters/generate-offer', payload, { timeout: 30000 });

                if (res.data.downloadUrl) {
                    const url = `${API_ROOT}${res.data.downloadUrl}`;
                    setPreviewPdfUrl(url);
                    setShowPreview(true);
                }
            } catch (err) {
                console.error("Preview generation failed", err);
                const msg = err.response?.data?.message || err.message || "Failed to generate preview";

                if (err.response?.status === 404 && !err.response?.data?.message) {
                    notification.error({ message: 'Error', description: `Preview failed: Server endpoint not found (404). Please ensure the backend server is running and the route '/api/letters/generate-offer' exists.`, placement: 'topRight' });
                } else {
                    notification.error({ message: 'Error', description: `Preview failed: ${msg}`, placement: 'topRight' });
                }
            } finally {
                setGenerating(false);
            }
        } else {
            setShowPreview(true);
        }
    };

    const submitOffer = async (e) => {
        if (e) e.preventDefault();
        if (!selectedApplicant) return;

        // Open window immediately to bypass popup blockers
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;"><div style="text-align:center;"><h3>Generating Offer Letter...</h3><p>Please wait, do not close this window.</p></div></body></html>');
        }

        setGenerating(true);
        try {
            // Use unified letter generation endpoint
            const payload = {
                applicantId: selectedApplicant._id,
                templateId: offerData.templateId,
                joiningDate: offerData.joiningDate,
                location: offerData.location,
                address: offerData.address,
                refNo: offerData.refNo, // Pass user-edited Ref No
                salutation: offerData.salutation,
                issueDate: offerData.issueDate,
                name: offerData.name,
                dearName: offerData.dearName,
                dateFormat: offerData.dateFormat,
                // Pass other fields if needed for specific templates
            };

            const res = await api.post('/letters/generate-offer', payload, { timeout: 30000 });

            if (res.data.downloadUrl) {
                const url = `${API_ROOT}${res.data.downloadUrl}`;

                if (newWindow) {
                    newWindow.location.href = url;
                } else {
                    // Fallback if reference lost
                    window.open(url, '_blank');
                }

                setShowModal(false);
                setShowPreview(false); // Close preview if open
                loadApplicants(); // Refresh to show status change
                notification.success({ message: 'Success', description: 'Offer Letter Generated Successfully', placement: 'topRight' });
            } else {
                if (newWindow) newWindow.close();
                notification.warning({ message: 'Warning', description: 'Offer generated but no download URL returned', placement: 'topRight' });
            }
        } catch (err) {
            console.error(err);
            if (newWindow) {
                newWindow.close();
            }
            notification.error({ message: 'Error', description: err.response?.data?.message || 'Failed to generate offer letter', placement: 'topRight' });
        } finally {
            setGenerating(false);
        }
    };

    const downloadOffer = (filePath) => {
        // Handle both cases: just filename or full path
        let cleanPath = filePath;
        if (filePath && filePath.includes('/')) {
            // If path contains slashes, extract just the filename
            cleanPath = filePath.split('/').pop();
        }
        const url = `${API_ROOT}/uploads/offers/${cleanPath}`;
        window.open(url, '_blank');
    };

    const viewOfferLetter = (filePath) => {
        // Handle both cases: just filename or full path
        let cleanPath = filePath;
        if (filePath && filePath.includes('/')) {
            // If path contains slashes, extract just the filename
            cleanPath = filePath.split('/').pop();
        }
        const url = `${API_ROOT}/uploads/offers/${cleanPath}`;
        window.open(url, '_blank');
    };

    const viewJoiningLetter = async (applicantId) => {
        try {
            const response = await api.get(`/requirements/joining-letter/${applicantId}/preview`);
            if (response.data.downloadUrl) {
                const url = `${API_ROOT}${response.data.downloadUrl}`;
                window.open(url, '_blank');
            }
        } catch (err) {
            console.error('Failed to view joining letter:', err);
            notification.error({ message: 'Error', description: 'Failed to view joining letter', placement: 'topRight' });
        }
    };

    // const downloadJoiningLetter = async (applicantId) => {
    //     try {
    //         const response = await api.get(`/requirements/joining-letter/${applicantId}/download`);
    //         if (response.data.downloadUrl) {
    //             const url = `${API_ROOT}${response.data.downloadUrl}`;
    //             const link = document.createElement('a');
    //             link.href = url;
    //             link.download = `Joining_Letter_${applicantId}.pdf`;
    //             document.body.appendChild(link);
    //             link.click();
    //             document.body.removeChild(link);

    //             notification.success({
    //                 message: "Success",
    //                 description: "Joining letter downloaded successfully",
    //                 placement: 'topRight'
    //             });
    //             loadApplicants();
    //         }
    //     } catch (err) {
    //         console.error(err);
    //         notification.error({
    //             message: "Error",
    //             description: "Failed to download joining letter",
    //             placement: 'topRight'
    //         });
    //     } finally {
    //         setGenerating(false);
    //     }
    // };

    const downloadJoiningLetter = async (applicantId) => {
        try {
            const res = await api.get(`/requirements/joining-letter/${applicantId}/download`, {
                responseType: 'blob'
            });

            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Joining_Letter_${applicantId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download joining letter:', err);
            notification.error({ message: 'Error', description: 'Failed to download joining letter', placement: 'topRight' });
        }
    };

    const viewResume = async (input) => {
        if (!input) {
            showToast('error', 'No Resume', 'This applicant does not have a resume uploaded.');
            return;
        }

        // Handle if full applicant object is passed instead of just the path string
        let filePath = typeof input === 'string' ? input : (input.resumeFileUrl || (input.resume && typeof input.resume === 'object' ? input.resume.url : input.resume));

        if (!filePath) {
            showToast('error', 'No Resume', 'No resume file path found for this candidate.');
            return;
        }

        let filename = filePath;
        if (typeof filePath === 'string' && (filePath.includes('/') || filePath.includes('\\'))) {
            filename = filePath.split(/[/\\]/).pop();
        }

        try {
            // Using Blob approach to handle Authentication Headers in new tab
            const response = await api.get(`/hr/resume/${filename}`, {
                responseType: 'blob'
            });

            // Detect type or default to PDF
            const type = response.headers['content-type'] || 'application/pdf';
            const blob = new Blob([response.data], { type });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Cleanup after short delay to allow browser to register
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);

        } catch (error) {
            console.error("View Resume Failed:", error);
            if (error.response?.status === 404) {
                showToast('error', 'Not Found', 'The resume file is missing on the server.');
            } else {
                showToast('error', 'Error', 'Failed to load resume. Please try again.');
            }
        }
    };

    const downloadResume = (filePath) => {
        viewResume(filePath);
    };

    const [resumePreviewUrl, setResumePreviewUrl] = useState(null);

    const openCandidateModal = async (applicant) => {
        if (!applicant?._id) return;

        setLoading(true);
        try {
            // Fetch full applicant/candidate details using the ID
            // Using the verified endpoint /requirements/applicants/:id
            const res = await api.get(`/requirements/applicants/${applicant._id}`);
            const fullData = res.data?.data || res.data;

            setSelectedApplicant(fullData);
            setShowCandidateModal(true);

            // Extract resume path - handle multiple possible field structures
            const resumePath = fullData.resumeFileUrl || (fullData.resume && typeof fullData.resume === 'object' ? fullData.resume.url : fullData.resume);

            // Fetch Resume Blob for Preview if path exists
            if (resumePath) {
                let filename = resumePath;
                if (filename.includes('/') || filename.includes('\\')) {
                    filename = filename.split(/[/\\]/).pop();
                }
                try {
                    const response = await api.get(`/hr/resume/${filename}`, { responseType: 'blob' });
                    const type = response.headers['content-type'] || 'application/pdf';
                    const blob = new Blob([response.data], { type });
                    const url = window.URL.createObjectURL(blob);
                    setResumePreviewUrl(url);
                } catch (err) {
                    console.error("Failed to load resume preview", err);
                    setResumePreviewUrl(null);
                }
            } else {
                setResumePreviewUrl(null);
            }
        } catch (err) {
            console.error("Failed to fetch candidate details:", err);
            showToast('error', 'Error', 'Failed to fetch candidate details');
        } finally {
            setLoading(false);
        }
    };

    const closeCandidateModalHelper = () => {
        setShowCandidateModal(false);
        if (resumePreviewUrl) {
            window.URL.revokeObjectURL(resumePreviewUrl);
            setResumePreviewUrl(null);
        }
    };


    const openJoiningModal = async (applicant) => {
        if (!applicant.offerLetterPath) {
            notification.warning({ message: 'Warning', description: "Please generate an Offer Letter first.", placement: 'topRight' });
            return;
        }
        // Check if salary is assigned (either via snapshot or flat ctc field)
        const isSalaryAssigned = applicant.salarySnapshotId || applicant.salarySnapshot || (applicant.ctc && applicant.ctc > 0);
        if (!isSalaryAssigned) {
            notification.warning({ message: 'Warning', description: "Please assign salary before generating joining letter.", placement: 'topRight' });
            return;
        }
        setSelectedApplicant(applicant);
        setJoiningTemplateId('');

        // Auto-fetch Reference Number
        setJoiningRefNo('Fetching ID...');
        try {
            const res = await api.post('/company-id-config/next', { entityType: 'APPOINTMENT', increment: false });
            if (res.data && res.data.data && res.data.data.id) {
                setJoiningRefNo(res.data.data.id);
            } else {
                setJoiningRefNo('');
            }
        } catch (error) {
            console.error("Failed to fetch next Appointment ID", error);
            setJoiningRefNo('');
        }

        setJoiningIssueDate(dayjs().format('YYYY-MM-DD'));
        setShowJoiningModal(true);
        setJoiningPreviewUrl(null);
        setShowJoiningPreview(false);
    };

    const openSalaryModal = (applicant) => {
        setSelectedApplicant(applicant);
        setShowSalaryModal(true);
    };

    const openSalaryPreview = (applicant) => {
        setSelectedApplicant(applicant);
        setShowSalaryPreview(true);
    };

    const handleSalaryAssigned = () => {
        loadApplicants(); // Refresh list to show updated salary status
    };

    const confirmSalary = async (applicant) => {
        if (!confirm("Confirm and Lock this salary structure? This will create an immutable snapshot and enable letter generation.")) return;
        try {
            setLoading(true);
            await api.post('/payroll-engine/salary/confirm', {
                applicantId: applicant._id,
                reason: 'JOINING'
            });
            alert("✅ Salary confirmed and locked!");
            loadApplicants();
        } catch (err) {
            console.error(err);
            alert("❌ Lock failed: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleJoiningPreview = async () => {
        if (!joiningTemplateId) {
            notification.error({ message: 'Error', description: 'Please select a Joining Letter Template', placement: 'topRight' });
            return;
        }

        setGenerating(true);
        try {
            const res = await api.post('/letters/preview-joining', {
                applicantId: selectedApplicant._id,
                templateId: joiningTemplateId,
                refNo: joiningRefNo,
                issueDate: joiningIssueDate
            }, { timeout: 90000 }); // 90 second timeout for PDF conversion

            if (res.data.previewUrl) {
                const url = `${API_ROOT}${res.data.previewUrl}`;

                setJoiningPreviewUrl(url);
                setShowJoiningPreview(true);
            }
        } catch (err) {
            console.error("Failed to preview joining letter", err);

            // FORCE DISPLAY OF BACKEND ERROR MESSAGE
            if (err.response && err.response.data && err.response.data.message) {
                alert(`SERVER ERROR: ${err.response.data.message}`);
            } else {
                alert(`Failed to preview joining letter: ${err.message}`);
            }
        } finally {
            setGenerating(false);
        }
    };

    const handleJoiningGenerate = async () => {
        if (!joiningTemplateId) {
            notification.error({ message: 'Error', description: 'Please select a Joining Letter Template', placement: 'topRight' });
            return;
        }

        setGenerating(true);
        try {
            const res = await api.post('/letters/generate-joining', {
                applicantId: selectedApplicant._id,
                templateId: joiningTemplateId,
                refNo: joiningRefNo,
                issueDate: joiningIssueDate
            });

            if (res.data.downloadUrl) {
                const url = `${API_ROOT}${res.data.downloadUrl}`;

                // Download the PDF
                const link = document.createElement('a');
                link.href = url;
                link.download = `Joining_Letter_${selectedApplicant._id}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setShowJoiningModal(false);
                setShowJoiningPreview(false);
                loadApplicants();
            }
        } catch (err) {
            console.error("Failed to generate joining letter", err);
            const errorMsg = err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to generate joining letter';

            // Check if it's a salary not assigned error
            if (errorMsg.toLowerCase().includes('salary not assigned') ||
                err.response?.data?.code === 'SALARY_NOT_ASSIGNED') {
                notification.error({ message: 'Error', description: 'Please assign salary before generating joining letter.', placement: 'topRight' });
            } else {
                notification.error({ message: 'Error', description: errorMsg, placement: 'topRight' });
            }
        } finally {
            setGenerating(false);
        }
    };

    const handleOnboard = (applicant) => {
        showConfirmToast({
            title: 'Confirm Onboarding',
            description: `Convert ${applicant.name} into an Employee? This will create a new employee profile.`,
            okText: 'Yes, Convert',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setLoading(true);
                try {
                    // Split Name
                    const nameParts = (applicant.name || '').trim().split(' ');
                    const firstName = nameParts[0];
                    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '.';

                    // Prepare Payload
                    const payload = {
                        firstName,
                        lastName,
                        email: applicant.email,
                        contactNo: applicant.mobile,
                        joiningDate: applicant.joiningDate || new Date(),
                        department: applicant.requirementId?.department?.name || 'General',
                        departmentId: applicant.requirementId?.department?._id,
                        designation: applicant.requirementId?.jobTitle,
                        role: 'employee',
                        applicantId: applicant._id,
                        status: 'Active',
                        leavePolicy: null,
                    };

                    await api.post('/hrms/hr/employees', payload);
                    showToast('success', 'Onboarding Started', `${applicant.name} is now an Active Employee.`);
                    loadApplicants();
                } catch (err) {
                    console.error(err);
                    showToast('error', 'Onboarding Failed', err.response?.data?.message || err.message);
                } finally {
                    setLoading(false);
                }
            }
        });
    };



    return (
        <div className="space-y-6 sm:space-y-8 relative pb-20 px-4 sm:px-0">
            {/* Premium Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-2">
                        <span>Recruiting</span>
                        <span className="opacity-30">/</span>
                        <span className="text-blue-600">Applicants</span>
                        {jobSpecific && selectedRequirement && (
                            <>
                                <span className="opacity-30">/</span>
                                <span className="text-blue-600">{selectedRequirement.jobTitle}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {(jobSpecific || showAllCandidates) && (
                            <button
                                onClick={() => navigate('/hr/applicants')}
                                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                                title="Back to all jobs"
                            >
                                <ChevronRight size={20} className="rotate-180 text-slate-600" />
                            </button>
                        )}
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {showAllCandidates ? 'All Candidates' : (jobSpecific && selectedRequirement ? selectedRequirement.jobTitle : 'Candidate Pipeline')}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Search Bar - PMG Style */}
                    <div className="relative flex-grow lg:flex-grow-0 lg:w-48 xl:w-64">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search name, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-100 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>

                    {/* Job Dropdown - Hidden, replaced with cards below */}
                    {false && (
                        <div className="lg:w-48 xl:w-64">
                            <select
                                className="w-full border border-slate-100 shadow-sm rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/10 outline-none bg-white cursor-pointer"
                                value={selectedReqId}
                                onChange={(e) => handleRequirementChange(e.target.value)}
                            >
                                <option value="all">Global Pipeline</option>
                                <optgroup label="Active Recruitments">
                                    {requirements.filter(r => {
                                        if (r.status !== 'Open') return false;
                                        // Strict visibility filtering
                                        if (internalMode) {
                                            return r.visibility === 'Internal' || r.visibility === 'Both';
                                        } else {
                                            return r.visibility === 'External' || r.visibility === 'Both' || !r.visibility; // Default to External
                                        }
                                    }).map(req => (
                                        <option key={req._id} value={req._id}>{req.jobTitle}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    )}

                    <div className="lg:w-40 xl:w-48">
                        <select
                            className="w-full border border-slate-100 shadow-sm rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/10 outline-none bg-white cursor-pointer"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="15days">Past 15 Days</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>

                    <div className="w-full sm:w-auto flex gap-2">
                        <button
                            onClick={() => notification.info({ message: 'Info', description: 'Exporting...', placement: 'topRight' })}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-100 shadow-sm rounded-xl hover:bg-slate-50 transition font-bold text-xs uppercase tracking-wider"
                        >
                            <Download size={16} />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={refreshData}
                            className="p-2.5 bg-white text-slate-400 border border-slate-100 shadow-sm rounded-xl hover:text-blue-600 transition flex-shrink-0"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Job Cards Grid - Only show on main applicants page, not on job-specific page OR all candidates view */}
            {!jobSpecific && !showAllCandidates && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Global Pipeline Card */}
                    <div
                        onClick={() => navigate('/hr/applicants?view=all')}
                        className={`bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group border-slate-200 hover:border-blue-300`}
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg">
                                    <span className="text-white text-lg font-black">🌐</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                                        Global Pipeline
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        All Positions
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-600">
                                    View all candidates across all open positions
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-slate-500 to-slate-700 px-6 py-3">
                            <div className="flex items-center justify-between text-white">
                                <span className="text-xs font-black uppercase tracking-wider">
                                    Total Candidates
                                </span>
                                <span className="text-2xl font-black">
                                    {applicants.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Individual Job Cards */}
                    {requirements.filter(r => {
                        if (r.status !== 'Open') return false;
                        if (internalMode) {
                            return r.visibility === 'Internal' || r.visibility === 'Both';
                        } else {
                            return r.visibility === 'External' || r.visibility === 'Both' || !r.visibility;
                        }
                    }).map(req => {
                        const jobApplicants = applicants.filter(a =>
                            a.requirementId?._id === req._id || a.requirementId === req._id
                        );

                        return (
                            <div
                                key={req._id}
                                onClick={() => navigate(`/hr/job/${req._id}/candidates`)}
                                className="bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group border-slate-200 hover:border-blue-300"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                            <span className="text-white text-lg font-black">
                                                {(req.jobTitle || 'J').charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                                {req.jobTitle}
                                            </h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                                                {req.department?.name || req.department || 'General'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Openings</p>
                                            <p className="text-sm font-black text-slate-900">{req.openings || 0}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Experience</p>
                                            <p className="text-sm font-black text-slate-900 truncate">{req.experience || 'Any'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <p className="text-[10px] text-slate-600 line-clamp-2">
                                            📍 {req.location || 'Remote'} • {req.jobType || 'Full-time'}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3">
                                    <div className="flex items-center justify-between text-white">
                                        <span className="text-xs font-black uppercase tracking-wider">
                                            Applicants
                                        </span>
                                        <span className="text-2xl font-black">
                                            {jobApplicants.length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Candidates Table Section - Show on job-specific pages OR when viewing all candidates */}
            {(jobSpecific || showAllCandidates) && (
                <div className="bg-white/50 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.05)] overflow-hidden">

                    {/* Modern Pipeline Stepper */}
                    <div className="bg-white/80 border-b border-indigo-50/50 px-6 py-5">
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2 scrollbar-hide snap-x">
                            {workflowTabs.map((tab, idx) => {
                                let sub = applicants;
                                if (searchQuery) {
                                    const query = searchQuery.toLowerCase();
                                    sub = sub.filter(a => (a.name || '').toLowerCase().includes(query) || (a.email || '').toLowerCase().includes(query));
                                }

                                let count = sub.filter(a => {
                                    if (selectedReqId !== 'all') {
                                        if (!(a.requirementId?._id === selectedReqId || a.requirementId === selectedReqId)) return false;
                                    }
                                    if (a.status === 'Rejected' && tab !== 'Rejected') return false;
                                    if (selectedReqId === 'all') {
                                        if (tab === 'Finalized') return (a.status === 'Finalized');
                                        if (tab === 'Rejected') return (a.status === 'Rejected');
                                        return a.status !== 'Finalized' && a.status !== 'Rejected';
                                    }
                                    return checkStatusPassage(a.status, tab, workflowTabs);
                                }).length;

                                const isActive = activeTab === tab;
                                const isFinal = tab === 'Finalized';
                                const isRejected = tab === 'Rejected';

                                return (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                                        className={`
                                            group relative flex-shrink-0 px-6 py-3 rounded-2xl transition-all duration-500 ease-out snap-center
                                            flex items-center gap-3 border
                                            ${isActive
                                                ? (isFinal ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200/50 border-transparent scale-105' :
                                                    isRejected ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-200/50 border-transparent scale-105' :
                                                        'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/50 border-transparent scale-105')
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-100 hover:bg-indigo-50/30 hover:text-indigo-600'}
                                        `}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-indigo-400'}`}>
                                                Stage 0{idx + 1}
                                            </span>
                                            <span className="text-sm font-black tracking-tight">
                                                {tab}
                                            </span>
                                        </div>
                                        <span className={`
                                            flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full text-[11px] font-black
                                            ${isActive
                                                ? 'bg-white/20 text-white backdrop-blur-sm'
                                                : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}
                                        `}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-4 sm:p-8 bg-slate-50/50 min-h-[600px]">
                        {loading ? (
                            <div className="h-96 flex flex-col items-center justify-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-8 h-8 bg-white rounded-full"></div>
                                    </div>
                                </div>
                                <span className="text-slate-400 font-medium animate-pulse">Fetching Talent...</span>
                            </div>
                        ) : getFilteredApplicants().length === 0 ? (
                            <div className="h-96 flex flex-col items-center justify-center gap-6 text-slate-400">
                                <div className="w-24 h-24 rounded-3xl bg-white shadow-xl shadow-slate-100 flex items-center justify-center transform rotate-3 transition-transform hover:rotate-6 duration-500">
                                    <UserX size={40} className="text-slate-300" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm">Try adjusting your filters or search query</p>
                                </div>
                            </div>
                        ) : activeTab !== 'Finalized' ? (
                            /* CARD GRID VIEW */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {getFilteredApplicants()
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((app, index) => (
                                        <div
                                            key={app._id || index}
                                            className="bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] transition-all duration-300 border border-slate-100 overflow-hidden group hover:-translate-y-1 block relative"
                                        >
                                            {/* Status Header Line */}
                                            <div className={`h-1.5 w-full ${app.status === 'Selected' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                                                app.status === 'Rejected' ? 'bg-gradient-to-r from-rose-400 to-rose-600' :
                                                    'bg-gradient-to-r from-blue-400 to-indigo-600'
                                                }`}></div>

                                            <div className="p-6">
                                                {/* Header */}
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex gap-4">
                                                        <div className="relative">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg ${app.status === 'Selected' ? 'bg-emerald-500' :
                                                                app.status === 'Rejected' ? 'bg-rose-500' :
                                                                    'bg-blue-600'
                                                                }`}>
                                                                {(app.name || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            {activeTab === 'Rejected' && (
                                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center bg-rose-500 text-white">
                                                                    <X size={12} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                                                                {app.name || 'Anonymous'}
                                                            </h3>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-wide truncate max-w-[150px]">
                                                                    {app.requirementId?.jobTitle || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Info Grid */}
                                                <div className="flex flex-col gap-2.5 mb-6">
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-50">
                                                        <span className="w-5 flex justify-center">📧</span>
                                                        <span className="font-medium truncate">{app.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-50">
                                                        <span className="w-5 flex justify-center">📅</span>
                                                        <span className="font-medium">Applied {dayjs(app.appliedAt).format('MMM D, YYYY')}</span>
                                                    </div>
                                                    {app.source && (
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-50">
                                                            <span className="w-5 flex justify-center">🔗</span>
                                                            <span className="font-medium">{app.source}</span>
                                                        </div>
                                                    )}
                                                    {/* AI Match Score */}
                                                    {app.matchPercentage !== undefined && (
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 bg-purple-50/50 p-2 rounded-lg border border-purple-50">
                                                            <span className="w-5 flex justify-center text-purple-500">✨</span>
                                                            <span className="font-bold text-purple-700">{app.matchPercentage}% Match</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* AI Skills Preview */}
                                                {app.parsedSkills && app.parsedSkills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-3 mb-1">
                                                        {app.parsedSkills.slice(0, 4).map((skill, i) => (
                                                            <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-500 font-medium rounded border border-slate-100">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {app.parsedSkills.length > 4 && (
                                                            <span className="text-[10px] px-1.5 py-0.5 text-slate-400">+{app.parsedSkills.length - 4}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Area */}
                                                <div className="pt-4 border-t border-slate-100 space-y-3">
                                                    {/* Interview Status */}
                                                    {app.interview?.date ? (
                                                        <div className={`p-3 rounded-xl border flex items-center justify-between ${app.interview.completed
                                                            ? 'bg-emerald-50/50 border-emerald-100'
                                                            : 'bg-amber-50/50 border-amber-100'
                                                            }`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-1.5 rounded-lg ${app.interview.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                                                    }`}>
                                                                    <Clock size={14} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Interview</p>
                                                                    <p className="text-xs font-bold text-slate-700">
                                                                        {dayjs(app.interview.date).format('MMM D')} • {app.interview.time}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {!app.interview.completed && (
                                                                <button
                                                                    onClick={() => markInterviewCompleted(app)}
                                                                    className="p-1 min-w-[32px] rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition shadow-sm flex items-center justify-center"
                                                                    title="Mark Complete"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => openScheduleModal(app)}
                                                            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs font-bold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition flex items-center justify-center gap-2 group/btn"
                                                        >
                                                            <PlusCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                            Schedule Interview
                                                        </button>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-3">
                                                        {/* Resume Button */}
                                                        <button
                                                            onClick={() => handleViewResume(app.resume)}
                                                            className="col-span-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                                            title="View Resume"
                                                        >
                                                            <FileText size={14} /> Resume
                                                        </button>

                                                        {/* Move/Action Button */}
                                                        <div className="relative col-span-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const dropdown = e.currentTarget.nextElementSibling;
                                                                    if (dropdown) dropdown.classList.toggle('hidden');
                                                                    document.querySelectorAll('.stage-dropdown').forEach(d => {
                                                                        if (d !== dropdown) d.classList.add('hidden');
                                                                    });
                                                                }}
                                                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200 z-10 relative"
                                                            >
                                                                <span>Actions</span>
                                                                <ChevronDown size={14} />
                                                            </button>

                                                            <div className="stage-dropdown hidden absolute bottom-full mb-2 left-0 w-full bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-[50] animate-in slide-in-from-bottom-2 fade-in duration-200">
                                                                <div className="max-h-[200px] overflow-y-auto">
                                                                    {workflowTabs.filter(t => !['Finalized', 'Rejected', activeTab].includes(t)).map(stage => (
                                                                        <button
                                                                            key={stage}
                                                                            onClick={() => {
                                                                                handleStatusChangeRequest(app, stage);
                                                                                document.querySelectorAll('.stage-dropdown').forEach(d => d.classList.add('hidden'));
                                                                            }}
                                                                            className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-50 last:border-0"
                                                                        >
                                                                            Move to {stage}
                                                                        </button>
                                                                    ))}

                                                                    <div className="p-1 bg-slate-50 grid grid-cols-2 gap-1 border-t border-slate-100">
                                                                        <button onClick={() => { handleStatusChangeRequest(app, 'Selected'); document.querySelectorAll('.stage-dropdown').forEach(d => d.classList.add('hidden')); }} className="py-2 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition">HIRE</button>
                                                                        <button onClick={() => { handleStatusChangeRequest(app, 'Rejected'); document.querySelectorAll('.stage-dropdown').forEach(d => d.classList.add('hidden')); }} className="py-2 text-[10px] font-black bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition">REJECT</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            /* TABLE VIEW (Finalized) */
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Candidate</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Salary</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Offer</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Joining</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">BGV</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-50">
                                        {getFilteredApplicants()
                                            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                            .map((app, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-black">
                                                                {app.name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-sm">{app.name}</div>
                                                                <div className="text-xs text-slate-400">{app.requirementId?.jobTitle}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Finalized</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {app.salarySnapshotId || app.salarySnapshot || app.salaryAssigned ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={10} /> Locked</span>
                                                                <button onClick={() => navigate(`/hr/salary-structure/${app._id}`)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-blue-100 transition-all" title="Edit Salary Structure">
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => navigate(`/hr/salary-structure/${app._id}`)} className="w-full py-2 sm:py-3 bg-white border border-slate-200 text-slate-600 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition shadow-sm uppercase tracking-widest whitespace-nowrap">ASSIGN SALARY</button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {app.offerLetterPath ? (
                                                            <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                                                                <button onClick={() => viewOfferLetter(app.offerLetterPath)} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm hover:shadow-md" title="Preview"><Eye size={16} /></button>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-tighter">OFFER</span>
                                                                    <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase">ISSUED</span>
                                                                </div>
                                                                <button onClick={() => { setSelectedApplicant(app); setOfferData(prev => ({ ...prev, name: app.name })); setShowModal(true); }} className="ml-1 p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-white border border-transparent hover:border-orange-100 transition-all" title="Regenerate Offer">
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => { setSelectedApplicant(app); setOfferData(prev => ({ ...prev, name: app.name })); setShowModal(true); }} className="w-full py-2 sm:py-3 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 uppercase tracking-widest">GENERATE</button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {app.joiningLetterPath ? (
                                                            <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                                                                <button onClick={() => viewJoiningLetter(app.joiningLetterPath)} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm hover:shadow-md" title="Preview"><Eye size={16} /></button>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-tighter">JOINING</span>
                                                                    <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase">ISSUED</span>
                                                                </div>
                                                                <button onClick={() => openJoiningModal(app)} className="ml-1 p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-white border border-transparent hover:border-orange-100 transition-all" title="Regenerate Joining Letter">
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => openJoiningModal(app)} className="w-full py-2 sm:py-3 bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 uppercase tracking-widest">GENERATE</button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${app.bgvStatus === 'CLEAR' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                app.bgvStatus === 'FAILED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    app.bgvStatus === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                        'bg-slate-50 text-slate-400 border-slate-100'
                                                                }`}>
                                                                {app.bgvStatus?.replace(/_/g, ' ') || 'NOT INITIATED'}
                                                            </span>
                                                            <button
                                                                onClick={() => app.bgvStatus === 'NOT_INITIATED' ? handleInitiateBGV(app) : navigate('/hr/bgv')}
                                                                className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                                            >
                                                                {app.bgvStatus === 'NOT_INITIATED' ? 'Initiate' : 'Manage'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {app.isOnboarded ? (
                                                            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                                                                <CheckCircle size={14} />
                                                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Converted</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleOnboard(app)}
                                                                disabled={!app.joiningLetterPath || ['FAILED', 'IN_PROGRESS', 'INITIATED'].includes(app.bgvStatus)}
                                                                className={`w-full py-2 sm:py-3 text-white text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl transition shadow-lg uppercase tracking-widest ${(!app.joiningLetterPath || ['FAILED', 'IN_PROGRESS', 'INITIATED'].includes(app.bgvStatus)) ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
                                                                title={app.bgvStatus === 'FAILED' ? 'BGV Failed' : app.bgvStatus === 'IN_PROGRESS' || app.bgvStatus === 'INITIATED' ? 'BGV In Progress' : ''}
                                                            >
                                                                {app.bgvStatus === 'FAILED' ? 'BGV FAILED' :
                                                                    (['IN_PROGRESS', 'INITIATED'].includes(app.bgvStatus)) ? 'BGV PENDING' : 'Convert'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="px-8 py-5 bg-slate-50/20 flex items-center justify-between border-t border-slate-50">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">
                            Metrics: {getFilteredApplicants().length} Candidates Synced
                        </div>
                        <Pagination
                            current={currentPage}
                            pageSize={pageSize}
                            total={getFilteredApplicants().length}
                            onChange={(page) => setCurrentPage(page)}
                            showSizeChanger={false}
                            responsive={true}
                            size="small"
                        />
                    </div>
                </div>
            )}

            {/* Offer Generation Modal */}
            {
                showModal && selectedApplicant && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Offer Letter</h2>

                            <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Candidate Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={offerData.name}
                                        onChange={handleOfferChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Role: {selectedApplicant.requirementId?.jobTitle}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name (For 'Dear ...' section)</label>
                                    <input
                                        type="text"
                                        name="dearName"
                                        value={offerData.dearName}
                                        onChange={handleOfferChange}
                                        placeholder="e.g. First Name only"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date Format</label>
                                    <select
                                        name="dateFormat"
                                        value={offerData.dateFormat}
                                        onChange={handleOfferChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    >
                                        <option value="Do MMM. YYYY">17th Jan. 2026 (Default)</option>
                                        <option value="DD/MM/YYYY">17/01/2026</option>
                                        <option value="Do MMMM YYYY">17th January 2026</option>
                                        <option value="YYYY-MM-DD">2026-01-17</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-700">Title</label>
                                        <select
                                            name="salutation"
                                            value={offerData.salutation}
                                            onChange={handleOfferChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        >
                                            <option value="">--</option>
                                            <option value="Mr.">Mr.</option>
                                            <option value="Ms.">Ms.</option>
                                            <option value="Mrs.">Mrs.</option>
                                            <option value="Dr.">Dr.</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Offer Template</label>
                                        <select
                                            name="templateId"
                                            value={offerData.templateId}
                                            onChange={handleOfferChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        >
                                            <option value="">-- Select Template --</option>
                                            {templates.map(t => (
                                                <option key={t._id} value={t._id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                                    <input
                                        type="text"
                                        name="refNo"
                                        value={offerData.refNo || ''}
                                        onChange={handleOfferChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="e.g. OFFER/2025/001"
                                    />
                                </div>
                                <div>
                                    <div className="flex gap-4">
                                        <div className="w-1/2">
                                            <label className="block text-sm font-medium text-gray-700">Joining Date *</label>
                                            <DatePicker
                                                disabledDate={(current) => current && current < dayjs().startOf('day')}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-[42px]"
                                                format="DD-MM-YYYY"
                                                placeholder="DD-MM-YYYY"
                                                value={offerData.joiningDate ? dayjs(offerData.joiningDate) : null}
                                                onChange={(date) => setOfferData(prev => ({ ...prev, joiningDate: date ? date.format('YYYY-MM-DD') : '' }))}
                                            />
                                        </div>
                                        <div className="w-1/2">
                                            <label className="block text-sm font-medium text-gray-700">Letter Issue Date</label>
                                            <DatePicker
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-[42px]"
                                                format="DD-MM-YYYY"
                                                placeholder="DD-MM-YYYY"
                                                value={offerData.issueDate ? dayjs(offerData.issueDate) : null}
                                                onChange={(date) => setOfferData(prev => ({ ...prev, issueDate: date ? date.format('YYYY-MM-DD') : '' }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden">
                                    <label className="block text-sm font-medium text-gray-700">Work Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={offerData.location}
                                        onChange={handleOfferChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="e.g. New York, Remote"
                                    />
                                </div>
                                <div className="col-span-full">
                                    <label className="block text-sm font-medium text-gray-700">Candidate Address</label>
                                    <textarea
                                        name="address"
                                        value={offerData.address}
                                        onChange={handleOfferChange}
                                        rows="3"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="Full address with pin code..."
                                    />
                                </div>

                                <div className="flex justify-between items-center bg-slate-50 -mx-6 -mb-6 p-6 mt-6 rounded-b-lg">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2.5 text-slate-500 font-bold hover:text-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={generating}
                                            className="h-12 px-6 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {generating ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    <span>GENERATING...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={18} />
                                                    <span>GENERATE OFFER</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Joining Letter Generation Modal */}
            {
                showJoiningModal && selectedApplicant && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Joining Letter</h2>
                            <div className="mb-4 text-sm text-gray-600 space-y-2">
                                <p><strong>Candidate:</strong> {selectedApplicant.name}</p>
                                <p><strong>Joining Date:</strong> {selectedApplicant.joiningDate ? new Date(selectedApplicant.joiningDate).toLocaleDateString() : 'N/A'}</p>
                                <p><strong>Location:</strong> {selectedApplicant.location || selectedApplicant.workLocation || 'N/A'}</p>
                                <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded">
                                    Note: Joining Date and Location are pulled from the Offer Letter data.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Select Template</label>
                                    <select
                                        value={joiningTemplateId}
                                        onChange={(e) => setJoiningTemplateId(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    >
                                        <option value="">-- Select Template --</option>
                                        {joiningTemplates.map(t => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                                    <input
                                        type="text"
                                        value={joiningRefNo}
                                        onChange={(e) => setJoiningRefNo(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="e.g. JL/2025/001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Letter Issue Date</label>
                                    <DatePicker
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-[42px]"
                                        format="DD-MM-YYYY"
                                        placeholder="DD-MM-YYYY"
                                        value={joiningIssueDate ? dayjs(joiningIssueDate) : null}
                                        onChange={(date) => setJoiningIssueDate(date ? date.format('YYYY-MM-DD') : '')}
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        onClick={() => setShowJoiningModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleJoiningPreview}
                                        disabled={generating}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {generating ? 'Loading...' : 'Preview'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Joining Letter Preview Modal */}
            {
                showJoiningPreview && selectedApplicant && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-y-auto">
                        <div className="min-h-screen py-8 px-4">
                            {/* Sticky Header with Buttons */}
                            <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black to-transparent pb-6 mb-4">
                                <div className="max-w-5xl mx-auto flex justify-between items-center gap-3">
                                    <h2 className="text-xl font-bold text-white">Joining Letter Preview</h2>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowJoiningPreview(false)}
                                            className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 shadow-lg font-medium transition"
                                        >
                                            ✕ Close Preview
                                        </button>
                                        <button
                                            onClick={handleJoiningGenerate}
                                            disabled={generating}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium disabled:opacity-50 transition"
                                        >
                                            {generating ? 'Generating...' : '✓ Generate & Download'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Preview Content */}
                            <div className="max-w-5xl mx-auto">
                                {joiningPreviewUrl ? (
                                    <iframe
                                        src={joiningPreviewUrl}
                                        className="w-full h-[80vh] rounded-lg shadow-xl bg-white"
                                        title="Joining Letter PDF Preview"
                                    />
                                ) : (
                                    <div className="w-full h-[80vh] rounded-lg shadow-xl bg-white flex items-center justify-center">
                                        <p className="text-gray-500">Loading preview...</p>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Padding */}
                            <div className="h-8"></div>
                        </div>
                    </div>
                )
            }

            {/* Offer Letter Preview Modal (Unified for both Offer & Joining) */}
            {
                showPreview && selectedApplicant && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-y-auto">
                        <div className="min-h-screen py-8 px-4">
                            {/* Sticky Header with Buttons */}
                            <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black to-transparent pb-6 mb-4">
                                <div className="max-w-5xl mx-auto flex justify-between items-center gap-3">
                                    <h2 className="text-xl font-bold text-white">Offer Letter Preview</h2>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowPreview(false)}
                                            className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 shadow-lg font-medium transition"
                                        >
                                            ✕ Close Preview
                                        </button>
                                        <button
                                            onClick={(e) => submitOffer(e)}
                                            disabled={generating}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium disabled:opacity-50 transition"
                                        >
                                            {generating ? 'Downloading...' : '✓ Download PDF'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Preview Content */}
                            <div className="max-w-5xl mx-auto">
                                {offerData.isWordTemplate && previewPdfUrl ? (
                                    <iframe
                                        src={previewPdfUrl}
                                        className="w-full h-[80vh] rounded-lg shadow-xl bg-white"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <OfferLetterPreview
                                        applicant={selectedApplicant}
                                        offerData={offerData}
                                        companyInfo={companyInfo}
                                    />
                                )}
                            </div>

                            {/* Bottom Padding */}
                            <div className="h-8"></div>
                        </div>
                    </div>
                )
            }

            {/* Assign Salary Modal */}
            {
                showSalaryModal && selectedApplicant && (
                    <AssignSalaryModal
                        isOpen={showSalaryModal}
                        onClose={() => {
                            setShowSalaryModal(false);
                            setSelectedApplicant(null);
                        }}
                        applicant={selectedApplicant}
                        onSuccess={handleSalaryAssigned}
                    />
                )
            }

            {/* Salary Preview Modal */}
            {
                showSalaryPreview && selectedApplicant && (selectedApplicant.salarySnapshotId || selectedApplicant.salarySnapshot) && (() => {
                    // Logic: Use populated object if available, else fallback to embedded snapshot. 
                    // If salarySnapshotId is a string (unpopulated ID), we MUST use local snapshot.
                    const snapshot = (typeof selectedApplicant.salarySnapshotId === 'object' && selectedApplicant.salarySnapshotId !== null)
                        ? selectedApplicant.salarySnapshotId
                        : selectedApplicant.salarySnapshot;
                    const earnings = snapshot.earnings || [];
                    const deductions = snapshot.employeeDeductions || snapshot.deductions || [];
                    const takeHome = snapshot.breakdown?.takeHome || snapshot.takeHome?.monthly || snapshot.takeHome || 0;
                    const ctcYearly = snapshot.ctc?.yearly || snapshot.ctc || 0;
                    const grossMonthly = snapshot.breakdown?.grossA || snapshot.grossA?.monthly || snapshot.grossA || 0;

                    return (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                                {/* Header */}
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Salary Structure</h3>
                                        <p className="text-sm text-slate-500">{selectedApplicant.name} • {selectedApplicant.requirementId?.jobTitle}</p>
                                    </div>
                                    <button onClick={() => setShowSalaryPreview(false)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
                                        ✕
                                    </button>
                                </div>

                                {/* Body - Scrollable */}
                                <div className="p-6 overflow-y-auto space-y-6">
                                    {/* Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Earnings */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2">Earnings (Monthly)</h4>
                                            <div className="space-y-2">
                                                {earnings.map((e, i) => (
                                                    <div key={i} className="flex justify-between text-sm group border-b border-dashed border-slate-100 pb-1 last:border-0">
                                                        <span className="text-slate-600 group-hover:text-slate-900">{e.name}</span>
                                                        <span className="font-medium text-slate-800">₹{e.monthlyAmount?.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800 mt-2">
                                                <span>Gross Earnings</span>
                                                <span>₹{grossMonthly.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Deductions */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider border-b border-rose-100 pb-2">Deductions (Monthly)</h4>
                                            <div className="space-y-2">
                                                {deductions.length > 0 ? (
                                                    deductions.map((d, i) => (
                                                        <div key={i} className="flex justify-between text-sm group border-b border-dashed border-slate-100 pb-1 last:border-0">
                                                            <span className="text-slate-600 group-hover:text-slate-900">{d.name}</span>
                                                            <span className="font-medium text-rose-600">-₹{d.monthlyAmount?.toLocaleString()}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">No deductions</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Card */}
                                    <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg ring-1 ring-white/10">
                                        <div className="grid grid-cols-2 gap-4 text-center divide-x divide-slate-700/50">
                                            <div>
                                                <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Monthly Net Pay</div>
                                                <div className="text-2xl font-bold text-emerald-400">₹{takeHome.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Annual CTC</div>
                                                <div className="text-xl font-bold text-white">₹{ctcYearly.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                    <button
                                        onClick={() => { setShowSalaryPreview(false); navigate(`/hr/salary-structure/${selectedApplicant._id}`); }}
                                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    >
                                        Edit Structure
                                    </button>
                                    <button
                                        onClick={() => setShowSalaryPreview(false)}
                                        className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-lg"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* INTERVIEW MODAL */}
            {/* INTERVIEW MODAL - REFACTORED */}
            {/* INTERVIEW MODAL - REFACTORED */}

            <InterviewScheduleModal
                visible={showInterviewModal}
                onCancel={() => setShowInterviewModal(false)}
                onSubmit={handleInterviewSubmit}
                initialData={interviewData}
                isReschedule={isReschedule}
                loading={loading}
                companyHolidays={companyHolidays}
            />


            {/* Custom Stage Modal */}
            {
                isCustomStageModalVisible && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Add Custom Stage</h2>
                            <p className="text-sm text-slate-600 mb-4">Enter the name for the new ad-hoc stage. This will be added for <b>{candidateForCustomStage?.name}</b>.</p>

                            <input
                                type="text"
                                value={customStageName}
                                onChange={(e) => setCustomStageName(e.target.value)}
                                placeholder="e.g. Manager Review 2"
                                className="w-full p-2 border border-slate-300 rounded mb-4"
                                autoFocus
                            />

                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsCustomStageModalVisible(false)} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                                <button onClick={handleAddCustomStage} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Add & Move</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Workflow Edit Modal */}
            {
                showWorkflowEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Edit Hiring Workflow</h2>
                                <button onClick={() => setShowWorkflowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-sm text-slate-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                Customize the hiring process for <b>{selectedRequirement?.jobTitle}</b>.
                                Adding steps here updates the job for all candidates.
                            </p>

                            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                                {editingWorkflow.map((stage, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 group ${stage === 'Applied' || stage === 'Finalized' ? 'opacity-80' : 'cursor-move hover:border-blue-300'}`}
                                        draggable={stage !== 'Applied' && stage !== 'Finalized'}
                                        onDragStart={(e) => {
                                            dragItem.current = index;
                                            e.target.classList.add('opacity-50');
                                        }}
                                        onDragEnter={(e) => {
                                            dragOverItem.current = index;
                                        }}
                                        onDragEnd={(e) => {
                                            e.target.classList.remove('opacity-50');
                                            handleSort();
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        {/* Grip Handle for Draggable Items */}
                                        {stage !== 'Applied' && stage !== 'Finalized' ? (
                                            <div className="text-slate-400 cursor-grab active:cursor-grabbing">
                                                <GripVertical size={16} />
                                            </div>
                                        ) : (
                                            <div className="w-4"></div> // Spacer
                                        )}

                                        <div className="flex-1 text-sm font-medium text-slate-700">
                                            {index + 1}. {stage}
                                        </div>
                                        {/* Prevent removing critical stages if needed, or allow full flexibility */}
                                        {stage !== 'Applied' && stage !== 'Finalized' && (
                                            <button
                                                onClick={() => handleStageRemove(index)}
                                                className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                    placeholder="New Stage Name (e.g. Logic Test)"
                                    className="flex-1 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleStageAdd()}
                                />
                                <button
                                    onClick={handleStageAdd}
                                    className="bg-blue-100 text-blue-600 p-2 rounded hover:bg-blue-200 transition"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setShowWorkflowEditModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveWorkflowChanges}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md text-sm font-medium disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* End of Workflow Edit Modal */}
            {/* Candidate Details & Resume Modal */}
            {
                showCandidateModal && selectedApplicant && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
                        <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        {selectedApplicant.name}
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(selectedApplicant.status)}`}>
                                            {selectedApplicant.status}
                                        </span>
                                    </h2>
                                    <p className="text-sm text-slate-500">Applied for <span className="font-medium text-slate-700">{selectedApplicant.requirementId?.jobTitle}</span></p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            const resumeLink = selectedApplicant.resumeFileUrl || (selectedApplicant.resume && typeof selectedApplicant.resume === 'object' ? selectedApplicant.resume.url : selectedApplicant.resume);
                                            downloadResume(resumeLink);
                                        }}
                                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
                                    >
                                        <Download size={16} /> Download Resume
                                    </button>
                                    <button
                                        onClick={() => setShowCandidateModal(false)}
                                        className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                {/* Sidebar: Candidate Details */}
                                <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6">
                                    <section>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Personal Information</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 text-slate-400"><FileText size={16} /></div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Father's Name</p>
                                                    <p className="text-sm font-medium text-slate-800">{selectedApplicant.fatherName || '-'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 text-slate-400">@</div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Email Address</p>
                                                    <p className="text-sm font-medium text-slate-800 break-all">{selectedApplicant.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 text-slate-400">#</div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Phone / Mobile</p>
                                                    <p className="text-sm font-medium text-slate-800">{selectedApplicant.mobile || selectedApplicant.phone || '-'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 text-slate-400">📅</div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Date of Birth</p>
                                                    <p className="text-sm font-medium text-slate-800">
                                                        {selectedApplicant.dob ? dayjs(selectedApplicant.dob).format('DD MMM YYYY') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 text-slate-400">📍</div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Address</p>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{selectedApplicant.address || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="border-t border-slate-100 my-2"></div>

                                    <section>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Professional Details</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-slate-500">Experience</p>
                                                    <p className="text-sm font-medium text-slate-800">{selectedApplicant.experience || '0'} Years</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Notice Period</p>
                                                    <p className="text-sm font-medium text-slate-800">{selectedApplicant.noticePeriod ? 'Yes' : 'No'}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-slate-500">Current Company</p>
                                                <p className="text-sm font-medium text-slate-800">{selectedApplicant.currentCompany || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Designation</p>
                                                <p className="text-sm font-medium text-slate-800">{selectedApplicant.currentDesignation || '-'}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-slate-500">Current CTC</p>
                                                    <p className="text-sm font-medium text-slate-800">{selectedApplicant.currentCTC || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Expected CTC</p>
                                                    <p className="text-sm font-medium text-emerald-600">{selectedApplicant.expectedCTC || '-'}</p>
                                                </div>
                                            </div>

                                            {selectedApplicant.linkedin && (
                                                <div>
                                                    <p className="text-xs text-slate-500 mb-1">LinkedIn Profile</p>
                                                    <a href={selectedApplicant.linkedin} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                                                        {selectedApplicant.linkedin}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {selectedApplicant.intro && (
                                        <>
                                            <div className="border-t border-slate-100 my-2"></div>
                                            <section>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Introduction / Notes</h3>
                                                <p className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-3 rounded">
                                                    "{selectedApplicant.intro}"
                                                </p>
                                            </section>
                                        </>
                                    )}

                                    {/* AI Insights Section */}
                                    {selectedApplicant.aiParsedData && (
                                        <>
                                            <div className="border-t border-slate-100 my-2"></div>
                                            <section>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    <span className="text-purple-600">✨</span> AI Insights
                                                </h3>
                                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-purple-700">Match Score</span>
                                                        <span className="text-sm font-black text-purple-600">{selectedApplicant.matchPercentage}%</span>
                                                    </div>
                                                    {/* Skills */}
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {selectedApplicant.parsedSkills?.map((skill, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-white text-purple-600 text-[10px] font-bold rounded border border-purple-100">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {/* Summary */}
                                                    {selectedApplicant.aiParsedData.experienceSummary && (
                                                        <p className="text-xs text-purple-800 leading-relaxed">
                                                            {selectedApplicant.aiParsedData.experienceSummary}
                                                        </p>
                                                    )}
                                                </div>
                                            </section>
                                        </>
                                    )}

                                </div>

                                {/* Main Area: Resume Preview */}
                                <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
                                    {resumePreviewUrl ? (
                                        <iframe
                                            src={resumePreviewUrl}
                                            className="w-full h-full rounded-lg shadow-input bg-white"
                                            title="Resume Preview"
                                        />
                                    ) : (selectedApplicant.resume || selectedApplicant.resumeFileUrl) ? (
                                        <div className="text-center p-8 bg-white rounded-xl shadow-sm max-w-md">
                                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                                            <p className="text-lg font-medium text-slate-800 mb-2">Preview not available</p>
                                            <p className="text-slate-500 mb-6">This file type cannot be previewed directly in the browser or is still loading.</p>
                                            <button
                                                onClick={() => downloadResume(selectedApplicant.resume || selectedApplicant.resumeFileUrl)}
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                                            >
                                                <Download size={18} /> Download File
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <p className="font-bold uppercase tracking-widest text-[10px]">No resume uploaded</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Premium Candidate Evaluation Drawer */}
            {
                showEvaluationDrawer && selectedApplicant && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setShowEvaluationDrawer(false)}
                        />

                        {/* Drawer Content */}
                        <div className="relative w-full max-w-2xl bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                <div>
                                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Candidate Evaluation</h1>
                                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest flex items-center gap-2">
                                        <span className="text-blue-600 font-black">{selectedApplicant.name}</span>
                                        <span className="opacity-20 italic">|</span>
                                        <span>{selectedApplicant.requirementId?.jobTitle}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEvaluationDrawer(false);
                                        setIsFinishingInterview(false);
                                    }}
                                    className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Middle Area (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">

                                {/* Round Navigation Tabs */}
                                <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
                                    {evaluationData.rounds.map((round, idx) => (
                                        <button
                                            key={round.id}
                                            onClick={() => setEvalActiveRound(idx)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all
                                            ${evalActiveRound === idx
                                                    ? 'bg-white text-blue-600 shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {round.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Active Evaluation Criteria */}
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">0{evalActiveRound + 1}</span>
                                        {evaluationData.rounds[evalActiveRound].name}
                                    </h3>

                                    {evaluationData.rounds[evalActiveRound].categories.map((cat, catIdx) => (
                                        <div key={catIdx} className="space-y-4">
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{cat.name}</h4>
                                            <div className="space-y-2">
                                                {cat.skills.map((skill, skillIdx) => (
                                                    <div key={skillIdx} className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                                                        <div className="col-span-12 md:col-span-5">
                                                            <p className="text-xs font-black text-slate-700">{skill.name}</p>
                                                        </div>
                                                        <div className="col-span-12 md:col-span-3 flex gap-2">
                                                            {[1, 2, 3, 4, 5].map(num => (
                                                                <button
                                                                    key={num}
                                                                    onClick={() => {
                                                                        const newData = { ...evaluationData };
                                                                        newData.rounds[evalActiveRound].categories[catIdx].skills[skillIdx].rating = num;
                                                                        setEvaluationData(newData);
                                                                        const allRatings = evaluationData.rounds.flatMap(r => r.categories.flatMap(c => c.skills.map(s => s.rating))).filter(r => r > 0);
                                                                        if (allRatings.length > 0) {
                                                                            const avg = Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length);
                                                                            setReviewRating(avg);
                                                                        }
                                                                    }}
                                                                    className={`w-8 h-8 rounded-full text-[11px] font-black transition-all flex items-center justify-center
                                                                    ${skill.rating === num
                                                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                                                                            : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-400 font-bold'}`}
                                                                >
                                                                    {num}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="col-span-12 md:col-span-4">
                                                            <input
                                                                type="text"
                                                                placeholder="Short Note..."
                                                                value={skill.comment}
                                                                onChange={(e) => {
                                                                    const newData = { ...evaluationData };
                                                                    newData.rounds[evalActiveRound].categories[catIdx].skills[skillIdx].comment = e.target.value;
                                                                    setEvaluationData(newData);
                                                                    // Sync with main feedback
                                                                    setReviewFeedback(e.target.value);
                                                                }}
                                                                className="w-full text-[10px] p-2 bg-white border border-slate-100 rounded-lg outline-none focus:border-blue-500 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer - Bottom Action Bar */}
                            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-6 flex items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-1">Total Score</p>
                                        <div className="text-2xl font-black text-slate-800">
                                            {(evaluationData.rounds.flatMap(r => r.categories.flatMap(c => c.skills.map(s => s.rating))).filter(r => r > 0).reduce((a, b, _, arr) => a + b / arr.length, 0) || 0).toFixed(2)}
                                            <span className="text-xs text-slate-300"> / 5</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-10 bg-slate-100"></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-1">Decision</p>
                                        <Select
                                            className="w-40 premium-select"
                                            placeholder="Pick Step"
                                            value={selectedStatusForReview || null}
                                            variant="borderless"
                                            style={{ background: '#f8fafc', borderRadius: '12px', padding: '0 8px', border: '1px solid #f1f5f9' }}
                                            onChange={(val) => setSelectedStatusForReview(val)}
                                        >
                                            <Select.OptGroup label="Hiring Pipeline">
                                                {workflowTabs.filter(t => !['Applied', 'Finalized'].includes(t)).map(tab => (
                                                    <Select.Option key={tab} value={tab}>{tab}</Select.Option>
                                                ))}
                                            </Select.OptGroup>
                                            <Select.OptGroup label="Final Result">
                                                <Select.Option value="Selected" className="text-emerald-600 font-bold">Selected / Hire</Select.Option>
                                                <Select.Option value="Rejected" className="text-red-500 font-bold">Reject</Select.Option>
                                            </Select.OptGroup>
                                        </Select>
                                    </div>
                                </div>

                                <button
                                    onClick={submitReviewAndStatus}
                                    disabled={loading || !selectedStatusForReview}
                                    className="px-8 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    {loading ? 'Processing...' : 'Complete Evaluation'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Document Upload Modal */}
            {
                showDocumentModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Upload Documents</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {documentApplicant?.name} - {documentApplicant?.requirementId?.title}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDocumentModal(false)}
                                    className="p-2 hover:bg-white rounded-lg transition-colors"
                                >
                                    <XCircle size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Add New Document */}
                                <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Add New Document</h4>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Document Name *</label>
                                        <input
                                            type="text"
                                            value={documentName}
                                            onChange={(e) => setDocumentName(e.target.value)}
                                            placeholder="e.g., Aadhar Card, PAN Card, Degree Certificate"
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Select File * (PDF, JPG, PNG - Max 5MB)</label>
                                        <input
                                            id="documentFileInput"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleDocumentFileChange}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        {documentFile && (
                                            <p className="mt-2 text-xs text-slate-500">
                                                Selected: {documentFile.name} ({(documentFile.size / 1024).toFixed(1)} KB)
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={addDocumentToList}
                                        className="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        + Add to List
                                    </button>
                                </div>

                                {/* Uploaded Documents List */}
                                {uploadedDocuments.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                                            Documents to Upload ({uploadedDocuments.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {uploadedDocuments.map((doc, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-slate-800">{doc.name}</div>
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            {doc.fileName} • {(doc.fileSize / 1024).toFixed(1)} KB
                                                            {doc.verified && <span className="ml-2 text-emerald-600">✓ Verified</span>}
                                                        </div>
                                                    </div>
                                                    {!doc.verified && (
                                                        <button
                                                            onClick={() => removeDocumentFromList(idx)}
                                                            className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                                <button
                                    onClick={() => setShowDocumentModal(false)}
                                    className="flex-1 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveDocuments}
                                    disabled={uploadedDocuments.length === 0}
                                    className={`flex-1 py-2 font-bold rounded-lg transition-colors ${uploadedDocuments.length > 0
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Save Documents ({uploadedDocuments.length})
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* FINALIZE CANDIDATE CONFIRMATION MODAL */}
            {
                finalizeModalVisible && candidateToFinalize && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-300 border border-slate-100">
                            <div className="p-8 text-center text-slate-900">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                                    <ShieldCheck size={40} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-2xl font-black mb-2">Finalize Candidate?</h2>
                                <p className="text-slate-500 font-medium">
                                    Are you sure you want to finalize <span className="text-slate-900 font-bold">{candidateToFinalize.name}</span>?
                                    They will move to the terminal recruitment stage and you can begin generating their documents.
                                </p>
                            </div>

                            <div className="px-8 pb-8 flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        setStatusUpdating(true);
                                        const success = await updateStatus(candidateToFinalize, 'Finalized');
                                        if (success) {
                                            setFinalizeModalVisible(false);
                                            setCandidateToFinalize(null);
                                        }
                                        setStatusUpdating(false);
                                    }}
                                    disabled={statusUpdating}
                                    className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    {statusUpdating ? (
                                        <RefreshCw className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            <span>FINALIZE CANDIDATE</span>
                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setFinalizeModalVisible(false)}
                                    disabled={statusUpdating}
                                    className="w-full py-4 bg-slate-50 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    Not Now, Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Rule 5: Add Interview Round Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-slate-800 font-black">
                        <PlusCircle className="text-blue-600" size={20} />
                        <span>ADD INTERVIEW ROUND</span>
                    </div>
                }
                open={addRoundModalVisible}
                onCancel={() => {
                    setAddRoundModalVisible(false);
                    setNewRoundName('');
                }}
                footer={null}
                centered
                width={400}
                className="premium-modal"
            >
                <div className="space-y-4 py-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                        <Info className="text-blue-500 shrink-0" size={20} />
                        <p className="text-xs text-blue-700 font-medium leading-relaxed">
                            This will add a new interview stage placeholder (e.g., "Technical Assessment") to the hiring workflow for this candidate.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Round Name</label>
                        <input
                            type="text"
                            value={newRoundName}
                            onChange={(e) => setNewRoundName(e.target.value)}
                            placeholder="e.g. Technical Round 2"
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setAddRoundModalVisible(false)}
                            className="flex-1 h-12 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (!newRoundName.trim()) return;
                                updateStatus(candidateForNewRound, `Round: ${newRoundName}`);
                                setAddRoundModalVisible(false);
                                setNewRoundName('');
                                notification.success({ message: 'Success', description: 'New round added to pipeline', placement: 'topRight' });
                            }}
                            disabled={!newRoundName.trim()}
                            className="flex-1 h-12 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            Add Round
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Custom Other Round Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-slate-800 font-black">
                        <PlusCircle className="text-amber-600" size={20} />
                        <span>ADD OTHER ROUND</span>
                    </div>
                }
                open={addCustomRoundModalVisible}
                onCancel={() => {
                    setAddCustomRoundModalVisible(false);
                    setCustomRoundName('');
                    setCustomRoundDescription('');
                    setCustomRoundType('Game');
                    setGameRoundConfig({ gameName: '', duration: 30, difficulty: 'Medium', gameType: 'Coding' });
                }}
                footer={null}
                centered
                width={500}
                className="premium-modal"
            >
                <div className="space-y-5 py-4">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                        <Info className="text-amber-500 shrink-0" size={20} />
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                            Add a custom round like Game-based Assessment, Coding Challenge, or Custom Task for this candidate before finalization.
                        </p>
                    </div>

                    {/* Round Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Round Name</label>
                        <input
                            type="text"
                            value={customRoundName}
                            onChange={(e) => setCustomRoundName(e.target.value)}
                            placeholder="e.g. Game-Based Assessment"
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-slate-700"
                        />
                    </div>

                    {/* Round Type Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Round Type</label>
                        <select
                            value={customRoundType}
                            onChange={(e) => setCustomRoundType(e.target.value)}
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-slate-700"
                        >
                            <option value="Game">🎮 Game-Based Assessment</option>
                            <option value="Coding">💻 Coding Challenge</option>
                            <option value="Task">📋 Task/Project</option>
                            <option value="Assessment">✏️ Assessment</option>
                            <option value="Custom">⚙️ Custom Round</option>
                        </select>
                    </div>

                    {/* Round Description */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</label>
                        <textarea
                            value={customRoundDescription}
                            onChange={(e) => setCustomRoundDescription(e.target.value)}
                            placeholder="Brief description of this round..."
                            className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 resize-none"
                        />
                    </div>

                    {/* Game Round Config (if Game type selected) */}
                    {customRoundType === 'Game' && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 space-y-3">
                            <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                                <span className="text-blue-600">🎮</span> Game Configuration
                            </h4>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Game Name</label>
                                <input
                                    type="text"
                                    value={gameRoundConfig.gameName}
                                    onChange={(e) => setGameRoundConfig({ ...gameRoundConfig, gameName: e.target.value })}
                                    placeholder="e.g. Logic Puzzle Pro"
                                    className="w-full h-10 px-3 bg-white border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Duration (mins)</label>
                                    <input
                                        type="number"
                                        value={gameRoundConfig.duration}
                                        onChange={(e) => setGameRoundConfig({ ...gameRoundConfig, duration: parseInt(e.target.value) || 30 })}
                                        min="5"
                                        max="180"
                                        className="w-full h-10 px-3 bg-white border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Difficulty</label>
                                    <select
                                        value={gameRoundConfig.difficulty}
                                        onChange={(e) => setGameRoundConfig({ ...gameRoundConfig, difficulty: e.target.value })}
                                        className="w-full h-10 px-3 bg-white border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                        <option value="Expert">Expert</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Game Type</label>
                                <select
                                    value={gameRoundConfig.gameType}
                                    onChange={(e) => setGameRoundConfig({ ...gameRoundConfig, gameType: e.target.value })}
                                    className="w-full h-10 px-3 bg-white border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                >
                                    <option value="Coding">Coding</option>
                                    <option value="Puzzle">Puzzle</option>
                                    <option value="Logic">Logic</option>
                                    <option value="Strategy">Strategy</option>
                                    <option value="Trivia">Trivia</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => {
                                setAddCustomRoundModalVisible(false);
                                setCustomRoundName('');
                                setCustomRoundDescription('');
                                setCustomRoundType('Game');
                                setGameRoundConfig({ gameName: '', duration: 30, difficulty: 'Medium', gameType: 'Coding' });
                            }}
                            className="flex-1 h-12 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (!customRoundName.trim()) {
                                    notification.error({ message: 'Error', description: 'Please enter round name', placement: 'topRight' });
                                    return;
                                }

                                const roundDetails = customRoundType === 'Game'
                                    ? `${customRoundName} (Game: ${gameRoundConfig.gameName || 'TBD'}, ${gameRoundConfig.duration}min, ${gameRoundConfig.difficulty})`
                                    : `${customRoundName} (${customRoundType})`;

                                updateStatus(candidateForNewRound, roundDetails);
                                setAddCustomRoundModalVisible(false);
                                setCustomRoundName('');
                                setCustomRoundDescription('');
                                setCustomRoundType('Game');
                                setGameRoundConfig({ gameName: '', duration: 30, difficulty: 'Medium', gameType: 'Coding' });
                                notification.success({ message: 'Success', description: `${customRoundType} round added to pipeline`, placement: 'topRight' });
                            }}
                            disabled={!customRoundName.trim()}
                            className="flex-1 h-12 bg-amber-600 text-white font-black rounded-xl shadow-lg shadow-amber-100 hover:bg-amber-700 transition-all disabled:opacity-50"
                        >
                            Add {customRoundType} Round
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Resume Preview Modal */}
            <Modal
                title="Resume Preview"
                open={isResumeModalOpen}
                onCancel={() => {
                    setIsResumeModalOpen(false);
                    setResumeUrl(null);
                }}
                footer={null}
                width={1000}
                centered
                styles={{ body: { height: '80vh', padding: 0 } }}
            >
                {resumeUrl && (
                    <iframe
                        src={resumeUrl}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Resume PDF"
                    />
                )}
            </Modal>

            {/* BGV Initiation Modal (Package-Driven) */}
            {showBGVModal && bgvCandidate && (
                <JobBasedBGVModal
                    applicant={bgvCandidate}
                    jobTitle={bgvCandidate.requirementId?.jobTitle || 'N/A'}
                    onClose={() => {
                        setShowBGVModal(false);
                        setBgvCandidate(null);
                    }}
                    onSuccess={handleBGVSuccess}
                />
            )}
        </div >
    );
}

