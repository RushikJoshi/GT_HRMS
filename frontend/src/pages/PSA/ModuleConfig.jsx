import React, { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import {
  applyModuleDependencies,
  createDefaultEnabledModules,
  normalizeEnabledModules
} from "../../utils/moduleConfig";
import {
  Save,
  Settings,
  Search,
  Check,
  LayoutGrid,
  Building2,
  CircleDollarSign,
  Users,
  Clock,
  Briefcase,
  UserCircle2,
  Plus,
  CircleFadingPlus,
  ChevronDown,
  CheckCircle2,
  ArrowLeft,
  Cpu,
  Zap,
  ShieldCheck,
  ToggleRight
} from "lucide-react";

/**
 * Module Configuration Component
 * Allows Super Admins to enable/disable specific modules for each tenant.
 */

const AVAILABLE_MODULES = [
  { code: "hr", label: "HR Management", description: "Employee records, roles & hierarchy", icon: Users },
  { code: "payroll", label: "Payroll System", description: "Salaries, taxes & disbursements", icon: CircleDollarSign },
  { code: "attendance", label: "Attendance & Time", description: "Shifts, biometrics & tracking", icon: Clock },
  { code: "leave", label: "Leave Management", description: "Leave apply, tracking & approval", icon: Clock },
  { code: "employeePortal", label: "Employee Portal", description: "Self-service dashboard", icon: UserCircle2 },
  { code: "recruitment", label: "Recruitment", description: "Hiring, jobs & applicants", icon: Briefcase },
  { code: "backgroundVerification", label: "BGV", description: "Background Verification", icon: ShieldCheck },
  { code: "documentManagement", label: "Document Management", description: "Managing and Sending Documents and Offers", icon: CircleFadingPlus },
  { code: "socialMediaIntegration", label: "Social Media Integration", description: "Social Media Integration and Automation", icon: Zap },
];

export default function ModuleConfig({ company, onClose }) {
  const { id } = useParams(); // Get company ID from URL if in standalone mode
  const navigate = useNavigate();
  const isStandalonePage = !company && id; // Determine if we're in standalone page mode

  const [enabledModules, setEnabledModules] = useState(
    createDefaultEnabledModules(false, AVAILABLE_MODULES.map(m => m.code))
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(company || null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const container = document.getElementById('org-dropdown-container');
      if (container && !container.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCount = useMemo(() => {
    return AVAILABLE_MODULES.reduce(
      (count, mod) => count + (enabledModules?.[mod.code] ? 1 : 0),
      0
    );
  }, [enabledModules]);

  const allSelected = activeCount === AVAILABLE_MODULES.length;

  // Load all companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Load company from URL parameter if in standalone mode
  useEffect(() => {
    if (isStandalonePage && companies.length > 0) {
      const companyFromUrl = companies.find(c => c._id === id);
      if (companyFromUrl) {
        setSelectedCompany(companyFromUrl);
      }
    }
  }, [id, companies, isStandalonePage]);

  // Sync state if 'company' prop changes
  useEffect(() => {
    const normalized = normalizeEnabledModules(
      company?.enabledModules,
      company?.modules
    );

    const filtered = Object.fromEntries(
      AVAILABLE_MODULES.map(m => [m.code, normalized?.[m.code] === true])
    );

    setEnabledModules(filtered);

    if (company) {
      setSelectedCompany(company);
      const normalized = normalizeEnabledModules(company.enabledModules, company.modules);
      setEnabledModules(Object.fromEntries(
        AVAILABLE_MODULES.map((m) => [m.code, normalized[m.code] === true])
      ));
    }
  }, [company]);

  // Sync local module state when a new company is selected from dropdown
  useEffect(() => {
    if (selectedCompany) {
      const normalized = normalizeEnabledModules(selectedCompany?.enabledModules, selectedCompany?.modules);
      const filtered = Object.fromEntries(
        AVAILABLE_MODULES.map((m) => [m.code, normalized[m.code] === true])
      );
      setEnabledModules(filtered);
    }
  }, [selectedCompany]);

  async function loadCompanies() {
    try {
      setLoading(true);
      const res = await api.get("/tenants");
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.tenants || res.data?.data || [];
      setCompanies(list || []);
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAll() {
    if (!selectedCompany) return;
    if (allSelected) {
      setEnabledModules(Object.fromEntries(AVAILABLE_MODULES.map(m => [m.code, false])));
    } else {
      setEnabledModules(applyModuleDependencies(Object.fromEntries(AVAILABLE_MODULES.map(m => [m.code, true]))));
    }
  }

  function toggle(code) {
    if (!selectedCompany) return;
    setEnabledModules((prev) => {
      const next = { ...prev, [code]: !prev[code] };
      return applyModuleDependencies(next);
    });
  }

  async function handleSave() {
    const target = selectedCompany || company;
    if (!target?._id) return;

    setSaving(true);
    try {
      const payloadModules = applyModuleDependencies({ ...enabledModules });

      await api.put(
        `/tenants/company/${target._id}/modules`,
        { enabledModules: payloadModules }
      );

      alert("Configuration updated successfully!");
      if (typeof onClose === "function") onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent p-4 lg:p-6 font-['Inter',sans-serif] text-slate-900 relative overflow-hidden pb-20">
      {/* Premium Background Aura */}
      <div className="fixed -top-20 -right-20 w-[600px] h-[600px] bg-emerald-50/50 blur-[150px] rounded-full -z-10 animate-pulse"></div>
      <div className="fixed -bottom-20 -left-20 w-[500px] h-[500px] bg-[#14B8A6]/5 blur-[120px] rounded-full -z-10 animate-pulse delay-1000"></div>

      <div className="w-full space-y-6 animate-in fade-in duration-700">



        {/* Configuration Core Card */}
        <div className="bg-white rounded-[40px] border border-slate-100/80 overflow-hidden shadow-none">

          {/* Top Selection Area */}
          <div className="p-6 sm:p-8 border-b border-slate-100/80 bg-slate-50/30">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={14} className="text-[#14B8A6] animate-spin-slow" />
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Configuration Target</label>
                </div>
                <div className="relative group" id="org-dropdown-container">
                  <div
                    onClick={() => !loading && setIsOpen(!isOpen)}
                    className={`relative flex items-center h-[72px] bg-white border rounded-[28px] px-8 cursor-pointer transition-all duration-300 
                      ${isOpen ? 'border-[#14B8A6] ring-4 ring-[#14B8A6]/5 shadow-lg' : 'border-slate-200 hover:border-[#14B8A6]/30'}`}
                  >
                    <div className={`flex items-center gap-4 transition-colors ${isOpen ? 'text-[#14B8A6]' : 'text-slate-400'}`}>
                      <Building2 size={24} strokeWidth={1.5} />
                      <div className="h-7 w-[1px] bg-slate-100"></div>
                    </div>

                    <div className="flex-1 px-4 overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Target Organization</p>
                      <p className="text-[16px] font-normal text-slate-700 truncate">
                        {selectedCompany ? selectedCompany.name : '-- Choose Organization --'}
                      </p>
                    </div>

                    <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#14B8A6]' : 'text-slate-300'}`}>
                      <ChevronDown size={20} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Modern Dropdown Menu */}
                  {isOpen && (
                    <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white border border-slate-100 rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] py-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      {/* Search Input inside Dropdown */}
                      <div className="px-6 pb-4 mb-2 border-b border-slate-50">
                        <div className="relative flex items-center px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-[#14B8A6]/30 transition-all">
                          <Search size={16} className="text-slate-400" />
                          <input
                            type="text"
                            placeholder="Find organization..."
                            className="bg-transparent border-none focus:ring-0 text-[14px] px-3 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto px-3 space-y-1 custom-scrollbar">
                        {companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                          <div className="py-10 text-center">
                            <p className="text-slate-400 text-[13px]">No matching companies found</p>
                          </div>
                        ) : (
                          companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                            <div
                              key={c._id}
                              onClick={() => {
                                setSelectedCompany(c);
                                setIsOpen(false);
                                setSearchQuery('');
                              }}
                              className={`group flex items-center justify-between px-6 py-4 rounded-2xl cursor-pointer transition-all duration-200
                                ${selectedCompany?._id === c._id
                                  ? 'bg-[#14B8A6]/5 text-[#14B8A6]'
                                  : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedCompany?._id === c._id ? 'bg-[#14B8A6] text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400 group-hover:bg-white'}`}>
                                  <Building2 size={18} />
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[14px] font-medium leading-none">{c.name}</p>
                                  <p className="text-[11px] font-normal opacity-50 uppercase tracking-widest">{c.code || 'CORE-ID'}</p>
                                </div>
                              </div>
                              {selectedCompany?._id === c._id && (
                                <div className="w-6 h-6 rounded-full bg-[#14B8A6] flex items-center justify-center text-white scale-110 shadow-lg shadow-emerald-500/20">
                                  <Check size={14} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Active Payload</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-normal text-[#14B8A6]">{activeCount}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-xl text-slate-400">{AVAILABLE_MODULES.length}</span>
                  </div>
                </div>

                <button
                  onClick={handleSelectAll}
                  disabled={!selectedCompany}
                  className={`flex items-center gap-3 px-8 h-16 rounded-[24px] border transition-all duration-300 group
                    ${allSelected
                      ? 'bg-[#14B8A6] border-[#14B8A6] text-white shadow-[0_10px_20px_-5px_rgba(20,184,166,0.2)]'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-[#14B8A6]/30 hover:bg-emerald-50/30'}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${allSelected ? 'bg-white/20' : 'bg-slate-50 border border-slate-100'}`}>
                    <Check size={14} strokeWidth={3} className={allSelected ? 'text-white' : 'text-transparent'} />
                  </div>
                  <span className="text-[13px] font-medium tracking-tight">Fully Configured</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modules Grid Area */}
          <div className="p-6 sm:p-8 min-h-[400px]">
            {!selectedCompany ? (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-slate-50/30 rounded-[32px] border-2 border-dashed border-slate-100">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 text-slate-200 shadow-sm">
                  <LayoutGrid size={40} strokeWidth={1} />
                </div>
                <h4 className="text-lg font-normal text-slate-600 tracking-tight">No Selection Detected</h4>
                <p className="text-[14px] text-slate-400 mt-2">Select a tenant organization above to begin architecture mapping.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {AVAILABLE_MODULES.map((m, idx) => {
                  const active = !!enabledModules[m.code];
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.code}
                      onClick={() => !saving && toggle(m.code)}
                      className={`group relative p-5 rounded-[28px] border transition-all duration-500 cursor-pointer animate-in fade-in slide-in-from-bottom-4 shadow-none hover:border-[#14B8A6]/30
                        ${active
                          ? 'bg-white border-[#14B8A6]/20'
                          : 'bg-white/50 border-slate-100 hover:border-slate-200'}`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {/* Interactive Corner Glow */}
                      {active && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full -z-10"></div>
                      )}

                      {/* Header Row */}
                      <div className="flex justify-between items-start mb-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 
                          ${active ? 'bg-[#14B8A6]/10 text-[#14B8A6] rotate-6' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                          <Icon size={22} strokeWidth={1.5} />
                        </div>

                        <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-500
                          ${active ? 'bg-[#14B8A6] border-[#14B8A6] text-white' : 'bg-white border-slate-100 text-transparent group-hover:border-slate-300'}`}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      </div>

                      {/* Info Panel */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-[14px] font-semibold tracking-tight transition-colors ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                            {m.label}
                          </h4>
                          {active && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Global</span>
                            </div>
                          )}
                        </div>
                        <p className={`text-[12px] font-normal leading-relaxed transition-colors ${active ? 'text-slate-500' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {m.description}
                        </p>
                      </div>

                      {/* Status Visualization */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                          <span className={`text-[11px] font-bold uppercase tracking-widest ${active ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {active ? 'Protocol Active' : 'Offline'}
                          </span>
                        </div>
                        <div className={`opacity-0 group-hover:opacity-100 transition-opacity text-[#14B8A6]`}>
                          <ToggleRight size={24} className={active ? '' : 'rotate-180 opacity-20 text-slate-300'} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Action - Save Modules Button */}
        <div className="flex justify-center pb-10">
          <button
            onClick={handleSave}
            disabled={saving || !selectedCompany}
            className="group relative flex items-center justify-center gap-3 px-12 h-16 bg-[#14B8A6] text-white rounded-[24px] text-[15px] font-medium hover:bg-[#0D9488] transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(20,184,166,0.3)] disabled:opacity-50 min-w-[240px] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <Save size={20} />
            <span className="tracking-wide">{saving ? 'Processing State...' : 'Save Module Configuration'}</span>
          </button>
        </div>
      </div>

      <style>{`
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}

ModuleConfig.propTypes = {
  company: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    modules: PropTypes.arrayOf(PropTypes.string),
    enabledModules: PropTypes.object
  }),
  onClose: PropTypes.func
};
