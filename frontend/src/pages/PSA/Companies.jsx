import React, { useEffect, useState } from "react";
import { Pagination } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from "../../utils/api";
import CompanyForm from "./CompanyForm";
import ModuleConfig from "./ModuleConfig";
import CompanyView from "./CompanyView";
import {
  Building2,
  Mail,
  Search,
  Plus,
  Filter,
  Zap,
  Eye,
  EyeOff,
  Edit2,
  Settings,
  LayoutGrid,
  Users,
  Activity,
  Lock
} from 'lucide-react';
import { enabledModulesToArray, normalizeEnabledModules } from "../../utils/moduleConfig";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [openForm, setOpenForm] = useState(false);
  const [selected, setSelected] = useState(null);

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

  // Calculate stats for local summary cards
  const stats = {
    total: companies.length,
    active: companies.filter(c => c.status === 'active').length,
    inactive: companies.filter(c => c.status !== 'active').length
  };

  const statsCards = [
    {
      label: 'TOTAL COMPANIES',
      value: stats.total,
      icon: LayoutGrid,
      bg: 'bg-[#00C292]',
    },
    {
      label: 'ACTIVE COMPANIES',
      value: stats.active,
      icon: Zap,
      bg: 'bg-[#7047EB]',
    },
    {
      label: 'INACTIVE COMPANIES',
      value: stats.inactive,
      icon: Activity,
      bg: 'bg-[#FF5C8D]',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8 font-sans text-slate-900 overflow-x-hidden">
      <div className="w-full mx-auto space-y-8 animate-in fade-in duration-700 px-0">

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Building2 size={24} />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies</h1>
              <p className="text-[12px] font-medium text-slate-400 tracking-tight">Central ecosystem management for all tenant organizations.</p>
            </div>
          </div>
          <button
            onClick={() => { setSelected(null); setOpenForm(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95"
          >
            <Plus size={16} /> Onboard New Company
          </button>
        </div>

        {/* Local Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          {statsCards.map((card, idx) => (
            <div key={idx} className={`${card.bg} p-6 rounded-[32px] shadow-lg shadow-slate-200/20 hover:-translate-y-1 transition-all duration-500 group flex flex-col justify-between h-40 text-white relative overflow-hidden cursor-default`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full -mr-8 -mt-8"></div>

              <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <card.icon size={18} strokeWidth={2} />
                </div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] opacity-30">
                  ID-0{idx + 1}
                </p>
              </div>

              <div className="space-y-0.5 relative z-10">
                <p className="text-[9px] font-semibold text-white/50 uppercase tracking-[0.2em]">{card.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight leading-none">{card.value}</span>
                  <span className="text-[10px] font-semibold opacity-40 uppercase tracking-widest">Units</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 px-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#14B8A6] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Filter companies by name, code or email..."
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200/60 rounded-2xl focus:outline-none focus:border-[#14B8A6] transition-all text-sm font-medium text-slate-600 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Content Table Card (Full Width) */}
        <div className="bg-white border-y md:border border-slate-200/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Company Branding</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Client Code</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Admin Credentials</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Ecosystem Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 text-right">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paged.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                          {c.meta?.logo ? (
                            <img src={(c.meta.logo || '').startsWith('http') ? c.meta.logo : `${API_ORIGIN}${c.meta.logo || ''}`} alt="logo" className="w-full h-full object-contain p-2" />
                          ) : (
                            <Building2 className="text-slate-200" size={20} />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-bold text-slate-800">{c.name}</p>
                          <p className="text-[11px] font-medium text-slate-400">{c.meta?.primaryEmail || c.meta?.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        {c.code || '-'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-300" />
                          {c.meta?.primaryEmail || c.meta?.email || '-'}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Lock size={12} className="text-slate-300" />
                            <span className="text-[11px] font-bold text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100/50">
                              {revealMap[c._id] ? (c.meta?.adminPassword || '-') : '••••••••'}
                            </span>
                          </div>
                          {c.meta?.adminPassword && (
                            <button onClick={() => toggleReveal(c._id)} className="text-slate-300 hover:text-blue-500 p-1 transition-colors">
                              {revealMap[c._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${c.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">
                          {c.status === 'active' ? 'OPERATIONAL' : 'SUSPENDED'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setSelected(c); setOpenView(true); }} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="View">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => { setSelected(c); setOpenForm(true); }} className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => _navigate(`/super-admin/modules/${c._id}`)} className="p-2 text-slate-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-all" title="Modules">
                          <Settings size={16} />
                        </button>
                        <button onClick={() => toggleActive(c)} className={`p-2 rounded-lg transition-all ${c.status === 'active' ? 'text-slate-300 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`} title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                          <Zap size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-white border-t border-slate-100 gap-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              PAGE {currentPage} OF {Math.ceil(companies.length / pageSize)} — SHOWING {paged.length} OF {companies.length} ORGANIZATIONS
            </p>
            {companies.length > pageSize && (
              <div className="flex items-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  PREVIOUS
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(companies.length / pageSize) }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${currentPage === num ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button
                  disabled={currentPage === Math.ceil(companies.length / pageSize)}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
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


    </div>
  );
}
