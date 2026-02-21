import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_ROOT } from '../../utils/api';
import { DatePicker, Pagination, Select } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import dayjs from 'dayjs';
import ApplyLeaveForm from '../../components/ApplyLeaveForm';
import EmployeeProfileView from '../../components/EmployeeProfileView';
import EmployeeExcelUploadModal from '../../components/HR/EmployeeExcelUploadModal';
import EmployeeForm from './EmployeeForm';
import { Calendar as CalendarIcon, User, Search, Filter, Plus, FileText, Edit2, Trash2, Eye, IndianRupee, LayoutGrid, LayoutList, MoreHorizontal, Upload, Users, Briefcase, Phone, Mail } from 'lucide-react';

const BACKEND_URL = API_ROOT || 'https://hrms.gitakshmi.com';

const DEPARTMENTS = ["HR", "Tech", "Accounts", "Admin"];

const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Antiguans", "Argentinean", "Armenian", "Australian", "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Barbudans", "Batswana", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian", "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech", "Danish", "Djibouti", "Dominican", "Dutch", "East Timorese", "Ecuadorean", "Egyptian", "Emirian", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", "Filipino", "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", "Guinea-Bissauan", "Guinean", "Guyanese", "Haitian", "Herzegovinian", "Honduran", "Hungarian", "I-Kiribati", "Icelander", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakhstani", "Kenyan", "Kittian and Nevisian", "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner", "Lithuanian", "Luxembourger", "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivan", "Malian", "Maltese", "Marshallese", "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan", "Monacan", "Mongolian", "Moroccan", "Mosotho", "Motswana", "Mozambican", "Namibian", "Nauruan", "Nepalese", "New Zealander", "Ni-Vanuatu", "Nicaraguan", "Nigerian", "Nigerien", "North Korean", "Northern Irish", "Norwegian", "Omani", "Pakistani", "Palauan", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish", "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Saint Lucian", "Salvadoran", "Samoan", "San Marinese", "Sao Tomean", "Saudi", "Scottish", "Senegalese", "Serbian", "Seychellois", "Sierra Leonean", "Singaporean", "Slovakian", "Slovenian", "Solomon Islander", "Somali", "South African", "South Korean", "Spanish", "Sri Lankan", "Sudanese", "Surinamer", "Swazi", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tongan", "Trinidadian or Tobagonian", "Tunisian", "Turkish", "Tuvaluan", "Ugandan", "Ukrainian", "Uruguayan", "Uzbekistani", "Venezuelan", "Vietnamese", "Welsh", "Yemenite", "Zambian", "Zimbabwean"
];

const EMPLOYEE_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contract', 'Consultant'];
const WORK_MODES = ['Work From Office (WFO)', 'Work From Home (WFH)', 'Hybrid', 'Field / Onsite'];

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openUploadPopup, setOpenUploadPopup] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [applyingLeave, setApplyingLeave] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignations, setSelectedDesignations] = useState([]);
  const [selectedEmployeeTypes, setSelectedEmployeeTypes] = useState([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableDesignations, setAvailableDesignations] = useState([]);
  const [showFilterDropdowns, setShowFilterDropdowns] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Joining Letter State
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [selectedEmpForJoining, setSelectedEmpForJoining] = useState(null);
  const [joiningTemplateId, setJoiningTemplateId] = useState('');
  const [joiningTemplates, setJoiningTemplates] = useState([]);
  const [generatingJoining, setGeneratingJoining] = useState(false);
  const [joiningPreviewUrl, setJoiningPreviewUrl] = useState(null);
  const [showJoiningPreview, setShowJoiningPreview] = useState(false);
  const [joiningRefNo, setJoiningRefNo] = useState('');
  const [joiningIssueDate, setJoiningIssueDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [viewMode, setViewMode] = useState('list');

  // Quick Stats for Dashboard Header
  const stats = useMemo(() => {
    const total = employees.length;
    // Assuming active if status is not explicitly 'Inactive' or 'Terminated' or based on your logic
    // If no status field, assume active. 
    const active = employees.length;
    const depts = new Set(employees.map(e => e.department).filter(Boolean)).size;
    // New joiners in last 30 days
    const newJoiners = employees.filter(e => {
      if (!e.joiningDate) return false;
      return dayjs(e.joiningDate).isAfter(dayjs().subtract(30, 'days'));
    }).length;
    return { total, active, depts, newJoiners };
  }, [employees]);

  async function loadDrafts() {
    try {
      const res = await api.get('/hr/employees?status=Draft');
      setDrafts(res.data?.data || res.data || []);
    } catch (err) { console.error('Failed to load drafts', err); }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment && selectedDepartment !== 'All Departments') {
        params.append('department', selectedDepartment);
      }
      if (selectedDesignations.length > 0) {
        params.append('designation', selectedDesignations.join(','));
      }
      if (selectedEmployeeTypes.length > 0) {
        params.append('type', selectedEmployeeTypes.join(','));
      }
      if (selectedWorkModes.length > 0) {
        params.append('workMode', selectedWorkModes.join(','));
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      console.log(`[EMPLOYEE_LIST] Fetching with params:`, params.toString());
      const res = await api.get(`/hr/employees?${params.toString()}`);
      const data = res.data?.data || res.data || [];
      setEmployees(data);
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to load employees');
    } finally { setLoading(false); }
  }, [selectedDepartment, selectedDesignations, selectedEmployeeTypes, selectedWorkModes, searchTerm]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      // Fetch Departments
      const deptRes = await api.get('/hr/departments');
      setAvailableDepartments(deptRes.data?.data || deptRes.data || []);

      // Fetch Designations (Distinct) - We'll use the existing list but extract unique designations
      // Or if there's a dedicated endpoint, use it. Assuming we need to extract from all employees for now
      // as a fallback if no dedicated metadata endpoint exists.
      const empRes = await api.get('/hr/employees');
      const allEmps = empRes.data?.data || empRes.data || [];
      const uniqueDesignations = [...new Set(allEmps.map(e => e.designation).filter(Boolean))];
      setAvailableDesignations(uniqueDesignations);
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  }, []);

  const clearFilters = () => {
    setSelectedDepartment('');
    setSelectedDesignations([]);
    setSelectedEmployeeTypes([]);
    setSelectedWorkModes([]);
    setSearchTerm('');
    setCurrentPage(1);
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchFilterOptions();
    async function fetchJoiningTemplates() {
      try {
        const res = await api.get('/letters/templates?type=joining');
        setJoiningTemplates(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        // Silently handle 403/404 - user may not have permission
        if (err.response?.status !== 403 && err.response?.status !== 404) {
          console.error("Failed to load joining templates", err);
        }
        setJoiningTemplates([]); // Always set to valid array
      }
    }
    fetchJoiningTemplates();
  }, [fetchFilterOptions]);

  // Helper to derive a readable display name from various possible fields
  function getDisplayName(emp) {
    if (!emp) return '';
    const parts = [];
    if (emp.firstName) parts.push(emp.firstName);
    if (emp.middleName) parts.push(emp.middleName.charAt(0).toUpperCase() + '.');
    if (emp.lastName) parts.push(emp.lastName);
    if (parts.length) return parts.join(' ');
    if (emp.name) return emp.name;
    if (emp.fullName) return emp.fullName;
    if (emp.displayName) return emp.displayName;
    // fallback to email or id
    return emp.email || emp.employeeId || '';
  }

  function openNew() { setEditing(null); setViewing(null); setOpenForm(true); }
  function openEdit(e) { setEditing(e); setViewing(null); setOpenForm(true); }
  function openView(e) { setEditing(e); setViewing(true); setOpenForm(true); }
  function openUpload() { setOpenUploadPopup(true); }

  function remove(id) {
    showConfirmToast({
      title: 'Confirm Deletion',
      description: 'Are you sure you want to delete this employee? This action cannot be undone.',
      okText: 'OK',
      cancelText: 'Cancel',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/hr/employees/${id}`);
          load();
          showToast('success', 'Success', 'Employee deleted successfully');
        } catch (err) {
          console.error(err);
          showToast('error', 'Error', 'Delete failed');
        }
      }
    });
  }

  const openJoiningModal = (emp) => {
    setSelectedEmpForJoining(emp);
    setJoiningTemplateId('');
    setJoiningRefNo('');
    setJoiningIssueDate(dayjs().format('YYYY-MM-DD'));
    setShowJoiningModal(true);
    setJoiningPreviewUrl(null);
    setShowJoiningPreview(false);
  };

  const handleJoiningPreview = async () => {
    if (!joiningTemplateId) { alert('Please select a Joining Letter Template'); return; }
    setGeneratingJoining(true);
    try {
      const res = await api.post('/letters/preview-joining', {
        employeeId: selectedEmpForJoining._id,
        templateId: joiningTemplateId,
        refNo: joiningRefNo,
        issueDate: joiningIssueDate
      });
      if (res.data.previewUrl) {
        const url = `${BACKEND_URL}${res.data.previewUrl}`;
        setJoiningPreviewUrl(url);
        setShowJoiningPreview(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to preview joining letter: ' + (err.response?.data?.message || err.message));
    } finally { setGeneratingJoining(false); }
  };

  const handleJoiningGenerate = async () => {
    if (!joiningTemplateId) { alert('Please select a Joining Letter Template'); return; }
    setGeneratingJoining(true);
    try {
      const res = await api.post('/letters/generate-joining', {
        employeeId: selectedEmpForJoining._id,
        templateId: joiningTemplateId,
        refNo: joiningRefNo,
        issueDate: joiningIssueDate
      });
      if (res.data.downloadUrl) {
        const url = `${BACKEND_URL}${res.data.downloadUrl}`;
        window.open(url, '_blank');
        setShowJoiningModal(false);
        alert('Joining Letter generated successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate joining letter: ' + (err.response?.data?.message || err.message));
    } finally { setGeneratingJoining(false); }
  };


  if (openForm) {
    if (viewing) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 hidden-print">
            <button onClick={() => setOpenForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition" title="Back">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-slate-900">Employee Profile</h1>
          </div>
          <EmployeeProfileView employee={editing} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setOpenForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition" title="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-slate-900">{editing ? 'Edit Employee' : 'Add New Employee'}</h1>
        </div>
        <EmployeeForm
          employee={editing}
          viewOnly={false}
          onClose={() => { setOpenForm(false); load(); }}
        />
      </div>
    );
  }
  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Employee Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your organization's workforce, profiles, and roles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setShowDrafts(!showDrafts); if (!showDrafts) loadDrafts(); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${showDrafts ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <FileText size={16} />
            {showDrafts ? 'Hide Drafts' : 'Drafts'}
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <button onClick={openUpload} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
            <Upload size={16} />
            <span className="hidden sm:inline">Import Excel</span>
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
            <Plus size={18} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Stats Section - Premium Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: stats?.total || 0, icon: Users, color: 'text-[#14B8A6]', bg: 'bg-teal-50 dark:bg-teal-950/20' },
          { label: 'Currently Active', value: stats?.active || 0, icon: User, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'Departments', value: stats?.depts || 0, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
          { label: 'New Joiners', value: stats?.newJoiners || 0, icon: CalendarIcon, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all hover:border-[#14B8A6]/20 group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</div>
                <div className="text-3xl font-black text-slate-800 dark:text-white leading-none mt-1">{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drafts Section */}
      {showDrafts && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 shadow-sm p-4 mb-6 animate-in slide-in-from-top-2">
          <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
            Draft Applications
          </h3>
          {drafts.length === 0 ? (
            <div className="text-amber-700 text-sm">No drafts found.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map(d => (
                <div key={d._id} onClick={() => { setEditing(d); setViewing(null); setOpenForm(true); setShowDrafts(false); }} className="bg-white p-3 rounded border border-amber-200 cursor-pointer hover:shadow-md transition group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-blue-600">
                        {d.firstName ? `${d.firstName} ${d.lastName || ''}` : 'Untitled Draft'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {d.email || 'No email'} • Step {d.lastStep || 1}
                      </div>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Draft</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Bar - Modern Design */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search employees by name, ID or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowFilterDropdowns(!showFilterDropdowns)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${showFilterDropdowns ? 'bg-[#14B8A6] text-white border-[#14B8A6] shadow-lg shadow-teal-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#14B8A6]/30 shadow-sm'}`}
            >
              <Filter size={14} />
              <span>Filters</span>
              {(selectedDepartment || selectedDesignations.length > 0 || selectedEmployeeTypes.length > 0 || selectedWorkModes.length > 0) && (
                <div className="w-1.5 h-1.5 rounded-full bg-white ml-1 animate-pulse"></div>
              )}
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>

            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
              {[
                { mode: 'list', icon: LayoutList, title: 'List View' },
                { mode: 'grid', icon: LayoutGrid, title: 'Grid View' }
              ].map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => setViewMode(opt.mode)}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === opt.mode ? 'bg-white dark:bg-slate-800 text-[#14B8A6] shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
                  title={opt.title}
                >
                  <opt.icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilterDropdowns && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/50 animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Department</label>
              <Select
                placeholder="Department"
                value={selectedDepartment || undefined}
                onChange={setSelectedDepartment}
                className="w-full h-11 premium-select"
                allowClear
              >
                <Select.Option value="">All Departments</Select.Option>
                {availableDepartments.map(d => (
                  <Select.Option key={d._id} value={d.name}>{d.name}</Select.Option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Designation</label>
              <Select
                mode="multiple"
                placeholder="Designation"
                value={selectedDesignations}
                onChange={setSelectedDesignations}
                className="w-full premium-select"
                maxTagCount="responsive"
                allowClear
              >
                {availableDesignations.map(d => (
                  <Select.Option key={d} value={d}>{d}</Select.Option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Employee Type</label>
              <Select
                mode="multiple"
                placeholder="Type"
                value={selectedEmployeeTypes}
                onChange={setSelectedEmployeeTypes}
                className="w-full premium-select"
                maxTagCount="responsive"
                allowClear
              >
                {EMPLOYEE_TYPES.map(t => (
                  <Select.Option key={t} value={t}>{t}</Select.Option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Work Mode</label>
              <div className="flex gap-2">
                <Select
                  mode="multiple"
                  placeholder="Work Mode"
                  value={selectedWorkModes}
                  onChange={setSelectedWorkModes}
                  className="flex-1 premium-select"
                  maxTagCount="responsive"
                  allowClear
                >
                  {WORK_MODES.map(m => (
                    <Select.Option key={m} value={m}>{m}</Select.Option>
                  ))}
                </Select>

                <button
                  onClick={clearFilters}
                  className="w-11 h-11 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-2xl border border-rose-200/50 transition-colors shadow-sm"
                  title="Clear All"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Loading employees...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No employees yet. Add one to get started!</div>
      ) : (
        (() => {
          const paginatedEmployees = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

          return (
            <>
              {viewMode === 'list' ? (
                <div className="space-y-2 animate-in fade-in duration-500">
                  {/* Floating Header Labels - Aligned with the cards */}
                  <div className="hidden md:grid grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr_0.6fr] px-6 py-2 opacity-60">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      Member Information
                    </div>
                    <div className="text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-l border-slate-200 dark:border-slate-800 pl-4">Position</div>
                    <div className="text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-l border-slate-200 dark:border-slate-800 pl-4">Connection</div>
                    <div className="text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-l border-slate-200 dark:border-slate-800 pl-4">Department</div>
                    <div className="text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-l border-slate-200 dark:border-slate-800 pl-4">Manager</div>
                    <div className="text-right text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pr-4 border-l border-slate-200 dark:border-slate-800">Actions</div>
                  </div>

                  {/* Desktop Card List */}
                  <div className="hidden md:block space-y-2">
                    {paginatedEmployees.map(emp => (
                      <div key={emp._id} className="bg-white dark:bg-slate-900 grid grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr_0.6fr] items-center px-6 py-3 rounded-2xl border border-transparent dark:border-slate-800/40 shadow-sm hover:shadow-md hover:border-[#14B8A6]/20 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {emp.profilePic ? (
                              <img src={`${BACKEND_URL}${emp.profilePic}`} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-100 dark:border-slate-800 shadow-sm" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 text-[#14B8A6] flex items-center justify-center text-[12px] font-black border border-slate-200 dark:border-slate-800">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                              </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase truncate group-hover:text-[#14B8A6] transition-colors leading-none">{getDisplayName(emp)}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-70 truncate">{emp.employeeId || '-'}</span>
                          </div>
                        </div>

                        <div className="text-left flex flex-col items-start pl-4">
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-none truncate w-full">{emp.designation || '-'}</span>
                          <span className="text-[7px] font-black uppercase tracking-widest text-[#14B8A6] mt-1">
                            {emp.role || '-'}
                          </span>
                        </div>

                        <div className="text-left flex flex-col items-start gap-0.5 pl-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 truncate w-full">
                            <Mail size={10} className="text-[#14B8A6] shrink-0" /> {emp.email}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 truncate w-full">
                            <Phone size={10} className="text-teal-400 shrink-0" /> {emp.contactNo || emp.phone || '-'}
                          </div>
                        </div>

                        <div className="text-left pl-4">
                          <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-500">
                            {emp.department || '-'}
                          </span>
                        </div>

                        <div className="text-left pl-4">
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-none truncate w-full block">
                            {(() => {
                              if (!emp.manager) return '-';
                              if (typeof emp.manager === 'string') {
                                const m = employees.find(e => String(e._id) === String(emp.manager));
                                return m ? getDisplayName(m) : emp.manager;
                              }
                              return emp.manager.fullName || getDisplayName(emp.manager) || '-';
                            })()}
                          </span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-1 block">Lead Manager</span>
                        </div>

                        <div className="flex items-center justify-end gap-1 pl-4">
                          <button onClick={() => openView(emp)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 text-slate-400 hover:text-[#14B8A6] border border-transparent hover:border-[#14B8A6]/20 transition-all shadow-sm">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => navigate(`/hr/salary-structure/${emp._id}`)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 text-slate-400 hover:text-purple-500 border border-transparent hover:border-purple-200 transition-all shadow-sm">
                            <IndianRupee size={14} />
                          </button>

                          <div className="relative group/menu">
                            <button className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 text-slate-400 hover:text-slate-800 border border-transparent hover:border-slate-200 transition-all shadow-sm">
                              <MoreHorizontal size={14} />
                            </button>
                            <div className="absolute right-0 top-full pt-1 hidden group-hover/menu:block z-50">
                              <div className="w-40 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden py-1">
                                <button onClick={() => openEdit(emp)} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-950 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-600">
                                  <Edit2 size={10} className="text-blue-500" /> Edit
                                </button>
                                <button onClick={() => setApplyingLeave(emp)} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-950 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-600">
                                  <CalendarIcon size={10} className="text-emerald-500" /> Leave
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                                <button onClick={() => remove(emp._id)} className="w-full text-left px-4 py-2 hover:bg-rose-50 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-rose-500">
                                  <Trash2 size={10} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Mobile View - Premium Card format */}
                  <div className="md:hidden space-y-4">
                    {paginatedEmployees.map(emp => (
                      <div key={emp._id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {emp.profilePic ? (
                              <img src={`${BACKEND_URL}${emp.profilePic}`} alt="" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-50 text-[#14B8A6] flex items-center justify-center font-black text-base border border-slate-100">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none text-[13px]">{getDisplayName(emp)}</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{emp.designation || '-'}</p>
                            <span className="inline-block mt-2 px-1.5 py-0.5 bg-blue-50/50 text-blue-600 text-[7px] font-black uppercase tracking-widest rounded-md border border-blue-100">{emp.role}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-slate-50 dark:border-slate-800 text-[9px] font-bold text-slate-500">
                          <div className="flex items-center gap-1.5"><Briefcase size={10} className="text-[#14B8A6]" /> {emp.department || '-'}</div>
                          <div className="flex items-center gap-1.5"><Phone size={10} className="text-[#14B8A6]" /> {emp.contactNo || '-'}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openView(emp)} className="flex-1 h-8 rounded-lg bg-slate-50 dark:bg-slate-950 text-[9px] font-black uppercase tracking-widest text-[#14B8A6] border border-slate-200">View</button>
                          <button onClick={() => openEdit(emp)} className="flex-1 h-8 rounded-lg bg-[#14B8A6] text-white text-[9px] font-black uppercase tracking-widest shadow-md shadow-teal-500/10">Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Grid View - Optimized for multi-column density */
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 animate-in fade-in duration-500">
                  {paginatedEmployees.map(emp => (
                    <div key={emp._id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-lg hover:border-[#14B8A6]/20 transition-all duration-500 overflow-hidden group flex flex-col relative">
                      {/* Action Triggers */}
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative group/menu">
                          <button className="w-7 h-7 rounded-lg bg-white/95 dark:bg-slate-900 text-slate-400 hover:text-[#14B8A6] shadow-sm border border-slate-100 dark:border-slate-800">
                            <MoreHorizontal size={12} className="mx-auto" />
                          </button>
                          <div className="absolute right-0 top-full pt-1 hidden group-hover/menu:block z-50">
                            <div className="w-36 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden py-1">
                              <button onClick={() => openEdit(emp)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-[8px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-600">
                                <Edit2 size={10} className="text-blue-500" /> Edit
                              </button>
                              <button onClick={() => remove(emp._id)} className="w-full text-left px-4 py-2 hover:bg-rose-50 text-[8px] font-black uppercase tracking-widest flex items-center gap-2 text-rose-500">
                                <Trash2 size={10} /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pb-3 flex flex-col items-center text-center">
                        <div className="relative mb-2 shrink-0">
                          {emp.profilePic ? (
                            <img src={`${BACKEND_URL}${emp.profilePic}`} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-lg font-black text-[#14B8A6] border border-slate-200 dark:border-slate-800 group-hover:scale-105 transition-transform">
                              {emp.firstName?.[0]}
                            </div>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-white text-[11px] uppercase tracking-tight truncate w-full px-1 leading-none mb-1">{getDisplayName(emp)}</h3>
                        <p className="text-[7px] font-black text-[#14B8A6] uppercase tracking-[0.2em]">{emp.role || 'Member'}</p>
                      </div>

                      <div className="px-4 py-3 space-y-1.5 bg-slate-50/50 dark:bg-slate-955/20 border-t border-slate-100/50 dark:border-slate-800/50 flex-1">
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0">Dept</span>
                          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase truncate" title={emp.department}>{emp.department || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0">Designation</span>
                          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase truncate text-right shrink-0 max-w-[60px]" title={emp.designation}>{emp.designation || '-'}</span>
                        </div>
                      </div>

                      <div className="p-1.5 grid grid-cols-2 gap-1.5 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800/30">
                        <button onClick={() => openView(emp)} className="h-7 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-[#14B8A6] text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-200 dark:border-slate-800/50 shadow-sm" title="Profile">
                          <Eye size={12} />
                        </button>
                        <button onClick={() => navigate(`/hr/salary-structure/${emp._id}`)} className="h-7 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-emerald-500 text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-200 dark:border-slate-800/50 shadow-sm" title="Salary">
                          <IndianRupee size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="px-4 py-3 mt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={employees.length}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                  responsive={true}
                  size="small"
                  className="scale-90"
                />
              </div>
            </>
          );
        })()
      )}

      {
        applyingLeave && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
              <ApplyLeaveForm
                isHR={true}
                targetEmployeeId={applyingLeave._id}
                balances={[]}
                onSuccess={() => {
                  setApplyingLeave(null);
                  load();
                }}
                onCancelEdit={() => setApplyingLeave(null)}
                onClose={() => setApplyingLeave(null)}
              />
            </div>
          </div>
        )
      }

      {/* Joining Letter Modal */}
      {
        showJoiningModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-900">Joining Letter - {getDisplayName(selectedEmpForJoining)}</h2>
                <button onClick={() => setShowJoiningModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto no-scrollbar">
                {!showJoiningPreview ? (
                  <>
                    <p className="text-sm text-slate-600">Select a Joining Letter template to generate the document for this employee.</p>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Select Template</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={joiningTemplateId}
                        onChange={(e) => setJoiningTemplateId(e.target.value)}
                      >
                        <option value="">Choose a template...</option>
                        {joiningTemplates.map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                      {joiningTemplates.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                          No joining letter templates found. Please upload one in <b>Letter Templates</b> section first.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Reference Number</label>
                      <input
                        type="text"
                        value={joiningRefNo}
                        onChange={(e) => setJoiningRefNo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. JL/2025/001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Letter Issue Date</label>
                      <DatePicker
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        format="DD-MM-YYYY"
                        placeholder="DD-MM-YYYY"
                        value={joiningIssueDate ? dayjs(joiningIssueDate) : null}
                        onChange={(date) => setJoiningIssueDate(date ? date.format('YYYY-MM-DD') : '')}
                      />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-[500px] border border-slate-200 rounded-lg overflow-hidden bg-slate-100 flex flex-col">
                    {joiningPreviewUrl ? (
                      <iframe src={joiningPreviewUrl} title="Joining Letter Preview" className="w-full flex-1" />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 italic">Generating Preview...</div>
                    )}
                    <div className="p-3 bg-white border-t border-slate-200 flex justify-between gap-2">
                      <button
                        onClick={() => setShowJoiningPreview(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm font-medium"
                      >
                        Back to Selection
                      </button>
                      <button
                        onClick={handleJoiningGenerate}
                        disabled={generatingJoining}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 text-sm font-medium"
                      >
                        {generatingJoining ? 'Downloading...' : 'Download Final PDF'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!showJoiningPreview && (
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                  <button
                    onClick={() => setShowJoiningModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoiningPreview}
                    disabled={!joiningTemplateId || generatingJoining}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition shadow-md disabled:opacity-50 text-sm font-medium"
                  >
                    {generatingJoining ? 'Generating...' : 'Preview Letter'}
                  </button>
                  <button
                    onClick={handleJoiningGenerate}
                    disabled={!joiningTemplateId || generatingJoining}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 text-sm font-medium"
                  >
                    {generatingJoining ? 'Processing...' : 'Generate & Download'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }



      {/* Excel Upload Modal */}
      <EmployeeExcelUploadModal
        isOpen={openUploadPopup}
        onClose={() => setOpenUploadPopup(false)}
        onSuccess={() => {
          setOpenUploadPopup(false);
          showToast('success', 'Success', 'Employees uploaded successfully!');
          load();
        }}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
          Employees by Department
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'HR', gradient: 'from-blue-500 to-indigo-600', icon: Users },
            { name: 'Tech', gradient: 'from-emerald-500 to-teal-600', icon: Briefcase },
            { name: 'Accounts', gradient: 'from-purple-500 to-pink-600', icon: IndianRupee },
            { name: 'Admin', gradient: 'from-amber-500 to-orange-600', icon: User }
          ].map((dept) => {
            const deptEmps = employees.filter(e => e.department === dept.name);
            const DeptIcon = dept.icon;

            return (
              <div key={dept.name} className={`bg-gradient-to-br ${dept.gradient} rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/20">
                    <DeptIcon size={18} />
                  </div>
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full border border-white/10">
                    {deptEmps.length} Employees
                  </span>
                </div>

                <div className="relative z-10">
                  <h4 className="font-black text-white text-lg mb-3 tracking-tight">{dept.name}</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {deptEmps.length > 0 ? (
                      deptEmps.map(e => (
                        <div key={e._id} className="flex justify-between items-center bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/5 hover:bg-white/20 transition-colors">
                          <span className="text-xs font-bold text-white truncate max-w-[100px]">
                            {[e.firstName, e.lastName].filter(Boolean).join(' ') || e.email}
                          </span>
                          <span className="text-[9px] font-black text-white/60 uppercase tracking-tighter">
                            {e.role || '-'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-white/50 italic py-2">No employees assigned</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
