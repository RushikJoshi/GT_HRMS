import React, { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import api from "../../utils/api";
import {
  applyModuleDependencies,
  createDefaultEnabledModules,
  normalizeEnabledModules
} from "../../utils/moduleConfig";
import {
  Save,
  Settings,
  LayoutGrid,
  Building2,
  CircleDollarSign,
  Users,
  Clock,
  Briefcase,
  UserCircle2,
  Plus,
  CircleFadingPlus,
  Check
} from "lucide-react";

const AVAILABLE_MODULES = [
  { code: "hr", label: "HR Management", description: "Employee records, roles & hierarchy", icon: Users },
  { code: "payroll", label: "Payroll System", description: "Salaries, taxes & disbursements", icon: CircleDollarSign },
  { code: "attendance", label: "Attendance & Time", description: "Shifts, biometrics & tracking", icon: Clock },
  { code: "leave", label: "Leave Management", description: "Leave apply, tracking & approval", icon: Clock },
  { code: "employeePortal", label: "Employee Portal", description: "Self-service dashboard", icon: UserCircle2 },
  { code: "recruitment", label: "Recruitment", description: "Hiring, jobs & applicants", icon: Briefcase },
  { code: "backgroundVerification", label: "BGV", description: "Background Verification", icon: Briefcase },
  { code: "documentManagement", label: "Document Management", description: "Managing and sending documents and offers", icon: CircleFadingPlus },
  { code: "socialMediaIntegration", label: "Social Media Integration", description: "Social media integration and automation", icon: CircleFadingPlus }
];

export default function ModuleConfig({ company, onClose }) {
  const [enabledModules, setEnabledModules] = useState(
    createDefaultEnabledModules(false, AVAILABLE_MODULES.map(m => m.code))
  );
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(company || null);
  const [loading, setLoading] = useState(false);

  const activeCount = useMemo(() => {
    return AVAILABLE_MODULES.reduce(
      (count, mod) => count + (enabledModules?.[mod.code] ? 1 : 0),
      0
    );
  }, [enabledModules]);

  const allSelected = activeCount === AVAILABLE_MODULES.length;

  useEffect(() => {
    loadCompanies();
  }, []);

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
    }
  }, [company]);

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

  function toggle(code) {
    setEnabledModules(prev => {
      const isEnabling = !prev[code];
      const next = { ...prev, [code]: isEnabling };

      if (isEnabling) {
        return applyModuleDependencies(next);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (allSelected) {
      setEnabledModules(
        Object.fromEntries(AVAILABLE_MODULES.map(m => [m.code, false]))
      );
    } else {
      setEnabledModules(
        applyModuleDependencies(
          Object.fromEntries(AVAILABLE_MODULES.map(m => [m.code, true]))
        )
      );
    }
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
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="w-full mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Settings size={28} className="text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold">Module Configuration</h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest">
                Enable or disable system modules
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !selectedCompany}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {saving ? "Processing..." : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

        {/* Company Selector */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              Configuration Target
            </label>

            <div className="relative mt-3">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />

              <select
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold appearance-none"
                value={selectedCompany?._id || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const c = companies.find(x => x._id === id) || null;
                  setSelectedCompany(c);

                  const normalized = normalizeEnabledModules(
                    c?.enabledModules,
                    c?.modules
                  );

                  setEnabledModules(
                    Object.fromEntries(
                      AVAILABLE_MODULES.map(m => [
                        m.code,
                        normalized?.[m.code] === true
                      ])
                    )
                  );
                }}
              >
                <option value="">-- Choose Organization --</option>
                {companies.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modules */}
          {selectedCompany ? (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Available Modules</h2>

                <button
                  onClick={handleSelectAll}
                  className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest border-2 transition-all ${
                    allSelected
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                {AVAILABLE_MODULES.map(m => {
                  const active = !!enabledModules[m.code];
                  const Icon = m.icon;

                  return (
                    <div
                      key={m.code}
                      onClick={() => !saving && toggle(m.code)}
                      className={`p-8 rounded-2xl border-2 cursor-pointer transition-all ${
                        active
                          ? "border-emerald-500 shadow-md"
                          : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div className={`p-4 rounded-xl ${
                          active
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 text-emerald-600"
                        }`}>
                          <Icon size={24} />
                        </div>

                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 ${
                          active
                            ? "bg-emerald-600 border-emerald-600"
                            : "border-slate-200"
                        }`}>
                          {active ? (
                            <Check size={16} className="text-white" />
                          ) : (
                            <Plus size={16} className="text-slate-300" />
                          )}
                        </div>
                      </div>

                      <h3 className="font-bold text-lg">{m.label}</h3>
                      <p className="text-sm text-slate-500 mt-2">
                        {m.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-20 text-center border-4 border-dashed border-slate-200 rounded-2xl">
              <LayoutGrid size={48} className="text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">
                Please select an organization
              </p>
            </div>
          )}

        </div>
      </div>
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
