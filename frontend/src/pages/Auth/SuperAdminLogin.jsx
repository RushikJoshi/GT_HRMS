import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Zap, ArrowRight, Building2, UserCircle2, Cpu } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import { getToken, isValidToken } from '../../utils/token';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login, user, isInitialized } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    const token = getToken();
    if (!isValidToken(token)) return;
    if (user && user.role === 'psa') {
      navigate('/super-admin/dashboard', { replace: true });
    }
  }, [isInitialized, user, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/super-admin/dashboard', { replace: true });
        return;
      }
      setError(res.message || "Invalid credentials. Identity check failed.");
    } catch (err) {
      setError("Synchronous failure. System link lost.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] font-sans selection:bg-indigo-100 selection:text-indigo-600 overflow-hidden">

      {/* Immersive Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] opacity-10 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[120px] opacity-10 translate-x-1/2 translate-y-1/2 animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1000px] mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 animate-in fade-in zoom-in-95 duration-1000">

        {/* Left Aspect: Branding & Information */}
        <div className="flex-1 space-y-8 hidden lg:block">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200">
            <Shield className="text-indigo-500" size={32} />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Nexus <span className="text-indigo-600">Protocol</span> Global Gateway
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
              Secure access point for Platform Super Administrators. Manage entities, sync capability matrices, and monitor global telemetry.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Zap size={16} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Zero Trust Access</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Cpu size={16} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Encrypted Uplink</span>
            </div>
          </div>
        </div>

        {/* Right Aspect: Login Card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-50 overflow-hidden relative group">

            {/* Top Indicator */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 to-emerald-500 opacity-80"></div>

            <div className="p-10 md:p-12">
              <div className="lg:hidden flex justify-center mb-8">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
                  <Shield className="text-indigo-500" size={28} />
                </div>
              </div>

              <div className="text-center lg:text-left mb-10">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Master Authentication</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PSA Credential Verification</p>
              </div>

              {error && (
                <div className="p-4 mb-8 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                  <Lock size={14} className="shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Identity Identifier</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                      type="email"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                      placeholder="admin@nexus.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Key</label>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest cursor-default">AES-256 Validated</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                      type="password"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group bg-slate-900 hover:bg-black text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 overflow-hidden mt-6"
                >
                  <span className="relative z-10 flex items-center gap-3 justify-center">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>Initialize Session <ArrowRight size={16} /></>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-emerald-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>
              </form>

              <div className="mt-12 pt-8 border-t border-slate-50">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-center mb-6">Cross-Dimensional Hubs</p>
                <div className="flex justify-center gap-8">
                  <button
                    onClick={() => navigate('/tenant/login')}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                  >
                    <Building2 size={14} /> Tenant
                  </button>
                  <button
                    onClick={() => navigate('/employee/login')}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest"
                  >
                    <UserCircle2 size={14} /> Personnel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center mt-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            © 2024 Nexus hrms • Global Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}
