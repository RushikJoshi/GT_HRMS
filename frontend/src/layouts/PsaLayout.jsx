import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Briefcase, Plus, List, LayoutGrid,
  Activity, Settings, LogOut, Menu, X, ArrowLeft, Bell, Search, User
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logoSrc from "../assets/logonew.png";

const NavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={(navData) => {
      // Base: Clean and simple professional font style
      const base = "group w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border-l-4 border-transparent";

      // Active: Professional Blue accent on left border, subtle background
      const active = "bg-[#1E293B] text-white border-blue-500 shadow-md";

      // Inactive: Muted gray text, hover effects
      const inactive = "text-gray-400 hover:bg-[#1E293B] hover:text-white";

      return `${base} ${navData.isActive ? active : inactive} `;
    }}
  >
    <Icon size={18} strokeWidth={1.5} />
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
    // Main Wrapper
    <div className="flex flex-col lg:flex-row h-screen bg-[#F1F5F9] font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">

      {/* Sidebar: Slide drawer for mobile, visible on lg and above */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0F172A] border-r border-[#1E293B] flex-col shadow-2xl transition-transform duration-300 transform lg:translate-x-0 lg:static lg:flex ${isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full hidden lg:block"}`}>

        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 border-b border-[#1E293B] bg-[#020617]">
          <img src={logoSrc} alt="logo" className="w-32 object-contain brightness-0 invert opacity-90" />
          <button className="lg:hidden ml-auto text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-6 scrollbar-thin scrollbar-thumb-gray-800">
          <div className="mb-4 px-4 mt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Main Menu</p>
          </div>
          <NavItem to="/super-admin/dashboard" icon={LayoutGrid} label="Dashboard" end />
          <div className="space-y-1 mt-1">
            <button
              onClick={toggleCompanies}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border-l-4 border-transparent ${isCompaniesOpen ? 'bg-[#1E293B] text-white' : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Briefcase size={18} strokeWidth={1.5} className={isCompaniesOpen ? 'text-blue-500' : 'text-gray-400 group-hover:text-white'} />
                <span className="tracking-wide">Companies</span>
              </div>
              {isCompaniesOpen ? <ChevronDown size={16} className="text-blue-500" /> : <ChevronRight size={16} className="text-gray-500" />}
            </button>
            {isCompaniesOpen && (
              <div className="pl-4 mt-1 space-y-1">
                <div className="border-l border-gray-700 pl-3 space-y-1 ml-4 transition-all duration-300 ease-in-out">
                  <NavLink to="/super-admin/companies/add" className={({ isActive }) => `flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium rounded-md transition-all ${isActive ? 'text-white bg-blue-600/10 border-l-2 border-blue-500' : 'text-gray-400 hover:text-white hover:bg-[#1E293B]'}`}>
                    <Plus size={16} /> Add Company
                  </NavLink>
                  <NavLink to="/super-admin/companies" end className={({ isActive }) => `flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium rounded-md transition-all ${isActive ? 'text-white bg-blue-600/10 border-l-2 border-blue-500' : 'text-gray-400 hover:text-white hover:bg-[#1E293B]'}`}>
                    <List size={16} /> All Companies
                  </NavLink>
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 mb-4 px-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">System</p>
          </div>
          <NavItem to="/super-admin/activities" icon={Activity} label="Audit Logs" />
          <NavItem to="/super-admin/modules" icon={Settings} label="Configuration" />
        </nav>

        {/* User / Logout Section */}
        <div className="p-4 border-t border-[#1E293B] bg-[#020617]">
          <div className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-[#1E293B] transition-all">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-900/40">SA</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">Super Admin</div>
              <div className="text-[10px] font-medium text-gray-400 truncate uppercase tracking-wider">System Root</div>
            </div>
            <Settings size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="w-full flex-1 min-h-screen relative flex flex-col min-w-0 overflow-hidden transition-all">
        {/* Header */}
        <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={20} />
              </button>
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-100 hover:shadow-md flex items-center justify-center transition-all hidden md:flex group">
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div className="flex flex-col justify-center h-full">
                <h1 className="text-lg font-bold text-slate-800 tracking-tight uppercase leading-none bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {location.pathname.split('/').pop().replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) || 'Dashboard'}
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest">System Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="relative group hidden lg:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Type to search..."
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all w-64 md:block font-medium"
                />
              </div>
              <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block"></div>
              <button className="relative p-2.5 rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
              <button
                onClick={() => { logout(); navigate("/super-admin/login"); }}
                className="px-4 lg:px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 group"
              >
                <LogOut size={14} className="group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-10 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <div className="w-full mx-auto min-h-full fade-in-up">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
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
