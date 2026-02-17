import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import {
  TrendingUp, Activity, Users, Plus, Settings, Clock,
  ChevronRight, Zap, Bell, Search, MoreHorizontal,
  Shield, LayoutGrid, Cpu, Briefcase, Building2, ExternalLink, EyeOff
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { normalizeEnabledModules } from "../../utils/moduleConfig";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalModules: 0,
    systemUptime: '99.9%'
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Fetch Stats
        await api.get("/tenants/psa/stats");

        // Fetch Companies List
        const compRes = await api.get('/tenants');
        const list = Array.isArray(compRes.data) ? compRes.data : (compRes.data?.tenants || compRes.data?.data || []);

        setCompanies(list);
        setStats({
          total: list.length,
          active: list.filter(c => c.status === 'active').length,
          inactive: list.filter(c => c.status !== 'active').length,
          totalModules: 9, // Total available in module configuration
          systemUptime: '99.9%'
        });
      } catch (err) {
        console.error("Dashboard Data Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Calculate Real-time Module Distribution
  const moduleDistribution = useMemo(() => {
    const counts = {
      hr: 0,
      payroll: 0,
      attendance: 0,
      leave: 0,
      employeePortal: 0,
      recruitment: 0,
      backgroundVerification: 0,
      documentManagement: 0,
      socialMediaIntegration: 0
    };
    companies.forEach(c => {
      const enabled = normalizeEnabledModules(c.enabledModules, c.modules);
      Object.keys(counts).forEach((key) => {
        if (enabled[key] === true) counts[key]++;
      });
    });

    return [
      { name: 'HR', value: counts.hr, color: '#3B82F6' },
      { name: 'Payroll', value: counts.payroll, color: '#10B981' },
      { name: 'Attendance', value: counts.attendance, color: '#F59E0B' },
      { name: 'Recruitment', value: counts.recruitment, color: '#EF4444' },
      { name: 'Leave', value: counts.leave, color: '#22C55E' },
      { name: 'BGV', value: counts.backgroundVerification, color: '#8B5CF6' },
      { name: 'Documents', value: counts.documentManagement, color: '#6366F1' },
      { name: 'Social Media', value: counts.socialMediaIntegration, color: '#0EA5E9' },
      { name: 'Employee Portal', value: counts.employeePortal, color: '#06B6D4' },
    ].filter(m => m.value > 0);
  }, [companies]);

  // Updated cards with gradient backgrounds and pattern effects
  const statsCards = [
    {
      label: 'Total Companies',
      value: stats.total,
      icon: LayoutGrid,
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
      shadow: 'shadow-purple-200',
      trend: 'Live'
    },
    {
      label: 'Active Tenants',
      value: stats.active,
      icon: Users,
      gradient: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      shadow: 'shadow-emerald-200',
      trend: 'Stable'
    },
    {
      label: 'Core Modules',
      value: stats.totalModules,
      icon: Cpu,
      gradient: 'bg-gradient-to-br from-rose-500 to-orange-500',
      shadow: 'shadow-rose-200',
      trend: 'Global'
    },
    {
      label: 'Inactive Companies',
      value: stats.inactive,
      icon: EyeOff,
      gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500',
      shadow: 'shadow-blue-200',
      trend: 'Audit'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-4 sm:p-6 lg:p-10 font-sans text-slate-900">
      <div className="w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700">

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-6 sm:p-8 rounded-2xl border border-emerald-500 shadow-sm relative overflow-hidden">
          <div className="space-y-1 relative z-10 w-full">
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">Super Admin Dashboard</h1>
            <div className="flex flex-wrap items-center gap-2 text-emerald-100 font-medium text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-200" />
                <span className="uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <span className="hidden sm:inline mx-2 text-emerald-400/50">|</span>
              <span className="flex items-center gap-2 px-3 py-1 bg-white text-emerald-700 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shadow-sm">
                <Activity size={12} className="animate-pulse" /> SYSTEM ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid - Updated Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsCards.map((card, idx) => (
            <div
              key={idx}
              className={`${card.gradient} relative overflow-hidden p-6 sm:p-8 rounded-2xl flex flex-col justify-between h-40 sm:h-48 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md group`}
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
              <div className="absolute bottom-10 -left-10 w-24 h-24 bg-black/5 rounded-full blur-xl"></div>

              <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <card.icon size={22} className="sm:hidden" />
                  <card.icon size={26} className="hidden sm:block" />
                </div>
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                  {card.trend}
                </span>
              </div>

              <div className="relative z-10 space-y-1">
                <h3 className="text-3xl sm:text-5xl font-bold text-white tracking-tight drop-shadow-sm">
                  {loading ? '...' : card.value}
                </h3>
                <p className="text-[10px] sm:text-sm font-semibold text-white/90 uppercase tracking-widest leading-relaxed">
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

          {/* Module Distribution (Real Data) */}
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 sm:space-y-8 relative overflow-hidden">
            <Settings className="absolute top-4 right-4 text-slate-50 animate-spin-slow" size={60} />

            <div className="flex justify-between items-center relative z-10">
              <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-slate-700">Module Adoption</h3>
              <MoreHorizontal className="text-slate-300" />
            </div>

            <div className="h-48 sm:h-72 w-full relative z-10">
              {moduleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moduleDistribution}
                      innerRadius={50}
                      outerRadius={75}
                      smInnerRadius={70}
                      smOuterRadius={95}
                      paddingAngle={8}
                      dataKey="value"
                      animationDuration={1500}
                    >
                      {moduleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-300 font-bold uppercase tracking-widest text-[10px] sm:text-xs">No Data Available</div>
              )}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter">
                  {companies.length > 0 ? ((moduleDistribution.reduce((a, b) => a + b.value, 0) / (companies.length * stats.totalModules)) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
              {moduleDistribution.map((m, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-tight">{m.name}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-blue-600 sm:ml-auto">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Onboarded (Compact Feed) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 sm:w-1.5 sm:h-8 bg-emerald-600 rounded-full"></div>
                <div>
                  <h3 className="text-[11px] sm:text-sm font-black uppercase tracking-widest text-slate-800">Recent Registrations</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Latest additions to the network</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/super-admin/companies')}
                className="w-full sm:w-auto justify-center text-emerald-600 hover:text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-1 transition-all py-2 sm:py-0 border border-emerald-50 sm:border-0 rounded-lg"
              >
                View All <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-3">
              {companies.slice(0, 5).map((comp, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/super-admin/companies/view/${comp._id}`)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 cursor-pointer group gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-slate-100 shrink-0 group-hover:scale-105 transition-transform">
                      {comp.meta?.logo ? (
                        <img src={comp.meta.logo} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" alt="logo" />
                      ) : (
                        <Building2 size={18} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] sm:text-[12px] font-extrabold text-slate-800 uppercase tracking-tight leading-none mb-1">{comp.name}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{comp.code || 'ORGANIZATION'}</span>
                        <span className="hidden sm:inline w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase tracking-tighter flex items-center gap-1">
                          <Clock size={10} /> Just Joined
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-3 sm:pt-0">
                    <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${comp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {comp.status}
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <div className="py-12 text-center space-y-3 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                  <LayoutGrid size={32} className="mx-auto text-slate-200" />
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Awaiting New Entity Entry</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      <style>{`
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
