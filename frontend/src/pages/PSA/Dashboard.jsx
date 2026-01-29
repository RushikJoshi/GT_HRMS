import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import { Grid, TrendingUp, Activity, Users } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    companies: 0,
    activeTenants: 0,
    activeModules: 0,
    total: 0,
    active: 0,
    inactive: 0
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/tenants/psa/stats");
        const d = res.data || {};
        const total = Number(d.total ?? d.companies ?? 0) || 0;
        const active = Number(d.active ?? d.activeTenants ?? 0) || 0;
        const inactive = Number(d.inactive ?? d.deactiveTenants ?? (total - active)) || (total - active);
        setStats({ ...d, total, active, inactive });
      } catch (err) {
        console.log(err);
        try {
          const r2 = await api.get('/tenants');
          const list = Array.isArray(r2.data) ? r2.data : (r2.data?.tenants || r2.data?.data || []);
          const total = Array.isArray(list) ? list.length : 0;
          const active = Array.isArray(list) ? list.filter(t => t.status === 'active').length : 0;
          const inactive = total - active;
          setStats({ total, active, inactive, companies: total, activeTenants: active, deactiveTenants: inactive });
        } catch (r2err) { }
      }
    }
    load();
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-2">Overview of all registered tenants and system performance.</p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Card 1: Total Companies */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Companies</p>
              <p className="text-4xl font-bold text-gray-900 mt-3 group-hover:scale-105 transition-transform origin-left">
                {stats.total ?? 0}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Grid size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <span className="text-green-500 flex items-center mr-2"><TrendingUp className="mr-1" /> +12%</span>  from last month
          </div>
        </div>

        {/* Card 2: Active Tenants */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Active Tenants</p>
              <p className="text-4xl font-bold text-gray-900 mt-3 group-hover:scale-105 transition-transform origin-left">
                {stats.active ?? 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <span className="text-green-500 font-medium">Healthy</span> system status
          </div>
        </div>

        {/* Card 3: Inactive/Suspended */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Inactive / Suspended</p>
              <p className="text-4xl font-bold text-gray-900 mt-3 group-hover:scale-105 transition-transform origin-left">
                {stats.inactive ?? 0}
              </p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Activity size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            Requires admin attention
          </div>
        </div>
      </div>
    </div>
  );
}
