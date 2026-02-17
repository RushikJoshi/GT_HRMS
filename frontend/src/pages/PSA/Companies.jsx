import React, { useEffect, useState } from "react";
import { Pagination } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from "../../utils/api";
import CompanyForm from "./CompanyForm";
import ModuleConfig from "./ModuleConfig";
import CompanyView from "./CompanyView";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Search,
  Plus,
  Filter,
  ArrowRight,
  MoreVertical,
  Shield,
  Zap,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Edit2,
  Settings
} from 'lucide-react';
import { enabledModulesToArray, normalizeEnabledModules } from "../../utils/moduleConfig";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [openForm, setOpenForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [openModules, setOpenModules] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [revealMap, setRevealMap] = useState({});
  const _navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://hrms.gitakshmi.com/api';
  const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

  async function load() {
    try {
      const res = await api.get("/tenants");
      setCompanies(Array.isArray(res.data) ? res.data : (res.data?.tenants || res.data?.data || []));

    } catch (err) {
      console.log(err);
      alert("Failed to load companies");
    }
  }

  useEffect(() => {
    (async () => {
      await load();
      setCurrentPage(1);
    })();
  }, []);

  // compute current page slice for rendering
  const start = (currentPage - 1) * pageSize;
  const paged = companies.slice(start, start + pageSize);

  async function toggleActive(company) {
    try {
      const newStatus = company.status === 'active' ? 'suspended' : 'active';
      await api.put(`/tenants/${company._id}`, { status: newStatus });
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  }

  function toggleReveal(id) {
    setRevealMap(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-6 lg:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-50 to-transparent"></div>

          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white shadow-2xl shadow-emerald-200 ring-8 ring-emerald-50">
                <Building2 size={28} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Companies</h1>
                <p className="text-slate-500 font-bold text-lg">Manage tenant organizations.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={() => {
                setSelected(null);
                setOpenForm(true);
              }}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1 active:scale-95"
            >
              <Plus size={18} /> Add Company
            </button>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">

          {/* Desktop Table */}
          <div className="hidden md:block overflow-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">ID</th>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Logo</th>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Company</th>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Contact</th>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Access Key</th>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Capabilities</th>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                  <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {paged.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 text-xs font-bold text-slate-400 font-mono">{c.code || c._id.slice(-6)}</td>
                    <td className="px-8 py-6">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                        {c.meta?.logo ? (
                          <img src={(c.meta.logo || '').startsWith('http') ? c.meta.logo : `${API_ORIGIN}${c.meta.logo || ''}`} alt="logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="text-lg font-black text-slate-300">{c.name.charAt(0)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-slate-700">{c.name}</span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-500">{c.meta?.primaryEmail || c.meta?.email || '-'}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          {revealMap[c._id] ? (c.meta?.adminPassword || '-') : (c.meta?.adminPassword ? '••••••' : '-')}
                        </span>
                        {c.meta?.adminPassword && (
                          <button type="button" onClick={() => toggleReveal(c._id)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors">
                            {revealMap[c._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {(() => {
                        const activeModules = enabledModulesToArray(normalizeEnabledModules(c.enabledModules, c.modules));
                        return (
                      <div className="flex flex-wrap gap-1">
                        {activeModules.length === 0 ? <span className="text-xs text-slate-400 font-bold">-</span> : activeModules.slice(0, 3).map(m => (
                          <span key={m} className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" title={m}></span>
                        ))}
                        {activeModules.length > 3 && <span className="text-[10px] font-bold text-slate-400">+{activeModules.length - 3}</span>}
                      </div>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {c.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelected(c); setOpenView(true); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="View">
                          <Search size={16} />
                        </button>
                        <button onClick={() => { setSelected(c); setOpenForm(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => { setSelected(c); setOpenModules(true); }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Modules">
                          <Settings size={16} />
                        </button>
                        <button onClick={() => toggleActive(c)} className={`p-2 rounded-xl transition-all ${c.status === 'active' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                          {c.status === 'active' ? <X size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / Small: stacked cards */}
          <div className="md:hidden p-6 space-y-6">
            {paged.map((c) => (
              <div key={c._id} className="bg-white border text-center border-slate-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                    {c.meta?.logo ? (
                      <img src={(c.meta.logo || '').startsWith('http') ? c.meta.logo : `${API_ORIGIN}${c.meta.logo || ''}`} alt="logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-lg font-black text-slate-300">{c.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {c.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-1">{c.name}</h3>
                <p className="text-xs font-bold text-slate-400">{c.meta?.primaryEmail || '-'}</p>

                <div className="grid grid-cols-4 gap-2 mt-6 border-t border-slate-50 pt-6">
                  <button onClick={() => { setSelected(c); setOpenView(true); }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-600"><Search size={18} /><span className="text-[10px] font-bold">View</span></button>
                  <button onClick={() => { setSelected(c); setOpenForm(true); }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600"><Edit2 size={18} /><span className="text-[10px] font-bold">Edit</span></button>
                  <button onClick={() => { setSelected(c); setOpenModules(true); }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-purple-600"><Settings size={18} /><span className="text-[10px] font-bold">Config</span></button>
                  <button onClick={() => toggleActive(c)} className={`flex flex-col items-center gap-1 ${c.status === 'active' ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'}`}>
                    {c.status === 'active' ? <X size={18} /> : <CheckCircle2 size={18} />}
                    <span className="text-[10px] font-bold">{c.status === 'active' ? 'Block' : 'Active'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {companies.length > pageSize && (
            <div className="flex justify-center p-8 border-t border-slate-50 bg-slate-50/30">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={companies.length}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                className="font-bold"
              />
            </div>
          )}
        </div>
      </div>

      {openForm && (
        <CompanyForm
          company={selected}
          onClose={() => {
            setOpenForm(false);
            load();
          }}
        />
      )}

      {openView && (
        <CompanyView
          company={selected}
          onClose={() => {
            setOpenView(false);
            setSelected(null);
          }}
        />
      )}

      {openModules && (
        <ModuleConfig
          company={selected}
          onClose={() => {
            setOpenModules(false);
            load();
          }}
        />
      )}
    </div>
  );
}
