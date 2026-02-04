import React, { useState, useEffect, useCallback } from 'react';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import {
    User, Mail, Phone, MapPin, FileText,
    Edit3, CheckCircle2, CloudUpload, ShieldCheck,
    Calendar, Shield, AlertCircle
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Modal, Slider } from 'antd';

export default function CandidateProfile() {
    const { candidate, refreshCandidate } = useJobPortalAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editFields, setEditFields] = useState({ name: '', email: '', phone: '', professionalTier: '' });

    // Cropper State
    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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

    // When profileData loads, set editFields
    useEffect(() => {
        if (candidate || profileData) {
            setEditFields({
                name: profileData?.name || candidate?.name || '',
                email: profileData?.email || candidate?.email || '',
                phone: profileData?.phone || '',
                professionalTier: profileData?.professionalTier || 'Technical Leader',
            });
        }
    }, [candidate, profileData]);

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Profile...</p>
            </div>
        </div>
    );

    const handleEditClick = () => setEditMode(true);
    const handleCancelEdit = () => {
        if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(profileImageUrl);
        }
        setEditMode(false);
        setEditFields({
            name: profileData?.name || candidate?.name || '',
            email: profileData?.email || candidate?.email || '',
            phone: profileData?.phone || '',
            professionalTier: profileData?.professionalTier || 'Technical Leader',
        });
        setProfileImageUrl(profileData?.profileImageUrl || candidate?.profileImageUrl || '');
        setProfileImage(null);
    };

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setEditFields((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveEdit = async () => {
        try {
            // Update profile info
            await api.put('/candidate/profile', {
                name: editFields.name,
                email: editFields.email,
                phone: editFields.phone,
                professionalTier: editFields.professionalTier
            });

            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }

            setEditMode(false);
            await fetchProfile();
            await refreshCandidate();
        } catch (err) {
            console.error("Save error:", err);
            alert('Failed to update profile.');
        }
    };




    return (
        <div className="space-y-10 animate-in fade-in duration-200 pb-20">
            {/* Luxury Profile Header Banner */}
            <div className="relative overflow-hidden bg-premium-gradient rounded-[1.5rem] h-72 lg:h-80 shadow-xl shadow-blue-200/50">
                {/* Minimal Background Elements */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-blue-400/20 rounded-full blur-[60px] -ml-24 -mb-24"></div>

                <div className="absolute inset-0 p-12 lg:p-20 flex items-end">
                    <div className="relative z-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div className="flex items-end gap-10">
                    <div className="relative group">
                                <div className="h-32 w-32 lg:h-40 lg:w-40 rounded-[2.5rem] bg-white p-1 shadow-xl relative z-10 overflow-hidden">
                                    <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-6xl lg:text-7xl shadow-inner">
                                        {candidate?.name?.charAt(0)?.toUpperCase() || 'C'}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4 text-white">
                                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-xl mb-6 border border-white/20 text-white">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Professional</span>
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-none mb-6">
                                    {candidate?.name || 'Your Profile'}<span className="text-emerald-400">.</span>
                                </h1>
                                <div className="flex items-center gap-6 text-white/80 font-bold text-sm">
                                    <div className="flex items-center gap-2.5">
                                        <MapPin size={18} className="text-emerald-400" />
                                        <span>Candidate Ecosystem</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                                    <div className="flex items-center gap-2.5">
                                        <User size={18} className="text-emerald-400" />
                                        <span>Technical Expert</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {!editMode ? (
                            <button
                                className="flex items-center gap-4 bg-white hover:bg-slate-50 text-indigo-600 border border-white/20 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 mb-4 group"
                                onClick={handleEditClick}
                            >
                                <Edit3 size={18} className="group-hover:rotate-12 transition-transform shadow-sm" /> Edit Professional Bio
                            </button>
                        ) : (
                            <div className="flex gap-4 mb-4">
                                <button
                                    className="bg-white text-indigo-600 border border-white/20 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                                    onClick={handleSaveEdit}
                                >Save</button>
                                <button
                                    className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-white/20 transition-all"
                                    onClick={handleCancelEdit}
                                >Cancel</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Side: Stats & Info */}
                <div className="lg:col-span-8 space-y-10">
                    <div className="bg-white p-10 lg:p-12 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 flex items-center gap-4">
                            <div className="bg-slate-100 p-3 rounded-xl text-indigo-600">
                                <User size={20} />
                            </div>
                            Personal Overview
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                            {!editMode ? ([
                                { label: 'Full Legal Name', value: candidate?.name, icon: User },
                                { label: 'Primary Email', value: candidate?.email, icon: Mail },
                                { label: 'Contact Number', value: profileData?.phone || 'Not provided', icon: Phone },
                                { label: 'Professional Tier', value: editFields.professionalTier || 'Not provided', icon: ShieldCheck }
                            ].map((info, idx) => (
                                <div key={idx} className="group relative text-slate-800">
                                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-slate-100 group-hover:bg-indigo-600 transition-colors text-indigo-600"></div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
                                        <info.icon size={14} className="text-indigo-600" />
                                        {info.label}
                                    </p>
                                    <p className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors uppercase italic">{info.value || 'Not provided'}</p>
                                </div>
                            ))) : ([
                                { label: 'Full Legal Name', name: 'name', value: editFields.name, icon: User },
                                { label: 'Primary Email', name: 'email', value: editFields.email, icon: Mail },
                                { label: 'Contact Number', name: 'phone', value: editFields.phone, icon: Phone },
                                { label: 'Professional Tier', name: 'professionalTier', value: editFields.professionalTier, icon: ShieldCheck }
                            ].map((info, idx) => (
                                <div key={idx} className="group relative">
                                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-slate-100 group-hover:bg-indigo-600 transition-colors"></div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
                                        <info.icon size={14} className="text-indigo-600" />
                                        {info.label}
                                    </p>
                                    <input
                                        type="text"
                                        name={info.name}
                                        value={info.value}
                                        onChange={handleFieldChange}
                                        className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors uppercase italic bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            )))}
                        </div>
                    </div>

                    <div className="bg-white p-10 lg:p-14 rounded-[2.5rem] border border-slate-100 shadow-[0px_8px_16px_rgba(0,0,0,0.06)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-10 flex items-center gap-4">
                            <div className="bg-emerald-400/20 p-2.5 rounded-xl text-emerald-600">
                                <FileText size={20} />
                            </div>
                            Professional Assets
                        </h3>

                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                            <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform">
                                <CloudUpload size={32} className="text-indigo-600" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-2">Update your Resume</h4>
                            <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8">PDF preferred. Max file size: 5MB</p>
                            <button className="bg-white text-indigo-600 px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm border border-slate-100 hover:shadow-md transition-all">Choose File</button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Quick Stats */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="bg-indigo-600 p-8 rounded-[1.5rem] text-white shadow-lg shadow-indigo-200">
                        <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-white/20">
                            <AlertCircle size={24} className="text-white" />
                        </div>
                        <h4 className="text-lg font-bold tracking-tight mb-3 leading-tight">Complete your profile</h4>
                        <p className="text-white/90 text-sm font-medium mb-6 leading-relaxed">Profiles with 100% completion are 4x more likely to be noticed.</p>
                        <button className="w-full bg-white text-indigo-600 py-3.5 rounded-[1rem] font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-50 transition-all">Finish Now</button>
                    </div>
                </div>
            </div>

        </div>
    );
}
