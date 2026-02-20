import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import api from '../../utils/api';
import { Building2, Plus, Users, Briefcase, IndianRupee, User, Edit2, Trash2, Eye, FileText, Shield } from 'lucide-react';

export default function Departments() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/hr/departments');
      setDepts(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setOpenForm(true); }
  function openEdit(d) { setEditing(d); setOpenForm(true); }
  function openView(d) { setViewing(d); }

  function remove(id) {
    showConfirmToast({
      title: 'Delete department?',
      description: 'Are you sure you want to delete this department?',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/hr/departments/${id}`);
          load();
          showToast('success', 'Success', 'Department deleted');
        } catch (err) {
          console.error(err);
          showToast('error', 'Error', 'Delete failed');
        }
      }
    });
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. PREMIUM HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-10 rounded-xl shadow-sm relative overflow-hidden mb-8">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Departments</h1>
          <p className="text-emerald-100 font-medium text-lg">Manage your organization's departmental structure and roles.</p>
        </div>
        <button
          onClick={openNew}
          className="relative z-10 flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-emerald-900/20 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Add Department
        </button>
        {/* Decorative BG element */}
        <div className="absolute top-0 right-0 w-64 h-full bg-white/10 blur-3xl rounded-full pointer-events-none -mr-16 -mt-10"></div>
      </div>

      {/* 2. DEPARTMENTS GRID */}
      {loading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Departments...</p>
        </div>
      ) : depts.length === 0 ? (
        <div className="p-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Building2 size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4">No departments found</p>
          <button onClick={openNew} className="text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline">Create your first department</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {depts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(d => {
            // Determine colors and icon based on name
            let borderColor = 'border-slate-200';
            let iconBg = 'bg-slate-100';
            let iconColor = 'text-slate-600';
            let accentColor = 'bg-slate-600';
            let Icon = Building2;
            const name = d.name?.toLowerCase() || '';

            if (name.includes('hr')) {
              borderColor = 'border-blue-200';
              iconBg = 'bg-blue-50';
              iconColor = 'text-blue-600';
              accentColor = 'bg-blue-600';
              Icon = Users;
            } else if (name.includes('tech') || name.includes('it')) {
              borderColor = 'border-emerald-200';
              iconBg = 'bg-emerald-50';
              iconColor = 'text-emerald-600';
              accentColor = 'bg-emerald-600';
              Icon = Briefcase;
            } else if (name.includes('account') || name.includes('finance')) {
              borderColor = 'border-purple-200';
              iconBg = 'bg-purple-50';
              iconColor = 'text-purple-600';
              accentColor = 'bg-purple-600';
              Icon = IndianRupee;
            } else if (name.includes('admin')) {
              borderColor = 'border-amber-200';
              iconBg = 'bg-amber-50';
              iconColor = 'text-amber-600';
              accentColor = 'bg-amber-600';
              Icon = User;
            }

            return (
              <div key={d._id} className={`bg-white p-6 rounded-2xl border-2 ${borderColor} shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}>
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className={`w-12 h-12 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center border border-transparent group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openView(d)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all" title="View">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => openEdit(d)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all" title="Edit">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{d.name}</h3>
                    {d.status === 'inactive' && (
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-black ${iconColor} uppercase tracking-widest ${iconBg} px-2 py-0.5 rounded border border-transparent`}>{d.code || 'NO-CODE'}</span>
                  </div>
                  <p className="text-slate-600 text-sm font-medium line-clamp-2 min-h-[40px] leading-relaxed">
                    {d.description || 'No description provided for this department unit.'}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center relative z-10">
                  <button
                    onClick={() => remove(d._id)}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                  >
                    Remove Dept
                  </button>
                  <div className={`w-2 h-2 rounded-full ${accentColor}`}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. PAGINATION */}
      {depts.length > pageSize && (
        <div className="mt-8 flex justify-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={depts.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            className="ant-pagination-modern"
          />
        </div>
      )}

      {openForm && <DeptForm dept={editing} depts={depts} onClose={() => { setOpenForm(false); load(); }} />}
      {viewing && <DeptView dept={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function DeptForm({ dept, depts = [], onClose }) {
  const [name, setName] = useState(dept?.name || '');
  const [code, setCode] = useState(dept?.code || '');
  const [status, setStatus] = useState(dept?.status || 'active');
  const [description, setDescription] = useState(dept?.description || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!name || name.trim().length < 2 || name.trim().length > 50) e.name = 'Name must be 2-50 characters';
    if (!code || code.trim().length < 1) e.code = 'Code is required';
    if (description && description.length > 250) e.description = 'Description must be at most 250 characters';

    // uniqueness: compare against existing depts
    const dupName = depts.find(d => d.name && d.name.toLowerCase() === name.trim().toLowerCase() && (!dept || d._id !== dept._id));
    if (dupName) e.name = 'Department name already exists';

    const dupCode = depts.find(d => d.code && d.code.toUpperCase() === code.trim().toUpperCase() && (!dept || d._id !== dept._id));
    if (dupCode) e.code = 'Department code already exists';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function submit(evt) {
    evt.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        status: status,
        description: description || ''
      };

      if (dept) await api.put(`/hr/departments/${dept._id}`, payload);
      else await api.post('/hr/departments', payload);
      onClose();
    } catch (err) {
      console.error(err);
      console.error(err);
      let msg = err?.response?.data?.error || err?.response?.data?.message;

      // Fallback for non-standard structure or network errors
      if (!msg) {
        if (err.message === "Network Error") {
          msg = "Unable to connect to server. Please check if backend is running.";
        } else if (err.response) {
          msg = `Server Error (${err.response.status}): ${err.response.statusText}`;
        } else {
          msg = err.message || 'Save failed';
        }
      }

      showToast('error', 'Error', msg);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 px-8 py-6 text-white relative">
          <h3 className="text-xl font-black uppercase tracking-widest">{dept ? 'Modify' : 'New'} Department</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter mt-1">Fill in the departmental details below.</p>
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <form onSubmit={submit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Department Name <span className="text-red-500">*</span></label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  required
                  value={name}
                  onChange={e => { const v = e.target.value; setName(v.charAt(0).toUpperCase() + v.slice(1)); }}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:border-emerald-500 transition-all ${errors.name ? 'border-red-200 ring-red-500/10' : 'border-slate-100 ring-emerald-500/10'}`}
                  placeholder="e.g. Human Resources"
                />
              </div>
              {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase mt-1.5 ml-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Department Code <span className="text-red-500">*</span></label>
              <div className="relative group">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:border-emerald-500 transition-all ${errors.code ? 'border-red-200 ring-red-500/10' : 'border-slate-100 ring-emerald-500/10'}`}
                  placeholder="e.g. HR01"
                />
              </div>
              {errors.code && <p className="text-[10px] text-red-500 font-bold uppercase mt-1.5 ml-1">{errors.code}</p>}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all h-24 resize-none ${errors.description ? 'border-red-200 ring-red-500/10' : ''}`}
                placeholder="Describe this department unit..."
              />
              {errors.description && <p className="text-[10px] text-red-500 font-bold uppercase mt-1.5 ml-1">{errors.description}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              Discard
            </button>
            <button
              disabled={saving}
              className="flex-1 px-4 py-3.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
            >
              {saving ? 'Processing...' : 'Save Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeptView({ dept, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 px-8 py-8 text-white relative">
          <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-4">
            <Building2 size={32} className="text-blue-400" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">{dept.name}</h3>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">Department Unit Profile</p>
          <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-white transition-colors">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Code</label>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-blue-500" />
                <p className="text-sm font-bold text-slate-900">{dept.code || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Status</label>
              <div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${dept.status === 'inactive' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  {dept.status === 'inactive' ? 'Inactive' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-slate-600 text-sm font-medium leading-relaxed italic">
                "{dept.description || 'No description provided for this department unit.'}"
              </p>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
              Dismiss View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
