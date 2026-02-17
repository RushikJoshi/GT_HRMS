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


        // 1. Navigation Logic
        navigate(`/employee/${id}`);

        // 2. State & UI Logic
        // Always call setActiveTab to ensure highlighting and tab selection are in sync
        setActiveTab(id);

        if (onClose) onClose();
    };

    return (
        <aside className="w-full h-full bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#0F172A] border-r border-indigo-900/30 text-slate-300 flex flex-col shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none opacity-30"></div>

            {/* Header / Brand */}
            <div className="px-4 py-6 flex-shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
                        G
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white leading-none">
                            Gitakshmi
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                            {isManager ? 'Manager' : 'Employee'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Scroll Area */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
                {filteredGroups.map((group) => {
                    const groupTitle = group.title;
                    const groupKey = group.id || group.title;
                    const isExpanded = expandedGroups[groupKey];

                    return (
                        <div key={groupKey} className="space-y-1">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between text-xs font-medium text-slate-400 mb-2 px-2 hover:text-slate-300 transition-colors"
                            >
                                <span>{groupTitle}</span>
                                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                    <ChevronDown size={12} />
                                </span>
                            </button>

                            {/* Group Items */}
                            <div className={`space-y-1 transition-all duration-200 overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {group.items.map((item) => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabClick(item.id)}
                                            aria-label={item.label}
                                            title={item.label}
                                            className={`relative w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-sm transition-all duration-200 group
                                                ${isActive
                                                    ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <div className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                {item.icon}
                                            </div>
                                            <span className="font-medium flex-1 text-left">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer System Info */}
            <div className="p-4 mt-auto border-t border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium text-slate-400">System Active</span>
                </div>
                <div className="text-xs text-slate-500">
                    Logged in as <span className="text-slate-300 font-medium">{user?.role}</span>
                </div>
            </div>
        </aside>
    );
}


