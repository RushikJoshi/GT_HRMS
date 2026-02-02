import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useJobPortalAuth } from '../context/JobPortalAuthContext';
import {
  LogOut, User, Briefcase, FileText,
  LayoutDashboard, ChevronDown,
  Bell, ArrowLeft, Shield
} from 'lucide-react';
import { getTenantId } from '../utils/auth';

export default function JobPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { candidate, logoutCandidate } = useJobPortalAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const tenantId = getTenantId();

  const handleLogout = () => {
    logoutCandidate();
    navigate(`/candidate/login?tenantId=${tenantId}`);
  };

  useEffect(() => {
    const handlePopState = (event) => {
      const path = window.location.pathname;
      if (path.includes('/apply-job/') || path.includes('/application/')) {
        event.preventDefault();
        const tid = tenantId || getTenantId();
        if (tid) {
          navigate(`/jobs/${tid}`, { replace: true });
        } else {
          navigate('/candidate/dashboard', { replace: true });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, tenantId]);

  const menuItems = [
    { path: '/candidate/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/candidate/open-positions', icon: Briefcase, label: 'Open Positions' },
    { path: '/candidate/applications', icon: FileText, label: 'My Applications' },
    { path: '/candidate/profile', icon: User, label: 'My Profile' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-600">
      {/* LUXURY TOP HEADER */}
      <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-10 lg:px-16 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-12">
          {/* Brand/Back - Enhanced */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(`/jobs/${tenantId}`)}
              className="group flex items-center gap-4 text-slate-500 hover:text-indigo-600 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
            >
              <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:scale-110 shadow-sm">
                <ArrowLeft size={20} />
              </div>
              <span className="hidden sm:inline">Portal Hub</span>
            </button>
          </div>

          <div className="h-8 w-px bg-slate-100 hidden md:block"></div>

          {/* Luxury Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-3 bg-slate-50/50 p-1.5 rounded-[2rem] border border-slate-100/50">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-7 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all relative overflow-hidden group
                  ${isActive
                    ? 'text-white bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 shadow-xl shadow-indigo-100'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-white'}
                `}
              >
                <item.icon size={16} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
                {/* Active Glow Effect */}
                {location.pathname === item.path && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-blue-500/30 to-purple-500/30 opacity-20 blur-xl"></div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors relative bg-slate-50 rounded-full">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>

          {/* Elevated Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-4 p-1.5 rounded-[1.5rem] bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-all active:scale-[0.98] shadow-inner"
            >
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 ring-4 ring-white">
                <span className="font-black text-sm uppercase">{(candidate?.name || 'C').charAt(0)}</span>
              </div>
              <div className="text-left hidden sm:block pr-3">
                <p className="text-xs font-black text-slate-800 leading-none truncate max-w-[130px]">{candidate?.name || 'Candidate'}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Global Account</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-500 mr-2 ${profileOpen ? 'rotate-180 text-indigo-500' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-100 py-4 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="px-6 py-4 border-b border-slate-50 mb-2">
                    <p className="text-sm font-bold text-slate-800">{candidate?.name || 'Candidate'}</p>
                    <p className="text-xs text-slate-400 font-medium truncate">{candidate?.email}</p>
                  </div>
                  <div className="block lg:hidden px-2 mb-2 border-b border-slate-50 pb-2">
                    {menuItems.map((item) => (
                      <button key={item.path} onClick={() => { navigate(item.path); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all text-sm font-bold">
                        <item.icon size={18} /> {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="px-2">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all text-sm font-bold">
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA - LUXURY CONSTRAINTS */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="p-8 lg:p-14 max-w-[1700px] mx-auto w-full animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
