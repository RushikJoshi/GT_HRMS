import React, { useEffect, useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import api from "../../utils/api";
import { applyModuleDependencies, createDefaultEnabledModules, normalizeEnabledModules } from "../../utils/moduleConfig";
import {
  Save,
  Settings,
  Check,
  LayoutGrid,
  Building2,
  CircleDollarSign,
  Users,
  Clock,
  Briefcase,
  UserCircle2,
  Plus,
  CircleFadingPlus
} from "lucide-react";

const AVAILABLE_MODULES = [
  { code: "hr", label: "HR Management", description: "Employee records, roles & hierarchy", icon: Users, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "payroll", label: "Payroll System", description: "Salaries, taxes & disbursements", icon: CircleDollarSign, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "attendance", label: "Attendance & Time", description: "Shifts, biometrics & tracking", icon: Clock, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "leave", label: "Leave Management", description: "Leave apply, tracking & approval", icon: Clock, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "employeePortal", label: "Employee Portal", description: "Self-service dashboard", icon: UserCircle2, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "recruitment", label: "Recruitment", description: "Hiring, jobs & applicants", icon: Briefcase, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "backgroundVerification", label: "BGV", description: "Background Verification", icon: Briefcase, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "documentManagement", label: "Document Management", description: "Managing and Sending Documents and Offers", icon: CircleFadingPlus, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  { code: "socialMediaIntegration", label: "Social Media Integration", description: "Social Media Integration and Automation", icon: CircleFadingPlus, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
];

export default function ModuleConfig({ company, onClose }) {
  const [enabledModules, setEnabledModules] = useState(
    createDefaultEnabledModules(false, AVAILABLE_MODULES.map((m) => m.code))
  );
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(company || null);

  const activeCount = useMemo(() => {
    return AVAILABLE_MODULES.reduce((count, mod) => {
      return count + (enabledModules?.[mod.code] === true ? 1 : 0);
    }, 0);
  }, [enabledModules]);

  const allSelected = activeCount === AVAILABLE_MODULES.length;
  const isIndeterminate = activeCount > 0 && activeCount < AVAILABLE_MODULES.length;
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  function handleSelectAll() {
    if (allSelected) {
      setEnabledModules(Object.fromEntries(AVAILABLE_MODULES.map(m => [m.code, false])));
    } else {
      setEnabledModules(applyModuleDependencies(Object.fromEntries(AVAILABLE_MODULES.map(m => [m.code, true]))));
    }
  }

  useEffect(() => {
    const normalized = normalizeEnabledModules(company?.enabledModules, company?.modules);
    const filtered = Object.fromEntries(
      AVAILABLE_MODULES.map((m) => [m.code, normalized[m.code] === true])
    );
    setEnabledModules(filtered);
    if (!company) {
      loadCompanies();
    } else {
      setSelectedCompany(company);
    }
  }, [company]);

  async function loadCompanies() {
    try {
      const res = await api.get('/tenants');
      const list = Array.isArray(res.data) ? res.data : (res.data?.tenants || res.data?.data || []);
      setCompanies(list || []);
    } catch (err) {
      console.error('Failed to load companies', err);
    }
  }

  function toggle(code) {
    setEnabledModules((prev) => {
      const next = { ...prev, [code]: !prev[code] };
      return applyModuleDependencies(next);
    });
  }

  async function handleSave() {
    const target = selectedCompany || company;
    if (!target?._id) return alert("Please select a company first.");
    setSaving(true);
    try {
      const payloadModules = applyModuleDependencies({ ...enabledModules });
      await api.put(`/tenants/company/${target._id}/modules`, { enabledModules: payloadModules });
      alert("Configuration updated successfully!");
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-4 sm:p-6 lg:p-10 font-sans text-slate-900">
      <div className="w-full mx-auto space-y-6 sm:space-y-10 animate-in fade-in duration-700">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="space-y-2 w-full relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-sm ring-4 sm:ring-8 ring-emerald-50 shrink-0">
                <Settings size={28} className="animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 tracking-tight">Capability Stack</h1>
                <p className="text-slate-500 font-bold text-sm sm:text-lg">Configure available features for each organization.</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto relative z-10">
            <button
              onClick={handleSave}
              disabled={saving || !selectedCompany}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 sm:py-5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <Save size={20} />}
              {saving ? 'Processing...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Global Controls */}
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>

          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div className="flex-1 space-y-4">
              <label className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-[0.2em] ml-1">Configuration Target</label>
              <div className="relative group">
                <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                <select
                  className="w-full pl-14 pr-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 font-bold text-slate-800 text-base sm:text-lg tracking-tight appearance-none transition-all cursor-pointer shadow-sm"
                  value={selectedCompany?._id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const c = companies.find((x) => x._id === id) || null;
                    setSelectedCompany(c);
                    const normalized = normalizeEnabledModules(c?.enabledModules, c?.modules);
                    setEnabledModules(Object.fromEntries(
                      AVAILABLE_MODULES.map((m) => [m.code, normalized[m.code] === true])
                    ));
                  }}
                >
                  <option value="">-- Choose Organization --</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code || 'CORE'})
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Plus size={18} className="rotate-45" />
                </div>
              </div>
            </div>

            {selectedCompany && (
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 bg-emerald-50/50 p-6 sm:p-8 rounded-2xl border border-emerald-100 shadow-inner w-full xl:w-auto">
                <div className="text-center sm:text-right w-full sm:w-auto">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Active Modules</p>
                  <p className="text-3xl sm:text-4xl font-bold text-emerald-600 tracking-tighter">{activeCount} <span className="text-emerald-300 text-xl font-bold">/ {AVAILABLE_MODULES.length}</span></p>
                </div>
                <div className="hidden sm:block h-12 w-px bg-emerald-200/50"></div>
                <label className="flex items-center gap-5 cursor-pointer group w-full sm:w-auto justify-center sm:justify-start">
                  <div
                    onClick={handleSelectAll}
                    className={`w-14 h-7 rounded-full transition-all duration-500 relative ring-4 p-1 ${allSelected ? 'bg-emerald-600 ring-emerald-100' : 'bg-slate-300 ring-slate-100'}`}
                  >
                    <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500 ${allSelected ? 'left-8' : 'left-1'}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Select All</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stack Toggle</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Modules Grid */}
        {selectedCompany ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 pb-20">
            {AVAILABLE_MODULES.map((m) => {
              const active = !!enabledModules[m.code];
              const Icon = m.icon;
              return (
                <div
                  key={m.code}
                  onClick={() => !saving && toggle(m.code)}
                  className={`group relative p-8 sm:p-10 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center text-center sm:items-start sm:text-left ${active
                    ? 'border-emerald-500 bg-white shadow-md scale-[1.01]'
                    : `border-slate-100 bg-white hover:border-slate-300 hover:shadow-md`
                    }`}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between w-full mb-6">
                    <div className={`p-4 sm:p-5 rounded-xl transition-all duration-500 ${active ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm ring-4 sm:ring-8 ring-emerald-50' : `${m.color} group-hover:scale-110 shadow-sm`}`}>
                      <Icon size={24} className="sm:hidden" />
                      <Icon size={28} className="hidden sm:block" />
                    </div>
                    <div className={`mt-4 sm:mt-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${active ? 'bg-emerald-600 border-emerald-600 scale-110' : 'bg-transparent border-slate-200'
                      }`}>
                      {active ? <Check size={18} className="text-white" /> : <Plus size={18} className="text-slate-300" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-base sm:text-xl font-bold tracking-tight ${active ? 'text-slate-900' : 'text-slate-800'}`}>{m.label}</h3>
                    <p className={`text-[11px] sm:text-sm font-semibold leading-relaxed ${active ? 'text-slate-600' : 'text-slate-400'}`}>{m.description}</p>
                  </div>

                  {active && (
                    <div className="absolute top-4 right-4 sm:static sm:mt-6 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Active</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 sm:py-40 text-center bg-white rounded-2xl border-4 border-dashed border-slate-100 shadow-sm px-6">
            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 transform -rotate-6 shadow-inner ring-4 sm:ring-8 ring-emerald-50/50 animate-bounce-slow">
              <LayoutGrid size={40} className="sm:hidden" />
              <LayoutGrid size={56} className="hidden sm:block" />
            </div>
            <h3 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Select an Organization</h3>
            <p className="text-slate-400 font-bold text-sm sm:text-lg max-w-sm mx-auto mt-4 uppercase tracking-[0.15em] leading-relaxed">Choose an entity above to configure its active capability stack.</p>
          </div>
        )}
      </div>
      <style>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-bounce-slow {
          animation: bounce 3s ease-in-out infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}

ModuleConfig.propTypes = {
  company: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    modules: PropTypes.arrayOf(PropTypes.string),
    enabledModules: PropTypes.object,
  }),
  onClose: PropTypes.func,
};
