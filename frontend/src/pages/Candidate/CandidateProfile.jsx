import React, { useState, useEffect, useCallback } from 'react';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import {
    User, Mail, Phone, MapPin, FileText,
    Edit3, CheckCircle2, CloudUpload, ShieldCheck,
    Calendar, Shield, AlertCircle, Download, X, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { API_ROOT } from '../../utils/api'; // Centralized axios instance with auth & tenant headers
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
    const [profileImage, setProfileImage] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [showOfferModal, setShowOfferModal] = useState(false);

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

    const handleDownload = async (url, title) => {
        if (!url) return;
        try {
            const finalUrl = url.startsWith('http') ? url : `${API_ROOT}${url}`;
            // Direct open without HEAD check to avoid CORS/Auth issues on static files
            window.open(finalUrl, '_blank');
        } catch (err) {
            console.error(`Download failed for ${title}:`, err);
            alert(`Sorry! This ${title} is not yet available on the server. Please check back later or contact HR.`);
        }
    };

    const handleAcceptOffer = async () => {
        const appId = profileData?.bgvApplicationId || profileData?.applicationId;
        if (!appId) {
            alert("Application ID not found. Please try refreshing the page.");
            return;
        }
        if (!window.confirm("Are you sure you want to ACCEPT this offer? Once accepted, you can proceed with background verification.")) return;

        try {
            setLoading(true);
            const res = await api.post(`/candidate/application/accept-offer/${appId}`);
            if (res.data.success) {
                alert("Offer Accepted! You can now upload your BGV documents.");
                setShowOfferModal(false);
                await fetchProfile();
            }
        } catch (err) {
            console.error("Failed to accept offer:", err);
            alert(err.response?.data?.error || "Failed to accept offer. Please try again.");
            setLoading(false);
        }
    };

    const handleRejectOffer = async () => {
        const appId = profileData?.bgvApplicationId || profileData?.applicationId;
        if (!appId) {
            alert("Application ID not found. Please try refreshing the page.");
            return;
        }
        if (!window.confirm("Are you sure you want to REJECT this offer? This cannot be undone.")) return;

        try {
            setLoading(true);
            const res = await api.post(`/candidate/application/reject-offer/${appId}`);
            if (res.data.success) {
                alert("Offer Rejected.");
                setShowOfferModal(false);
                await fetchProfile();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to reject offer.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // When profileData loads, set editFields
    useEffect(() => {
        if (candidate || profileData) {
            // Priority: profileData.profilePic > candidate.profilePic > placeholders
            let picPath = profileData?.profilePic || candidate?.profilePic || '';

            if (picPath && !picPath.startsWith('http') && !picPath.startsWith('blob:')) {
                picPath = `${API_ROOT}/${picPath}`;
            }

            setProfileImageUrl(picPath);
            setEditFields({
                name: profileData?.name || candidate?.name || '',
                email: profileData?.email || candidate?.email || '',
                phone: profileData?.mobile || profileData?.phone || '',
                professionalTier: profileData?.professionalTier || 'Technical Leader',
            });
        }
    }, [candidate, profileData]);



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
            const formData = new FormData();
            formData.append('name', editFields.name);
            formData.append('email', editFields.email);
            formData.append('phone', editFields.phone);
            formData.append('professionalTier', editFields.professionalTier);

            if (profileImage) {
                formData.append('profileImage', profileImage);
            }

            // Update profile info
            await api.put('/candidate/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }

            setEditMode(false);
            setProfileImage(null);
            await fetchProfile();
            await refreshCandidate();
        } catch (err) {
            console.error("Save error:", err);
            alert('Failed to update profile.');
        }
    };

    const onFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageToCrop(reader.result);
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCropImage = async () => {
        try {
            const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const blobUrl = URL.createObjectURL(croppedImage);
            setProfileImageUrl(blobUrl);
            setProfileImage(croppedImage);
            setShowCropper(false);
        } catch (e) {
            console.error(e);
        }
    };

    const getCroppedImg = (imageSrc, pixelCrop) => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = pixelCrop.width;
                canvas.height = pixelCrop.height;

                ctx.drawImage(
                    image,
                    pixelCrop.x,
                    pixelCrop.y,
                    pixelCrop.width,
                    pixelCrop.height,
                    0,
                    0,
                    pixelCrop.width,
                    pixelCrop.height
                );

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas is empty'));
                        return;
                    }
                    resolve(blob);
                }, 'image/jpeg');
            };
            image.onerror = reject;
        });
    };




    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Profile...</p>
            </div>
        </div>
    );

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
                                    {profileImageUrl ? (
                                        <img
                                            src={profileImageUrl}
                                            alt="Profile"
                                            className="w-full h-full rounded-[2rem] object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-6xl lg:text-7xl shadow-inner">
                                            {candidate?.name?.charAt(0)?.toUpperCase() || 'C'}
                                        </div>
                                    )}

                                    {editMode && (
                                        <label className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[2rem]">
                                            <CloudUpload className="text-white" size={32} />
                                            <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                                        </label>
                                    )}
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

                    {/* Official Documents Section */}
                    {(profileData.offerLetterUrl || profileData.joiningLetterUrl) && (
                        <div className="bg-white rounded-[2.5rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-50 p-10 lg:p-14 animate-in slide-in-from-bottom-5">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 border border-emerald-100 ring-4 ring-emerald-50">
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">Official Documents</h2>
                                    <p className="text-slate-500 font-medium">Download your issued letters</p>
                                </div>
                            </div>

                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Below are the official documents issued to you by the HR department. You can download them for your records.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {profileData.offerLetterUrl && (
                                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100/50 flex flex-col items-center text-center gap-6 group hover:border-indigo-200 transition-all">
                                        <div className="h-20 w-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                            <FileText size={40} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-xl tracking-tight">Offer Letter</h4>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ref ID: {profileData.offerRefCode || 'OL-GEN'}</p>
                                        </div>
                                        <button
                                            onClick={() => setShowOfferModal(true)}
                                            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={16} /> View Offer Letter
                                        </button>

                                        {(!profileData?.bgvRequired && !profileData?.joiningLetterUrl) && (
                                            <div className="flex gap-3 mt-3 w-full">
                                                <button
                                                    onClick={handleRejectOffer}
                                                    className="flex-1 bg-white border border-rose-200 text-rose-600 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <X size={16} /> Reject
                                                </button>
                                                <button
                                                    onClick={handleAcceptOffer}
                                                    className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 size={16} /> Accept
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {profileData.joiningLetterUrl && (
                                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100/50 flex flex-col items-center text-center gap-6 group hover:border-emerald-200 transition-all">
                                        <div className="h-20 w-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            <FileText size={40} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-xl tracking-tight">Joining Letter</h4>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Available for Download</p>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(profileData.joiningLetterUrl, 'Joining Letter')}
                                            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                        >
                                            <FileText size={16} /> Download PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BGV Documents Section - Only shown if enabled */}
                    {profileData?.bgvRequired && (
                        <div className="bg-white p-10 lg:p-14 rounded-[2.5rem] border border-indigo-100 shadow-[0px_8px_16px_rgba(79,70,229,0.06)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>

                            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 flex items-center gap-4">
                                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                                    <ShieldCheck size={20} />
                                </div>
                                Background Verification Documents
                            </h3>

                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Please upload the required documents for your background verification. Ensure all documents are clear and readable.
                            </p>

                            <BGVUploadManager
                                applicationId={profileData.bgvApplicationId}
                                onRefresh={fetchProfile}
                            />
                        </div>
                    )}
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

            {/* Cropper Modal */}
            <Modal
                title="Adjust your profile picture"
                open={showCropper}
                onOk={createCropImage}
                onCancel={() => setShowCropper(false)}
                okText="Apply Crop"
                width={600}
                centered
            >
                <div className="relative h-80 w-full bg-slate-100 rounded-xl overflow-hidden mb-6">
                    <Cropper
                        image={imageToCrop}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                <div className="px-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Zoom Intensity</p>
                    <Slider
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(v) => setZoom(v)}
                    />
                </div>
            </Modal>

            {/* Offer Letter Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl relative overflow-hidden ring-1 ring-white/20">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Offer Letter</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Review your document</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleDownload(profileData?.offerLetterUrl, 'Offer Letter')}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    <Download size={16} /> Download
                                </button>
                                <button
                                    onClick={() => setShowOfferModal(false)}
                                    className="p-3 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-slate-100 p-6 overflow-hidden relative">
                            <iframe
                                src={profileData?.offerLetterUrl?.startsWith('http') ? profileData?.offerLetterUrl : `${API_ROOT}${profileData?.offerLetterUrl}`}
                                className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-sm"
                                title="Offer Letter"
                            />
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

// BGV Upload Manager Component
function BGVUploadManager({ applicationId, onRefresh }) {
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [applicationId]);

    const fetchDocuments = async () => {
        try {
            const res = await api.get(`/candidate/application/bgv-documents/${applicationId}`);
            setDocuments(res.data.documents || []);
        } catch (err) {
            console.error("Failed to fetch documents", err);
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('document', file);
        formData.append('type', type);

        try {
            setUploading(true);
            await api.post(`/candidate/application/bgv-documents/${applicationId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchDocuments();
            // alert(`${type} uploaded successfully!`); 
        } catch (err) {
            console.error(err);
            alert("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const requiredDocs = [
        { id: 'AadharCard', label: 'Aadhar Card' },
        { id: 'PANCard', label: 'PAN Card' },
        { id: 'DegreeCertificate', label: 'Highest Degree Certificate' },
        { id: 'RelievingLetter', label: 'Relieving Letter (Last Company)' },
        { id: 'Payslips', label: 'Last 3 Months Payslips' }
    ];

    return (
        <div className="space-y-4">
            {requiredDocs.map((doc) => {
                const existing = documents.find(d => d.name === doc.id);
                return (
                    <div key={doc.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100/50 hover:border-indigo-100 transition-colors">
                        <div className="flex items-center gap-5">
                            <div className={`p-3 rounded-xl ${existing ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                {existing ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1">{doc.label}</h4>
                                {existing ? (
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Uploaded
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Required</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                id={`file-${doc.id}`}
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, doc.id)}
                                disabled={uploading || existing?.verified}
                            />

                            {existing?.filePath && (
                                <button
                                    onClick={() => window.open(`${API_ROOT}/${existing.filePath}`, '_blank')}
                                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                                    title="View Document"
                                >
                                    <FileText size={18} />
                                </button>
                            )}

                            <label
                                htmlFor={`file-${doc.id}`}
                                className={`cursor-pointer px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${existing
                                    ? 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
                                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5'
                                    }`}
                            >
                                {uploading ? '...' : (existing ? 'Replace' : 'Upload')}
                            </label>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
