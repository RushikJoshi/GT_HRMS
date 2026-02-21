import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
  History,
  Trash2,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  Activity as ActivityIcon,
  AlertCircle,
  ChevronRight,
  Zap,
  Cpu,
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;
  const navigate = useNavigate();

  async function load() {
    try {
      setLoading(true);
      const res = await api.get('/activities/psa/all', { timeout: 60000 });
      setActivities(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load activities', err);
      try {
        const res = await api.get('/activities');
        setActivities(res.data?.data || []);
      } catch (fallbackErr) {
        console.error('Failed to load activities (fallback):', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function removeActivity(id) {
    if (!id) return;
    const ok = window.confirm('Are you sure you want to delete this log entry?');
    if (!ok) return;
    try {
      await api.delete(`/activities/${id}`);
      load();
    } catch (err) {
      console.error('Failed to remove activity', err);
      alert('Failed to remove log entry.');
    }
  }

  const filtered = activities.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(term) ||
      (log.company || log.tenantInfo?.name || '').toLowerCase().includes(term)
    );
  });

  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const getStatusStyles = (action) => {
    const act = action?.toLowerCase() || '';
    if (act.includes('delete') || act.includes('remove') || act.includes('fail')) {
      return 'bg-rose-50 text-rose-500 border-rose-100 shadow-[0_2px_10px_rgba(244,63,94,0.05)]';
    }
    if (act.includes('create') || act.includes('add') || act.includes('success')) {
      return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_2px_10px_rgba(16,185,129,0.05)]';
    }
    if (act.includes('update') || act.includes('edit')) {
      return 'bg-sky-50 text-sky-600 border-sky-100 shadow-[0_2px_10px_rgba(14,165,233,0.05)]';
    }
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-700 font-['Inter',sans-serif] relative pb-20">
      {/* Elegant Background Gradients */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-50/40 blur-[150px] rounded-full -z-10 animate-pulse"></div>
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/30 blur-[130px] rounded-full -z-10 animate-pulse delay-1000"></div>

      {/* Premium Header/Sync Area */}
      <div className="flex justify-end px-2">
        <button
          onClick={load}
          disabled={loading}
          className="group flex items-center gap-3 px-8 h-14 bg-[#14B8A6] text-white rounded-2xl text-[14px] font-medium hover:bg-[#0D9488] transition-all active:scale-95 shadow-[0_10px_25px_-5px_rgba(20,184,166,0.3)] disabled:opacity-50"
        >
          <RefreshCw size={18} className={`${loading ? "animate-spin" : "group-hover:rotate-180"} transition-transform duration-700`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Dynamic Search Bar - Full Width Premium */}
      <div className="relative group mx-2">
        <div className="relative flex items-center h-20 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[28px] px-8 focus-within:border-[#14B8A6]/40 transition-all duration-300">
          <Search className="text-slate-400 group-focus-within:text-[#14B8A6] transition-colors" size={22} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search system logs by action, organization, or metadata..."
            className="flex-1 bg-transparent px-6 border-none focus:outline-none focus:ring-0 text-[16px] text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Activities Table - Enhanced Aesthetic */}
      <div className="w-full min-w-[1000px] space-y-2">
        {/* Modern Table Header */}
        <div className="flex items-center px-12 py-5 bg-slate-50/50 rounded-2xl mx-2 border border-slate-100/50">
          <div className="w-[18%] text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Calendar size={12} className="text-[#14B8A6]" />
            Audit Period
          </div>
          <div className="flex-1 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <ActivityIcon size={12} className="text-[#14B8A6]" />
            Transaction Details
          </div>
          <div className="w-[15%] text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Building2 size={12} className="text-[#14B8A6]" />
            Registry Source
          </div>
          <div className="w-[12%] text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Zap size={12} className="text-[#14B8A6]" />
            Integrity
          </div>
          <div className="w-[8%] text-right text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Action
          </div>
        </div>

        {/* Table Body */}
        <div className="space-y-3 px-2 pt-2">
          {loading ? (
            <div className="py-32 bg-white/40 border border-slate-100 rounded-[40px] flex flex-col items-center justify-center gap-6 shadow-sm">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-[#14B8A6] rounded-full animate-spin"></div>
              <p className="text-[14px] text-slate-400 font-medium tracking-wide">Syncing data stream...</p>
            </div>
          ) : paged.length === 0 ? (
            <div className="py-32 bg-white/40 border border-slate-100 rounded-[40px] flex flex-col items-center justify-center gap-6 shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                <AlertCircle size={40} strokeWidth={1.5} />
              </div>
              <p className="text-[15px] text-slate-500">No matching logs found in the audit trail.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paged.map((log, idx) => (
                <div
                  key={log._id || idx}
                  className="group relative flex items-center px-10 py-6 bg-white border border-slate-100/80 rounded-[28px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] hover:border-[#14B8A6]/30 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Subtle Gradient Line on Hover */}
                  <div className="absolute inset-y-8 left-0 w-[3px] bg-gradient-to-b from-[#14B8A6] to-emerald-300 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  {/* Audit Period */}
                  <div className="w-[18%] pr-4">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-slate-700">
                        {new Date(log.time || log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[12px] text-slate-400 mt-1 font-normal uppercase tracking-wider">
                        {new Date(log.time || log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#14B8A6]/10 group-hover:text-[#14B8A6] transition-all duration-300">
                        <ActivityIcon size={18} />
                      </div>
                      <p className="text-[14px] text-slate-600 font-normal leading-snug line-clamp-2 max-w-2xl group-hover:text-slate-900 transition-colors">
                        {log.action}
                      </p>
                    </div>
                  </div>

                  {/* Registry Source */}
                  <div className="w-[15%] pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:border-[#14B8A6]/20 transition-colors">
                        {(log.company || log.tenantInfo?.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] text-slate-500 truncate">
                        {log.company || log.tenantInfo?.name || 'Central System'}
                      </span>
                    </div>
                  </div>

                  {/* Integrity (Status) */}
                  <div className="w-[12%]">
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border text-center inline-block min-w-[90px] ${getStatusStyles(log.action)}`}>
                      {log.action?.split(' ')[0] || 'Unknown'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="w-[8%] flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => removeActivity(log._id)}
                      className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                    <div className="text-slate-200 group-hover:text-[#14B8A6] transition-colors">
                      <ArrowUpRight size={20} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls - Clean Centered Design */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-center pt-10">
          <div className="bg-white/60 backdrop-blur-md p-2 rounded-2xl border border-slate-100 flex items-center gap-2 shadow-sm">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="h-10 px-4 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-30"
            >
              Back
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-10 h-10 rounded-xl text-[13px] font-medium transition-all ${currentPage === num ? 'bg-[#14B8A6] text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="h-10 px-4 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <style>{`
                .animate-spin-slow { animation: spin 5s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
    </div>
  );
}
