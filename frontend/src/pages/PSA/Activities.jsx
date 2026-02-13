import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import {
  History,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

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

  const pagedActivities = activities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getActionColor = (action) => {
    const act = action?.toLowerCase() || '';
    if (act.includes('delete') || act.includes('remove') || act.includes('fail')) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (act.includes('create') || act.includes('add') || act.includes('success')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (act.includes('update') || act.includes('edit')) return 'bg-blue-50 text-blue-600 border-blue-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-4 sm:p-6 lg:p-10 font-sans text-slate-900">
      <div className="w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-6 sm:p-10 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="space-y-2 relative z-10 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/50 rounded-xl flex items-center justify-center text-white ring-4 ring-emerald-500/20 shrink-0">
                <History size={24} className="sm:hidden" />
                <History size={28} className="hidden sm:block" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">Audit Logs</h1>
                <p className="text-emerald-100 font-bold text-sm sm:text-lg">Track system events and administrative actions.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full md:w-auto">
            <button
              onClick={load}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-700/50 border border-emerald-500/30 rounded-xl font-bold text-xs uppercase tracking-widest text-emerald-100 hover:text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>

          {/* Table Toolbar */}
          <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between bg-white gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <History size={16} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-900 text-lg sm:text-xl">{activities.length}</span>
                <span className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] sm:text-xs">Entries Recorded</span>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="w-full md:w-64 pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-slate-700 placeholder:text-slate-400 transition-all font-sans"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 sm:px-10 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap w-[25%]">Timestamp</th>
                  <th className="px-6 sm:px-10 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap w-[25%]">Action Type</th>
                  <th className="px-6 sm:px-10 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap w-[35%]">Target Entity</th>
                  <th className="px-6 sm:px-10 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap w-[15%]">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 sm:px-10 py-16 sm:py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Retrieving Audit Trail...</p>
                      </div>
                    </td>
                  </tr>
                ) : pagedActivities.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 sm:px-10 py-16 sm:py-20 text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <History size={32} />
                      </div>
                      <p className="text-slate-500 font-bold text-base sm:text-lg">No Activity Patterns Detected</p>
                      <p className="text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-1">System logs appear to be empty for this period.</p>
                    </td>
                  </tr>
                ) : (
                  pagedActivities.map((log, index) => (
                    <tr key={log._id || index} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 sm:px-10 py-4 sm:py-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors"></div>
                          <span className="text-xs sm:text-sm font-bold text-slate-700">
                            {new Date(log.time || log.createdAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest border break-words pointer-events-none ${getActionColor(log.action)}`}>
                          {log.action || 'System Action'}
                        </span>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <div className="flex items-center gap-2 max-w-[250px] sm:max-w-none">
                          <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                            {(log.company || log.tenantInfo?.name || '-').charAt(0)}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 break-words">
                            {log.company || log.tenantInfo?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => removeActivity(log._id)}
                          className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transform translate-x-0 sm:translate-x-2 sm:group-hover:translate-x-0"
                          title="Purge Record"
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

          {/* Pagination */}
          {activities.length > pageSize && (
            <div className="px-6 sm:px-10 py-6 border-t border-slate-100 bg-slate-50/30 flex justify-center">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={activities.length}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                size="small"
                className="font-bold responsive-pagination"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
