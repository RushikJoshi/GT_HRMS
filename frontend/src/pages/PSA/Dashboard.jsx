import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import {
  TrendingUp, Activity, Users, Plus, Settings, Clock,
  ChevronRight, Zap, Bell, Search, MoreHorizontal,
  Shield, LayoutGrid, Cpu, Briefcase, Building2, ExternalLink, EyeOff,
  FileText, Calendar
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
      { name: 'HR', value: counts.hr, color: '#3B82F6', icon: Users },
      { name: 'Payroll', value: counts.payroll, color: '#10B981', icon: Briefcase },
      { name: 'Attendance', value: counts.attendance, color: '#F59E0B', icon: Clock },
      { name: 'Recruitment', value: counts.recruitment, color: '#EF4444', icon: Search },
      { name: 'Leave', value: counts.leave, color: '#22C55E', icon: Calendar },
      { name: 'BGV', value: counts.backgroundVerification, color: '#8B5CF6', icon: Shield },
      { name: 'Documents', value: counts.documentManagement, color: '#6366F1', icon: FileText },
      { name: 'Social Media', value: counts.socialMediaIntegration, color: '#0EA5E9', icon: ExternalLink },
      { name: 'Employee Portal', value: counts.employeePortal, color: '#06B6D4', icon: LayoutGrid },
    ];
  }, [companies]);

  const [activeIndex, setActiveIndex] = useState(-1);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  // Updated cards with Pinterest-inspired Solid Colors
  // Reverted labels and kept compressed descriptions
  // Reverted labels - Lighter Weight
  const statsCards = [
    {
      label: 'TOTAL COMPANIES',
      value: stats.total,
      icon: LayoutGrid,
      bg: 'bg-[#00C292]',
      accent: 'text-white/70',
      description: ''
    },
    {
      label: 'ACTIVE COMPANIES',
      value: stats.active,
      icon: Zap,
      bg: 'bg-[#7047EB]',
      accent: 'text-white/70',
      description: ''
    },
    {
      label: 'INACTIVE COMPANIES',
      value: stats.inactive,
      icon: Activity,
      bg: 'bg-[#FF5C8D]',
      accent: 'text-white/70',
      description: ''
    },
  ];

  const usagePercent = companies.length > 0 && stats.totalModules
    ? Math.round((moduleDistribution.reduce((a, b) => a + b.value, 0) / (companies.length * stats.totalModules)) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12 font-sans">
      {/* Stats Section -Pinterest Cards - Compressed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((card, idx) => (
          <div key={idx} className={`${card.bg} p-6 rounded-[32px] shadow-lg shadow-slate-200/20 hover:-translate-y-1 transition-all duration-500 group flex flex-col justify-between h-40 text-white relative overflow-hidden cursor-default`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full -mr-8 -mt-8"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                <card.icon size={18} strokeWidth={2} />
              </div>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">
                ID-0{idx + 1}
              </p>
            </div>

            <div className="space-y-0.5 relative z-10">
              <p className="text-[9px] font-bold text-white uppercase tracking-[0.2em]">{card.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight leading-none">{card.value}</span>
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">Units</span>
              </div>
            </div>


          </div>
        ))}
      </div>

      {/* Main Content Area - Split Layout for Minimal Scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">

        {/* Module Adoption - Infographic Section (lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-[32px] shadow-2xl shadow-slate-200/10 border border-slate-50 flex flex-col h-[520px] relative overflow-hidden group">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="space-y-0.5">
              <p className="text-xl font-bold text-slate-900 tracking-tight">Module Adoption</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
              <Activity size={16} />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center gap-24 relative z-10">
            {/* Left: Compact Premium Donut */}
            <div className="relative w-80 h-80 shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moduleDistribution}
                      innerRadius={90}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={6}
                      cornerRadius={12}
                      startAngle={90}
                      endAngle={-270}
                      activeIndex={activeIndex}
                      activeShape={{
                        outerRadius: 135,
                        filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.1))'
                      }}
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                    >
                      {moduleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="outline-none transition-all duration-700 cursor-pointer" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute w-32 h-32 bg-white rounded-full shadow-sm flex flex-col items-center justify-center text-center p-2 z-20 border border-slate-50">
                  <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                    {companies.length > 0 ? ((moduleDistribution.reduce((a, b) => a + b.value, 0) / (companies.length * stats.totalModules)) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</p>
                </div>
              </div>

              {/* Connector Path Layer - Absolute Precision Alignment */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ left: '100%', marginLeft: '12px' }}>
                {moduleDistribution.map((m, i) => {
                  const totalValue = moduleDistribution.reduce((a, b) => a + b.value, 0);
                  const prevValues = moduleDistribution.slice(0, i).reduce((a, b) => a + b.value, 0);

                  // Middle angle of the current segment in degrees (Clockwise from Top)
                  const middleAngleDeg = 90 - ((prevValues + m.value / 2) / totalValue) * 360;
                  const rad = (middleAngleDeg * Math.PI) / 180;

                  // Cartesion coords relative to donut center (160, 160)
                  const x1 = 120 * Math.cos(rad);
                  const y1 = -120 * Math.sin(rad); // Negative because SVG Y grows down

                  // Start point on donut edge (relative to SVG origin)
                  // The SVG origin is at the right edge of the 320px donut container
                  // So donut center is at X = -160, Y = 160
                  const startX = x1 - 160;
                  const startY = y1 + 160;

                  // Target height: Centers nodes vertically around the donut center (160)
                  // Node height is 44px, gap is 4px. Total height for 9 nodes = 9*44 + 8*4 = 428
                  // Center of list: 160
                  // targetY for i=4 (middle) should be 160
                  // 44 * 4 + C = 160 => 176 + C = 160 => C = -16
                  const targetY = (44 * i) - 16;

                  const isActive = activeIndex === -1 || activeIndex === i;
                  const isFocus = activeIndex === i;
                  const destX = 96; // Matching gap-24 (96px)

                  return (
                    <g key={`infopath-precision-v3-${i}`}>
                      {/* Start Dot on Donut Segment */}
                      <circle
                        cx={startX}
                        cy={startY}
                        r={isFocus ? 3.5 : 2}
                        fill={m.color}
                        className="transition-all duration-500"
                        style={{ opacity: isActive ? 1 : 0.1 }}
                      />

                      {/* Perfect Orthogonal Path */}
                      <path
                        d={`M ${startX} ${startY} L 40 ${startY} L 40 ${targetY} L ${destX} ${targetY}`}
                        stroke={isFocus ? m.color : m.color + (activeIndex === -1 ? '44' : '11')}
                        strokeWidth={isFocus ? 3 : 1}
                        fill="none"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />

                      {/* End Indicator on Node */}
                      <circle
                        cx={destX}
                        cy={targetY}
                        r="3"
                        fill={m.color}
                        className="transition-all duration-500"
                        style={{
                          opacity: isFocus ? 1 : 0,
                          filter: `drop-shadow(0 0 10px ${m.color})`
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Right: Precision Nodes List */}
            <div className="flex flex-col gap-1 relative z-10 h-full justify-center">
              {moduleDistribution.map((m, i) => (
                <div
                  key={i}
                  onMouseEnter={() => onPieEnter(null, i)}
                  onMouseLeave={onPieLeave}
                  className={`flex items-center gap-4 transition-all duration-500 py-1 px-4 rounded-[20px] border h-10 w-[280px] ${activeIndex === i ? 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 scale-105 z-30' : (activeIndex !== -1 ? 'opacity-20 blur-[0.5px]' : 'opacity-100 border-transparent hover:bg-slate-50/50')}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-2 transition-all duration-500 shadow-sm" style={{ borderColor: activeIndex === i ? m.color : '#f1f5f9' }}>
                      <m.icon size={12} strokeWidth={2.5} style={{ color: activeIndex === i ? m.color : '#cbd5e1' }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] font-black uppercase tracking-[0.15em] leading-none transition-colors duration-500 ${activeIndex === i ? 'text-slate-900' : 'text-slate-400'}`}>{m.name}</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <p className={`text-sm font-black tracking-tighter leading-none ${activeIndex === i ? 'text-slate-900' : 'text-slate-500'}`}>{m.value}</p>
                      <span className={`text-[7px] font-bold uppercase tracking-tight opacity-40 transition-opacity duration-500 ${activeIndex === i ? 'opacity-100' : 'opacity-0'}`}>Acquisition</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/30 blur-3xl pointer-events-none" />
        </div>

        {/* Activity Stream - Section (lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-[32px] shadow-2xl shadow-slate-200/10 border border-slate-50 flex flex-col h-[520px] relative overflow-hidden group">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity Stream</h3>
            <button
              onClick={() => navigate('/super-admin/companies')}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 transition-all"
            >
              Master Grid <ChevronRight size={12} />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
            {companies.slice(0, 6).map((comp, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/super-admin/companies/view/${comp._id}`)}
                className="flex items-center justify-between p-3 rounded-[20px] bg-slate-50/30 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group/row"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-white border border-slate-100 p-2 shadow-sm flex items-center justify-center shrink-0">
                    {comp.meta?.logo ? (
                      <img src={comp.meta.logo} className="w-full h-full object-contain" alt="logo" />
                    ) : (
                      <Building2 size={16} className="text-slate-200" strokeWidth={1} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800 tracking-tight uppercase leading-none">{comp.name}</h4>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1.5">{comp.code || 'SYS'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${comp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover/row:bg-slate-900 group-hover/row:text-white transition-all">
                    <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            ))}
            {companies.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <Shield size={32} className="mx-auto" />
                <p className="text-[10px] font-bold uppercase tracking-widest mt-4">No Recent Activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
