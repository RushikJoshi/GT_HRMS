import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { formatDateDDMMYYYY } from '../../../utils/dateUtils';
import { Modal, notification, Tooltip, Select, Button, Drawer, Space, Badge, Divider } from 'antd';
import PayrollCorrectionModal from '../../../components/Payroll/PayrollCorrectionModal';
import { Play, CheckCircle, AlertTriangle, Loader, Settings2, Filter, X, Users } from 'lucide-react';

const EMPLOYEE_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contract', 'Consultant'];
const WORK_MODES = ['Work From Office (WFO)', 'Work From Home (WFH)', 'Hybrid', 'Field / Onsite'];

export default function RunPayroll() {
    const [loading, setLoading] = useState(false);
    const [runs, setRuns] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filter Panel States
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        employeeType: [],
        workMode: [],
        department: 'All Departments',
        designation: 'All Designations'
    });
    const [availableDepartments, setAvailableDepartments] = useState([]);
    const [availableDesignations, setAvailableDesignations] = useState([]);
    const [matchingCount, setMatchingCount] = useState(null);
    const [fetchingCount, setFetchingCount] = useState(false);

    // Correction Modal
    const [correctionState, setCorrectionState] = useState({ visible: false, run: null });

    useEffect(() => {
        loadRuns();
    }, [selectedYear]);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (showFilters) {
            updateMatchingCount();
        }
    }, [filters, selectedMonth, selectedYear]);

    async function fetchMetadata() {
        try {
            const [deptRes, desRes] = await Promise.all([
                api.get('/hr/departments'),
                api.get('/hr/employees') // We can derive designations from here or use a dedicated endpoint if available
            ]);
            setAvailableDepartments(deptRes.data?.data || deptRes.data || []);

            // Extract unique designations from employees or dedicated list
            const emps = desRes.data?.data || desRes.data || [];
            const uniqueDes = [...new Set(emps.map(e => e.designation).filter(Boolean))];
            setAvailableDesignations(uniqueDes);
        } catch (err) {
            console.error("Failed to fetch filter metadata", err);
        }
    }

    async function updateMatchingCount() {
        setFetchingCount(true);
        try {
            const params = new URLSearchParams({
                month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
                year: selectedYear,
                department: filters.department,
                designation: filters.designation,
                employeeType: filters.employeeType.join(','),
                workMode: filters.workMode.join(',')
            });
            const res = await api.get(`/payroll/filteredEmployees?${params.toString()}`);
            setMatchingCount(res.data?.count || 0);
        } catch (err) {
            console.error("Failed to fetch matching count", err);
        } finally {
            setFetchingCount(false);
        }
    }

    async function loadRuns() {
        setLoading(true);
        try {
            const res = await api.get(`/payroll/runs?year=${selectedYear}`);
            setRuns(res.data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleInitiate(isFiltered = false) {
        setCalculating(true);
        setError('');
        setSuccess('');
        try {
            const payload = {
                month: selectedMonth,
                year: selectedYear,
                isFiltered: isFiltered,
                filters: isFiltered ? filters : {}
            };

            // 1. Initiate
            const initRes = await api.post('/payroll/runs', payload);
            const runId = initRes.data?.data?._id;

            if (runId) {
                // 2. Calculate
                await api.post(`/payroll/runs/${runId}/calculate`);
                const msg = isFiltered
                    ? `Filtered payroll for ${selectedMonth}/${selectedYear} calculated successfully!`
                    : `Full payroll for ${selectedMonth}/${selectedYear} calculated successfully!`;
                setSuccess(msg);
                setShowFilters(false);
                loadRuns();
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.response?.data?.error || "Failed to run payroll");
        } finally {
            setCalculating(false);
        }
    }

    async function handleApprove(runId) {
        if (!window.confirm("Are you sure you want to approve this payroll run? Once approved, payslips will be generated and finalizing the payroll will be locked.")) return;

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post(`/payroll/runs/${runId}/approve`);
            setSuccess("Payroll run approved successfully!");
            loadRuns();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.response?.data?.error || "Failed to approve payroll");
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkPaid(runId) {
        if (!window.confirm("Mark this payroll as PAID? This will record the payment date and notify employees.")) return;

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post(`/payroll/runs/${runId}/mark-paid`);
            setSuccess("Payroll marked as paid successfully!");
            loadRuns();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.response?.data?.error || "Failed to mark as paid");
        } finally {
            setLoading(false);
        }
    }

    const clearFilters = () => {
        setFilters({
            employeeType: [],
            workMode: [],
            department: 'All Departments',
            designation: 'All Designations'
        });
    };

    const isFilterApplied = filters.employeeType.length > 0 ||
        filters.workMode.length > 0 ||
        filters.department !== 'All Departments' ||
        filters.designation !== 'All Designations';

    return (
        <div className="w-full px-4 py-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Run Payroll</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage monthly payroll processing</p>
                </div>
            </div>

            {/* Runner Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-600" />
                        Run New Payroll
                    </h3>
                    <Button
                        icon={<Filter className="h-4 w-4" />}
                        onClick={() => setShowFilters(true)}
                        className="flex items-center gap-2"
                    >
                        Add Filters
                    </Button>
                </div>

                <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Payroll Month</label>
                        <Select
                            value={selectedMonth}
                            onChange={v => setSelectedMonth(v)}
                            className="w-full h-10"
                            options={Array.from({ length: 12 }, (_, i) => ({
                                value: i + 1,
                                label: new Date(0, i).toLocaleString('default', { month: 'long' })
                            }))}
                        />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Payroll Year</label>
                        <Select
                            value={selectedYear}
                            onChange={v => setSelectedYear(v)}
                            className="w-full h-10"
                            options={[2024, 2025, 2026, 2027].map(y => ({ value: y, label: String(y) }))}
                        />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <button
                            onClick={() => handleInitiate(false)}
                            disabled={calculating}
                            className="w-full h-10 px-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition flex items-center justify-center gap-2 text-sm"
                        >
                            {calculating ? <Loader className="animate-spin h-4 w-4" /> : <Play className="h-4 w-4" />}
                            Run Payroll for All
                        </button>
                    </div>
                </div>

                {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2"><AlertTriangle className="h-4 w-4" /> {error}</div>}
                {success && <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2"><CheckCircle className="h-4 w-4" /> {success}</div>}
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800 text-sm">Payroll History ({selectedYear})</h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                        <Loader className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="text-sm font-medium">Loading history...</span>
                    </div>
                ) : runs.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">No payroll runs found for {selectedYear}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Processed / Total</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Net Payable</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Run Date</th>
                                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {runs.map(run => (
                                    <tr key={run._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-900 text-sm">
                                            {new Date(0, run.month - 1).toLocaleString('default', { month: 'long' })}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            {run.isFiltered ? (
                                                <Tooltip title={
                                                    <div className="text-xs space-y-1">
                                                        {run.filters?.department && run.filters.department !== 'All Departments' && <div>Dept: {run.filters.department}</div>}
                                                        {run.filters?.employeeTypes?.length > 0 && <div>Types: {run.filters.employeeTypes.join(', ')}</div>}
                                                    </div>
                                                }>
                                                    <Badge status="processing" text="Filtered" className="text-blue-600 font-medium cursor-help" />
                                                </Tooltip>
                                            ) : (
                                                <span className="text-slate-500 text-sm">Full Run</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <StatusBadge status={run.status} />
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-slate-600 text-sm">
                                            <div className="flex flex-col">
                                                <span>
                                                    <span className="font-bold text-slate-800">{run.processedEmployees}</span>
                                                    <span className="mx-1 text-slate-300">/</span>
                                                    <span className="text-xs text-slate-400">
                                                        {run.isFiltered ? `${run.totalEmployees} (Match)` : run.totalEmployees}
                                                        {run.totalTenantEmployees > 0 && ` of ${run.totalTenantEmployees}`}
                                                    </span>
                                                </span>
                                                {run.failedEmployees > 0 && (
                                                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-0.5">
                                                        <AlertTriangle className="h-2.5 w-2.5" />
                                                        {run.failedEmployees} Failed
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap font-bold text-blue-700 text-sm">
                                            ₹{run.totalNetPay?.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-slate-500 text-xs">
                                            {formatDateDDMMYYYY(run.updatedAt)}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                                            {run.status === 'CALCULATED' && (
                                                <button
                                                    onClick={() => handleApprove(run._id)}
                                                    className="text-emerald-600 hover:text-emerald-800 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 mr-2 text-xs transition-colors"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            {(run.status === 'APPROVED' || run.status === 'PAID') && (
                                                <Tooltip title="Safe Payroll Correction / Adjustments">
                                                    <button
                                                        onClick={() => setCorrectionState({ visible: true, run })}
                                                        className="text-blue-600 hover:text-blue-800 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 mr-2 text-xs flex items-center gap-1.5 inline-flex transition-colors"
                                                    >
                                                        <Settings2 className="h-3.5 w-3.5" />
                                                        Correct
                                                    </button>
                                                </Tooltip>
                                            )}
                                            {run.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleMarkPaid(run._id)}
                                                    className="text-blue-600 hover:text-blue-800 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 mr-2 text-xs transition-colors"
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                            {run.status === 'PAID' && (
                                                <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider inline-block">Paid & Verified</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Filter Drawer */}
            <Drawer
                title={
                    <div className="flex items-center justify-between pr-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-blue-600" />
                            <span className="font-bold text-slate-800">Payroll Filters</span>
                        </div>
                        <Badge count={matchingCount !== null ? matchingCount : 0} showZero color="#10b981" overflowCount={999}>
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <Users className="h-4 w-4 text-emerald-600" />
                            </div>
                        </Badge>
                    </div>
                }
                placement="right"
                onClose={() => setShowFilters(false)}
                open={showFilters}
                width={400}
                className="font-sans"
                closeIcon={<X className="h-5 w-5 text-slate-400" />}
                footer={
                    <div className="flex flex-col gap-3 py-4 px-2">
                        <div className="flex items-center justify-between text-sm px-1">
                            <span className="text-slate-500 font-medium">Matching Employees:</span>
                            {fetchingCount ? (
                                <Loader className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                                <span className="font-bold text-slate-800">{matchingCount ?? '--'}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={clearFilters}
                                className="flex-1 h-11 font-semibold text-slate-600 hover:text-red-500 border-slate-200 rounded-xl"
                            >
                                Clear All
                            </Button>
                            <Button
                                type="primary"
                                className="flex-2 h-11 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl border-none shadow-emerald-200"
                                onClick={() => handleInitiate(true)}
                                disabled={matchingCount === 0 || calculating}
                                loading={calculating}
                            >
                                Run Filtered Payroll
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Department</label>
                        <Select
                            placeholder="All Departments"
                            value={filters.department}
                            onChange={v => setFilters(prev => ({ ...prev, department: v }))}
                            className="w-full h-11"
                            allowClear
                        >
                            <Select.Option value="All Departments">All Departments</Select.Option>
                            {availableDepartments.map(d => (
                                <Select.Option key={d._id} value={d.name}>{d.name}</Select.Option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Designation</label>
                        <Select
                            placeholder="All Designations"
                            value={filters.designation}
                            onChange={v => setFilters(prev => ({ ...prev, designation: v }))}
                            className="w-full h-11"
                            allowClear
                        >
                            <Select.Option value="All Designations">All Designations</Select.Option>
                            {availableDesignations.map(d => (
                                <Select.Option key={d} value={d}>{d}</Select.Option>
                            ))}
                        </Select>
                    </div>

                    <Divider className="my-2" />

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Employee Type</label>
                        <Select
                            mode="multiple"
                            placeholder="Select Employee Types"
                            value={filters.employeeType}
                            onChange={v => setFilters(prev => ({ ...prev, employeeType: v }))}
                            className="w-full"
                            maxTagCount="responsive"
                            options={EMPLOYEE_TYPES.map(t => ({ value: t, label: t }))}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Work Mode</label>
                        <Select
                            mode="multiple"
                            placeholder="Select Work Modes"
                            value={filters.workMode}
                            onChange={v => setFilters(prev => ({ ...prev, workMode: v }))}
                            className="w-full"
                            maxTagCount="responsive"
                            options={WORK_MODES.map(m => ({ value: m, label: m }))}
                        />
                    </div>
                </div>
            </Drawer>

            <PayrollCorrectionModal
                visible={correctionState.visible}
                onCancel={() => setCorrectionState({ visible: false, run: null })}
                payrollRun={correctionState.run}
            />
        </div >
    );
}

function StatusBadge({ status }) {
    const styles = {
        INITIATED: "bg-blue-100 text-blue-800",
        CALCULATED: "bg-purple-100 text-purple-800",
        APPROVED: "bg-emerald-100 text-emerald-800",
        PAID: "bg-green-100 text-green-800",
        CANCELLED: "bg-red-100 text-red-800",
        PROCESSING: "bg-amber-100 text-amber-800 animate-pulse"
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.INITIATED}`}>
            {status}
        </span>
    );
}
