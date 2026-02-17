import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import {
    User, FileText, ChevronRight, ChevronLeft,
    CheckCircle, Search, AlertCircle, Loader2,
    Calendar, Briefcase, MapPin, IndianRupee
} from 'lucide-react';
import { showToast } from '../../../utils/uiNotifications';

export default function IssueLetterWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data List State
    const [employees, setEmployees] = useState([]);
    const [templates, setTemplates] = useState([]);

    // Selection State
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [customData, setCustomData] = useState({});

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [templateType, setTemplateType] = useState('');

    useEffect(() => {
        fetchEmployees();
        fetchTemplates();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/hr/employees');
            const empData = res.data.data || res.data;
            console.log('📋 Employees fetched:', empData);
            setEmployees(empData);
        } catch (err) {
            console.error('Failed to fetch employees', err);
            showToast('error', 'Error', 'Failed to fetch employees');
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/letters/templates');
            setTemplates(res.data);
        } catch (err) {
            console.error('Failed to fetch templates', err);
        }
    };

    const handleEmployeeSelect = (emp) => {
        setSelectedEmployee(emp);
        setStep(2);
    };

    const handleTemplateSelect = (tmpl) => {
        setSelectedTemplate(tmpl);

        // Initialize custom data with placeholders
        const initialCustomData = {};
        if (tmpl.placeholders) {
            tmpl.placeholders.forEach(p => {
                initialCustomData[p] = '';
            });
        }

        // Auto-fill some common fields if possible
        if (selectedEmployee) {
            initialCustomData['employee_name'] = `${selectedEmployee.firstName} ${selectedEmployee.lastName || ''}`;
            initialCustomData['designation'] = selectedEmployee.designation || '';
            initialCustomData['department'] = selectedEmployee.department || '';
        }

        setCustomData(initialCustomData);
        setStep(3);
    };

    const handleGenerate = async () => {
        // Validation
        if (!selectedEmployee?._id) {
            showToast('error', 'Error', 'Employee ID is missing. Please select an employee again.');
            console.error('❌ Missing employee ID:', selectedEmployee);
            return;
        }

        if (!selectedTemplate?._id) {
            showToast('error', 'Error', 'Template ID is missing. Please select a template again.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                templateId: selectedTemplate._id,
                employeeId: selectedEmployee._id,
                customData
            };
            
            console.log('📤 Sending payload:', payload);
            
            const res = await api.post('/letters/generate-generic', payload);

            showToast('success', 'Success', res.data.message);
            navigate('/hr/letters');
        } catch (err) {
            console.error('Generation failed', err);
            showToast('error', 'Error', err.response?.data?.message || 'Failed to generate letter');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <User className="text-blue-500" /> 1. Select Recipient
                </h3>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search employee by name, ID, or email..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 transition text-sm font-bold shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {employees.filter(emp =>
                        (emp.firstName + ' ' + emp.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(emp => (
                        <div
                            key={emp._id}
                            onClick={() => handleEmployeeSelect(emp)}
                            className="p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl cursor-pointer transition group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100 dark:border-slate-700">
                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-900 dark:text-white truncate">{emp.firstName} {emp.lastName}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.employeeId || 'NO ID'} • {emp.designation || 'EMPLOYEE'}</p>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <FileText className="text-blue-500" /> 2. Select Letter Template
                    </h3>
                    <button onClick={() => setStep(1)} className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                        <ChevronLeft size={16} /> Back to recipient
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {templates.map(tmpl => (
                        <div
                            key={tmpl._id}
                            onClick={() => handleTemplateSelect(tmpl)}
                            className="p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl cursor-pointer transition group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 transform transition translate-x-1 translate-y--1 group-hover:translate-x-0 group-hover:translate-y-0">
                                <FileText size={48} className="text-blue-500/10" />
                            </div>
                            <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight mb-2 uppercase">{tmpl.name}</h4>
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-full">{tmpl.type}</span>
                                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-full">{tmpl.templateType}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <CheckCircle className="text-blue-500" /> 3. Review & Customize
                    </h3>
                    <button onClick={() => setStep(2)} className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                        <ChevronLeft size={16} /> Back to template
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Summary Column */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Summary</p>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Recipient</p>
                                    <p className="font-black text-slate-900 dark:text-white">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Template</p>
                                    <p className="font-black text-slate-900 dark:text-white">{selectedTemplate.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Requires Approval</p>
                                    <p className={`font-black ${selectedTemplate.requiresApproval ? 'text-amber-600' : 'text-green-600'}`}>
                                        {selectedTemplate.requiresApproval ? 'YES (Sent to Manager)' : 'NO (Direct Issue)'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Entry Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest border-b-2 border-slate-50 dark:border-slate-800 pb-2">Custom Field Values</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.keys(customData).map(field => (
                                <div key={field} className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.replace(/_/g, ' ')}</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition text-sm font-bold"
                                        value={customData[field]}
                                        onChange={(e) => setCustomData({ ...customData, [field]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t-2 border-slate-50 dark:border-slate-800 flex justify-end gap-4">
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} /> Generating...
                                    </>
                                ) : (
                                    <>
                                        {selectedTemplate.requiresApproval ? 'Submit for Approval' : 'Generate & Issue'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Letter Wizard</h1>
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs mt-2">
                    <span className={step >= 1 ? 'text-blue-600' : ''}>Recipient</span>
                    <ChevronRight size={14} />
                    <span className={step >= 2 ? 'text-blue-600' : ''}>Template</span>
                    <ChevronRight size={14} />
                    <span className={step >= 3 ? 'text-blue-600' : ''}>Review</span>
                </div>
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
    );
}
