import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import {
  TrendingUp, Activity, Users, ChevronRight, LayoutGrid,
  Building2, MoreHorizontal, Clock
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
        await api.get("/tenants/psa/stats");
        const compRes = await api.get('/tenants');
        const list = Array.isArray(compRes.data) ? compRes.data : (compRes.data?.tenants || compRes.data?.data || []);

        setCompanies(list);
        setStats({
          total: list.length,
          active: list.filter(c => c.status === 'active').length,
          inactive: list.filter(c => c.status !== 'active').length,
          totalModules: 9,
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
      { name: 'HR', value: counts.hr, color: '#8B5CF6' },
      { name: 'Payroll', value: counts.payroll, color: '#A78BFA' },
      { name: 'Attendance', value: counts.attendance, color: '#C4B5FD' },
      { name: 'Recruitment', value: counts.recruitment, color: '#7C3AED' },
      { name: 'Leave', value: counts.leave, color: '#A78BFA' },
      { name: 'BGV', value: counts.backgroundVerification, color: '#6D28D9' },
      { name: 'Documents', value: counts.documentManagement, color: '#8B5CF6' },
      { name: 'Social Media', value: counts.socialMediaIntegration, color: '#C4B5FD' },
      { name: 'Employee Portal', value: counts.employeePortal, color: '#A78BFA' },
    ].filter(m => m.value > 0);
  }, [companies]);

  const statsCards = [
    {
      label: 'TOTAL COMPANIES',
      value: stats.total,
      icon: LayoutGrid,
      iconBg: 'bg-violet-100 text-violet-600',
      trend: '+12% from last month',
      trendColor: 'text-violet-600',
      trendIcon: TrendingUp,
    },
    {
      label: 'ACTIVE COMPANIES',
      value: stats.active,
      icon: Users,
      iconBg: 'bg-violet-100 text-violet-600',
      trend: 'Healthy system status',
      trendColor: 'text-violet-600',
    },
    {
      label: 'INACTIVE COMPANIES',
      value: stats.inactive,
      icon: Activity,
      iconBg: 'bg-violet-100 text-violet-600',
      trend: 'Requires admin attention',
      trendColor: 'text-slate-500',
    },
  ];

  const usagePercent = companies.length > 0 && stats.totalModules
    ? Math.round((moduleDistribution.reduce((a, b) => a + b.value, 0) / (companies.length * stats.totalModules)) * 100)
    : 0;

  return (
    <div className="min-h-full text-slate-700 relative">
      <div className="space-y-8 fade-in-up relative">

        {/* Vector decorations - lavender only */}
        <div className="absolute top-0 right-0 w-72 h-72 opacity-20 pointer-events-none overflow-hidden" aria-hidden>
          <svg viewBox="0 0 200 200" className="w-full h-full text-violet-200">
            <circle cx="160" cy="40" r="60" fill="currentColor" />
            <circle cx="180" cy="120" r="45" fill="currentColor" opacity="0.7" />
          </svg>
        </div>
        <div className="absolute top-48 left-0 w-56 h-56 opacity-15 pointer-events-none overflow-hidden" aria-hidden>
          <svg viewBox="0 0 200 200" className="w-full h-full text-violet-200">
            <circle cx="40" cy="160" r="55" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute bottom-24 right-1/4 w-40 h-40 opacity-15 pointer-events-none overflow-hidden" aria-hidden>
          <svg viewBox="0 0 200 200" className="w-full h-full text-violet-200">
            <circle cx="100" cy="100" r="50" fill="currentColor" />
          </svg>
        </div>

        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-sm font-medium text-slate-500">Overview of all registered tenants and system performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {statsCards.map((card, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-white p-6 shadow-lg shadow-violet-100/40 flex flex-col justify-between min-h-[180px] transition-all hover:shadow-xl hover:border-violet-300/80"
            >
              <div className="absolute top-0 right-0 w-24 h-24 opacity-20 pointer-events-none" aria-hidden>
                <svg viewBox="0 0 100 100" className="w-full h-full text-violet-200">
                  <circle cx="70" cy="30" r="38" fill="currentColor" />
                </svg>
              </div>
              <div className="relative flex justify-between items-start">
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    {card.label}
                  </p>
                  <h3 className="text-4xl font-bold text-slate-700">
                    {loading ? '...' : card.value}
                  </h3>
                </div>
                <div className={`rounded-xl ${card.iconBg} p-3 shadow-inner`}>
                  <card.icon size={24} strokeWidth={1.5} />
                </div>
              </div>
              <div className="relative mt-4 flex items-center gap-2">
                {card.trendIcon && <card.trendIcon size={16} className={card.trendColor} />}
                <p className={`text-[12px] font-medium ${card.trendColor}`}>
                  {card.trend}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

          <div className="rounded-2xl border border-violet-200/80 bg-white p-6 sm:p-8 shadow-lg shadow-violet-100/40 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-36 h-36 opacity-15 pointer-events-none" aria-hidden>
              <svg viewBox="0 0 100 100" className="w-full h-full text-violet-200">
                <circle cx="80" cy="20" r="45" fill="currentColor" />
              </svg>
            </div>
            <div className="relative flex justify-between items-center mb-6">
              <h3 className="text-[12px] font-bold uppercase tracking-widest text-violet-700">Module Adoption</h3>
              <MoreHorizontal className="text-violet-400" size={20} />
            </div>

            <div className="h-48 sm:h-64 w-full relative z-10" style={{ minHeight: '192px' }}>
              {moduleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moduleDistribution}
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {moduleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #EDE9FE',
                        background: '#fff',
                        color: '#5B21B6',
                        fontWeight: '600',
                        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.12)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-violet-200 font-bold uppercase tracking-widest text-[10px]">No Data Available</div>
              )}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-2xl font-bold text-slate-700 tracking-tighter">{usagePercent}%</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Usage</p>
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-3 mt-6">
              {moduleDistribution.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-violet-50/80 border border-violet-100 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">{m.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-violet-600">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-violet-200/80 bg-white p-6 sm:p-8 shadow-lg shadow-violet-100/40 flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-44 h-44 opacity-10 pointer-events-none" aria-hidden>
              <svg viewBox="0 0 100 100" className="w-full h-full text-violet-200">
                <circle cx="20" cy="20" r="50" fill="currentColor" />
              </svg>
            </div>
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-violet-500" />
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-700">Recent Registrations</h3>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Active network additions</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/super-admin/companies')}
                className="text-violet-600 hover:text-violet-700 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all group"
              >
                View All <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
              </button>
            </div>

            <div className="relative flex-1 space-y-3">
              {companies.slice(0, 5).map((comp, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/super-admin/companies/view/${comp._id}`)}
                  className="flex items-center justify-between p-4 rounded-xl bg-violet-50/50 border border-violet-100 hover:bg-violet-50 hover:border-violet-200 transition-all cursor-pointer group gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-violet-100 flex items-center justify-center text-violet-500 shadow-sm shrink-0">
                      {comp.meta?.logo ? (
                        <img src={comp.meta.logo} className="w-8 h-8 object-contain" alt="logo" />
                      ) : (
                        <Building2 size={22} strokeWidth={1.5} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-700 tracking-tight leading-none mb-1">{comp.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{comp.code || 'ORG'}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-tight flex items-center gap-1">
                          <Clock size={10} strokeWidth={2} /> Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight ${comp.status === 'active' ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-violet-50 text-violet-600 border border-violet-200'}`}>
                      {comp.status}
                    </span>
                    <ChevronRight size={14} className="text-violet-400 group-hover:text-violet-600 transition-colors" strokeWidth={2} />
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <div className="py-12 text-center space-y-3 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50">
                  <LayoutGrid size={36} className="mx-auto text-violet-200" strokeWidth={1.5} />
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">No companies registered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
