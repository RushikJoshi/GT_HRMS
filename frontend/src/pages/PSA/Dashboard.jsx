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

  // Updated cards with simple, professional style
  const statsCards = [
    {
      label: 'TOTAL COMPANIES',
      value: stats.total,
      icon: LayoutGrid,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      trend: '+12% from last month',
      trendColor: 'text-emerald-500',
      trendIcon: TrendingUp
    },
    {
      label: 'ACTIVE COMPANIES',
      value: stats.active,
      icon: Users,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      trend: 'Healthy system status',
      trendColor: 'text-emerald-500'
    },
    {
      label: 'INACTIVE COMPANIES',
      value: stats.inactive,
      icon: Activity,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      trend: 'Requires admin attention',
      trendColor: 'text-slate-400'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 lg:p-10 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">

        {/* Top Header Section */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-sm font-medium text-slate-500">Overview of all registered tenants and system performance.</p>
        </div>

        {/* Stats Grid - Simple Professional Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-48 transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {card.label}
                  </p>
                  <h3 className="text-4xl font-bold text-slate-900">
                    {loading ? '...' : card.value}
                  </h3>
                </div>
                <div className={`${card.iconBg} ${card.iconColor} w-12 h-12 rounded-xl flex items-center justify-center shadow-sm`}>
                  <card.icon size={22} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {card.trendIcon && <card.trendIcon size={14} className={card.trendColor} />}
                <p className={`text-[12px] font-medium ${card.trendColor}`}>
                  {card.trend}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Module Distribution (Real Data) */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/60 shadow-sm space-y-6 relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-700">Module Adoption</h3>
              <MoreHorizontal className="text-slate-300" />
            </div>

            <div className="h-48 sm:h-64 w-full relative z-10">
              {moduleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moduleDistribution}
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {moduleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-300 font-bold uppercase tracking-widest text-[10px]">No Data Available</div>
              )}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-2xl font-bold text-slate-900 tracking-tighter">
                  {companies.length > 0 ? ((moduleDistribution.reduce((a, b) => a + b.value, 0) / (companies.length * stats.totalModules)) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Usage</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10">
              {moduleDistribution.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{m.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Onboarded (Compact Feed) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-xl border border-slate-200/60 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-800">Recent Registrations</h3>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Active network additions</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/super-admin/companies')}
                className="text-blue-600 hover:text-blue-700 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all group"
              >
                View All <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="flex-1 space-y-3">
              {companies.slice(0, 5).map((comp, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/super-admin/companies/view/${comp._id}`)}
                  className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-100 cursor-pointer group gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 border border-slate-100 shrink-0">
                      {comp.meta?.logo ? (
                        <img src={comp.meta.logo} className="w-8 h-8 object-contain" alt="logo" />
                      ) : (
                        <Building2 size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-800 tracking-tight leading-none mb-1">{comp.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{comp.code || 'ORG'}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight flex items-center gap-1">
                          <Clock size={10} /> Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight ${comp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {comp.status}
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <div className="py-12 text-center space-y-3 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                  <LayoutGrid size={32} className="mx-auto text-slate-200" />
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">No companies registered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
