import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

import {
  LayoutDashboard,
  Users,
  Building2,
  Workflow,
  UserCog,
  Fingerprint,
  CalendarDays,
  Plane,
  Gavel,
  LineChart,
  Layers,
  Coins,
  Zap,
  Clock9,
  Banknote,
  Paintbrush,
  Briefcase,
  UserPlus,
  Radar,
  FileJson,
  Lock,
  Settings2,
  Brush,
  ExternalLink,
  Shield,
  X
} from 'lucide-react';

/* ================= ICONS ================= */
const ICON_SIZE = 20;

const ICONS = {
  dashboard: <LayoutDashboard size={ICON_SIZE} />,
  employees: <Users size={ICON_SIZE} />,
  departments: <Building2 size={ICON_SIZE} />,
  org: <Workflow size={ICON_SIZE} />,
  users: <UserCog size={ICON_SIZE} />,
  attendance: <Fingerprint size={ICON_SIZE} />,
  calendar: <CalendarDays size={ICON_SIZE} />,
  leaveRequests: <Plane size={ICON_SIZE} />,
  leavePolicies: <Gavel size={ICON_SIZE} />,
  payrollDashboard: <LineChart size={ICON_SIZE} />,
  salaryComponents: <Layers size={ICON_SIZE} />,
  compensation: <Coins size={ICON_SIZE} />,
  process: <Zap size={ICON_SIZE} />,
  runHistory: <Clock9 size={ICON_SIZE} />,
  payslips: <Banknote size={ICON_SIZE} />,
  payslipDesign: <Paintbrush size={ICON_SIZE} />,
  requirements: <Briefcase size={ICON_SIZE} />,
  applicants: <UserPlus size={ICON_SIZE} />,
  tracker: <Radar size={ICON_SIZE} />,
  templates: <FileJson size={ICON_SIZE} />,
  bgv: <Shield size={ICON_SIZE} />,
  access: <Lock size={ICON_SIZE} />,
  settings: <Settings2 size={ICON_SIZE} />,
  customization: <Brush size={ICON_SIZE} className="text-indigo-400" />,
  viewCareers: <ExternalLink size={ICON_SIZE} className="text-blue-400" />
};

/* ================= NAV GROUPS ================= */
const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [{ to: '/hr', label: 'Dashboard', icon: ICONS.dashboard, end: true }]
  },
  {
    title: 'People',
    items: [
      { to: '/hr/employees', label: 'Employees', icon: ICONS.employees },
      { to: '/hr/departments', label: 'Departments', icon: ICONS.departments },
      { to: '/hr/org', label: 'Org Structure', icon: ICONS.org },
      { to: '/hr/users', label: 'User Management', icon: ICONS.users }
    ]
  },
  {
    title: 'Attendance',
    items: [

      { to: '/hr/attendance', label: 'Attendance Dashboard', icon: ICONS.attendance },
      { to: '/hr/attendance-calendar', label: 'Calendar Management', icon: ICONS.calendar },
      { to: '/hr/face-update-requests', label: 'Face Update Requests', icon: ICONS.users }

    ]
  },
  {
    title: 'Leave',
    items: [
      { to: '/hr/leave-approvals', label: 'Leave Requests', icon: ICONS.leaveRequests },
      { to: '/hr/leave-policies', label: 'Leave Policies', icon: ICONS.leavePolicies }
    ]
  },
  {
    title: 'Payroll',
    items: [
      { to: '/hr/payroll/dashboard', label: 'Payroll Dashboard', icon: ICONS.payrollDashboard },
      { to: '/hr/payroll/salary-components', label: 'Salary Components', icon: ICONS.salaryComponents },
      { to: '/hr/payroll/compensation', label: 'Employee Compensation', icon: ICONS.compensation },
      { to: '/hr/payroll/process', label: 'Process Payroll', icon: ICONS.process },
      { to: '/hr/payroll/run', label: 'Run History', icon: ICONS.runHistory },
      { to: '/hr/payroll/payslips', label: 'Payslips', icon: ICONS.payslips },
      // { to: '/hr/payroll/payslip-design', label: 'Payslip Design', icon: ICONS.payslipDesign }
    ]
  },
  {
    title: 'Hiring',
    items: [
      {
        label: 'Recruitment',
        icon: ICONS.requirements,
        children: [

          { to: '/hr/requirements', label: 'Job List' },
          { to: '/hr/create-requirement', label: 'Create Requirement' },
          { to: '/hr/positions', label: 'Position Master' }

        ]
      },
      {
        label: 'Applicants',
        icon: ICONS.applicants,
        children: [
          { to: '/hr/applicants', label: 'External' },
          { to: '/hr/internal-applicants', label: 'Internal' }
        ]
      },
      { to: '/hr/bgv', label: 'BGV Management', icon: ICONS.bgv },
      { to: '/hr/candidate-status', label: 'Candidate Status Tracker', icon: ICONS.tracker }
    ]
  },
  {
    title: 'Configuration',
    items: [
      {
        label: 'Templates',
        icon: ICONS.templates,
        children: [
          { to: '/hr/letter-templates', label: 'Letter Editor' },
          { to: '/hr/letter-settings', label: 'Letter Settings' },
          { to: '/hr/payslip-templates', label: 'Payslip Templates' }
        ]
      },
      { to: '/hr/access', label: 'Access Control', icon: ICONS.access },
      { to: '/hr/settings/company', label: 'Company Settings', icon: ICONS.settings }
    ]
  },
  {
    title: 'Public Portal',
    items: [
      {
        label: 'Customization',
        icon: ICONS.customization,
        children: [
          { to: '/hr/career-builder', label: 'Edit Career Page' },
          { to: '/hr/apply-builder', label: 'Edit Apply Page' }
        ]
      },
      {
        label: 'View Careers Page',
        icon: ICONS.viewCareers,
        isExternal: true
      }
    ]
  }
];

/* ================= COMPONENT ================= */
export default function HRSidebar({ collapsed = false, toggleCollapse, onNavigate }) {
  const { user, isInitialized } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) return;
    // Prevent fetching HR data if the user is a Candidate
    if (user.role === 'candidate') return;

    api.get('/tenants/me').then(res => setTenant(res.data)).catch(() => { });
  }, [user, isInitialized]);

  const toggleGroup = (title) =>
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));

  const handleExternalNav = (item) => {
    if (item.label === 'View Careers Page' && tenant?.code) {
      window.open(`/jobs/${tenant.code}`, '_blank');
    }
  };

  return (
    <aside className="h-full bg-gradient-to-b from-[#0F172A] via-[#111827] to-[#0F172A] border-r border-indigo-900/40 text-slate-300 flex flex-col w-full relative">
      <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        {!collapsed && (
          <div>
            <div className="font-bold text-lg text-blue-400">Company Admin</div>
            <div className="text-xs text-slate-500">HR Platform</div>
          </div>
        )}
        {toggleCollapse && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-95"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full text-left text-xs uppercase text-slate-500 font-bold mb-2"
              >
                {group.title}
              </button>
            )}
            {group.items.map(item => {
              if (item.isExternal) {
                return (
                  <button
                    key={item.label}
                    onClick={() => handleExternalNav(item)}
                    aria-label={item.label}
                    title={item.label}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm transition hover:bg-slate-800/50 text-blue-400 font-bold"
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              }
              if (item.children) {
                const isExpanded = expanded[item.label];
                const hasActiveChild = item.children.some(child => location.pathname === child.to);
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      aria-label={item.label}
                      title={item.label}
                      className={`w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm transition
                        ${hasActiveChild ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'hover:bg-indigo-500/10 hover:text-indigo-300'}`}
                    >
                      {item.icon}
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </>
                      )}
                    </button>
                    {!collapsed && isExpanded && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map(child => (
                          <NavLink
                            key={child.label}
                            to={child.to}
                            onClick={() => onNavigate && onNavigate()}
                            className={({ isActive }) =>
                              `block py-1.5 px-3 rounded-md text-sm transition
                               ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )
                    }
                  </div>
                );
              }
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => onNavigate && onNavigate()}


                  className={({ isActive }) => {
                    // Custom active check for links with query parameters
                    let active = isActive;
                    if (item.to.includes('?')) {
                      const [path, query] = item.to.split('?');
                      const currentPath = location.pathname;
                      const currentQuery = location.search.substring(1);
                      active = currentPath === path && currentQuery === query;
                    }
                    return `flex items-center gap-3 py-2 px-3 rounded-md text-sm transition
                     ${active ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`;
                  }}

                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Company block */}
      <div className="p-4 border-t border-slate-800">
        {tenant && !collapsed && (
          <div className="text-xs text-slate-400">
            <div className="font-semibold">{tenant.name}</div>
            <div>{tenant.code}</div>
          </div>
        )}
      </div>
    </aside >
  );
}

function SidebarCompanyBlock({ collapsed }) {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get('/tenants/me').then(res => { if (mounted) setTenant(res.data); }).catch(() => { });
    return () => { mounted = false; };
  }, []);

  const name = tenant?.name || 'Company';
  const code = tenant?.code || '';
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`flex items-center gap-3 mt-4 ${collapsed ? 'justify-center' : ''}`}>
      <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold flex-shrink-0">{initials || 'HR'}</div>
      {!collapsed && (
        <div className="overflow-hidden">
          <div className="font-semibold truncate">{name}</div>
          {code && <div className="text-sm text-slate-500 truncate">{code}</div>}
        </div>
      )}
    </div>
  );
}
