import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Share2,
  ChevronDown
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
  customization: <Brush size={ICON_SIZE} />,
  social: <Share2 size={ICON_SIZE} />,
  viewCareers: <ExternalLink size={ICON_SIZE} />,
  chevronDown: <ChevronDown size={14} />
};

/* ================= NAV GROUPS ================= */
const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { to: '/hr', label: 'Dashboard', icon: ICONS.dashboard, end: true },
      { to: '/hr/reports', label: 'Reports', icon: ICONS.payrollDashboard }
    ]
  },
  {
    title: 'People',
    module: 'hr',
    items: [
      { to: '/hr/employees', label: 'Employees', icon: ICONS.employees },
      { to: '/hr/departments', label: 'Departments', icon: ICONS.departments },
      { to: '/hr/org', label: 'Org Structure', icon: ICONS.org },
      { to: '/hr/users', label: 'Users', icon: ICONS.users }
    ]
  },
  {
    title: 'Attendance',
    module: 'attendance',
    items: [
      { to: '/hr/attendance', label: 'Dashboard', icon: ICONS.attendance },
      { to: '/hr/attendance-calendar', label: 'Calendar', icon: ICONS.calendar },
      { to: '/hr/face-update-requests', label: 'Face Updates', icon: ICONS.users }
    ]
  },
  {
    title: 'Leave',
    module: 'leave',
    items: [
      { to: '/hr/leave-approvals', label: 'Requests', icon: ICONS.leaveRequests },
      { to: '/hr/leave-policies', label: 'Policies', icon: ICONS.leavePolicies }
    ]
  },
  {
    title: 'Payroll',
    module: 'payroll',
    items: [
      { to: '/hr/payroll/dashboard', label: 'Stats', icon: ICONS.payrollDashboard },
      { to: '/hr/payroll/salary-components', label: 'Salary', icon: ICONS.salaryComponents },
      { to: '/hr/payroll/compensation', label: 'Compensation', icon: ICONS.compensation },
      { to: '/hr/payroll/process', label: 'Process', icon: ICONS.process },
      { to: '/hr/payroll/run', label: 'History', icon: ICONS.runHistory },
      { to: '/hr/payroll/payslips', label: 'Payslips', icon: ICONS.payslips }
    ]
  },
  {
    title: 'Hiring',
    module: 'recruitment',
    items: [
      { to: '/hr/requirements', label: 'Job List', icon: ICONS.requirements },
      { to: '/hr/applicants', label: 'Applicants', icon: ICONS.applicants },
      { to: '/hr/candidate-status', label: 'Tracker', icon: ICONS.tracker }
    ]
  },
  {
    title: 'Identity',
    module: 'backgroundVerification',
    items: [
      { to: '/hr/bgv', label: 'Case Master', icon: ICONS.bgv },
    ]
  },
  {
    title: 'Documents',
    module: 'documentManagement',
    items: [
      { to: '/hr/letters', label: 'Dashboard', icon: ICONS.dashboard },
      { to: '/hr/letters/issue', label: 'Issue New', icon: ICONS.applicants },
    ]
  },
  {
    title: 'Config',
    items: [
      { to: '/hr/letter-templates', label: 'Templates', icon: ICONS.templates },
      { to: '/hr/access', label: 'Access Control', icon: ICONS.access },
      { to: '/hr/settings/company', label: 'Settings', icon: ICONS.settings, end: true },
    ]
  },
  {
    title: 'Portals',
    items: [
      { to: '/hr/career-builder', label: 'Career Page', icon: ICONS.customization },
      { to: '/hr/apply-builder', label: 'Apply Page', icon: ICONS.customization },
      { label: 'View Public', icon: ICONS.viewCareers, isExternal: true }
    ]
  }
];

export default function HRSidebar({ onClose }) {
  const { user, isInitialized, enabledModules } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState({
    Overview: true,
    People: true,
    Attendance: true,
    Leave: true,
    Payroll: false,
    Hiring: false,
    Identity: false,
    Documents: false,
    Config: false,
    Portals: false
  });
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    if (!isInitialized || !user || user.role === 'candidate') return;
    api.get('/tenants/me').then(res => setTenant(res.data)).catch(() => { });
  }, [user, isInitialized]);

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredGroups = NAV_GROUPS.filter(group => {
    if (user?.role === 'psa') return true;
    if (group.module) {
      return enabledModules && enabledModules[group.module] === true;
    }
    return true;
  });

  const handleExternalNav = () => {
    if (tenant?.code) window.open(`/jobs/${tenant.code}`, '_blank');
  };

  return (
    <aside className="w-full h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex flex-col shadow-sm overflow-hidden relative">
      <div className="px-4 py-8 flex-shrink-0 flex items-center justify-start gap-3 h-20">
        <div className="w-10 h-10 min-w-[2.5rem] rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
          H
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden flex flex-col">
          <div className="text-sm font-bold text-slate-800 dark:text-white leading-none">Global Tech</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-2 group-hover:space-y-6 transition-all duration-300 custom-scrollbar">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups[group.title];
          return (
            <div key={group.title} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 transition-all duration-300 h-0 mb-0 opacity-0 overflow-hidden group-hover:h-6 group-hover:mb-2 group-hover:opacity-100"
              >
                <span className="whitespace-nowrap">{group.title}</span>
                <span className={`transform transition-all duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                  <ChevronDown size={12} />
                </span>
              </button>

              <div className={`space-y-1 transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {group.items.map((item) => {
                  const isActive = item.to && location.pathname === item.to;
                  if (item.isExternal) {
                    return (
                      <button
                        key={item.label}
                        onClick={handleExternalNav}
                        className="relative w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 group/item hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-[#14B8A6]"
                      >
                        <div className="flex-shrink-0 text-slate-400 group-hover/item:text-[#14B8A6]">
                          {item.icon}
                        </div>
                        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                          {item.label}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      end={item.end}
                      onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                      className={({ isActive }) => `relative w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 group/item overflow-hidden
                        ${isActive
                          ? 'bg-[#14B8A6] text-white shadow-md shadow-teal-500/20 group-hover:bg-gradient-to-r group-hover:from-[#14B8A6] group-hover:via-[#5EEAD4] group-hover:to-[#CCFBF1] group-hover:text-[#0F766E]'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                      <div className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover/item:text-slate-600'}`}>
                        {item.icon}
                      </div>
                      <span className={`whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 ${isActive ? 'font-bold' : ''}`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 bg-[#ccfbf1] opacity-50 blur-[2px]"></div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Active</span>
        </div>
        <div className="text-[10px] text-slate-400 truncate">
          v2.5.0 Stable Release
        </div>
      </div>
    </aside>
  );
}
