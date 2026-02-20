import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Clock,
    SquareCheck,
    ScanFace,
    Plane,
    CreditCard,
    Briefcase,
    FileSignature,
    User,
    ChevronDown,
    Users,
    Settings,
    Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ICONS = {
    dashboard: <LayoutDashboard size={20} />,
    attendance: <Clock size={20} />,
    regularization: <SquareCheck size={20} />,
    faceAttendance: <ScanFace size={20} />,
    leaves: <Plane size={20} />,
    payslips: <CreditCard size={20} />,
    jobs: <Briefcase size={20} />,
    applications: <FileSignature size={20} />,
    profile: <User size={20} />,
    team: <Users size={20} />,
    chevronDown: <ChevronDown size={14} />,
    vendor: <Building2 size={20} />
};

export default function EmployeeSidebar({ activeTab, setActiveTab, onClose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isManager = user?.role === 'manager';

    const [expandedGroups, setExpandedGroups] = useState({
        Overview: true,
        Attendance: true,
        Leave: true,
        Payroll: true,
        Team: true,
        Opportunities: true,
        Vendor: true,
        Settings: true
    });

    const NAV_GROUPS = [
        {
            title: 'Overview',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard }
            ]
        },
        {
            title: 'Work Management',
            id: 'Attendance',
            module: 'attendance',
            items: [
                { id: 'attendance', label: 'My Attendance', icon: ICONS.attendance },
                { id: 'regularization', label: 'Regularization', icon: ICONS.regularization },
                { id: 'face-attendance', label: 'Face Attendance', icon: ICONS.faceAttendance }
            ]
        },
        {
            title: 'Leave & Time',
            id: 'Leave',
            module: 'leave',
            items: [
                { id: 'leaves', label: 'My Leaves', icon: ICONS.leaves }
            ]
        },
        ...(isManager ? [{
            title: 'Team Management',
            id: 'Team',
            module: 'hr', // Team management usually part of HR module
            items: [
                { id: 'team-attendance', label: 'Team Attendance', icon: ICONS.attendance },
                { id: 'team-leaves', label: 'Team Leaves', icon: ICONS.leaves },
                { id: 'team-regularization', label: 'Team Approval', icon: ICONS.regularization }
            ]
        }] : []),
        {
            title: 'Finances',
            id: 'Payroll',
            module: 'payroll',
            items: [
                { id: 'payslips', label: 'My Payslips', icon: ICONS.payslips }
            ]
        },
        {
            title: 'Growth',
            id: 'Opportunities',
            module: 'recruitment',
            items: [
                { id: 'internal-jobs', label: 'Internal Jobs', icon: ICONS.jobs },
                { id: 'my-applications', label: 'My Applications', icon: ICONS.applications }
            ]
        },
        // {
        //     title: 'Vendor Portal',
        //     id: 'Vendor',
        //     items: [
        //         { id: 'vendor/list', label: 'Vendor Forms', icon: ICONS.vendor }
        //     ]
        // },
        {
            title: 'Account',
            id: 'Settings',
            items: [
                { id: 'profile', label: 'My Profile', icon: ICONS.profile }
            ]
        }
    ];

    const { enabledModules } = useAuth();

    const filteredGroups = NAV_GROUPS.filter(group => {
        if (user?.role === 'psa') return true;
        if (group.module) {
            return enabledModules && enabledModules[group.module] === true;
        }
        return true;
    });

    const toggleGroup = (title) => {
        setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const handleTabClick = (id) => {
        navigate(`/employee/${id}`);
        setActiveTab(id);
        if (onClose) onClose();
    };

    return (
        <aside className="w-full h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex flex-col shadow-sm overflow-hidden relative">

            {/* Header / Brand */}
            <div className="px-4 py-8 flex-shrink-0 flex items-center justify-start gap-3 h-20">
                <div className="w-10 h-10 min-w-[2.5rem] rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
                    G
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden flex flex-col">
                    <div className="text-sm font-bold text-slate-800 dark:text-white leading-none">Global Tech</div>
                </div>
            </div>

            {/* Navigation Scroll Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-2 group-hover:space-y-6 transition-all duration-300 custom-scrollbar">
                {filteredGroups.map((group) => {
                    const groupKey = group.id || group.title;
                    const isExpanded = expandedGroups[groupKey];

                    return (
                        <div key={groupKey} className="space-y-1">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 transition-all duration-300 h-0 mb-0 opacity-0 overflow-hidden group-hover:h-6 group-hover:mb-2 group-hover:opacity-100"
                            >
                                <span className="whitespace-nowrap">{group.title}</span>
                                <span className={`transform transition-all duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                    <ChevronDown size={12} />
                                </span>
                            </button>

                            {/* Group Items */}
                            <div className={`space-y-1 transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {group.items.map((item) => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabClick(item.id)}
                                            title={item.label}
                                            className={`relative w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 group/item overflow-hidden
                                                ${isActive
                                                    /* Active State: 
                                                       Collapsed -> Solid Teal (#14B8A6), White Text
                                                       Expanded (Hover) -> Gradient Teal-to-White, Dark Teal Text
                                                    */
                                                    ? 'bg-[#14B8A6] text-white shadow-md shadow-teal-500/20 group-hover:bg-gradient-to-r group-hover:from-[#14B8A6] group-hover:via-[#5EEAD4] group-hover:to-[#CCFBF1] group-hover:text-[#0F766E]'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <div className={`flex-shrink-0 transition-colors duration-200 
                                                ${isActive
                                                    ? 'text-white' // Icon always white on active
                                                    : 'text-slate-400 group-hover/item:text-slate-600'}`}>
                                                {item.icon}
                                            </div>
                                            <span className={`whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 ${isActive ? 'font-bold' : ''}`}>
                                                {item.label}
                                            </span>

                                            {/* Active Indicator Glow */}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 bg-[#ccfbf1] opacity-50 blur-[2px]"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer System Info */}
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
