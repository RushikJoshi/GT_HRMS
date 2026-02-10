import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { formatDateDDMMYYYY } from '../../../utils/dateUtils';
import { FileText, Download, Filter, Search, Eye, X, Settings2, AlertTriangle } from 'lucide-react';
import PayrollCorrectionModal from '../../../components/Payroll/PayrollCorrectionModal';
import { Tooltip, Modal, Spin, Radio, Button } from 'antd';
import { showToast } from '../../../utils/uiNotifications';

export default function Payslips() {
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [previewPayslip, setPreviewPayslip] = useState(null);
    const [correctionState, setCorrectionState] = useState({ visible: false, run: null });
    const [templates, setTemplates] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedPayslipForDownload, setSelectedPayslipForDownload] = useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [activeMode, setActiveMode] = useState('download');

    useEffect(() => {
        loadPayslips();
        loadTemplates();
    }, [selectedMonth, selectedYear]);

    async function loadTemplates() {
        try {
            const res = await api.get('/payslip-templates');
            const activeTemplates = (res.data?.data || []).filter(t => t.isActive);
            setTemplates(activeTemplates);

            // Set default template if exists
            const defaultTpl = activeTemplates.find(t => t.isDefault);
            if (defaultTpl) setSelectedTemplateId(defaultTpl._id);
            else if (activeTemplates.length > 0) setSelectedTemplateId(activeTemplates[0]._id);
        } catch (err) {
            console.error("Failed to load templates", err);
        }
    }

    async function loadPayslips() {
        setLoading(true);
        try {
            const res = await api.get(`/payroll/payslips`);
            setPayslips(res.data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Filter Logic
    const filtered = payslips.filter(p => {
        if (p.year !== selectedYear) return false;
        if (selectedMonth && p.month !== selectedMonth) return false;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const empName = p.employeeInfo?.name?.toLowerCase() || '';
            const empId = p.employeeInfo?.employeeId?.toLowerCase() || '';
            return empName.includes(term) || empId.includes(term);
        }
        return true;
    });

    const handleDownloadClick = (payslip, mode = 'download') => {
        setSelectedPayslipForDownload(payslip);
        setActiveMode(mode);
        if (templates.length <= 1) {
            // If only one template or none, process directly with default/none
            downloadPDF(payslip, templates[0]?._id, mode);
        } else {
            setShowTemplateModal(true);
        }
    };

    async function downloadPDF(payslip, templateId, mode = 'download') {
        if (!payslip) return;
        setDownloadingId(payslip._id);
        try {
            showToast('info', 'Processing', mode === 'view' ? 'Opening payslip...' : 'Generating your payslip PDF...');

            const endpoint = templateId
                ? `/payslip-templates/render/${payslip._id}`
                : `/payroll/payslips/${payslip._id}/generate-pdf`;

            const payload = templateId ? { templateId } : {};

            const res = await api.post(endpoint, payload, { responseType: 'blob' });

            // Robust Blob handling
            let blob = res.data;

            // 1. Force PDF type if we are sure it's binary
            if (blob.type === '' || blob.type === 'application/octet-stream') {
                blob = new Blob([blob], { type: 'application/pdf' });
            }

            console.log(`[PDF_CLIENT] Response received. Type: ${blob.type}, Size: ${blob.size} bytes`);

            // 2. Check if the server returned JSON/HTML instead of PDF (manually)
            if (blob.type.includes('json') || blob.type.includes('html')) {
                const text = await blob.text();
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.message || 'Server failed to generate PDF');
                } catch (e) {
                    throw new Error('Server returned an error page instead of PDF. Please check backend logs.');
                }
            }

            // 3. Size check
            if (blob.size < 1000) {
                console.warn("Possible small PDF/Error:", blob.size);
                const text = await blob.text();
                if (text.includes('error') || text.includes('not found')) {
                    throw new Error(`PDF Generation Warning: ${text.substring(0, 100)}`);
                }
            }

            const url = window.URL.createObjectURL(blob);

            if (mode === 'view') {
                // For 'view', some browsers prefer a new window with a name
                const win = window.open('', '_blank');
                if (win) {
                    win.location.href = url;
                } else {
                    window.location.href = url; // Fallback
                }
            } else {
                const link = document.createElement('a');
                link.href = url;
                const safeName = (payslip.employeeInfo?.name || 'Payslip').replace(/[^a-z0-9]/gi, '_');
                const fileName = `Payslip_${safeName}_${payslip.month}-${payslip.year}.pdf`;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
            }

            setTimeout(() => window.URL.revokeObjectURL(url), 5000);

            showToast('success', mode === 'view' ? 'Preview Opened' : 'Downloaded', 'Payslip processed successfully');
            setShowTemplateModal(false);
        } catch (err) {
            console.error("PDF operation failed", err);
            let errorMessage = err.message || 'Could not process PDF.';

            // Handle axial-parsed blob errors
            if (err.hrms?.type === 'blob_error') {
                try {
                    const text = await err.hrms.blob.text();
                    const json = JSON.parse(text);
                    errorMessage = json.message || errorMessage;
                } catch (e) {
                    errorMessage = 'Server error (HTML). Check template settings.';
                }
            }

            showToast('error', 'Operation Failed', errorMessage);
        } finally {
            setDownloadingId(null);
        }
    }

    return (
        <div className="w-full px-4 py-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payslips</h1>
                    <p className="text-slate-500 text-sm mt-0.5">View and download generated payslips</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                {/* Filters */}
                <div className="p-3 border-b border-slate-200 flex flex-wrap gap-3 items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(parseInt(e.target.value))}
                            className="rounded border-slate-300 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5"
                        >
                            <option value="">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(parseInt(e.target.value))}
                            className="rounded border-slate-300 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 relative max-w-md ml-auto">
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 py-1.5 rounded border-slate-300 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading payslips...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No payslips found for selected period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500">
                                <tr>
                                    <th className="px-4 py-2 text-left tracking-wider">Employee</th>
                                    <th className="px-4 py-2 text-left tracking-wider">Period</th>
                                    <th className="px-4 py-2 text-left tracking-wider">Gross Pay</th>
                                    <th className="px-4 py-2 text-left tracking-wider">Net Pay</th>
                                    <th className="px-4 py-2 text-left tracking-wider">Generated On</th>
                                    <th className="px-4 py-2 text-right tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filtered.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="font-medium text-slate-900 text-sm">{p.employeeInfo?.name}</div>
                                            <div className="text-xs text-slate-500">{p.employeeInfo?.employeeId}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-sm">
                                            {new Date(0, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-sm">
                                            ₹{p.grossEarnings?.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 text-sm">
                                            ₹{p.netPay?.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                                            {formatDateDDMMYYYY(p.generatedAt)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip title="Correct / Adjust in future payroll">
                                                    <button
                                                        onClick={() => setCorrectionState({
                                                            visible: true,
                                                            run: { _id: p.payrollRunId, month: p.month, year: p.year }
                                                        })}
                                                        className="text-orange-600 hover:text-orange-800 font-medium inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-50 text-xs"
                                                    >
                                                        <Settings2 className="h-3.5 w-3.5" /> Correct
                                                    </button>
                                                </Tooltip>
                                                <button
                                                    onClick={() => handleDownloadClick(p, 'view')}
                                                    disabled={downloadingId === p._id}
                                                    className="text-emerald-600 hover:text-emerald-800 font-medium inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-50 text-xs"
                                                >
                                                    {downloadingId === p._id && activeMode === 'view' ? <Spin size="small" /> : <Eye className="h-3.5 w-3.5" />}
                                                    View PDF
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadClick(p, 'download')}
                                                    disabled={downloadingId === p._id}
                                                    className={`text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 text-xs ${downloadingId === p._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {downloadingId === p._id && activeMode === 'download' ? <Spin size="small" /> : <Download className="h-3.5 w-3.5" />}
                                                    Download
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewPayslip && (
                <PayslipPreviewModal
                    payslip={previewPayslip}
                    onClose={() => setPreviewPayslip(null)}
                    onDownload={() => handleDownloadClick(previewPayslip)}
                />
            )}
            {/* Correction Modal */}
            <PayrollCorrectionModal
                visible={correctionState.visible}
                onCancel={() => setCorrectionState({ visible: false, run: null })}
                payrollRun={correctionState.run}
            />

            {/* Template Selection Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        <span>Choose Payslip Template</span>
                    </div>
                }
                open={showTemplateModal && !!selectedPayslipForDownload}
                onCancel={() => setShowTemplateModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowTemplateModal(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="download"
                        type="primary"
                        icon={activeMode === 'view' ? <Eye size={16} /> : <Download size={16} />}
                        loading={!!downloadingId}
                        onClick={() => downloadPDF(selectedPayslipForDownload, selectedTemplateId, activeMode)}
                        disabled={!selectedTemplateId}
                        className="bg-blue-600"
                    >
                        {activeMode === 'view' ? 'Preview & View' : 'Generate & Download'}
                    </Button>
                ]}
                width={500}
                centered
            >
                <div className="py-4">
                    <p className="text-sm text-slate-500 mb-4 italic">
                        Select a design template for <span className="font-bold text-slate-800">{selectedPayslipForDownload?.employeeInfo?.name}</span>'s payslip.
                    </p>

                    <Radio.Group
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full space-y-3"
                    >
                        {templates.map(tpl => (
                            <Radio
                                key={tpl._id}
                                value={tpl._id}
                                className="w-full p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm transition-all"
                            >
                                <div className="inline-flex flex-col ml-2">
                                    <span className="font-bold text-slate-800 flex items-center gap-2">
                                        {tpl.name}
                                        {tpl.isDefault && (
                                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase">Default</span>
                                        )}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">
                                        Type: {tpl.templateType} • Updated: {new Date(tpl.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </Radio>
                        ))}
                    </Radio.Group>

                    {templates.length === 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-bold underline">No active templates found!</p>
                                <p className="mt-1 text-xs opacity-80">Generating with system default layout. Go to Payslip Templates to create one.</p>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

// Preview Modal Component
function PayslipPreviewModal({ payslip, onClose, onDownload }) {
    // Determine the default template if available to pass to download
    // But since onDownload is passed from parent, we keep it simple or update parent
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-900">Payslip Preview</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Payslip Content */}
                <div className="p-8 space-y-6">
                    {/* Employee Info */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{payslip.employeeInfo?.name}</h3>
                            <p className="text-sm text-slate-600">Employee ID: {payslip.employeeInfo?.employeeId}</p>
                            <p className="text-sm text-slate-600">Department: {payslip.employeeInfo?.department}</p>
                            <p className="text-sm text-slate-600">Designation: {payslip.employeeInfo?.designation}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-slate-900">
                                {new Date(0, payslip.month - 1).toLocaleString('default', { month: 'long' })} {payslip.year}
                            </p>
                            <p className="text-sm text-slate-600">Generated: {formatDateDDMMYYYY(payslip.generatedAt)}</p>
                        </div>
                    </div>

                    {/* Earnings */}
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Earnings</h4>
                        <table className="w-full text-sm">
                            <tbody>
                                {payslip.earningsSnapshot?.map((e, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">{e.name}</td>
                                        <td className="py-2 text-right font-medium">₹{e.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold">
                                    <td className="py-2 text-slate-900">Gross Earnings</td>
                                    <td className="py-2 text-right text-slate-900">₹{payslip.grossEarnings?.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Deductions */}
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Deductions</h4>
                        <table className="w-full text-sm">
                            <tbody>
                                {payslip.preTaxDeductionsSnapshot?.map((d, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">{d.name}</td>
                                        <td className="py-2 text-right font-medium">₹{d.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {payslip.incomeTax > 0 && (
                                    <tr className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">Income Tax (TDS)</td>
                                        <td className="py-2 text-right font-medium">₹{payslip.incomeTax?.toLocaleString()}</td>
                                    </tr>
                                )}
                                {payslip.postTaxDeductionsSnapshot?.map((d, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">{d.name}</td>
                                        <td className="py-2 text-right font-medium">₹{d.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold">
                                    <td className="py-2 text-slate-900">Total Deductions</td>
                                    <td className="py-2 text-right text-slate-900">
                                        ₹{((payslip.preTaxDeductionsTotal || 0) + (payslip.incomeTax || 0) + (payslip.postTaxDeductionsTotal || 0)).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Adjustments (Corrections/Arrears) */}
                    {payslip.adjustmentsSnapshot?.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-3 text-orange-600 flex items-center gap-2">
                                <Settings2 className="w-4 h-4" /> Adjustments & Corrections
                            </h4>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-xs border-b">
                                        <th className="text-left font-normal py-1">Description</th>
                                        <th className="text-right font-normal py-1">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payslip.adjustmentsSnapshot.map((adj, i) => (
                                        <tr key={i} className="border-b border-slate-50 last:border-0 italic text-gray-600">
                                            <td className="py-2">
                                                {adj.type?.replace(/_/g, ' ')}
                                                <div className="text-[10px] text-gray-400 not-italic">Ref: {adj.reason}</div>
                                            </td>
                                            <td className={`py-2 text-right font-medium ${adj.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {adj.amount >= 0 ? '+' : ''}₹{adj.amount?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Net Pay */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-emerald-900">Net Pay</span>
                            <span className="text-2xl font-bold text-emerald-600">₹{payslip.netPay?.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Attendance Summary */}
                    {payslip.attendanceSummary && (
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Attendance Summary</h4>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-600">Total Days</p>
                                    <p className="font-semibold text-slate-900">{payslip.attendanceSummary.totalDays}</p>
                                </div>
                                <div>
                                    <p className="text-slate-600">Present</p>
                                    <p className="font-semibold text-emerald-600">{payslip.attendanceSummary.presentDays}</p>
                                </div>
                                <div>
                                    <p className="text-slate-600">Leaves</p>
                                    <p className="font-semibold text-blue-600">{payslip.attendanceSummary.leaveDays || 0}</p>
                                </div>
                                <div>
                                    <p className="text-slate-600">LOP Days</p>
                                    <p className="font-semibold text-red-600">{payslip.attendanceSummary.lopDays || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                    >
                        Close
                    </button>
                    <button
                        onClick={onDownload}
                        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" /> Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
