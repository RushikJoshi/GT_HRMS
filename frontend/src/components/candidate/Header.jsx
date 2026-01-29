import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCompany } from '../../utils/auth';
import { ArrowLeft, LogOut, User as UserIcon, Bell, LayoutDashboard, Briefcase, FileText, User } from 'lucide-react';

export default function Header() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Get company for back navigation
    const company = getCompany();

    const handleBack = () => {
        if (company && company.code) {
            navigate(`/jobs/${company.code}`);
        } else if (company && (company.tenantId || company._id)) {
            navigate(`/jobs/${company.tenantId || company._id}`);
        } else {
            navigate('/');
        }
    };

    const handleLogout = () => {
        const companyInfo = getCompany();
        logout();
        if (companyInfo && (companyInfo.code || companyInfo.tenantId || companyInfo._id)) {
            navigate(`/jobs/${companyInfo.code || companyInfo.tenantId || companyInfo._id}`);
        } else {
            navigate('/');
        }
    };

    const menuItems = [
        { name: 'Dashboard', path: '/candidate/dashboard', icon: LayoutDashboard },
        { name: 'Open Positions', path: '/candidate/open-positions', icon: Briefcase },
        { name: 'My Applications', path: '/candidate/applications', icon: FileText },
        { name: 'My Profile', path: '/candidate/profile', icon: User },
    ];

    return (
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
            <div className="flex items-center gap-8">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold text-sm uppercase tracking-widest transition-all group mr-4"
                >
                    <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span>Back to Job Portal</span>
                </button>

                <nav className="hidden xl:flex items-center gap-1">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/candidate/dashboard'}
                            className={({ isActive }) => `
                                px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2
                                ${isActive
                                    ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50'
                                    : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'}
                            `}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative text-gray-400 hover:text-blue-600 transition-colors">
                    <Bell className="w-6 h-6" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="h-8 w-px bg-gray-100"></div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-black text-gray-900 leading-none">{user?.name || 'Candidate'}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{user?.email}</p>
                    </div>
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] shadow-lg shadow-blue-500/20">
                        <div className="h-full w-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden">
                            {user?.name ? (
                                <span className="text-blue-600 font-bold">{user.name.charAt(0)}</span>
                            ) : (
                                <UserIcon className="w-5 h-5 text-blue-600" />
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 transition-all active:scale-95 border border-rose-100"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
