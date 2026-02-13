
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api, { API_ROOT } from '../../utils/api'; // Centralized axios instance with auth & tenant headers
import { normalizeStatus } from './PipelineStatusManager';
import { useAuth } from '../../context/AuthContext';
import OfferLetterPreview from '../../components/OfferLetterPreview';
import AssignSalaryModal from '../../components/AssignSalaryModal';
import { DatePicker, Pagination, Select, Modal, TimePicker, notification, Dropdown, Menu } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications'; // Imports fixed
import dayjs from 'dayjs';
import { Eye, Download, Edit2, RefreshCw, Upload, FileText, Settings, Plus, Trash2, X, GripVertical, Star, Clock, Lock, ChevronRight, ChevronDown, RotateCcw, UserX, PlusCircle, UserPlus, Info, Search, Calendar, Shield, ArrowRight } from 'lucide-react';
import DynamicPipelineEngine from './DynamicPipelineEngine';
import InterviewScheduleModal from './modals/InterviewScheduleModal';
import JobBasedBGVModal from './modals/JobBasedBGVModal';

// --- Helper Components ---

const OfferCountdown = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = React.useState('');
    const [isExpired, setIsExpired] = React.useState(false);

    React.useEffect(() => {
        const calculateTime = () => {
            if (!expiryDate) return;
            const now = dayjs();
            const expiry = dayjs(expiryDate);
            const diffMs = expiry.diff(now);

            if (diffMs <= 0) {
                setIsExpired(true);
                setTimeLeft('Expired');
                return;
            }

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            timeString += `${hours}h ${minutes}m`;

            setTimeLeft(timeString);
        };

        calculateTime();
        const timer = setInterval(calculateTime, 60000); // 1 min tick
        return () => clearInterval(timer);
    }, [expiryDate]);

    if (isExpired) return null; // Logic handled by parent status check, or show generic expired here
    return <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap border border-amber-100">⏳ Expires in: {timeLeft}</span>;
};

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


    // Tab State: Dynamic based on Requirement Workflow
    // Start with default tabs for 'all' view
    const [activeTab, setActiveTab] = useState('Applied');
    const [workflowTabs, setWorkflowTabs] = useState(['Applied', 'Shortlisted', 'Interview', 'HR Round', 'Finalized', 'Rejected']);

    // Custom Rounds State - Load from localStorage or use defaults
    const [customRounds] = useState(() => {
        const saved = localStorage.getItem('hrms_custom_rounds');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
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
    const [candidateForNewRound] = useState(null);

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
    }, [applicants, location.state, navigate]);

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
                !['Selected', 'Rejected', 'Finalized', 'Offer Generated', 'Salary Assigned', 'Offer Issued', 'Offer Accepted', 'Hired', 'Joining Letter Issued', 'Offer Expired', 'Interview Scheduled', 'Interview Rescheduled', 'Interview Completed', 'New Round'].includes(s)
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
    }, [selectedReqId, selectedRequirement, applicants, activeTab]);

    // Custom Stage State
    const [isCustomStageModalVisible, setIsCustomStageModalVisible] = useState(false);
    const [customStageName, setCustomStageName] = useState('');
    const [candidateForCustomStage, setCandidateForCustomStage] = useState(null);



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



    const renderHiringDropdown = (app) => {
        if (app.status === 'Finalized') return (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full w-full justify-center">
                <span className="text-blue-600">✅</span>
                <span className="text-[10px] font-black text-blue-700 tracking-widest uppercase">Selected</span>
                <CheckCircle size={14} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-700 tracking-widest uppercase">Finalized</span>
            </div>
        );

        if (app.status === 'Joining Letter Issued') return (
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-full w-full justify-center">
                <CheckCircle size={14} className="text-purple-600" />
                <span className="text-[10px] font-black text-purple-700 tracking-widest uppercase">Joining Letter Issued</span>
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
                        <span className="text-sm">✅</span>
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
                icon: <span className="text-blue-500 text-sm">✅</span>,
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
                icon: <span className="text-emerald-500 text-sm">✅</span>,
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
            return ['Finalized', 'Selected', 'Joining Letter Issued', 'Offer Issued', 'Offer Accepted', 'Hired', 'Offer Expired'].includes(applicantStatus);
        }

        // Candidates who are Finalized or Selected have passed all steps
        if (['Finalized', 'Selected', 'Joining Letter Issued', 'Offer Issued', 'Offer Accepted', 'Hired'].includes(applicantStatus)) {
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

    const getBaseFilteredApplicants = () => {
        let filtered = applicants;

        // 1. Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                (a.name || '').toLowerCase().includes(query) ||
                (a.email || '').toLowerCase().includes(query) ||
                (a.mobile && a.mobile.includes(query))
            );
        }

        // 2. Filter by Requirement ID
        if (selectedReqId !== 'all') {
            filtered = filtered.filter(a => a.requirementId?._id === selectedReqId || a.requirementId === selectedReqId);
        }

        // 3. Filter by Internal Mode vs External Mode
        if (internalMode) {
            filtered = filtered.filter(a => a.source === 'Internal' || a.requirementId?.visibility === 'Internal');
        } else {
            filtered = filtered.filter(a => a.source !== 'Internal' && a.requirementId?.visibility !== 'Internal');
        }

        // 4. Filter by Time Range
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

        return filtered;
    };

    const getFilteredApplicants = () => {
        const baseFiltered = getBaseFilteredApplicants();

        // 5. Filter by Active Tab (Stage)
        if (selectedReqId === 'all') {
            // Global Pipeline: Show all active in 'Applied', and only terminal in 'Finalized'
            if (activeTab === 'Finalized') return baseFiltered.filter(a => a?.status === 'Finalized' || a?.status === 'Selected');
            if (activeTab === 'Rejected') return baseFiltered.filter(a => a?.status === 'Rejected');
            // 'Applied' is the default bucket for everything else in Global View
            return baseFiltered.filter(a => a?.status !== 'Finalized' && a?.status !== 'Selected' && a?.status !== 'Rejected');
            if (activeTab === 'Finalized') return filtered.filter(a => ['Finalized', 'Joining Letter Issued', 'Offer Issued', 'Offer Accepted', 'Offer Expired'].includes(a?.status));
            if (activeTab === 'Rejected') return filtered.filter(a => a?.status === 'Rejected');
            return filtered.filter(a => a?.status !== 'Finalized' && a?.status !== 'Rejected');
        }

        // Specific Job Workflow: CUMULATIVE LOGIC (Show all who reached this stage)
        return baseFiltered.filter(a => {
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


    // Document Upload State
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentApplicant, setDocumentApplicant] = useState(null);
    const [documentName, setDocumentName] = useState('');
    const [documentFile, setDocumentFile] = useState(null);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);

    // Review Modal State
    const [showEvaluationDrawer, setShowEvaluationDrawer] = useState(false);


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
    const pageSize = 40;
    const [templates, setTemplates] = useState([]);
    const [companyInfo] = useState({
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

    const handleBGVSuccess = () => {
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
    const refreshData = React.useCallback(async () => {
        setLoading(true);
        await Promise.all([
            loadApplicants(),
            fetchTemplates()
        ]);
        setLoading(false);
    }, []);

    useEffect(() => {
        // Load data on mount if user is authenticated
        // We check if user exists (context) OR if we have a token in local storage to avoid waiting for context if unnecessary
        const token = localStorage.getItem('token');
        if (user || token) {
            refreshData();
        }
    }, [user, refreshData]); // Keep user as dependency to re-run if auth state changes



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
            case 'Offer Issued': return 'bg-purple-100 text-purple-800';
            case 'Offer Accepted': return 'bg-teal-100 text-teal-800';
            case 'Joining Letter Issued': return 'bg-cyan-100 text-cyan-800';
            case 'Hired': return 'bg-emerald-600 text-white';
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
            case 'Offer Issued': return 'bg-purple-50/50 text-purple-600 border-purple-100';
            case 'Offer Accepted': return 'bg-teal-50/50 text-teal-600 border-teal-100';
            case 'Joining Letter Issued': return 'bg-cyan-50/50 text-cyan-600 border-cyan-100';
            case 'Hired': return 'bg-emerald-600 text-white border-emerald-700';
            case 'Rejected': return 'bg-red-50/50 text-red-600 border-red-100';
            default: return 'bg-slate-50/50 text-slate-600 border-slate-100';
        }
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

                // Automatically initiate BGV and send request to candidate
                handleInitiateBGV(selectedApplicant);
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

    const handleViewResume = (resumePath) => {
        if (!resumePath) {
            notification.error({ message: 'Error', description: 'No resume available' });
            return;
        }

        // Logic to construct URL
        let filename = resumePath;
        if (typeof resumePath === 'object' && resumePath.url) {
            filename = resumePath.url;
        }

        if (filename.includes('/') || filename.includes('\\')) {
            filename = filename.split(/[/\\]/).pop();
        }

        const url = `${API_ROOT}/hr/resume/${filename}`;
        setResumeUrl(url);
        setIsResumeModalOpen(true);
    };

    const handleDocumentFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setDocumentFile(e.target.files[0]);
        }
    };

    const addDocumentToList = () => {
        if (!documentName || !documentFile) {
            notification.error({ message: 'Error', description: 'Please provide document name and file' });
            return;
        }
        const newDoc = {
            name: documentName,
            file: documentFile,
            fileName: documentFile.name,
            fileSize: documentFile.size,
            verified: false
        };
        setUploadedDocuments(prev => [...prev, newDoc]);
        setDocumentFile(null);
        setDocumentName('');
        // Reset file input
        const fileInput = document.getElementById('documentFileInput');
        if (fileInput) fileInput.value = '';
    };

    const removeDocumentFromList = (index) => {
        setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const saveDocuments = async () => {
        if (uploadedDocuments.length === 0) return;

        try {
            const formData = new FormData();
            uploadedDocuments.forEach((doc) => {
                formData.append('documents', doc.file);
                formData.append('names', doc.name);
            });

            await api.post(`/requirements/applicants/${documentApplicant._id}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            notification.success({ message: 'Success', description: 'Documents uploaded successfully' });
            setShowDocumentModal(false);
            setUploadedDocuments([]);
            loadApplicants(); // Refresh
        } catch (err) {
            console.error('Failed to upload documents', err);
            notification.error({ message: 'Error', description: 'Failed to upload documents' });
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




    const handleOpenOfferModal = async (app) => {
        setSelectedApplicant(app);
        
        // Initialize with default values
        const firstName = app.name ? app.name.split(' ')[0] : '';
        setOfferData(prev => ({
            ...prev,
            name: app.name || '',
            dearName: firstName,
            address: app.address || '',
            salutation: app.gender === 'Female' ? 'Ms.' : 'Mr.',
            joiningDate: app.joiningDate ? dayjs(app.joiningDate).format('YYYY-MM-DD') : '',
            issueDate: dayjs().format('YYYY-MM-DD'),
            refNo: 'Fetching ID...'
        }));
        setShowModal(true);

        // Auto-fetch Reference Number
        try {
            const res = await api.post('/company-id-config/next', { entityType: 'OFFER', increment: false });
            if (res.data && res.data.data && res.data.data.id) {
                setOfferData(prev => ({ ...prev, refNo: res.data.data.id }));
            } else {
                setOfferData(prev => ({ ...prev, refNo: '' }));
            }
        } catch (error) {
            console.error("Failed to fetch next Offer ID", error);
            setOfferData(prev => ({ ...prev, refNo: '' }));
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



    const handleSalaryAssigned = () => {
        loadApplicants(); // Refresh list to show updated salary status
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

                // Open in new tab
                window.open(url, '_blank');

                notification.success({
                    message: "Success",
                    description: "Joining letter generated successfully.",
                    placement: 'topRight'
                });

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

    const handleReOffer = (applicant) => {
        if (!applicant) return;
        setSelectedApplicant(applicant);
        setOfferData(prev => ({
            ...prev,
            name: applicant.name,
            refNo: '', // Clear ref so new one generated or asked
        }));
        setShowModal(true);
    };

    const handleOnboard = (applicant) => {
        // --- FRONTEND VACANCY CHECK ---
        const requirementId = applicant.requirementId?._id || applicant.requirementId;
        const totalVacancies = applicant.totalVacancies || applicant.requirementId?.vacancy || 1;

        // Count how many are already onboarded for this SPECIFIC job
        const alreadyHiredCount = (applicants || []).filter(a =>
            (a.requirementId?._id === requirementId || a.requirementId === requirementId) &&
            a.isOnboarded
        ).length;

        const isFull = alreadyHiredCount >= totalVacancies;
        console.log(`[ONBOARDING_FRONTEND_CHECK] ${applicant.name}, Job: ${requirementId}, Total: ${totalVacancies}, Hired: ${alreadyHiredCount}, isFull: ${isFull}`);

        const performConversion = async (override = false) => {
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
                    overrideVacancy: override
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
        };

        const showOnboardConfirmation = (override = false) => {
            showConfirmToast({
                title: 'Confirm Onboarding',
                description: `Convert ${applicant.name} into an Employee? This will create a new employee profile.`,
                okText: 'Yes, Convert',
                cancelText: 'Cancel',
                onConfirm: () => performConversion(override)
            });
        };

        if (isFull) {
            showConfirmToast({
                title: 'Vacancy Limit Reached',
                description: `All ${totalVacancies} vacancies for '${applicant.requirementId?.jobTitle || "this job"}' are already filled. Do you want to cover this requirement?`,
                okText: 'Yes, Cover it',
                cancelText: 'Cancel',
                onConfirm: () => {
                    showOnboardConfirmation(true);
                }
            });
        } else {
            showOnboardConfirmation(false);
        }
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
                        if (!['Open', 'Closed'].includes(r.status)) return false;
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
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                                    {req.jobTitle}
                                                </h3>
                                                {req.status === 'Closed' && (
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-tighter rounded">Closed</span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                                                {req.department?.name || req.department || 'General'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Vacancies</p>
                                            <p className="text-sm font-black text-slate-900">
                                                {applicants.filter(a => (a.requirementId?._id === req._id || a.requirementId === req._id) && ['Selected', 'Hired', 'Finalized'].includes(a.status)).length}
                                                <span className="text-slate-400 text-xs"> / {req.vacancy || 0}</span>
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Experience</p>
                                            <p className="text-sm font-black text-slate-900 truncate">{req.minExperienceMonths || 0} - {req.maxExperienceMonths || 0} Y</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <p className="text-[10px] text-slate-600 line-clamp-2">
                                            📍 {req.location || 'Remote'} • {req.jobType || 'Full-time'}
                                        </p>
                                    </div>
                                </div>

                                <div className={`bg-gradient-to-r ${req.status === 'Closed' ? 'from-slate-400 to-slate-500' : 'from-blue-500 to-indigo-600'} px-6 py-3`}>
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
                                const baseFiltered = getBaseFilteredApplicants();
                                let count = baseFiltered.filter(a => {
                                    if (a.status === 'Rejected' && tab !== 'Rejected') return false;
                                    if (selectedReqId === 'all') {
                                        if (tab === 'Finalized') return (a.status === 'Finalized' || a.status === 'Selected');
                                        if (tab === 'Finalized') return ['Finalized', 'Selected', 'Joining Letter Issued', 'Offer Issued', 'Offer Accepted', 'Hired', 'Offer Expired'].includes(a.status);
                                        if (tab === 'Rejected') return (a.status === 'Rejected');
                                        return a.status !== 'Finalized' && a.status !== 'Selected' && a.status !== 'Rejected';
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
                                                            <h3
                                                                onClick={() => openCandidateModal(app)}
                                                                className="text-lg font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors cursor-pointer hover:underline"
                                                            >
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
                                                            <span className="w-5 flex justify-center text-slate-400">🔗</span>
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

                                                {/* Action Area - Only show in job-specific view or when not in Global Pipeline mode */}
                                                {!showAllCandidates && (
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
                                                                        <span className="text-sm">✅</span>
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
                                                )}
                                            </div>
                                        </div >
                                    ))}
                            </div >
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
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">BGV</th>
                                            {!showAllCandidates && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>}
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Joining</th>
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
                                                                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">✅ Locked</span>
                                                                {!showAllCandidates && (
                                                                    <button onClick={() => navigate(`/hr/salary-structure/${app._id}`)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-blue-100 transition-all" title="Edit Salary Structure">
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            !showAllCandidates ? (
                                                                <button onClick={() => navigate(`/hr/salary-structure/${app._id}`)} className="w-full py-2 sm:py-3 bg-white border border-slate-200 text-slate-600 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition shadow-sm uppercase tracking-widest whitespace-nowrap">ASSIGN SALARY</button>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending</span>
                                                            )
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {app.latestOffer ? (() => {
                                                            // Calculate Effective Status (Handle Client-Side Expiry)
                                                            const isTimeExpired = app.latestOffer.expiryDate && new Date(app.latestOffer.expiryDate) < new Date();
                                                            const effectiveStatus = (app.latestOffer.status === 'Sent' && isTimeExpired) ? 'Expired' : app.latestOffer.status;

                                                            return (
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div
                                                                        className="flex items-center gap-2 cursor-pointer group"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/hr/offers/${app.latestOffer._id}`);
                                                                        }}
                                                                        title="Click to manage full offer lifecycle"
                                                                    >
                                                                        {effectiveStatus === 'Accepted' && (
                                                                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide border border-emerald-200 group-hover:bg-emerald-200 transition">
                                                                                ACCEPTED
                                                                            </span>
                                                                        )}
                                                                        {effectiveStatus === 'Rejected' && (
                                                                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wide border border-rose-200 group-hover:bg-rose-200 transition">
                                                                                REJECTED
                                                                            </span>
                                                                        )}
                                                                        {(effectiveStatus === 'Sent' || effectiveStatus === 'ReOffered') && (
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wide border border-amber-200 w-fit group-hover:bg-amber-200 transition">
                                                                                    {effectiveStatus === 'ReOffered' ? 'Re-Offered' : 'Sent'}
                                                                                </span>
                                                                                {/* Timer */}
                                                                                <OfferCountdown expiryDate={app.latestOffer.expiryDate} />
                                                                            </div>
                                                                        )}
                                                                        {effectiveStatus === 'Expired' && (
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="px-2 py-0.5 rounded bg-slate-100 text-rose-500 text-[10px] font-black uppercase tracking-wide border border-slate-200 w-fit group-hover:bg-slate-200 transition">
                                                                                    EXPIRED
                                                                                </span>
                                                                                {app.latestOffer.expiryDate && (
                                                                                    <span className="text-[9px] text-slate-400 font-bold">
                                                                                        {dayjs(app.latestOffer.expiryDate).format('DD MMM, h:mm a')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Actions based on Status */}
                                                                    <div className="flex items-center gap-2">
                                                                        {/* View Button */}
                                                                        <button
                                                                            onClick={() => viewOfferLetter(app.offerLetterPath)}
                                                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                                                            title="View Letter"
                                                                        >
                                                                            <Eye size={14} />
                                                                        </button>

                                                                        {/* Re-Offer Logic */}
                                                                        {(effectiveStatus === 'Expired' || effectiveStatus === 'Rejected') && (
                                                                            <button
                                                                                onClick={() => handleReOffer(app)}
                                                                                className="px-3 py-1 bg-blue-600 text-white text-[9px] font-bold rounded-lg shadow-sm hover:bg-blue-700 transition"
                                                                            >
                                                                                Re-Offer
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                            : (
                                                                app.offerLetterPath ? (
                                                                    <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                                                                        <button onClick={() => viewOfferLetter(app.offerLetterPath)} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm hover:shadow-md" title="Preview"><Eye size={16} /></button>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-tighter">OFFER</span>
                                                                            <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase">ISSUED</span>
                                                                        </div>
                                                                        {!showAllCandidates && (
                                                                            <button onClick={() => handleOpenOfferModal(app)} className="ml-1 p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-white border border-transparent hover:border-orange-100 transition-all" title="Regenerate Offer">
                                                                                <Edit2 size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    !showAllCandidates ? (
                                                                        <button onClick={() => handleOpenOfferModal(app)} className="w-full py-2 sm:py-3 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 uppercase tracking-widest">GENERATE</button>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending</span>
                                                                    )
                                                                )
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
                                                                onClick={() => {
                                                                    if (app.bgvStatus && app.bgvStatus !== 'NOT_INITIATED') return navigate('/hr/bgv');
                                                                    if (['Offer Accepted', 'Joining Letter Issued', 'Hired'].includes(app.status)) handleInitiateBGV(app);
                                                                }}
                                                                disabled={(!app.bgvStatus || app.bgvStatus === 'NOT_INITIATED') && !['Offer Accepted', 'Joining Letter Issued', 'Hired'].includes(app.status)}
                                                                className={`text-[9px] font-bold flex items-center gap-1 ${(!app.bgvStatus || app.bgvStatus === 'NOT_INITIATED') && !['Offer Accepted', 'Joining Letter Issued', 'Hired'].includes(app.status)
                                                                    ? 'text-slate-300 cursor-not-allowed'
                                                                    : 'text-blue-600 hover:underline'
                                                                    }`}
                                                                title={(!app.bgvStatus || app.bgvStatus === 'NOT_INITIATED') && !['Offer Accepted', 'Joining Letter Issued', 'Hired'].includes(app.status) ? "Candidate must accept offer first" : ""}
                                                            >
                                                                {(!app.bgvStatus || app.bgvStatus === 'NOT_INITIATED') ? 'Initiate' : 'Manage'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {app.joiningLetterPath ? (
                                                            <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                                                                <button onClick={() => viewJoiningLetter(app._id)} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm hover:shadow-md" title="Preview"><Eye size={16} /></button>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-tighter">JOINING</span>
                                                                    <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase">ISSUED</span>
                                                                </div>
                                                                {!showAllCandidates && (
                                                                    <button onClick={() => openJoiningModal(app)} className="ml-1 p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-white border border-transparent hover:border-orange-100 transition-all" title="Regenerate Joining Letter">
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            !showAllCandidates ? (
                                                                (app?.latestOffer?.status === 'Accepted' || (!app.latestOffer && app.offerLetterPath)) ? (
                                                                    <button onClick={() => openJoiningModal(app)} className="w-full py-2 sm:py-3 bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 uppercase tracking-widest">GENERATE</button>
                                                                ) : (
                                                                    <button disabled className="w-full py-2 sm:py-3 bg-slate-200 text-slate-400 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl cursor-not-allowed uppercase tracking-widest flex flex-col items-center leading-tight">
                                                                        <span>GENERATE</span>
                                                                        <span className="text-[7px] font-bold opacity-70">AWAITING ACCEPTANCE</span>
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending</span>
                                                            )
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
                                                    {!showAllCandidates && (
                                                        <td className="px-6 py-4">
                                                            {app.isOnboarded ? (
                                                                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                                                                    <span className="text-indigo-600 text-sm">Onboarded</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOnboard(app)}
                                                                    className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition uppercase tracking-widest shadow-sm"
                                                                >
                                                                    Onboard
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
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
                        )
                        }
                    </div>
                </div>
            )}
            {showEvaluationDrawer && selectedApplicant && (
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
                                    <span className="text-slate-400 text-xl font-bold">✖</span>
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
                                                            {doc.verified && <span className="ml-2 text-emerald-600">✔ Verified</span>}
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
                                    <span className="text-4xl">✅</span>
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

            {/* GENERATE OFFER MODAL - REDESIGNED TO MATCH USER SCREENSHOT */}
            <Modal
                title={null}
                open={showModal}
                onCancel={() => setShowModal(false)}
                footer={null}
                centered
                width={500}
                className="premium-modal no-header-modal"
                styles={{ body: { padding: '24px' } }}
            >
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">Generate Offer Letter</h2>

                    {/* Candidate Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Candidate Name</label>
                        <input
                            type="text"
                            name="name"
                            value={offerData.name}
                            onChange={handleOfferChange}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                        />
                        <p className="text-[10px] text-slate-400">Role: {selectedApplicant?.requirementId?.jobTitle || 'N/A'}</p>
                    </div>

                    {/* Name for Dear section */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Name (For 'Dear ...' section)</label>
                        <input
                            type="text"
                            name="dearName"
                            value={offerData.dearName}
                            onChange={handleOfferChange}
                            placeholder="e.g. First Name only"
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                        />
                    </div>

                    {/* Date Format */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Date Format</label>
                        <select
                            name="dateFormat"
                            value={offerData.dateFormat}
                            onChange={handleOfferChange}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                        >
                            <option value="Do MMM. YYYY">17th Jan. 2026 (Default)</option>
                            <option value="DD-MM-YYYY">17-01-2026</option>
                            <option value="MMMM Do, YYYY">January 17th, 2026</option>
                            <option value="YYYY-MM-DD">2026-01-17</option>
                        </select>
                    </div>

                    {/* Title & Offer Template */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4 space-y-1">
                            <label className="text-xs font-medium text-slate-500">Title</label>
                            <select
                                name="salutation"
                                value={offerData.salutation}
                                onChange={handleOfferChange}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                            >
                                <option value="">--</option>
                                <option value="Mr.">Mr.</option>
                                <option value="Ms.">Ms.</option>
                                <option value="Mrs.">Mrs.</option>
                            </select>
                        </div>
                        <div className="col-span-8 space-y-1">
                            <label className="text-xs font-medium text-slate-500">Offer Template</label>
                            <select
                                name="templateId"
                                value={offerData.templateId}
                                onChange={handleOfferChange}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                            >
                                <option value="">-- Select Template --</option>
                                {templates.map(t => (
                                    <option key={t._id} value={t._id}>{t.templateName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Reference Number */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Reference Number</label>
                        <input
                            type="text"
                            name="refNo"
                            value={offerData.refNo}
                            onChange={handleOfferChange}
                            placeholder="e.g. OFFER/2025/001"
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                        />
                    </div>

                    {/* Joining Date & Letter Issue Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Joining Date *</label>
                            <input
                                type="date"
                                name="joiningDate"
                                value={offerData.joiningDate}
                                onChange={handleOfferChange}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Letter Issue Date</label>
                            <input
                                type="date"
                                name="issueDate"
                                value={offerData.issueDate}
                                onChange={handleOfferChange}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm"
                            />
                        </div>
                    </div>

                    {/* Candidate Address */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Candidate Address</label>
                        <textarea
                            name="address"
                            value={offerData.address}
                            onChange={handleOfferChange}
                            placeholder="Full address with pin code..."
                            rows={3}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm resize-none"
                        />
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-between items-center pt-6">
                        <button
                            onClick={() => setShowModal(false)}
                            className="px-6 py-2 text-slate-600 font-bold hover:text-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitOffer}
                            disabled={generating || !offerData.templateId || !offerData.joiningDate}
                            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center gap-2"
                        >
                            {generating ? (
                                <RefreshCw className="animate-spin" size={18} />
                            ) : (
                                <ArrowRight size={18} />
                            )}
                            GENERATE OFFER
                        </button>
                    </div>
                </div>
            </Modal>

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
            {
                showBGVModal && bgvCandidate && (
                    <JobBasedBGVModal
                        applicant={bgvCandidate}
                        jobTitle={bgvCandidate.requirementId?.jobTitle || 'N/A'}
                        onClose={() => {
                            setShowBGVModal(false);
                            setBgvCandidate(null);
                        }}
                        onSuccess={handleBGVSuccess}
                    />
                )
            }

            {/* Salary Assignment Modal */}
            <AssignSalaryModal
                isOpen={showSalaryModal}
                onClose={() => setShowSalaryModal(false)}
                applicant={selectedApplicant}
                onSuccess={() => {
                    loadApplicants();
                    setShowSalaryModal(false);
                }}
            />
        </div >
    );
}

