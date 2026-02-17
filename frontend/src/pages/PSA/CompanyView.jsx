import React from 'react';
import {
  Building2,
  Globe,
  Mail,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  Shield,
  Activity,
  User,
  Package
} from 'lucide-react';
import { countEnabledModules, normalizeEnabledModules } from '../../utils/moduleConfig';

export default function CompanyView({ company, onClose }) {
  if (!company) return null;
  const activeModuleCount = countEnabledModules(normalizeEnabledModules(company.enabledModules, company.modules));

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden ring-1 ring-slate-900/5">

        {/* Header Gradient */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-emerald-500 to-teal-600"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>

        <div className="relative pt-8 px-8 pb-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md z-10"
          >
            <X size={20} />
          </button>

          <div className="w-24 h-24 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 relative z-0">
            {company.meta?.logo ? (
              <img src={company.meta.logo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <span className="text-4xl font-black text-slate-200">{company.name.charAt(0)}</span>
            )}
            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-lg border-4 border-white flex items-center justify-center ${company.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500 '}`}>
              {company.status === 'active' ? <Activity size={12} className="text-white" /> : <Shield size={12} className="text-white" />}
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{company.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{company.domain || 'No Domain'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{company.code || company._id.slice(-6)}</span>
          </div>
        </div>

        <div className="p-8 space-y-6 bg-slate-50/50">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-2">
                <Mail size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Internal Mail</span>
              <span className="text-xs font-bold text-slate-700 truncate w-full px-2">{company.emailDomain || 'N/A'}</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-2">
                <User size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Administrator</span>
              <span className="text-xs font-bold text-slate-700 truncate w-full px-2">{company.meta?.ownerName || 'Unknown'}</span>
            </div>
          </div>

          {/* Info List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Layers size={16} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Modules Active</span>
              </div>
              <span className="text-sm font-black text-slate-800">
                {activeModuleCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Calendar size={16} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registered On</span>
              </div>
              <span className="text-sm font-black text-slate-800">{formatDate(company.createdAt)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Package size={16} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subscription</span>
              </div>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest">{company.plan || 'Standard'}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-sm transition-all hover:-translate-y-1 active:scale-95"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
