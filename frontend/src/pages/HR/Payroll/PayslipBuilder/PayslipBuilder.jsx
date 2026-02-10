import React, { useState, useEffect, useCallback } from 'react';
import {
    Save, ArrowLeft, Loader2, CheckCircle2, LayoutTemplate,
    Plus, Trash2, Copy, MoveUp, MoveDown, Layers, Settings2,
    Type, Image as ImageIcon, Minus, Square, Columns, Table as TableIcon,
    User, Building2, Wallet, CreditCard, FileText, ChevronRight,
    Undo2, Redo2, Monitor, Smartphone, Download, Eye
} from 'lucide-react';
import { message, Modal, notification } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../utils/api';

import BuilderLayerPanel from './BuilderLayerPanel';
import BuilderPreview from './BuilderPreview';
import BuilderEditorPanel from './BuilderEditorPanel';
import ErrorBoundary from './ErrorBoundary';

export default function PayslipBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState("desktop");
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // Preview Data
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Core State
    const [config, setConfig] = useState({
        name: "New Payslip Template",
        sections: [],
        styles: {
            backgroundColor: '#f3f4f6',
            fontFamily: 'Inter',
            fontSize: '14px',
            color: '#1f2937',
            padding: '40px'
        }
    });

    // Variable definitions
    const variables = [
        { label: 'Employee Name', value: '{{EMPLOYEE_NAME}}', cat: 'Employee' },
        { label: 'Employee Code', value: '{{EMPLOYEE_CODE}}', cat: 'Employee' },
        { label: 'Department', value: '{{DEPARTMENT}}', cat: 'Employee' },
        { label: 'Designation', value: '{{DESIGNATION}}', cat: 'Employee' },
        { label: 'UAN', value: '{{UAN_NO}}', cat: 'Employee' },
        { label: 'PF No', value: '{{PF_NO}}', cat: 'Employee' },
        { label: 'PAN', value: '{{PAN_NUMBER}}', cat: 'Employee' },
        { label: 'Joining Date', value: '{{DATE_OF_JOINING}}', cat: 'Employee' },
        { label: 'Bank Name', value: '{{BANK_NAME}}', cat: 'Bank' },
        { label: 'Account No', value: '{{ACCOUNT_NO}}', cat: 'Bank' },
        { label: 'IFSC', value: '{{IFSC}}', cat: 'Bank' },
        { label: 'Month/Year', value: '{{MONTH_YEAR}}', cat: 'Period' },
        { label: 'Net Pay', value: '{{NET_PAY}}', cat: 'Financial' },
        { label: 'Gross Earnings', value: '{{GROSS_EARNINGS}}', cat: 'Financial' },
        { label: 'Total Deductions', value: '{{TOTAL_DEDUCTIONS}}', cat: 'Financial' },
        { label: 'Earnings List', value: '{{EARNINGS_LIST}}', cat: 'Dynamic' },
        { label: 'Deductions List', value: '{{DEDUCTIONS_LIST}}', cat: 'Dynamic' },
        { label: 'Reimbursements List', value: '{{REIMBURSEMENTS_LIST}}', cat: 'Dynamic' }
    ];

    useEffect(() => {
        console.log('🔨 PayslipBuilder Initializing:', { id, loading });

        if (id !== 'new') {
            console.log('Loading existing template:', id);
            fetchTemplate();
        } else {
            const defaultConfig = {
                sections: [
                    {
                        type: 'company-header',
                        content: {
                            showLogo: true,
                            logoSize: '80px',
                            companyName: 'Your Company Name',
                            companyNameSize: '24px',
                            showAddress: true,
                            companyAddress: '123 Business Avenue, Suite 500\nAhmedabad, Gujarat - 380015'
                        },
                        styles: { paddingTop: '20px', paddingBottom: '20px' }
                    },
                    {
                        type: 'employee-details-grid',
                        content: {
                            columns: 2,
                            fields: [
                                'EMPLOYEE_NAME',
                                'EMPLOYEE_CODE',
                                'DEPARTMENT',
                                'DESIGNATION',
                                'DATE_OF_JOINING',
                                'PAN_NUMBER'
                            ]
                        },
                        styles: { paddingTop: '20px', paddingBottom: '20px' }
                    }
                ],
                styles: {
                    backgroundColor: '#ffffff',
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    color: '#000000',
                    padding: '30px'
                }
            };
            console.log('Default config created:', defaultConfig);
            setConfig(defaultConfig);
            saveToHistory(defaultConfig);
            // For new templates we can stop loading immediately
            setLoading(false);
        }

        // Fetch employees for preview (does not block UI)
        fetchEmployeesForPreview();
    }, [id]);

    const fetchEmployeesForPreview = async () => {
        try {
            console.log('📥 Fetching employees for preview...');
            // Use existing HR employees endpoint to avoid 404s
            const res = await api.get('/hr/employees?limit=100');
            if (res.data?.success && Array.isArray(res.data.data)) {
                console.log('✅ Employees loaded:', res.data.data.length);
                setEmployees(res.data.data);
                // Auto-select first employee
                if (res.data.data.length > 0) {
                    setSelectedEmployee(res.data.data[0]);
                }
            }
        } catch (err) {
            console.warn('Failed to fetch employees:', err?.message);
        }
    };

    const fetchPayslipPreview = async (empId, month) => {
        if (!empId || !month) return;
        try {
            setLoadingPreview(true);
            console.log('📥 Fetching payslip preview:', { empId, month });
            const res = await api.get(`/payslips/${empId}?month=${month}`);
            if (res.data?.success && res.data.data) {
                console.log('✅ Payslip preview loaded');
                setPreviewData(res.data.data);
            } else {
                console.warn('No payslip found for this month');
                setPreviewData(null);
            }
        } catch (err) {
            console.warn('Failed to fetch payslip:', err?.message);
            setPreviewData(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleEmployeeChange = (emp) => {
        setSelectedEmployee(emp);
        if (selectedMonth) {
            fetchPayslipPreview(emp._id, selectedMonth);
        }
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
        if (selectedEmployee) {
            fetchPayslipPreview(selectedEmployee._id, month);
        }
    };

    const fetchTemplate = async () => {
        try {
            setLoading(true);
            console.log('📥 Fetching template:', id);
            const res = await api.get(`/payslip-templates/${id}`);
            console.log('✅ Template loaded:', res.data);
            
            if (res.data?.success && res.data.data) {
                const template = res.data.data;
                
                if (template.templateType === 'BUILDER' && template.builderConfig) {
                    console.log('Using BUILDER config');
                    setConfig(template.builderConfig);
                    saveToHistory(template.builderConfig);
                } else {
                    // Convert legacy template or show message
                    console.log('Template is legacy type, creating blank');
                    message.info("This is a legacy template. Editing in builder will recreate it.");
                    const fallbackConfig = {
                        name: template.name || 'Payslip Template',
                        sections: [],
                        styles: { backgroundColor: '#ffffff', padding: '30px', fontFamily: 'Inter', fontSize: '12px', color: '#000000' }
                    };
                    setConfig(fallbackConfig);
                    saveToHistory(fallbackConfig);
                }
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('❌ Template load error:', err?.message, err);
            message.error(`Failed to load template: ${err?.message || 'Unknown error'}`);
            
            // Fallback to blank template
            const fallbackConfig = {
                name: "Payslip Template",
                sections: [],
                styles: { backgroundColor: '#ffffff', padding: '30px', fontFamily: 'Inter', fontSize: '12px', color: '#000000' }
            };
            setConfig(fallbackConfig);
            saveToHistory(fallbackConfig);
        } finally {
            setLoading(false);
        }
    };

    const saveToHistory = (newConfig) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newConfig)));
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1];
            setConfig(JSON.parse(JSON.stringify(prev)));
            setHistoryIndex(historyIndex - 1);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1];
            setConfig(JSON.parse(JSON.stringify(next)));
            setHistoryIndex(historyIndex + 1);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                name: config.name,
                templateType: 'BUILDER',
                builderConfig: config,
                // generate a static HTML preview for the list view and old PDF engine
                htmlContent: "<!-- BUILDER_GENERATED -->"
            };

            if (id === 'new') {
                const res = await api.post('/payslip-templates', payload);
                if (res.data?.success) {
                    message.success("Template created successfully");
                    navigate(`/hr/payroll/payslip-builder/${res.data.data._id}`);
                }
            } else {
                await api.put(`/payslip-templates/${id}`, payload);
                message.success("Template saved successfully");
            }
        } catch (err) {
            message.error("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const addBlock = (type) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newBlock = {
            id,
            type,
            content: getDefaultContent(type),
            styles: getDefaultStyles(type)
        };
        const newConfig = {
            ...config,
            sections: [...config.sections, newBlock]
        };
        setConfig(newConfig);
        setSelectedBlockId(id);
        saveToHistory(newConfig);
    };

    const updateBlock = (id, newBlockData) => {
        const newConfig = {
            ...config,
            sections: config.sections.map(s => s.id === id ? { ...s, ...newBlockData } : s)
        };
        setConfig(newConfig);
        saveToHistory(newConfig);
    };

    const removeBlock = (id) => {
        const newConfig = {
            ...config,
            sections: config.sections.filter(s => s.id !== id)
        };
        setConfig(newConfig);
        if (selectedBlockId === id) setSelectedBlockId(null);
        saveToHistory(newConfig);
    };

    const duplicateBlock = (id) => {
        const index = config.sections.findIndex(s => s.id === id);
        if (index === -1) return;
        const original = config.sections[index];
        const copy = {
            ...JSON.parse(JSON.stringify(original)),
            id: Math.random().toString(36).substr(2, 9)
        };
        const newSections = [...config.sections];
        newSections.splice(index + 1, 0, copy);
        const newConfig = { ...config, sections: newSections };
        setConfig(newConfig);
        setSelectedBlockId(copy.id);
        saveToHistory(newConfig);
    };

    const moveBlock = (id, direction) => {
        const index = config.sections.findIndex(s => s.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === config.sections.length - 1) return;

        const newSections = [...config.sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

        const newConfig = { ...config, sections: newSections };
        setConfig(newConfig);
        saveToHistory(newConfig);
    };

    const getDefaultContent = (type) => {
        switch (type) {
            case 'text': return { text: 'Enter your text here...', align: 'left', size: '14px', weight: 'normal' };
            case 'heading': return { text: 'New Heading', level: 'h2', align: 'left' };
            case 'divider': return { thickness: '1px', color: '#e5e7eb', style: 'solid' };
            case 'image': return { url: '', width: '100px', align: 'left' };
            case 'spacer': return { height: '20px' };
            case 'row': return { columns: [{ id: 'col-1', content: [] }, { id: 'col-2', content: [] }] };
            case 'company-header': return { 
                showLogo: true, 
                logoAlign: 'left', 
                logoSize: '80px',
                companyName: 'Your Company Name',
                companyNameSize: '24px', 
                showAddress: true,
                companyAddress: '123 Business Avenue, Suite 500\nAhmedabad, Gujarat - 380015'
            };
            case 'payslip-title': return { text: 'Payslip for the month of {{MONTH_YEAR}}', align: 'center' };
            case 'employee-details-grid': return { columns: 2, fields: ['EMPLOYEE_NAME', 'EMPLOYEE_CODE', 'DEPARTMENT', 'DESIGNATION'] };
            case 'earnings-table': return { title: 'Earnings', showYTD: true, customRows: [] };
            case 'deductions-table': return { title: 'Deductions', showYTD: true, customRows: [] };
            case 'reimbursements-table': return { title: 'Reimbursements', showYTD: false, customRows: [] };
            case 'net-pay-box': return { title: 'Net Salary Payable', bgColor: '#f9fafb', textColor: '#111827' };
            default: return {};
        }
    };

    const getDefaultStyles = (type) => ({
        paddingTop: '10px',
        paddingBottom: '10px',
        paddingLeft: '0px',
        paddingRight: '0px',
        marginTop: '0px',
        marginBottom: '0px'
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Loading Payslip Builder...</p>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="h-16 bg-white border-b border-gray-200 px-6 py-0 z-40 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/hr/payslip-templates')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <LayoutTemplate size={20} className="text-blue-600" />
                            <input
                                value={config.name}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                className="text-lg font-black text-gray-900 tracking-tight bg-transparent border-none focus:ring-0 w-64"
                                placeholder="Enter Template Name"
                                maxLength={60}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* History Controls */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className={`p-1.5 rounded-md ${historyIndex > 0 ? 'text-gray-700 hover:bg-white hover:shadow-sm' : 'text-gray-300'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className={`p-1.5 rounded-md ${historyIndex < history.length - 1 ? 'text-gray-700 hover:bg-white hover:shadow-sm' : 'text-gray-300'}`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>

                    {/* Preview Switcher */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={`p-1.5 rounded-md ${previewMode === 'desktop' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Monitor size={16} />
                        </button>
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={`p-1.5 rounded-md ${previewMode === 'mobile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Smartphone size={16} />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200"></div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold shadow-lg shadow-gray-200 hover:bg-black hover:shadow-xl transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </header>

            {/* Workspace */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Layers / Structure */}
                <BuilderLayerPanel
                    config={config}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={setSelectedBlockId}
                    onMove={moveBlock}
                    onRemove={removeBlock}
                    onDuplicate={duplicateBlock}
                />

                {/* Center Panel: Canvas */}
                <div className="flex-1 bg-gray-200/50 relative overflow-hidden flex flex-col items-center">
                    <div className="w-full h-full p-8 overflow-y-auto scrollbar-hide flex justify-center">
                        <div className={`transition-all duration-500 ease-in-out ${previewMode === "mobile" ? "w-[390px] min-h-[844px] bg-white shadow-2xl rounded-[40px] border-[12px] border-gray-900 overflow-y-auto scrollbar-hide relative" : "w-full max-w-[800px] bg-white shadow-2xl min-h-[1100px] border border-gray-100"}`}>
                            {previewMode === "mobile" && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20"></div>}

                            <BuilderPreview
                                config={config}
                                selectedBlockId={selectedBlockId}
                                onSelectBlock={setSelectedBlockId}
                                isBuilder={true}
                                previewMode={previewMode}
                                previewData={previewData}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Controls & Components */}
                <BuilderEditorPanel
                    config={config}
                    selectedBlockId={selectedBlockId}
                    onUpdateConfig={setConfig}
                    onAddBlock={addBlock}
                    onUpdateBlock={updateBlock}
                    onRemoveBlock={removeBlock}
                    variables={variables}
                    employees={employees}
                    selectedEmployee={selectedEmployee}
                    selectedMonth={selectedMonth}
                    onEmployeeChange={handleEmployeeChange}
                    onMonthChange={handleMonthChange}
                    previewData={previewData}
                    loadingPreview={loadingPreview}
                />
            </div>
        </div>
        </ErrorBoundary>
    );
}
