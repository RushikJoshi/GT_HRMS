import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Calculator, ShieldCheck, AlertCircle, Check, X, Database, Lock, Unlock, IndianRupee, TrendingUp, TrendingDown, Plus
} from 'lucide-react';
import api from '../../utils/api';

/**
 * ============================================
 * SALARY STRUCTURE (v9.0) - ARCHITECT EDITION
 * ============================================
 */

export default function SalaryStructure() {
    const { candidateId } = useParams();
    const navigate = useNavigate();

    // --- CORE STATE ---
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [candidate, setCandidate] = useState(null);

    // --- UI SELECTION STATE ---
    const [ctcInput, setCtcInput] = useState('');
    const [selectedEarnings, setSelectedEarnings] = useState([]);
    const [selectedDeductions, setSelectedDeductions] = useState([]);
    const [selectedBenefits, setSelectedBenefits] = useState([]);

    // --- CALCULATION RESULT STATE ---
    const [salaryData, setSalaryData] = useState({
        annualCTC: 0,
        locked: false,
        breakdown: { earnings: [], deductions: [], benefits: [] },
        totals: { netMonthly: 0, grossMonthly: 0, deductionMonthly: 0 }
    });

    // --- MODAL STATE ---
    const [showModal, setShowModal] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [availableComponents, setAvailableComponents] = useState({ earnings: [], deductions: [], benefits: [] });
    const [tempSelectedIds, setTempSelectedIds] = useState([]);

    // --- HELPERS ---
    const safe = (v) => {
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    };
    const formatINR = (v) => {
        try {
            return safe(v).toLocaleString('en-IN');
        } catch (e) {
            return "0";
        }
    };

    const deriveCode = (c) => {
        if (!c) return '';
        const raw = (c.code || c.name || '').toUpperCase().trim();
        if (raw.includes('BASIC')) return 'BASIC';
        if (raw.includes('SPECIAL')) return 'SPECIAL_ALLOWANCE';
        return raw.replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    };

    // --- INITIALIZATION ---
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                // 1. Fetch Candidate
                const candidateRes = await api.get(`/requirements/applicants/${candidateId}`).catch(() => api.get(`/hr/employees/${candidateId}`));
                const cData = candidateRes.data?.data || candidateRes.data;
                setCandidate(cData);

                // 2. Fetch Master Components
                const [eMaster, dMaster, bMaster] = await Promise.all([
                    api.get('/payroll/earnings'), api.get('/deductions'), api.get('/payroll/benefits')
                ]);
                setAvailableComponents({
                    earnings: eMaster.data?.data || [],
                    deductions: dMaster.data?.data || [],
                    benefits: bMaster.data?.data || []
                });

                // 3. Fetch Current Snapshot/Calculation
                const url = `/salary/current?applicantId=${candidateId}`;
                console.log(`[DEBUG] Fetching salary from: ${url}`);
                const currentRes = await api.get(url);
                const sData = currentRes.data?.data;
                console.log(`[DEBUG] Received salary data:`, sData);

                if (sData) {
                    setSalaryData({
                        annualCTC: safe(sData.annualCTC),
                        locked: !!sData.locked,
                        breakdown: {
                            earnings: sData.earnings || [],
                            deductions: sData.deductions || [],
                            benefits: sData.benefits || []
                        },
                        totals: sData.totals || { netMonthly: 0, grossMonthly: 0, deductionMonthly: 0 }
                    });
                    setCtcInput(sData.annualCTC ? sData.annualCTC.toString() : '');
                    setSelectedEarnings(sData.earnings || []);
                    setSelectedDeductions(sData.deductions || []);
                    setSelectedBenefits(sData.benefits || []);
                }
            } catch (err) {
                console.error("[DEBUG] Initialization Error:", err);
                setError("Initialization failed: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [candidateId]);

    // --- AUTO-CALCULATION LOGIC ---
    useEffect(() => {
        const ctc = safe(ctcInput);
        if (ctc <= 0 || salaryData.locked) return;

        const timer = setTimeout(() => {
            handleCalculate();
        }, 800);

        return () => clearTimeout(timer);
    }, [ctcInput, selectedEarnings, selectedDeductions, selectedBenefits]);

    const handleCalculate = async () => {
        try {
            const payload = {
                annualCTC: safe(ctcInput),
                selectedEarnings,
                selectedDeductions,
                selectedBenefits
            };

            const res = await api.post('/salary/preview', payload);
            if (res.data?.success) {
                const result = res.data.data;
                setSalaryData({
                    annualCTC: result.annualCTC || 0,
                    locked: false,
                    breakdown: {
                        earnings: result.earnings || [],
                        deductions: result.deductions || [],
                        benefits: result.benefits || []
                    },
                    totals: result.totals || { netMonthly: 0, grossMonthly: 0, deductionMonthly: 0 }
                });
            }
        } catch (err) {
            console.error("Calculation Error:", err);
            setError("Calculation failed: " + (err.response?.data?.message || err.message));
        }
    };

    // --- ACTIONS ---
    const handleSaveDraft = async () => {
        if (safe(salaryData.annualCTC) <= 0) return;
        try {
            setSaving(true);
            const payload = {
                applicantId: candidateId,
                annualCTC: safe(ctcInput),
                earnings: selectedEarnings,
                deductions: selectedDeductions,
                benefits: selectedBenefits
            };
            await api.post('/salary/assign', payload);
            alert("Draft Saved Successfully");
        } catch (err) {
            alert("Save Failed: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleFinalize = async () => {
        try {
            setSaving(true);
            const res = await api.post('/salary/confirm', { applicantId: candidateId });
            if (res.data?.success) {
                setSalaryData(p => ({ ...p, locked: true }));
                alert("Salary Finalized & Locked!");
            }
        } catch (err) {
            alert("Lock Failed: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleUnlock = async () => {
        if (!window.confirm("Unlock this salary? All locked data will become editable.")) return;
        try {
            setSaving(true);
            await api.post('/salary/unlock', { applicantId: candidateId });
            setSalaryData(p => ({ ...p, locked: false }));
        } catch (err) {
            alert("Unlock Failed");
        } finally {
            setSaving(false);
        }
    };

    // --- MODAL WRANGLING ---
    const openModal = (section) => {
        if (salaryData.locked) return;
        setActiveSection(section);
        const current = section === 'Earnings' ? selectedEarnings : section === 'Deductions' ? selectedDeductions : selectedBenefits;

        let codes = current.map(c => deriveCode(c));

        // Auto-include mandatory codes if they are in the master list
        if (section === 'Earnings') {
            const masterCodes = availableComponents.earnings.map(m => deriveCode(m));
            if (masterCodes.includes('BASIC') && !codes.includes('BASIC')) codes.push('BASIC');
            if (masterCodes.includes('SPECIAL_ALLOWANCE') && !codes.includes('SPECIAL_ALLOWANCE')) codes.push('SPECIAL_ALLOWANCE');
        }

        setTempSelectedIds(codes);
        setShowModal(true);
    };

    const confirmSelection = () => {
        const master = availableComponents[activeSection.toLowerCase()] || [];
        const filtered = master.filter(m => tempSelectedIds.includes(deriveCode(m)));
        if (activeSection === 'Earnings') setSelectedEarnings(filtered);
        else if (activeSection === 'Deductions') setSelectedDeductions(filtered);
        else setSelectedBenefits(filtered);
        setShowModal(false);
    };

    // --- AUTO-BALANCE LOGIC (NEW) ---
    // --- AUTO-BALANCE LOGIC (SMART FIT) ---
    const handleAutoBalance = () => {
        const ctc = safe(ctcInput);
        if (ctc <= 0) return;

        // 1. Calculate Limits
        const basicAnnual = ctc * 0.40;
        let used = basicAnnual; // Basic is mandatory

        // 2. Sum up Fixed & Percentage Costs (Excluding HRA & SA)
        // We will treat HRA as the variable lever to shrink
        const otherEarnings = selectedEarnings.filter(e => {
            const code = deriveCode(e);
            return code !== 'BASIC' && code !== 'SPECIAL_ALLOWANCE' && code !== 'HOUSE_RENT_ALLOWANCE';
        });

        const calculateComponentCost = (list) => {
            return list.reduce((sum, c) => {
                const code = deriveCode(c);
                if (code === 'SPECIAL_ALLOWANCE') return sum;

                // Hardcoded Statutory
                if (code === 'PROFESSIONAL_TAX') return sum + 2400;
                if (code === 'EMPLOYER_PF' || code === 'EMPLOYEE_PF' || code === 'PF') return sum + (basicAnnual * 0.12);
                if (code === 'GRATUITY') return sum + (basicAnnual * 0.0481);

                // Configured
                const type = (c.calculationType || c.amountType || 'FIXED').toUpperCase();
                const base = (c.basedOn || c.calculationBase || 'NA').toUpperCase();
                const val = safe(c.value || c.amount || c.percentage || 0);

                if (type.includes('PERCENT')) {
                    if (base === 'BASIC') return sum + (basicAnnual * val / 100);
                    return sum + (ctc * val / 100);
                } else {
                    return sum + (val * 12);
                }
            }, 0);
        };

        used += calculateComponentCost(otherEarnings);
        used += calculateComponentCost(selectedDeductions); // Usually PT/PF covered above but safe to run
        used += calculateComponentCost(selectedBenefits);

        // 3. Determine remaining space for HRA + SA
        const remaining = ctc - used;

        if (remaining < 0) {
            alert(`Critical Error: Fixed Allocations (${formatINR(used)}) exceed CTC (${formatINR(ctc)}). Cannot balance without removing components.`);
            return;
        }

        // 4. Adjust HRA
        // Default Expectation: HRA = 50% of Basic (Standard) or 40%
        // We set HRA to absorb the remaining space, leaving 0 for SA (or small buffer)
        // Actually, SA is the balancer, so SA should take the dust. 
        // We sets HRA to "Max possible" or "Standard".

        // Let's check current HRA config
        const currentHRA = selectedEarnings.find(e => deriveCode(e) === 'HOUSE_RENT_ALLOWANCE');
        if (currentHRA) {
            // New Plan: Set HRA to (Remaining - 1200). 1200 for SA buffer (100/mo)
            // If Remaining is huge, cap HRA at 50% of Basic.

            const maxHRA = basicAnnual * 0.50; // Standard Cap
            let newHRAValue = remaining - 1200; // Leave buffer for SA

            if (newHRAValue > maxHRA) newHRAValue = maxHRA;
            if (newHRAValue < 0) newHRAValue = 0;

            // Update HRA to FIXED Amount to ensure stability
            const updatedHRA = {
                ...currentHRA,
                calculationType: 'FIXED',
                value: newHRAValue / 12, // Monthly Amount
                amount: newHRAValue / 12,
                amountType: 'FIXED',
                basedOn: 'NA'
            };

            const newEarnings = selectedEarnings.map(e =>
                deriveCode(e) === 'HOUSE_RENT_ALLOWANCE' ? updatedHRA : e
            );

            setSelectedEarnings(newEarnings);
            // Trigger calculation
            setError(null);
            setTimeout(handleCalculate, 100); // Allow state to update
        } else {
            // No HRA found? Then the Deficit is from other things.
            alert(`Cannot Auto-Balance: HRA component not found to adjust. Please reduce allowance amounts manually.`);
        }
    };

    // --- VALIDATION FOR SHIELD ---
    const isSumCorrect = Math.abs(safe(salaryData.annualCTC) - safe(ctcInput)) < 2 && safe(ctcInput) > 0;
    const canLock = isSumCorrect && !salaryData.locked && salaryData.breakdown.earnings.length > 0;

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Database className="animate-spin text-blue-600" size={48} />
                <p className="font-black text-slate-400 animate-pulse">LOADING ARCHITECTURE...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {error && (
                <div className="bg-rose-600 text-white px-8 py-3 flex items-center justify-between animate-in slide-in-from-top-full duration-300">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} />
                        <span className="font-bold text-sm tracking-wide">{error}</span>
                        {(error.includes('CTC') || error.includes('exceeds')) && (
                            <button
                                onClick={handleAutoBalance}
                                className="ml-4 px-3 py-1 bg-white text-rose-600 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-rose-50 transition-colors shadow-sm"
                            >
                                AUTO BALANCE
                            </button>
                        )}
                    </div>
                    <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg"><X size={18} /></button>
                </div>
            )}
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 sm:px-8 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 sm:gap-6 w-full md:w-auto overflow-hidden">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors flex-shrink-0">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{candidate?.name || 'Loading...'}</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase whitespace-nowrap">{candidate?.requirementId?.jobTitle || 'CANDIDATE'}</span>
                            {salaryData.locked && <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase flex items-center gap-1"><ShieldCheck size={10} /> LOCKED</span>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:flex-initial">
                        <input
                            type="number"
                            value={ctcInput}
                            disabled={salaryData.locked}
                            onChange={(e) => setCtcInput(e.target.value)}
                            placeholder="ANNUAL CTC"
                            className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 sm:px-6 py-3 font-black text-blue-900 sm:text-lg w-full md:w-48 focus:border-blue-500 focus:bg-white transition-all outline-none disabled:opacity-50"
                        />
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg">
                            <IndianRupee size={12} strokeWidth={4} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={handleCalculate}
                            disabled={salaryData.locked || safe(ctcInput) <= 0}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black hover:bg-blue-100 transition-all disabled:opacity-30 whitespace-nowrap"
                        >
                            <Calculator size={18} />
                            <span className="hidden sm:inline">CALCULATE</span>
                            <span className="sm:hidden">CALC</span>
                        </button>

                        <button
                            onClick={handleSaveDraft}
                            disabled={salaryData.locked || saving || safe(ctcInput) <= 0}
                            className="p-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-30"
                        >
                            <Database size={20} />
                        </button>
                    </div>

                    <button
                        onClick={handleFinalize}
                        disabled={!canLock || saving}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-3 px-6 sm:px-8 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95 disabled:opacity-30 whitespace-nowrap ${salaryData.locked ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white shadow-slate-200'}`}
                    >
                        {saving ? <Database size={20} className="animate-spin" /> : (salaryData.locked ? <ShieldCheck size={20} /> : <Lock size={20} />)}
                        <span className="text-xs sm:text-sm">{salaryData.locked ? 'FINALIZED' : 'FINALIZE & LOCK'}</span>
                    </button>

                    {salaryData.locked && (
                        <button onClick={handleUnlock} className="p-3 bg-orange-50 text-orange-600 rounded-2xl border-2 border-orange-100 hover:bg-orange-100 transition-all">
                            <Unlock size={20} />
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Breakup Section */}
                <div className="lg:col-span-8 space-y-8 order-2 lg:order-1">
                    {['Earnings', 'Deductions', 'Benefits'].map(section => (
                        <section key={section} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    <div className={`w-2 h-6 rounded-full ${section === 'Earnings' ? 'bg-emerald-500' : section === 'Deductions' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                    {section}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (salaryData.locked) return;
                                            const componentName = prompt(`Enter ${section.slice(0, -1)} name:`);
                                            if (!componentName) return;
                                            const monthlyValue = prompt('Enter monthly amount (₹):');
                                            if (!monthlyValue) return;

                                            const monthly = safe(monthlyValue);
                                            const yearly = monthly * 12;
                                            const code = componentName.toUpperCase().replace(/\s+/g, '_');

                                            const newComponent = {
                                                code,
                                                name: componentName,
                                                monthly,
                                                yearly,
                                                value: monthly,
                                                amount: monthly,
                                                calculationType: 'FIXED',
                                                basedOn: 'NA'
                                            };

                                            const sectionKey = section.toLowerCase();
                                            const updatedBreakdown = [...salaryData.breakdown[sectionKey], newComponent];

                                            // Recalculate totals
                                            const allEarnings = sectionKey === 'earnings' ? updatedBreakdown : salaryData.breakdown.earnings;
                                            const allDeductions = sectionKey === 'deductions' ? updatedBreakdown : salaryData.breakdown.deductions;
                                            const allBenefits = sectionKey === 'benefits' ? updatedBreakdown : salaryData.breakdown.benefits;

                                            const grossMonthly = allEarnings.reduce((sum, e) => sum + safe(e.monthly), 0);
                                            const deductionMonthly = allDeductions.reduce((sum, d) => sum + safe(d.monthly), 0);
                                            const netMonthly = grossMonthly - deductionMonthly;
                                            const annualCTC = (grossMonthly + allBenefits.reduce((sum, b) => sum + safe(b.monthly), 0)) * 12;

                                            setSalaryData({
                                                ...salaryData,
                                                breakdown: {
                                                    ...salaryData.breakdown,
                                                    [sectionKey]: updatedBreakdown
                                                },
                                                totals: {
                                                    grossMonthly,
                                                    deductionMonthly,
                                                    netMonthly
                                                },
                                                annualCTC
                                            });

                                            setCtcInput(Math.round(annualCTC).toString());
                                        }}
                                        disabled={salaryData.locked}
                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-30"
                                        title="Add Custom Component"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        onClick={() => openModal(section)}
                                        disabled={salaryData.locked}
                                        className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all disabled:opacity-30"
                                    >
                                        MODIFY ({salaryData.breakdown[section.toLowerCase()]?.length || 0})
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {salaryData.breakdown[section.toLowerCase()]?.map((comp, idx) => (
                                    <div key={comp.code} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 relative">
                                        {!salaryData.locked && comp.code !== 'BASIC' && comp.code !== 'SPECIAL_ALLOWANCE' && (
                                            <button
                                                onClick={() => {
                                                    if (!window.confirm(`Remove ${comp.name}?`)) return;

                                                    const sectionKey = section.toLowerCase();
                                                    const updatedBreakdown = salaryData.breakdown[sectionKey].filter((_, i) => i !== idx);

                                                    // Recalculate totals
                                                    const allEarnings = sectionKey === 'earnings' ? updatedBreakdown : salaryData.breakdown.earnings;
                                                    const allDeductions = sectionKey === 'deductions' ? updatedBreakdown : salaryData.breakdown.deductions;
                                                    const allBenefits = sectionKey === 'benefits' ? updatedBreakdown : salaryData.breakdown.benefits;

                                                    const grossMonthly = allEarnings.reduce((sum, e) => sum + safe(e.monthly), 0);
                                                    const deductionMonthly = allDeductions.reduce((sum, d) => sum + safe(d.monthly), 0);
                                                    const netMonthly = grossMonthly - deductionMonthly;
                                                    const annualCTC = (grossMonthly + allBenefits.reduce((sum, b) => sum + safe(b.monthly), 0)) * 12;

                                                    setSalaryData({
                                                        ...salaryData,
                                                        breakdown: {
                                                            ...salaryData.breakdown,
                                                            [sectionKey]: updatedBreakdown
                                                        },
                                                        totals: {
                                                            grossMonthly,
                                                            deductionMonthly,
                                                            netMonthly
                                                        },
                                                        annualCTC
                                                    });

                                                    setCtcInput(Math.round(annualCTC).toString());
                                                }}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-lg"
                                                title="Remove Component"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-slate-800 uppercase truncate">{comp.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {comp.calculationType} {comp.basedOn !== 'NA' ? `OF ${comp.basedOn}` : ''}
                                                </span>
                                                {comp.code === 'SPECIAL_ALLOWANCE' && <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 rounded uppercase">BALANCER</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {salaryData.locked ? (
                                                <>
                                                    <p className="font-black text-slate-900">₹{formatINR(comp.monthly)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">₹{formatINR(comp.yearly)} /yr</p>
                                                </>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-slate-400">₹</span>
                                                        <input
                                                            type="number"
                                                            value={Math.round(comp.monthly) || ''}
                                                            onChange={(e) => {
                                                                const newMonthly = safe(e.target.value);
                                                                const newYearly = newMonthly * 12;

                                                                // Update the component in the breakdown
                                                                const sectionKey = section.toLowerCase();
                                                                const updatedBreakdown = [...salaryData.breakdown[sectionKey]];
                                                                updatedBreakdown[idx] = {
                                                                    ...comp,
                                                                    monthly: newMonthly,
                                                                    yearly: newYearly,
                                                                    value: newMonthly,
                                                                    amount: newMonthly
                                                                };

                                                                // Recalculate totals
                                                                const allEarnings = sectionKey === 'earnings' ? updatedBreakdown : salaryData.breakdown.earnings;
                                                                const allDeductions = sectionKey === 'deductions' ? updatedBreakdown : salaryData.breakdown.deductions;
                                                                const allBenefits = sectionKey === 'benefits' ? updatedBreakdown : salaryData.breakdown.benefits;

                                                                const grossMonthly = allEarnings.reduce((sum, e) => sum + safe(e.monthly), 0);
                                                                const deductionMonthly = allDeductions.reduce((sum, d) => sum + safe(d.monthly), 0);
                                                                const netMonthly = grossMonthly - deductionMonthly;
                                                                const annualCTC = (grossMonthly + allBenefits.reduce((sum, b) => sum + safe(b.monthly), 0)) * 12;

                                                                setSalaryData({
                                                                    ...salaryData,
                                                                    breakdown: {
                                                                        ...salaryData.breakdown,
                                                                        [sectionKey]: updatedBreakdown
                                                                    },
                                                                    totals: {
                                                                        grossMonthly,
                                                                        deductionMonthly,
                                                                        netMonthly
                                                                    },
                                                                    annualCTC
                                                                });

                                                                // Update CTC input
                                                                setCtcInput(Math.round(annualCTC).toString());
                                                            }}
                                                            className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">₹{formatINR(comp.yearly || comp.monthly * 12)} /yr</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="lg:col-span-4 space-y-6 order-1 lg:order-2 lg:sticky lg:top-28 h-fit">
                    <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Monthly Take-Home</p>
                        <h2 className="text-3xl sm:text-5xl font-black mb-6 sm:mb-10 flex items-center gap-3">
                            ₹{formatINR(salaryData?.totals?.netMonthly || 0)}<span className="text-base sm:text-lg text-slate-500">/mo</span>
                        </h2>

                        <div className="space-y-4 pt-8 border-t border-slate-800">
                            {[
                                { label: 'Gross Income', val: salaryData?.totals?.grossMonthly || 0, color: 'text-emerald-400', icon: TrendingUp },
                                { label: 'Total Deductions', val: salaryData?.totals?.deductionMonthly || 0, color: 'text-rose-400', icon: TrendingDown },
                                { label: 'Annual CTC', val: salaryData?.annualCTC || 0, color: 'text-blue-400', icon: IndianRupee }
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg"><item.icon size={14} className={item.color} /></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    <span className={`font-black ${item.color}`}>₹{formatINR(item.val)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-600 rounded-[32px] p-6 sm:p-8 text-white shadow-lg relative cursor-help group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 sm:p-3 bg-white/20 rounded-2xl"><Calculator size={20} sm:size={24} /></div>
                            <h4 className="font-black uppercase tracking-tight text-sm">System Status</h4>
                        </div>
                        <p className="text-[11px] font-medium leading-relaxed opacity-80">
                            Calculation Engine v9.0 Active. Every component is derived from CTC. Special Allowance adjusts automatically to ensure 100% precision.
                        </p>
                        <div className="mt-6 pt-6 border-t border-white/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest">Integrity Check</span>
                            {isSumCorrect ? <Check size={16} className="text-emerald-300" /> : <AlertCircle size={16} className="text-warning-300" />}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Modify {activeSection}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Select components to include in structure</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 max-h-[500px] overflow-y-auto grid grid-cols-2 gap-4">
                            {(availableComponents[activeSection.toLowerCase()] || []).map(comp => {
                                const code = deriveCode(comp);
                                const isSelected = tempSelectedIds.includes(code);
                                // Prevent unselecting BASIC or SPECIAL_ALLOWANCE
                                const isMandatory = code === 'BASIC' || code === 'SPECIAL_ALLOWANCE';

                                return (
                                    <button
                                        key={code}
                                        disabled={isMandatory}
                                        onClick={() => setTempSelectedIds(p => isSelected ? p.filter(id => id !== code) : [...p, code])}
                                        className={`p-5 rounded-[24px] border-2 text-left transition-all relative overflow-hidden group ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'} ${isMandatory ? 'opacity-50 grayscale' : ''}`}
                                    >
                                        <p className={`font-black uppercase text-xs transition-colors ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{comp.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                            {comp.calculationType} {comp.calculationBase ? `OF ${comp.calculationBase}` : ''}
                                        </p>
                                        {isSelected && <div className="absolute top-4 right-4 text-blue-600"><Check size={16} strokeWidth={3} /></div>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase">{tempSelectedIds.length} COMPONENTS SELECTED</span>
                            <button onClick={confirmSelection} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
                                APPLY CONFIGURATION
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
