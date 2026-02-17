import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
  History,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft
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

  const getActionColor = (action) => {
    const act = action?.toLowerCase() || '';
    if (act.includes('delete') || act.includes('remove') || act.includes('fail')) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (act.includes('create') || act.includes('add') || act.includes('success')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (act.includes('update') || act.includes('edit')) return 'bg-blue-50 text-blue-600 border-blue-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8 font-sans text-slate-900 overflow-x-hidden">
      <div className="w-full mx-auto space-y-8 animate-in fade-in duration-700">

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <History size={24} />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recent Activities</h1>
              <p className="text-[12px] font-medium text-slate-400 tracking-tight">Track system events and administrative actions across the ecosystem.</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Logs
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 px-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search logs by action or organization..."
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all text-sm font-medium text-slate-600 placeholder:text-slate-300 shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-200/60 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={14} /> Filter
          </button>
        </div>

        {/* Content Table Card (Full Width) */}
        <div className="bg-white border-y md:border border-slate-200/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Timestamp</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Action Performed</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Target Entity</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      No activity records found
                    </td>
                  </tr>
                ) : (
                  paged.map((log, idx) => (
                    <tr key={log._id || idx} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                          <span className="text-[12px] font-bold text-slate-600">
                            {new Date(log.time || log.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border ${getActionColor(log.action)}`}>
                          {log.action || 'System Action'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 font-bold text-[10px]">
                            {(log.company || log.tenantInfo?.name || '-').charAt(0)}
                          </div>
                          <span className="text-[12px] font-bold text-slate-800">
                            {log.company || log.tenantInfo?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => removeActivity(log._id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Log"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-white border-t border-slate-100 gap-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              PAGE {currentPage} OF {totalPages || 1} — SHOWING {paged.length} OF {filtered.length} RECORDS
            </p>
            {filtered.length > pageSize && (
              <div className="flex items-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  PREVIOUS
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${currentPage === num ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button
                  disabled={currentPage === totalPages}
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
    </div>
  );
}
