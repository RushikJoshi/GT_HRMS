import React, { useState, useEffect, useCallback } from 'react';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import {
    User, Mail, Phone, MapPin, FileText,
    Edit3, CheckCircle2, CloudUpload, ShieldCheck,
    Calendar, Shield, AlertCircle, Camera
} from 'lucide-react';

export default function CandidateProfile() {
    const { candidate } = useJobPortalAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/candidate/profile');
            if (res.data) setProfileData(res.data);
        } catch (err) {
            console.error("Profile fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Profile...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-200 pb-20">
            {/* Luxury Profile Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-700 to-indigo-900 rounded-[3rem] h-80 lg:h-96 shadow-2xl shadow-indigo-100">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/30 to-purple-500/0 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px] -ml-24 -mb-24"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]"></div>

                <div className="absolute inset-0 p-12 lg:p-20 flex items-end">
                    <div className="relative z-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div className="flex items-end gap-10">
                            <div className="relative group">
                                <div className="h-40 w-40 lg:h-48 lg:w-48 rounded-[3.5rem] bg-white/5 backdrop-blur-3xl p-1.5 shadow-2xl relative z-10 overflow-hidden ring-1 ring-white/20">
                                    <div className="w-full h-full rounded-[3rem] bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-6xl uppercase shadow-inner">
                                        {candidate?.name?.charAt(0) || 'C'}
                                    </div>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center cursor-pointer backdrop-blur-md">
                                        <div className="flex flex-col items-center gap-2">
                                            <Camera className="text-white w-8 h-8 animate-bounce" />
                                            <span className="text-[10px] font-black uppercase text-white tracking-widest">Update</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <div className="inline-flex items-center gap-2 bg-indigo-400/20 backdrop-blur-md px-4 py-1.5 rounded-xl mb-6 border border-white/10">
                                    <ShieldCheck size={14} className="text-indigo-300" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Verified Professional</span>
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-none mb-6">
                                    {candidate?.name || 'Your Profile'}<span className="text-indigo-400">.</span>
                                </h1>
                                <div className="flex items-center gap-6 text-indigo-100/70 font-bold text-sm">
                                    <div className="flex items-center gap-2.5">
                                        <MapPin size={18} className="text-indigo-300" />
                                        <span>Candidate Ecosystem</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400/40 rounded-full"></div>
                                    <div className="flex items-center gap-2.5">
                                        <User size={18} className="text-indigo-300" />
                                        <span>Technical Expert</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="flex items-center gap-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 mb-4 group">
                            <Edit3 size={18} className="group-hover:rotate-12 transition-transform shadow-sm" /> Edit Professional Bio
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Side: Stats & Info */}
                <div className="lg:col-span-8 space-y-10">
                    <div className="bg-white p-12 lg:p-16 rounded-[3rem] border border-slate-100 shadow-[0px_40px_80px_-20px_rgba(0,0,0,0.06)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <h3 className="text-2xl font-black text-indigo-950 tracking-tight mb-12 flex items-center gap-5">
                            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
                                <User size={24} />
                            </div>
                            Personal Overview
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                            {[
                                { label: 'Full Legal Name', value: candidate?.name, icon: User },
                                { label: 'Primary Email', value: candidate?.email, icon: Mail },
                                { label: 'Contact Number', value: profileData?.phone || 'Not provided', icon: Phone },
                                { label: 'Professional Tier', value: 'Technical Leader', icon: ShieldCheck }
                            ].map((info, idx) => (
                                <div key={idx} className="group relative">
                                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-slate-100 group-hover:bg-indigo-600 transition-colors"></div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
                                        <info.icon size={14} className="text-indigo-400" />
                                        {info.label}
                                    </p>
                                    <p className="text-xl font-bold text-indigo-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase italic">{info.value || 'Not provided'}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-10 lg:p-14 rounded-[2.5rem] border border-slate-100 shadow-[0px_8px_16px_rgba(0,0,0,0.06)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-10 flex items-center gap-4">
                            <div className="bg-[#ECFDF5] p-2.5 rounded-xl text-emerald-600">
                                <FileText size={20} />
                            </div>
                            Professional Assets
                        </h3>

                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                            <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform">
                                <CloudUpload size={32} className="text-indigo-500" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-2">Update your Resume</h4>
                            <p className="text-slate-400 font-medium max-w-xs mx-auto mb-8">PDF preferred. Max file size: 5MB</p>
                            <button className="bg-white text-indigo-600 px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm border border-slate-100 hover:shadow-md transition-all">Choose File</button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Quick Stats */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-[0px_40px_80px_-20px_rgba(0,0,0,0.05)]">
                        <h3 className="text-xl font-black text-indigo-950 mb-10 border-b border-slate-50 pb-8 tracking-tight">Security & Insights</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Profile Privacy', status: 'Secured', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { label: 'Data Encryption', status: 'Active (256-bit)', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                { label: 'Partnership Since', status: 'January 2026', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-5 text-slate-700 font-bold text-sm">
                                        <div className={`${item.bg} ${item.color} p-3 rounded-2xl shadow-sm`}><item.icon size={20} /></div>
                                        {item.label}
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-10 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                        <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                            <AlertCircle size={24} className="text-blue-200" />
                        </div>
                        <h4 className="text-xl font-bold tracking-tight mb-4 leading-tight">Complete your profile to 100%</h4>
                        <p className="text-blue-50 text-sm font-medium mb-8 leading-relaxed">Profiles with 100% completion are 4x more likely to be noticed by top recruitment teams.</p>
                        <button className="w-full bg-white text-indigo-600 py-4 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-lg hover:shadow-xl transition-all">Finish Now</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
