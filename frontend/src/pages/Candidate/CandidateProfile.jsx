import React, { useState, useEffect, useCallback } from 'react';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import {
    User, Mail, Phone, MapPin, FileText,
    Edit3, CheckCircle2, CloudUpload, ShieldCheck,
    Calendar, Shield, AlertCircle
} from 'lucide-react';

export default function CandidateProfile() {
    const { candidate } = useJobPortalAuth();
    const [profile, setProfile] = useState(candidate || {});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/jobs/candidate/profile');
            // Backend returns: res.json(candidate) or res.json({profile, applications}) depending on which API
            // Let's handle both based on common patterns
            const data = res.data?.profile || res.data;
            if (data) {
                setProfile(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
            setError("Could not load profile details.");
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
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Loading Profile...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                    Professional Profile<span className="text-blue-600">.</span>
                </h1>
                <p className="text-gray-500 font-medium mt-3 text-lg">Update your information to stand out to employers.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-12 space-y-8 max-w-full mx-auto w-full">
                    {error && (
                        <div className="bg-rose-50 text-rose-600 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-4 shadow-sm">
                            <AlertCircle className="w-6 h-6" />
                            <p className="font-bold">{error}</p>
                        </div>
                    )}

                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-gray-100 overflow-hidden relative">
                        {/* Decorative Header */}
                        <div className="h-52 bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                            <div className="absolute top-0 right-0 p-12">
                                <ShieldCheck className="w-20 h-20 text-white/20" />
                            </div>
                            <div className="absolute bottom-10 left-12 text-white">
                                <h2 className="text-4xl font-black tracking-tight leading-none truncate max-w-md">{profile?.name || 'Candidate Name'}</h2>
                                <p className="text-blue-100/80 font-bold text-sm mt-3 uppercase tracking-widest">{profile?.email}</p>
                            </div>
                        </div>

                        <div className="p-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-gray-50">
                                <div>
                                    <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-600 w-fit px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                                        <CheckCircle2 className="w-4 h-4" /> Verified Candidate
                                    </div>
                                </div>
                                <button className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-xl shadow-gray-200 hover:bg-black hover:shadow-black/20 transition-all active:scale-95 flex items-center gap-3">
                                    <Edit3 className="w-5 h-5" /> Edit Profile Details
                                </button>
                            </div>

                            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                {[
                                    { label: 'Primary Email', value: profile?.email, icon: Mail },
                                    { label: 'Mobile Number', value: profile?.mobile || 'Not Linked', icon: Phone },
                                    { label: "Father's Name", value: profile?.fatherName || 'Not Specified', icon: User },
                                    { label: 'Current Address', value: profile?.address || 'Not Specified', icon: MapPin },
                                    { label: 'Birth Date', value: profile?.dob ? new Date(profile.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Specified', icon: Calendar },
                                    {
                                        label: 'Member Since',
                                        value: profile?.createdAt
                                            ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                            : 'N/A',
                                        icon: Shield
                                    },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-6 p-6 rounded-[2rem] hover:bg-gray-50 transition-all duration-300 group border border-transparent hover:border-gray-100 shadow-sm hover:shadow-md">
                                        <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-sm border border-gray-100">
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-1.5">{item.label}</p>
                                            <p className="font-bold text-gray-800 tracking-tight text-lg truncate">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Resume Section */}
                    <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-blue-900/5 border border-gray-100 flex flex-col md:flex-row items-center gap-10 group relative transition-all duration-500 hover:border-blue-100">
                        <div className="h-28 w-28 rounded-[2rem] bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 transition-all duration-700 shadow-inner border border-blue-100/50">
                            <FileText className="w-12 h-12" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Master Professional Resume</h3>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px] mt-2 mb-6">PDF / DOCX Format Supported</p>
                            <div className="flex items-center gap-3 justify-center md:justify-start bg-emerald-50 w-fit px-5 py-2.5 rounded-xl border border-emerald-100">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                <span className="text-sm font-black text-emerald-600 truncate max-w-xs">
                                    {profile?.resume ? profile.resume : 'No resume uploaded yet'}
                                </span>
                            </div>
                        </div>
                        <button className="w-full md:w-auto bg-gradient-to-tr from-blue-600 to-indigo-600 text-white px-12 py-5 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                            <CloudUpload className="w-5 h-5" /> {profile?.resume ? 'Replace Document' : 'Upload Resume'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ArrowRight = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
);
