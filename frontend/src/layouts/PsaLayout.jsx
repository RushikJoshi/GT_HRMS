import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Briefcase, Plus, List, LayoutGrid,
  Activity, Settings, LogOut, Menu, X, ArrowLeft, Bell, Search, User, Shield
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logoSrc from "../assets/logonew.png";

const NavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => {
      const base = "group flex items-center gap-4 px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-300 relative overflow-hidden";
      const active = "bg-[#D1FAE5] text-[#065F46] shadow-sm shadow-emerald-100";
      const inactive = "text-slate-500 hover:bg-slate-50 hover:text-[#14B8A6]";
      return `${base} ${isActive ? active : inactive}`;
    }}
  >
    <div className="flex items-center justify-center min-w-[24px]">
      <Icon size={20} strokeWidth={2} />
    </div>
    <span className="tracking-tight whitespace-nowrap opacity-0 lg:group-hover/sidebar:opacity-100 transition-all duration-300 invisible lg:group-hover/sidebar:visible ml-4">
      {label}
    </span>
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
    <div className="flex h-screen bg-[#F4F6F9] font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-hidden group/sidebar">
      {/* Sidebar Expansion Logic: w-20 default, w-72 on hover */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-[#E5E7EB] shadow-2xl lg:shadow-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] peer group/sidebar flex flex-col 
          ${isMobileMenuOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-72"}`}
      >
        {/* Sidebar Header - Solid Bold Branding */}
        <div className="h-28 flex items-center justify-center shrink-0 overflow-hidden relative">
          <div className="flex items-center justify-center transition-all duration-500">
            <img
              src={logoSrc}
              alt="Logo"
              className={`transition-all duration-500 select-none object-contain ${isMobileMenuOpen ? "w-48 h-16" : "w-24 h-12 lg:group-hover/sidebar:w-48 lg:group-hover/sidebar:h-16"
                }`}
            />
          </div>
          <button
            className="lg:hidden absolute top-8 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 space-y-2 overflow-y-auto py-6 custom-scrollbar">


          <NavItem to="/super-admin/dashboard" icon={LayoutGrid} label="Dashboard" end />

          <div className="space-y-1">
            <button
              onClick={toggleCompanies}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-300 relative overflow-hidden
                ${isCompaniesOpen ? 'bg-slate-100/50 text-[#14B8A6]' : 'text-slate-500 hover:bg-slate-50 hover:text-[#14B8A6]'}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center min-w-[24px]">
                  <Briefcase size={20} strokeWidth={2} />
                </div>
                <span className="tracking-tight whitespace-nowrap opacity-0 lg:group-hover/sidebar:opacity-100 transition-all duration-300 invisible lg:group-hover/sidebar:visible ml-4">
                  Companies
                </span>
              </div>
              <ChevronDown size={14} className={`transition-all duration-300 opacity-0 lg:group-hover/sidebar:opacity-100 invisible lg:group-hover/sidebar:visible ${isCompaniesOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCompaniesOpen && (
              <div className="space-y-1 mt-1 transition-all duration-300">
                {/* All Companies Sub-Item */}
                <NavLink
                  to="/super-admin/companies"
                  end
                  className={({ isActive }) => `flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50 text-[#14B8A6]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                  <div className="flex items-center justify-center min-w-[24px]">
                    <List size={18} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-0 lg:group-hover/sidebar:opacity-100 transition-all duration-300 invisible lg:group-hover/sidebar:visible ml-4">
                    All Companies
                  </span>
                </NavLink>

                {/* Add Company Sub-Item */}
                <NavLink
                  to="/super-admin/companies/add"
                  className={({ isActive }) => `flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50 text-[#14B8A6]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                  <div className="flex items-center justify-center min-w-[24px]">
                    <Plus size={18} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-0 lg:group-hover/sidebar:opacity-100 transition-all duration-300 invisible lg:group-hover/sidebar:visible ml-4">
                    Add Company
                  </span>
                </NavLink>
              </div>
            )}
          </div>


          <NavItem to="/super-admin/activities" icon={Activity} label="Activities" />
          <NavItem to="/super-admin/modules" icon={Settings} label="Module Config" />
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[#E5E7EB] bg-slate-50/50">
          <div className="flex items-center gap-3 p-2 rounded-2xl group/user cursor-pointer overflow-hidden transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg shadow-emerald-100">
              SA
            </div>
            <div className="flex-1 min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tighter leading-none">Super Admin</p>
              <p className="text-[10px] font-bold text-[#14B8A6] truncate uppercase tracking-widest mt-1">System Root</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Synchronized Margin with Sidebar */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden lg:ml-20 peer-hover:lg:ml-72">
        {/* Header - Transparent Glass Effect */}
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-[#E5E7EB] sticky top-0 z-40 shrink-0">
          <div className="flex items-center justify-between px-8 lg:px-12 h-full gap-8">
            <div className="flex items-center gap-6">
              <button className="lg:hidden p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={20} />
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] text-slate-400 hover:text-[#14B8A6] hover:border-[#14B8A6] hover:shadow-lg hover:shadow-emerald-50 flex items-center justify-center transition-all group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
              </button>
              <div className="hidden sm:block">
                <h1 className="text-[15px] font-black text-slate-700 tracking-[0.1em] uppercase">
                  {(() => {
                    const path = location.pathname;
                    if (path.includes('/dashboard')) return 'Dashboard';
                    if (path.includes('/companies/add')) return 'Add Company';
                    if (path.includes('/companies/view')) return 'Company Profile';
                    if (path.includes('/companies')) return 'All Companies';
                    if (path.includes('/activities')) return 'Activities';
                    if (path.includes('/modules')) return 'Module Config';
                    return 'Control Panel';
                  })()}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-8 flex-1 justify-end max-w-4xl">
              <div className="relative group flex-1 max-w-md hidden md:block">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="text-slate-400 group-focus-within:text-[#14B8A6] transition-colors" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search here..."
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#14B8A6] transition-all"
                />
              </div>

              <div className="h-10 w-px bg-slate-100 hidden lg:block"></div>

              <button
                onClick={() => { logout(); navigate("/super-admin/login"); }}
                className="h-11 px-6 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-slate-900/20 hover:scale-[1.02] hover:shadow-xl active:scale-95 transition-all flex items-center gap-2.5 shrink-0 group"
              >
                <LogOut size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          <div className="w-full min-h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
      `}</style>
    </div>
  );
}
