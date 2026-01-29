import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useJobPortalAuth } from '../context/JobPortalAuthContext';
import {
  LogOut, User, Briefcase, FileText,
  LayoutDashboard, ChevronDown,
  Bell, ExternalLink, ArrowLeft
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

  // FEATURE 3: BACK BUTTON BEHAVIOR
  useEffect(() => {
    const handlePopState = (event) => {
      const path = window.location.pathname;
      if (path.includes('/apply-job/') || path.includes('/application/')) {
        event.preventDefault();
        const tid = tenantId || getTenantId();
        if (tid) {
          navigate(`/jobs/${tid}`, { replace: true });
        } else {
          navigate('/jobs/dashboard', { replace: true });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, tenantId]);

  const menuItems = [
    { path: '/jobs/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/jobs/open-positions', icon: Briefcase, label: 'Open Positions' },
    { path: '/jobs/applications', icon: FileText, label: 'My Applications' },
    { path: '/jobs/profile', icon: User, label: 'My Profile' }
  ];

  return (
    <div className="min-h-screen bg-[#FBFCFE] font-sans flex flex-col">
      {/* TOP HEADER */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-8">
          {/* Brand/Back */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/jobs/${tenantId}`)}
              className="group flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-all font-bold text-xs uppercase tracking-widest"
            >
              <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
                <ArrowLeft size={18} />
              </div>
              <span className="hidden sm:inline">Back to Jobs</span>
            </button>
          </div>

          <div className="h-8 w-px bg-gray-100 hidden md:block"></div>

          {/* Horizontal Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50/50'}
                `}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button className="p-2.5 text-gray-400 hover:text-blue-600 transition-colors relative">
            <Bell size={22} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="h-8 w-px bg-gray-100 hidden sm:block"></div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 p-1 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <span className="font-black text-sm uppercase">{(candidate?.name || 'C').charAt(0)}</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-black text-gray-900 leading-none truncate max-w-[120px]">{candidate?.name || 'Candidate'}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Portal Account</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-gray-100 py-4 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="px-6 py-4 border-b border-gray-50 mb-2">
                    <p className="text-sm font-black text-gray-900">{candidate?.name || 'Candidate'}</p>
                    <p className="text-xs text-gray-400 font-medium truncate">{candidate?.email}</p>
                  </div>
                  <div className="block lg:hidden px-2 mb-2 border-b border-gray-50 pb-2">
                    {menuItems.map((item) => (
                      <button key={item.path} onClick={() => { navigate(item.path); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all text-sm font-bold">
                        <item.icon size={18} /> {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="px-2">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-all text-sm font-bold">
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
