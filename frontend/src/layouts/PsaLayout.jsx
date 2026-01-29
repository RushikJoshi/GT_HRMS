import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { useAuth } from "../context/AuthContext";
import logoSrc from "../assets/logonew.png";
import { ChevronDown, ChevronRight, Briefcase, Plus, List } from "lucide-react";

export default function PsaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Mobile menu state
  const [open, setOpen] = useState(false);

  // Sidebar Accordion State (Companies)
  // Default to open if currently on a companies page
  const [isCompaniesOpen, setIsCompaniesOpen] = useState(
    location.pathname.includes('/psa/companies')
  );

  // 🔐 PROTECT PSA ROUTE
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // 🔴 LOGOUT
  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const toggleCompanies = () => setIsCompaniesOpen(!isCompaniesOpen);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* SIDEBAR - desktop (dark theme) */}
      <aside className={`hidden sm:flex w-64 bg-slate-900 text-white flex-col flex-shrink-0 transition-all shadow-xl`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900">
          <img src={logoSrc} alt="logo" className="w-32 object-contain" />
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Dashboard */}
          <NavLink to="/psa" end className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <i className="fa-solid fa-chart-line w-5 text-center"></i>
            <span className="truncate">Dashboard</span>
          </NavLink>

          {/* Companies Accordion */}
          <div className="space-y-1">
            <button
              onClick={toggleCompanies}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isCompaniesOpen || location.pathname.includes('/psa/companies') ? 'text-white bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 opacity-90" />
                <span>Companies</span>
              </div>
              {isCompaniesOpen ? <ChevronDown /> : <ChevronRight />}
            </button>

            {/* Sub-menu */}
            {isCompaniesOpen && (
              <div className="pl-4 space-y-1 animate-fadeIn">
                <div className="border-l-2 border-slate-700 pl-2 space-y-1 mt-1">
                  <NavLink to="/psa/companies/add" className={({ isActive }) => `block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${isActive ? 'text-blue-400 font-semibold bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}`}>
                    <span className="flex items-center gap-2">
                      <Plus size={14} /> Add Company
                    </span>
                  </NavLink>
                  <NavLink to="/psa/companies" end className={({ isActive }) => `block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${isActive ? 'text-blue-400 font-semibold bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}`}>
                    <span className="flex items-center gap-2">
                      <List size={14} /> All Companies
                    </span>
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          <NavLink to="/psa/activities" className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <i className="fa-regular fa-clock w-5 text-center"></i>
            <span className="truncate">Recent Activity</span>
          </NavLink>
          <NavLink to="/psa/modules" className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <i className="fa-solid fa-sliders w-5 text-center"></i>
            <span className="truncate">Module Config</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center text-sm font-bold shadow-lg">SA</div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">Super Admin</div>
              <div className="text-xs text-slate-400 truncate">System Owner</div>
            </div>
          </div>
        </div>
      </aside>

      {/* SIDEBAR - mobile overlay */}
      <div className={`sm:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div className={`fixed inset-0 bg-black/50 transition-opacity backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)}></div>
        <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white shadow-2xl transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <img src={logoSrc} alt="logo" className="w-32" />
          </div>
          <nav className="p-4 space-y-2">
            <NavLink to="/psa" end onClick={() => setOpen(false)} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
              <i className="fa-solid fa-chart-line w-5"></i> Dashboard
            </NavLink>

            {/* Mobile Accordion */}
            <div className="space-y-1">
              <button
                onClick={toggleCompanies}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium rounded-lg ${isCompaniesOpen ? 'text-white bg-slate-800' : 'text-slate-400'}`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5" />
                  <span>Companies</span>
                </div>
                {isCompaniesOpen ? <ChevronDown /> : <ChevronRight />}
              </button>
              {isCompaniesOpen && (
                <div className="pl-4 space-y-1">
                  <div className="border-l-2 border-slate-700 pl-2 mt-1 space-y-1">
                    <NavLink to="/psa/companies/add" onClick={() => setOpen(false)} className={({ isActive }) => `block px-3 py-2 text-sm rounded ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                      + Add Company
                    </NavLink>
                    <NavLink to="/psa/companies" end onClick={() => setOpen(false)} className={({ isActive }) => `block px-3 py-2 text-sm rounded ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                      • All Companies
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            <NavLink to="/psa/activities" onClick={() => setOpen(false)} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
              <i className="fa-regular fa-clock w-5"></i> Recent Activity
            </NavLink>
            <NavLink to="/psa/modules" onClick={() => setOpen(false)} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
              <i className="fa-solid fa-sliders w-5"></i> Module Config
            </NavLink>
          </nav>
        </aside>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <button className="sm:hidden p-2 text-slate-600" onClick={() => setOpen(true)}>
              <i className="fa-solid fa-bars text-xl"></i>
            </button>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Product Super Admin</h1>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors">
            Logout
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
