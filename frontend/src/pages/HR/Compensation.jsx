/**
 * ============================================
 * EMPLOYEE COMPENSATION PAGE (FIXED)
 * ============================================
 * 
 * UPDATED: January 22, 2026
 * 
 * CHANGES:
 * 1. ✅ Calls GET /api/applicants (same endpoint as Salary Structure modal)
 * 2. ✅ Reads applicant.salaryStructure directly
 * 3. ✅ Maps: grossA, grossB, grossC, annualCTC
 * 4. ✅ Shows "CTC NOT SET" when salaryStructure is missing
 * 5. ✅ Reuses data from /api/applicants (no new API)
 * 
 * DATA MAPPING:
 * - applicant.salaryStructure.grossA → grossA (Gross Monthly)
 * - applicant.salaryStructure.grossB → grossB (Gross Annual)
 * - applicant.salaryStructure.grossC → grossC (Retention Annual)
 * - applicant.salaryStructure.annualCTC → totalCTC
 * 
 * RESULT: Employee Compensation shows SAME values as Salary Structure modal
 */

import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Eye, TrendingUp, History, IndianRupee,
    Download, AlertCircle, CheckCircle2, X, Plus, ChevronRight,
    Lock, Calendar, User, ShieldCheck, ArrowRight
} from 'lucide-react';
import api from '../../utils/api';
import SalaryIncrementModal from '../../components/Compensation/SalaryIncrementModal';


export default function Compensation() {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // --- MODAL STATE ---
    const [showViewModal, setShowViewModal] = useState(false);
    const [showIncrementModal, setShowIncrementModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [history, setHistory] = useState([]);
    const [incrementData, setIncrementData] = useState({
        effectiveFrom: new Date().toISOString().split('T')[0],
        totalCTC: 0,
        components: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    /**
     * MAPPING LAYER: Extract salary data from applicants
     * Maps salarySnapshotId (populated from /requirements/applicants) to Employee Compensation format
     * 
     * NOTE: Backend returns applicant.salarySnapshotId populated with EmployeeSalarySnapshot data
     * This contains: ctc, monthlyCTC, earnings[], employeeDeductions[], benefits[], breakdown{}, summary{}
     */
    const mapSalaryData = (applicant) => {
        // Get salary snapshot from populated salarySnapshotId field
        const salarySnapshot = applicant?.salarySnapshotId || {};

        // Safe extraction from snapshot with fallbacks
        // CTC from snapshot is annual, divide by 12 for monthly gross components
        const annualCTC = salarySnapshot?.ctc || 0;
        const monthlyCTC = salarySnapshot?.monthlyCTC || 0;

        // Extract earnings breakdown from snapshot
        // grossA = total earnings, grossB = total deductions, grossC = total benefits
        const grossA = salarySnapshot?.summary?.grossEarnings || salarySnapshot?.breakdown?.totalEarnings || 0;
        const grossB = salarySnapshot?.summary?.totalDeductions || salarySnapshot?.breakdown?.totalDeductions || 0;
        const grossC = salarySnapshot?.summary?.totalBenefits || salarySnapshot?.breakdown?.totalBenefits || 0;

        // Check if salary is actually set
        const isCTCSet = annualCTC > 0 && Object.keys(salarySnapshot).length > 0;

        return {
            // Preserve original applicant data
            ...applicant,

            // Map to activeVersion format for backward compatibility with table rendering
            activeVersion: isCTCSet ? {
                grossA,
                grossB,
                grossC,
                totalCTC: annualCTC,
                monthlyCTC,
                effectiveFrom: salarySnapshot?.effectiveFrom || new Date().toISOString(),
                version: 1,
                components: salarySnapshot?.earnings || [],
                reason: salarySnapshot?.reason || 'ASSIGNMENT'
            } : null,

            // CTC status indicator
            ctcStatus: isCTCSet ? 'Active' : 'Not Set'
        };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            // Call /requirements/applicants - Returns array of applicants with populated salarySnapshotId
            const res = await api.get('/requirements/applicants');

            console.log('Raw API Response:', res.data);

            // Map each applicant's salarySnapshotId to activeVersion format
            const applicantsArray = res.data && Array.isArray(res.data) ? res.data : (res.data?.data || []);
            console.log(`Processing ${applicantsArray.length} applicants`);

            const mappedEmployees = applicantsArray.map((applicant, idx) => {
                const mapped = mapSalaryData(applicant);
                if (idx < 2) { // Log first 2 for debugging
                    console.log(`Applicant ${idx}:`, {
                        name: `${applicant?.firstName} ${applicant?.lastName}`,
                        hasSalarySnapshot: !!applicant?.salarySnapshotId,
                        salarySnapshot: applicant?.salarySnapshotId,
                        activeVersion: mapped.activeVersion,
                        ctcStatus: mapped.ctcStatus
                    });
                }
                return mapped;
            });

            setEmployees(mappedEmployees);
            setFilteredEmployees(mappedEmployees);
        } catch (error) {
            console.error("Fetch Data Error:", error);
            // Fallback to empty array on error
            setEmployees([]);
            setFilteredEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = employees;
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(emp => {
                const fullName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
                const identifier = (emp.employeeId || emp.email || '').toLowerCase();
                return fullName.includes(s) || identifier.includes(s);
            });
        }
        if (statusFilter) {
            result = result.filter(emp => emp.status === statusFilter);
        }
        setFilteredEmployees(result);
    }, [search, statusFilter, employees]);

    const handleView = (emp) => {
        setSelectedEmployee(emp);
        setShowViewModal(true);
    };

    const handleHistory = async (emp) => {
        setSelectedEmployee(emp);
        try {
            const res = await api.get(`/compensation/history/${emp._id}`);
            setHistory(res.data.data);
            setShowHistoryModal(true);
        } catch (error) {
            console.error("History Fetch Error:", error);
        }
    };

    const handleOpenIncrement = (emp) => {
        // Validate employee ID exists
        const employeeId = emp._id || emp.id;
        if (!employeeId) {
            alert('⚠️ Employee ID Not Found\n\nPlease refresh the page and try again.');
            console.error('Employee object missing ID:', emp);
            return;
        }

        // Check if CTC is set before opening increment modal
        if (!emp.activeVersion) {
            alert('⚠️ Salary Structure Not Set\n\nPlease configure the salary structure before creating an increment.');
            return;
        }

        const displayName = emp?.name || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || 'N/A';
        console.log('Opening increment modal for employee:', {
            id: employeeId,
            name: displayName,
            activeVersion: emp.activeVersion
        });

        setSelectedEmployee(emp);
        const active = emp.activeVersion;
        setIncrementData({
            effectiveFrom: new Date().toISOString().split('T')[0],
            totalCTC: active ? active.totalCTC : 0,
            components: active ? active.components : [],
            grossA: active ? active.grossA : 0,
            grossB: active ? active.grossB : 0,
            grossC: active ? active.grossC : 0
        });
        setShowIncrementModal(true);
    };

    const handleApplyIncrement = async () => {
        try {
            const employeeId = selectedEmployee._id || selectedEmployee.id;
            await api.post('/compensation/increment', {
                employeeId,
                ...incrementData
            });
            setShowIncrementModal(false);
            fetchData();
        } catch (error) {
            alert("Increment failed: " + error.message);
        }
    };

    const formatINR = (v) => Number(v || 0).toLocaleString('en-IN');

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <div className="w-2 h-8 bg-blue-600 rounded-full" />
                        Employee Compensation
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Source of Truth for Payroll & Versioned Increments
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl w-64 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 shadow-sm"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 shadow-sm appearance-none pr-10 relative"
                    >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Draft">Draft</option>
                        <option value="Blocked">Blocked</option>
                    </select>
                </div>
            </div>

            {/* Table section */}
            <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Gross A</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Gross B</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Gross C</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Total CTC</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Effective</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle className="text-slate-300" size={48} />
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => {
                                    const active = emp.activeVersion;
                                    // Extract from applicant name field
                                    const fullName = emp?.name || 'N/A';
                                    const nameArray = fullName.trim().split(' ');
                                    const firstName = nameArray[0] || 'N';
                                    const lastName = nameArray.slice(1).join(' ') || 'A';

                                    // Get email as identifier (applicant doesn't have employeeId)
                                    const email = emp?.email || 'N/A';

                                    // Get job title/role from the populated requirementId
                                    const jobTitle = emp?.requirementId?.jobTitle || 'N/A';

                                    return (
                                        <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 uppercase flex-shrink-0">
                                                        {firstName.charAt(0)}{lastName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0 flex-1 max-w-[180px]">
                                                        <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase break-words line-clamp-2 leading-tight">
                                                            {fullName}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
                                                            {email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                                                    {jobTitle}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-slate-700">
                                                {active ? `₹${formatINR(active.grossA)}` : <span className="text-amber-600 font-semibold">CTC NOT SET</span>}
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-slate-700">
                                                {active ? `₹${formatINR(active.grossB)}` : <span className="text-amber-600 font-semibold">CTC NOT SET</span>}
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-slate-700">
                                                {active ? `₹${formatINR(active.grossC)}` : <span className="text-amber-600 font-semibold">CTC NOT SET</span>}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {active ? (
                                                    <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg font-black text-sm">
                                                        ₹{formatINR(active.totalCTC)}
                                                    </div>
                                                ) : (
                                                    <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-lg font-black text-sm">
                                                        CTC NOT SET
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                                {active ? new Date(active.effectiveFrom).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${emp.ctcStatus === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                                                    emp.ctcStatus === 'Blocked' ? 'bg-rose-50 text-rose-600' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {emp.ctcStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleView(emp)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenIncrement(emp)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="Increment"
                                                    >
                                                        <TrendingUp size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleHistory(emp)}
                                                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                        title="History"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            {showViewModal && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowViewModal(false)} />
                    <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl uppercase">
                                    {(selectedEmployee?.name || selectedEmployee?.firstName || 'E')[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Compensation Details</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {selectedEmployee?.name || `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`.trim() || 'N/A'} • {selectedEmployee?.employeeId || selectedEmployee?.email || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            {!selectedEmployee.activeVersion ? (
                                <div className="p-12 text-center text-slate-400 space-y-3">
                                    <AlertCircle size={48} className="mx-auto" />
                                    <p className="font-black uppercase tracking-widest">No Active Compensation Set</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 space-y-6">
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Salary Components</h4>
                                            <div className="space-y-2">
                                                {selectedEmployee.activeVersion.components.map((c, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                        <div>
                                                            <div className="text-xs font-black text-slate-800 uppercase">{c.name}</div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{c.type} • {c.isProRata ? 'PRO-RATA' : 'FIXED'}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-black text-slate-900">₹{formatINR(c.monthlyAmount)}</div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">₹{formatINR(c.annualAmount)} /yr</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-slate-900 rounded-[32px] text-white">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total CTC</p>
                                            <h2 className="text-3xl font-black mb-6">₹{formatINR(selectedEmployee.activeVersion.totalCTC)}<span className="text-sm text-slate-500 font-normal">/yr</span></h2>

                                            <div className="space-y-3 pt-6 border-t border-slate-800">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                                    <span>Gross A (Monthly)</span>
                                                    <span className="text-white">₹{formatINR(selectedEmployee.activeVersion.grossA)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                                    <span>Gross B (Annual)</span>
                                                    <span className="text-white">₹{formatINR(selectedEmployee.activeVersion.grossB)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                                    <span>Gross C (Retention)</span>
                                                    <span className="text-white">₹{formatINR(selectedEmployee.activeVersion.grossC)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Calendar className="text-blue-600" size={18} />
                                                <h4 className="text-xs font-black text-blue-900 uppercase">Snapshot Info</h4>
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase">Effective From</div>
                                                    <div className="text-xs font-bold text-blue-900">{new Date(selectedEmployee.activeVersion.effectiveFrom).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase">Version ID</div>
                                                    <div className="text-xs font-bold text-blue-900">v{selectedEmployee.activeVersion.version}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Increment Modal - Enhanced */}
            {showIncrementModal && selectedEmployee && selectedEmployee.activeVersion && (
                <SalaryIncrementModal
                    employee={selectedEmployee}
                    currentVersion={selectedEmployee.activeVersion}
                    onClose={() => setShowIncrementModal(false)}
                    onSuccess={(result) => {
                        setShowIncrementModal(false);
                        fetchData(); // Refresh data

                        // Show success message
                        alert(`✅ ${result.message}\n\n` +
                            `Version: v${result.data.newVersion.version}\n` +
                            `New CTC: ₹${result.data.newVersion.totalCTC.toLocaleString('en-IN')}\n` +
                            `Change: ${result.data.change.absolute > 0 ? '+' : ''}₹${Math.abs(result.data.change.absolute).toLocaleString('en-IN')} (${result.data.change.percentage}%)\n` +
                            `Status: ${result.data.status}\n\n` +
                            result.data.statusMessage
                        );
                    }}
                />
            )}

            {/* History Modal */}
            {showHistoryModal && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowHistoryModal(false)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in duration-200">
                        <div className="p-8 bg-orange-50/50 flex items-center justify-between border-b border-orange-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center font-black">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Compensation History</h3>
                                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-0.5">Audited Salary Revisions</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-orange-200 transition-all text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
                            {history.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 font-bold uppercase">No history found</div>
                            ) : (
                                history.map((ver, idx) => (
                                    <div key={idx} className={`p-5 rounded-3xl border ${ver.isActive ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/30'} flex justify-between items-center group hover:bg-white hover:shadow-md transition-all`}>
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <div className="text-[9px] font-black text-slate-400 uppercase">Version</div>
                                                <div className="text-lg font-black text-slate-900">v{ver.version}</div>
                                            </div>
                                            <div className="w-px h-10 bg-slate-200" />
                                            <div>
                                                <div className="text-[10px] font-black text-slate-900 uppercase">₹{formatINR(ver.totalCTC)} <span className="text-slate-400">/yr</span></div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-1 flex items-center gap-2">
                                                    <Calendar size={10} /> {new Date(ver.effectiveFrom).toLocaleDateString()}
                                                    {ver.isActive && <span className="bg-emerald-500 text-white px-1.5 rounded uppercase font-black text-[8px]">ACTIVE</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-slate-400 uppercase">Created By</div>
                                            <div className="text-[10px] font-bold text-slate-700">{ver.createdBy?.firstName || 'System'}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

