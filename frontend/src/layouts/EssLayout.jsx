import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import EmployeeSidebar from '../components/EmployeeSidebar';
import NotificationDropdown from '../components/NotificationDropdown';
import SidebarCompanyBlock from '../components/SidebarCompanyBlock';
import { useAuth } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { Sun, Moon, LogOut, Menu, ArrowLeft } from 'lucide-react';

export default function EssLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('essActiveTab') || 'dashboard');

  // Sync activeTab with current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/payslips')) {
      setActiveTab('payslips');
    } else if (path.includes('/dashboard') || path === '/employee' || path === '/employee/') {
      setActiveTab('dashboard');
    } else if (path.includes('/attendance')) {
      setActiveTab('attendance');
    } else if (path.includes('/leaves')) {
      setActiveTab('leaves');
    } else if (path.includes('/regularization')) {
      setActiveTab('regularization');
    } else if (path.includes('/profile')) {
      setActiveTab('profile');
    } else if (path.includes('/team-leaves')) {
      setActiveTab('team-leaves');
    } else if (path.includes('/team-attendance')) {
      setActiveTab('team-attendance');
    } else if (path.includes('/team-regularization')) {
      setActiveTab('team-regularization');
    } else if (path.includes('/internal-jobs')) {
      setActiveTab('internal-jobs');
    } else if (path.includes('/my-applications')) {
      setActiveTab('my-applications');
    } else if (path.includes('/face-attendance')) {
      setActiveTab('face-attendance');
    }
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('essActiveTab', activeTab);
  }, [activeTab]);
  const [profile, setProfile] = useState(null);

  const uiContext = useContext(UIContext);
  const { theme, toggleTheme } = uiContext || { theme: 'light', toggleTheme: () => { } };

  useEffect(() => {
    if (user) {
      api.get('/hrms/employee/profile').then(res => setProfile(res.data)).catch(() => { });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name || 'Employee';

  return (
    <div className={`flex h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on desktop */}
      <div className={`fixed w-72 h-screen transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <EmployeeSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (!window.location.pathname.startsWith('/employee')) navigate('/employee');
          }}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col w-full md:ml-72 min-h-screen overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center px-8 h-24 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-hover"
                title="Go Back"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
              <div className="flex flex-col">
                <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1">
                  Security Protocol
                </h2>
                <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">
                  Employee Intelligence Portal
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-[1.25rem] border border-slate-200/50 dark:border-slate-800/50">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm group"
                title="Toggle Environment"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-90 transition-transform duration-700" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600 group-hover:-rotate-12 transition-transform duration-700" />
                )}
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>

              <div className="relative">
                <NotificationDropdown />
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-black text-slate-800 dark:text-white leading-none uppercase tracking-tighter italic">{fullName}</p>
                <p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mt-1.5">{user?.role} NODE</p>
              </div>

              <div className="relative group cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 p-[2px] shadow-2xl shadow-indigo-600/20 group-hover:scale-110 transition-all duration-500">
                  <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center relative">
                    {profile?.profilePic ? (
                      <img src={profile.profilePic} alt="profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 italic">{fullName?.[0]?.toUpperCase()}</span>
                    )}
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full"></div>
              </div>

              <button
                onClick={handleLogout}
                className="p-3 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl transition-all border border-slate-200/50 dark:border-slate-800/50 hover:border-rose-200 dark:hover:border-rose-900/40 group shadow-sm"
                title="Terminate Session"
              >
                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F172A] p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Outlet context={{ activeTab, setActiveTab }} />
          </div>
        </main>
      </div>
    </div>
  );
}

