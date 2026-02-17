import React, { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import api from "../../utils/api";
import {
  Save,
  Settings,
  Building2,
  Users,
  Clock,
  Briefcase,
  Activity,
  BarChart3,
  UserCircle2,
  ChevronDown,
  CheckCircle2,
  Banknote,
  LayoutGrid
} from "lucide-react";

const AVAILABLE_MODULES = [
  { code: "hr", label: "HR Management", description: "Employee management, roles, policies", icon: Users },
  { code: "payroll", label: "Payroll Processing", description: "Salary processing, tax, & payslips", icon: Banknote },
  { code: "attendance", label: "Time & Attendance", description: "Punch in/out, shifts & timesheets", icon: Clock },
  { code: "ess", label: "ESS Portal", description: "Employee self-service access", icon: UserCircle2 },
  { code: "recruitment", label: "Recruitment", description: "Job posting & hiring workflows", icon: Briefcase },
  { code: "analytics", label: "Analytics & Reports", description: "Data insights & dashboards", icon: BarChart3 },
];

export default function ModuleConfig({ company, onClose }) {
  const [modules, setModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(company || null);
  const [loading, setLoading] = useState(false);

  const activeCount = useMemo(() => {
    return modules.length;
  }, [modules]);

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
      setModules([]);
    } else {
      setModules(AVAILABLE_MODULES.map(m => m.code));
    }
  }

  function toggle(code) {
    setModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSave() {
    const target = selectedCompany || company;
    if (!target?._id) return;
    setSaving(true);
    try {
      await api.put(`/tenants/${target._id}/modules`, { modules });
      alert("Configuration saved successfully!");
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save configuration.");
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

        {/* Modules Grid Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900">Available Modules</h3>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                {activeCount} Active
              </span>
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

        {/* Bottom Footer Section */}
        {selectedCompany && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mt-12">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-slate-300" />
              <p className="text-[11px] font-medium text-slate-400 italic">Configuration changes are immediate and will affect user access levels across the system.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-6 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all"
              >
                Update Configuration
              </button>
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
  }),
  onClose: PropTypes.func,
};
