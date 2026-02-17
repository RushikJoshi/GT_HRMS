import React, { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (company) {
      setSelectedCompany(company);
      setModules(company.modules || []);
    }
  }, [company]);

  async function loadCompanies() {
    try {
      setLoading(true);
      const res = await api.get('/tenants');
      const list = Array.isArray(res.data) ? res.data : (res.data?.tenants || res.data?.data || []);
      setCompanies(list || []);
    } catch (err) {
      console.error('Failed to load companies', err);
    } finally {
      setLoading(false);
    }
  }

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
    if (!target?._id) return;
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
    <div className="min-h-screen bg-slate-50/30 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <div className="w-full mx-auto space-y-6">

        {/* Header Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400">
              <Settings size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">Module Configuration</h1>
              <p className="text-[12px] font-medium text-slate-400 mt-1.5 uppercase tracking-tight">Enable or disable system modules for individual tenants.</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !selectedCompany}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            {saving ? 'Processing...' : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

        {/* Tenant Selection Card */}
        <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200/60 shadow-sm space-y-8">
          <div className="max-w-3xl space-y-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Tenant Company</label>
            <div className="relative group">
              <select
                className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer"
                value={selectedCompany?._id || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  const c = companies.find((x) => x._id === id) || null;
                  setSelectedCompany(c);
                  setModules(c?.modules ? [...c.modules] : []);
                }}
              >
                <option value="">Choose an organization...</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.code || 'N/A'})
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
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
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={allSelected && AVAILABLE_MODULES.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 rounded border-slate-200 text-blue-600 focus:ring-blue-500/20"
              />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Select All</span>
            </label>
          </div>

          {!selectedCompany ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm border-dashed">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                <LayoutGrid size={32} />
              </div>
              <h4 className="text-[15px] font-bold text-slate-800">No Company Selected</h4>
              <p className="text-[12px] font-medium text-slate-400 mt-2">Please select a tenant to configure their system modules.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AVAILABLE_MODULES.map((m) => {
                const active = modules.includes(m.code);
                const Icon = m.icon;
                return (
                  <div
                    key={m.code}
                    onClick={() => toggle(m.code)}
                    className={`group relative p-8 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-start ${active
                      ? 'bg-white border-blue-500 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                  >
                    {/* Checkbox Indicator */}
                    <div className="absolute top-6 right-6">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-100 group-hover:border-slate-200'}`}>
                        {active && <CheckCircle2 size={14} />}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all ${active ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                      <Icon size={22} />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h4 className={`text-[15px] font-bold tracking-tight ${active ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-800'}`}>{m.label}</h4>
                      <p className="text-[12px] font-medium text-slate-400 leading-tight">{m.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
          </div>
        )}

      </div>
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
