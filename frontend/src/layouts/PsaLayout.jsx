import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Briefcase, Plus, List, LayoutGrid,
  Activity, Settings, LogOut, Menu, X, ArrowLeft, Search
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logoSrc from "../assets/logonew.png";

const NavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={(navData) => {
      const base = "group w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200";
      const active = "bg-violet-100 text-violet-800 border border-violet-200/80 shadow-sm";
      const inactive = "text-slate-600 hover:bg-violet-50/80 hover:text-violet-700";
      return `${base} ${navData.isActive ? active : inactive}`;
    }}
  >
    <Icon size={20} strokeWidth={1.5} className="text-inherit" />
    <span className="tracking-wide">{label}</span>
  </NavLink>
);

export default function PsaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCompaniesOpen, setIsCompaniesOpen] = useState(
    location.pathname.includes('companies')
  );

  useEffect(() => {
    if (!user) navigate("/super-admin/login", { replace: true });
  }, [user, navigate]);

  const toggleCompanies = () => setIsCompaniesOpen(!isCompaniesOpen);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white font-sans selection:bg-violet-200 selection:text-violet-900 overflow-x-hidden">

      {/* Sidebar - light lavender */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:flex ${isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full hidden lg:block"}`}
        style={{
          background: "linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 50%, #E9D5FF 100%)",
          boxShadow: "4px 0 32px rgba(139, 92, 246, 0.06)",
          borderRight: "1px solid rgba(196, 181, 253, 0.4)"
        }}>
        <div className="absolute top-0 right-0 w-44 h-44 opacity-25 pointer-events-none" aria-hidden>
          <svg viewBox="0 0 100 100" className="w-full h-full text-violet-200">
            <circle cx="80" cy="20" r="45" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute bottom-40 left-0 w-28 h-28 opacity-20 pointer-events-none" aria-hidden>
          <svg viewBox="0 0 100 100" className="w-full h-full text-violet-200">
            <circle cx="20" cy="80" r="40" fill="currentColor" />
          </svg>
        </div>

        <div className="h-20 flex items-center px-6 border-b border-violet-200/50 relative z-10">
          <img src={logoSrc} alt="logo" className="w-32 object-contain h-8" />
          <button className="lg:hidden ml-auto text-slate-600 hover:text-violet-600" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-6 relative z-10">
          <div className="mb-4 px-4 mt-2">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest">Main Menu</p>
          </div>
          <NavItem to="/super-admin/dashboard" icon={LayoutGrid} label="Dashboard" end />
          <div className="space-y-1 mt-1">
            <button
              onClick={toggleCompanies}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isCompaniesOpen ? 'bg-violet-100 text-violet-800 border border-violet-200/80' : 'text-slate-600 hover:bg-violet-50/80 hover:text-violet-700'}`}
            >
              <div className="flex items-center gap-3">
                <Briefcase size={20} strokeWidth={1.5} className={isCompaniesOpen ? 'text-violet-600' : ''} />
                <span className="tracking-wide">Companies</span>
              </div>
              {isCompaniesOpen ? <ChevronDown size={16} className="text-violet-600" /> : <ChevronRight size={16} className="text-slate-400" />}
            </button>
            {isCompaniesOpen && (
              <div className="pl-4 mt-1 space-y-1">
                <div className="border-l-2 border-violet-200 pl-3 space-y-1 ml-4">
                  <NavLink to="/super-admin/companies/add" className={({ isActive }) => `flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive ? 'text-violet-700 bg-violet-50 border-l-2 border-violet-400 -ml-[2px] pl-[18px]' : 'text-slate-600 hover:text-violet-700 hover:bg-violet-50/60'}`}>
                    <Plus size={18} /> Add Company
                  </NavLink>
                  <NavLink to="/super-admin/companies" end className={({ isActive }) => `flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive ? 'text-violet-700 bg-violet-50 border-l-2 border-violet-400 -ml-[2px] pl-[18px]' : 'text-slate-600 hover:text-violet-700 hover:bg-violet-50/60'}`}>
                    <List size={18} /> All Companies
                  </NavLink>
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 mb-4 px-4">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest">System</p>
          </div>
          <NavItem to="/super-admin/activities" icon={Activity} label="Recent Activities" />
          <NavItem to="/super-admin/modules" icon={Settings} label="Module Config" />
        </nav>

        <div className="p-4 border-t border-violet-200/50 relative z-10" style={{ background: "linear-gradient(0deg, rgba(237,233,254,0.7) 0%, transparent 100%)" }}>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/90 border border-violet-200/60 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md text-white" style={{ background: "linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)" }}>SA</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-700 truncate">Super Admin</div>
              <div className="text-[10px] font-medium text-slate-500 truncate uppercase tracking-wider">System Root</div>
            </div>
            <Settings size={18} className="text-slate-400 shrink-0" />
          </div>
        </div>
      </aside>

      <main className="w-full flex-1 min-h-screen relative flex flex-col min-w-0 overflow-hidden bg-white">
        <header className="h-20 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-violet-100 bg-white/95 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2.5 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 hover:bg-violet-100 hover:border-violet-200 flex items-center justify-center transition-all hidden md:flex">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold text-slate-700 tracking-tight uppercase">
              Product Super Admin
            </h1>
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="relative hidden lg:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-violet-400" size={18} />
              </div>
              <input
                type="text"
                placeholder="Type to search..."
                className="pl-10 pr-4 py-2.5 bg-violet-50/80 border border-violet-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 w-56 transition-all"
              />
            </div>
            <div className="h-8 w-px bg-violet-200 hidden lg:block" />
            <button
              onClick={() => { logout(); navigate("/super-admin/login"); }}
              className="px-4 lg:px-5 py-2.5 bg-violet-600 text-white hover:bg-violet-500 text-xs font-semibold rounded-xl shadow-md hover:shadow-lg flex items-center gap-2 transition-all"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8" style={{ background: "linear-gradient(180deg, #FAF5FF 0%, #F5F3FF 50%, #EDE9FE 100%)" }}>
          <div className="w-full max-w-[1600px] mx-auto min-h-full fade-in-up">
            <Outlet />
          </div>
        </div>
      </main>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-500/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <style>{`
        .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
