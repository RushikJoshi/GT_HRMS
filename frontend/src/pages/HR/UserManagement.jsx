import React, { useEffect, useState, useContext } from 'react';
import { Pagination } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import api from '../../utils/api';
import { UIContext } from '../../context/UIContext';

export default function UserManagement() {
  // const uiContext = useContext(UIContext);
  // const setToast = uiContext?.setToast || (() => { });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    managerId: '',
    contactNo: '',
    jobType: 'Full-Time'
  });
  const [filter, setFilter] = useState({ search: '', department: '', role: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadData();

  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [employeesRes, deptRes] = await Promise.all([
        api.get('/hr/employees').catch(() => ({ data: [] })),
        api.get('/hr/departments').catch(() => ({ data: [] }))
      ]);
      const empList =
        (Array.isArray(employeesRes.data?.data) && employeesRes.data.data) ||
        (Array.isArray(employeesRes.data) && employeesRes.data) ||
        [];
      const deptList =
        (Array.isArray(deptRes.data?.data) && deptRes.data.data) ||
        (Array.isArray(deptRes.data) && deptRes.data) ||
        [];
      setEmployees(empList);
      setDepartments(deptList);
    } catch (err) {
      console.error('Failed to load data', err);
      showToast('error', 'Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee._id}`, formData);
        if (formData.managerId !== undefined) {
          // Ensure we only send a raw ObjectId string (24 hex chars) or null
          const raw = (formData.managerId || '').toString();
          const match = raw.match(/[a-fA-F0-9]{24}/);
          const sendManagerId = match ? match[0] : null;
          await api.post(`/hr/employees/${editingEmployee._id}/set-manager`, {
            managerId: sendManagerId
          });
        }
        showToast('success', 'Success', 'Employee updated successfully');
      } else {
        await api.post('/hr/employees', formData);
        showToast('success', 'Success', 'Employee created successfully');
      }
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save employee', err);
      showToast('error', 'Error', err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save employee');
    }
  }

  function handleDelete(id) {
    showConfirmToast({
      title: 'Delete Employee',
      description: 'Are you sure you want to delete this employee?',
      okText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/hr/employees/${id}`);
          showToast('success', 'Success', 'Employee deleted successfully');
          loadData();
        } catch (err) {
          console.error('Failed to delete employee', err);
          showToast('error', 'Error', 'Failed to delete employee');
        }
      }
    });
  }

  function openEditModal(emp) {
    setEditingEmployee(emp);
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      role: emp.role || '',
      department: emp.department || '',
      managerId: emp.manager ? String(emp.manager._id || emp.manager) : '',
      contactNo: emp.contactNo || '',
      jobType: emp.jobType || 'Full-Time'
    });
    setShowModal(true);
  }

  function openCreateModal() {
    setEditingEmployee(null);
    resetForm();
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      department: '',
      managerId: '',
      contactNo: '',
      jobType: 'Full-Time'
    });
  }

  const employeesList = Array.isArray(employees) ? employees : [];
  const filteredEmployees = employeesList.filter(emp => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const searchMatch = !filter.search || name.includes(filter.search.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(filter.search.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(filter.search.toLowerCase());
    const deptMatch = !filter.department || emp.department === filter.department;
    const roleMatch = !filter.role || emp.role === filter.role;
    return searchMatch && deptMatch && roleMatch;
  });

  const uniqueRoles = [...new Set(employeesList.map(e => e.role).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // View Toggle Logic
  // View Toggle Logic

  // View Toggle Logic
  if (showModal) {
    // ... (Existing Edit/Create Form Logic - unchanged) ...
    return (
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* 1. PREMIUM HEADER BANNER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-10 rounded-3xl shadow-sm relative overflow-hidden mb-8">
          <div className="relative z-10 flex items-center gap-6">
            <button
              onClick={() => { setShowModal(false); setEditingEmployee(null); }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all border border-white/20 shadow-lg group"
              title="Back to List"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h1>
              <p className="text-emerald-100 font-bold uppercase tracking-[0.3em] text-[10px]">Enter the details below</p>
            </div>
          </div>
          {/* Decorative BG element */}
          <div className="absolute top-0 right-0 w-64 h-full bg-white/10 blur-3xl rounded-full pointer-events-none -mr-16 -mt-10"></div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 w-full">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., CEO, HR Manager, Team Lead"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Number</label>
              <input
                type="tel"
                value={formData.contactNo}
                onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Type</label>
              <select
                value={formData.jobType}
                onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reports To</label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">— No Manager (Top Level) —</option>
              {employeesList
                .filter(e => !editingEmployee || String(e._id) !== String(editingEmployee._id))
                .filter(e => !formData.department || String(e.department) === String(formData.department))
                .map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId}) - {emp.role || 'Employee'}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingEmployee(null);
              }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {editingEmployee ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile View Logic
  if (viewingEmployee) {
    const managerName = viewingEmployee.manager
      ? `${viewingEmployee.manager.firstName} ${viewingEmployee.manager.lastName}`
      : '—';

    return (
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* 1. PREMIUM HEADER BANNER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-10 rounded-3xl shadow-sm relative overflow-hidden mb-8">
          <div className="relative z-10 flex items-center gap-6">
            <button
              onClick={() => setViewingEmployee(null)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all border border-white/20 shadow-lg group"
              title="Back to List"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Employee Profile</h1>
              <p className="text-emerald-100 font-bold uppercase tracking-[0.3em] text-[10px]">Comprehensive User Data</p>
            </div>
          </div>
          {/* Decorative BG element */}
          <div className="absolute top-0 right-0 w-64 h-full bg-white/10 blur-3xl rounded-full pointer-events-none -mr-16 -mt-10"></div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-full mt-8">
          <div className="px-8 py-8">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-slate-100 dark:border-slate-700 pb-8">
              <div className="w-32 h-32 rounded-full border-4 border-slate-50 dark:border-slate-700 bg-slate-100 flex items-center justify-center text-slate-400 text-4xl font-bold shadow-sm overflow-hidden">
                {viewingEmployee.profilePic ? (
                  <img
                    src={viewingEmployee.profilePic}
                    alt={`${viewingEmployee.firstName} ${viewingEmployee.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{viewingEmployee.firstName[0]}{viewingEmployee.lastName[0]}</span>
                )}
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {viewingEmployee.firstName} {viewingEmployee.lastName}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-1">
                  {viewingEmployee.role || 'No Role Assigned'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                  Contact Information
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-y-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Email</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.email}</span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Phone</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.contactNo || '—'}</span>
                </div>
              </div>

              {/* Work Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                  Work Details
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-y-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Employee ID</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.employeeId}</span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Department</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.department || '—'}</span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Job Type</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs">
                      {viewingEmployee.jobType || 'Full-Time'}
                    </span>
                  </span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Manager</span>
                  <span className="text-slate-900 dark:text-white font-medium">{managerName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-8">
      {/* 1. PREMIUM HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-10 rounded-3xl shadow-sm relative overflow-hidden mb-8">
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">User Management</h1>
          <p className="text-emerald-100 font-bold uppercase tracking-[0.3em] text-[10px]">Manage all employees in your organization</p>
        </div>
        <button
          onClick={openCreateModal}
          className="relative z-10 flex items-center gap-3 px-8 py-4 bg-white text-emerald-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-50 transition-all shadow-xl hover:shadow-emerald-900/20 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
        {/* Decorative BG element */}
        <div className="absolute top-0 right-0 w-64 h-full bg-white/10 blur-3xl rounded-full pointer-events-none -mr-16 -mt-10"></div>
      </div>

      {/* Filters Container */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-emerald-50 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-100 transition-all duration-700"></div>
        <div className="relative z-10">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Search & Segmentation
          </h3>
          {/* ... (Previous Filter Code Unchanged - relying on original file content if not explicit here) ... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, ID, or email..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                value={filter.department}
                onChange={(e) => setFilter({ ...filter, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select
                value={filter.role}
                onChange={(e) => setFilter({ ...filter, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 bg-white/50 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Active Directory
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Found {filteredEmployees.length} Total Registered Personnel
            </p>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-50">
              <tr>
                <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Name</th>
                <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[12%]">Identity</th>
                <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[15%]">Email Contact</th>
                <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[15%]">Current Role</th>
                <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[12%]">Department</th>
                <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[14%]">Reporting Line</th>
                <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[12%] text-right">Administrative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-10 py-12 text-center text-slate-400 font-bold italic">
                    No matching personnel records found in the directory.
                  </td>
                </tr>
              ) : (
                filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(emp => {
                  const manager = employees.find(e => String(e._id) === String(emp.manager));
                  return (
                    <tr key={emp._id} className="hover:bg-emerald-50/30 dark:hover:bg-slate-900 transition-colors group/row">
                      <td className="px-10 py-5 text-sm font-black text-slate-800 dark:text-white whitespace-nowrap">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-10 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{emp.employeeId}</td>
                      <td className="px-10 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{emp.email || '—'}</td>
                      <td className="px-10 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">{emp.role || '—'}</span>
                      </td>
                      <td className="px-10 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span className={`px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 ${!emp.department && 'opacity-0'}`}>{emp.department || '—'}</span>
                      </td>
                      <td className="px-10 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {manager ? `${manager.firstName} ${manager.lastName}` : '—'}
                      </td>
                      <td className="px-10 py-5 text-sm flex justify-end gap-2">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                          title="View Profile"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(emp._id)}
                          className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-10 py-8 border-t border-slate-50 flex justify-end bg-slate-50/30">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredEmployees.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      </div>
    </div>
  );
}

