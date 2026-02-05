import React, { useEffect, useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from 'react-router-dom';
import api from "../../utils/api";
import { Save, Settings, Check, X, Layers } from "lucide-react";

/**
 * ModuleConfig UI - Enterprise Upgrade
 */

const AVAILABLE_MODULES = [
  { code: "hr", label: "HR Management", description: "Employee management, roles, policies" },
  { code: "payroll", label: "Payroll Processing", description: "Salary processing, tax, & payslips" },
  { code: "attendance", label: "Time & Attendance", description: "Punch in/out, shifts & timesheets" },
  { code: "ess", label: "ESS Portal", description: "Employee self-service access" },
  { code: "recruitment", label: "Recruitment", description: "Job posting & hiring workflows" },
  { code: "analytics", label: "Analytics & Reports", description: "Data insights & dashboards" },
];

export default function ModuleConfig({ company, onClose }) {
  const [modules, setModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(company || null);
  const navigate = useNavigate();
  const activeCount = useMemo(() => {
    return modules.filter(m => AVAILABLE_MODULES.some(avail => avail.code === m)).length;
  }, [modules]);

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
      setModules([]);
    } else {
      setModules(AVAILABLE_MODULES.map(m => m.code));
    }
  }

  useEffect(() => {
    setModules(company?.modules ? [...company.modules] : []);
    setError(null);
    if (!company) {
      loadCompanies();
    } else {
      setSelectedCompany(company);
    }
  }, [company]);

  async function loadCompanies() {
    try {
      const res = await api.get('/tenants');
      const payload = res.data;
      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.tenants) ? payload.tenants : (Array.isArray(payload?.data) ? payload.data : []));
      setCompanies(list || []);
    } catch (err) {
      console.error('Failed to load companies', err);
    }
  }

  function toggle(code) {
    setModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSave() {
    const target = selectedCompany || company;
    if (!target?._id) return alert("Please select a company first.");
    setSaving(true);
    setError(null);
    try {
      await api.put(`/tenants/${target._id}/modules`, { modules });
      alert("Modules updated successfully!");
      if (typeof onClose === 'function') onClose(); // Close modal if used as modal
    } catch (err) {
      console.error(err);
      setError("Failed to save modules. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Common UI Render Logic for Module Card
  const renderModuleCard = (m) => {
    const active = modules.includes(m.code);
    return (
      <div
        key={m.code}
        onClick={() => !saving && toggle(m.code)}
        className={`cursor-pointer group relative p-6 rounded-xl border-2 transition-all duration-200 ${active
          ? 'border-blue-500 bg-blue-50/30'
          : 'border-transparent bg-white shadow-sm hover:shadow-md hover:border-gray-200'
          }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
            <Layers size={20} />
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-300'
            }`}>
            {active && <Check size={14} className="text-white" />}
          </div>
        </div>
        <h3 className={`text-base font-bold ${active ? 'text-blue-900' : 'text-gray-800'}`}>{m.label}</h3>
        <p className="text-xs text-gray-500 mt-1">{m.description}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Settings className="text-gray-400" /> Module Configuration
            </h1>
            <p className="text-sm text-gray-500 mt-2 ml-1">Enable or disable system modules for individual tenants.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !selectedCompany}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Save />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Selection Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Select Tenant Company</label>
          <div className="relative max-w-xl">
            <select
              className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none text-gray-700 font-medium cursor-pointer arrow-down-bg"
              value={selectedCompany?._id || ''}
              onChange={(e) => {
                const id = e.target.value;
                const c = companies.find((x) => x._id === id) || null;
                setSelectedCompany(c);
                setModules(c?.modules ? [...c.modules] : []);
              }}
            >
              <option value="">-- Choose a Company from List --</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        {selectedCompany ? (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Available Modules <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{activeCount} Active</span>
              </h3>

              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    ref={checkboxRef}
                    checked={allSelected}
                    onChange={handleSelectAll}
                    disabled={saving}
                    className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-blue-500 text-blue-600 cursor-pointer transition-all disabled:opacity-50"
                  />
                </div>
                <span className="text-sm font-bold text-gray-600 group-hover:text-blue-600 transition-colors uppercase tracking-wider">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {AVAILABLE_MODULES.map(renderModuleCard)}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Company Selected</h3>
            <p className="text-gray-500 mt-1">Please select a company above to configure its modules.</p>
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
  onClose: PropTypes.func, // Optional: used when rendered as modal
};
