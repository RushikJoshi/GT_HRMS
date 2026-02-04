import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import { getCompany } from '../../utils/auth';
import { API_ROOT } from '../../utils/api';
import { ArrowLeft, LogOut, User as UserIcon, Bell, LayoutDashboard, Briefcase, FileText, User } from 'lucide-react';

export default function Header() {
    const navigate = useNavigate();
    const { candidate, logoutCandidate } = useJobPortalAuth();

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
        logoutCandidate();
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
        <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40 supports-[backdrop-filter]:bg-white/60">
            <div className="flex items-center gap-8">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all group mr-6"
                >
                    <div className="bg-slate-50 p-2.5 rounded-xl group-hover:bg-indigo-50 transition-colors border border-slate-100 group-hover:border-indigo-100">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span>Portal Hub</span>
                </button>

                <nav className="hidden xl:flex items-center gap-2">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/candidate/dashboard'}
                            className={({ isActive }) => `
                                px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2.5 border border-transparent
                                ${isActive
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm'
                                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}
                            `}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative text-slate-400 hover:text-premium-blue transition-colors">
                    <Bell className="w-5 h-5" />
                </button>

                <div className="h-8 w-px bg-slate-100"></div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
                        <p className="text-[13px] font-black text-slate-800 leading-none mb-1">{candidate?.name || 'Candidate'}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Global Account</p>
                    </div>
                    <div
                        className="h-10 w-10 rounded-xl bg-white border border-slate-100 p-1 shadow-sm group cursor-pointer hover:border-premium-blue transition-colors flex items-center justify-center overflow-hidden"
                        onClick={() => navigate('/candidate/profile')}
                    >
                        {candidate?.profilePic ? (
                            <img
                                src={candidate.profilePic.startsWith('http') || candidate.profilePic.startsWith('blob:') ? candidate.profilePic : `${API_ROOT}${candidate.profilePic}`}
                                alt="Profile"
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className={`h-full w-full bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors ${candidate?.profilePic ? 'hidden' : 'flex'}`}>
                            {candidate?.name ? (
                                <span className="text-slate-600 font-black text-sm group-hover:text-premium-blue">{candidate.name.charAt(0)}</span>
=======
                        <p className="text-[13px] font-black text-slate-900 leading-none mb-1">{user?.name || 'Candidate'}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Global Account</p>
                    </div>
=======
                        <p className="text-[13px] font-black text-slate-900 leading-none mb-1">{user?.name || 'Candidate'}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Global Account</p>
                    </div>
>>>>>>> Stashed changes
=======
                        <p className="text-[13px] font-black text-slate-900 leading-none mb-1">{user?.name || 'Candidate'}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Global Account</p>
                    </div>
>>>>>>> Stashed changes
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 p-1 shadow-sm group cursor-pointer hover:border-indigo-200 transition-colors">
                        <div className="h-full w-full bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden group-hover:bg-indigo-50 transition-colors">
                            {user?.name ? (
                                <span className="text-slate-900 font-black text-sm group-hover:text-indigo-600">{user.name.charAt(0)}</span>
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
                            ) : (
                                <UserIcon className="w-4 h-4 text-slate-400" />
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="bg-white text-slate-400 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 border border-slate-100 hover:border-rose-100 shadow-sm"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
