/**
 * -----------------------------------------------------------------------
 * ENTERPRISE ID ENGINE CONFIGURATION - SETTINGS VIEW
 * -----------------------------------------------------------------------
 * 
 * Centralized configuration for all Document IDs in the system.
 * Manages Company Codes, Branch Codes, and Financial Year rollover.
 * 
 * @version 3.0 (Enterprise)
 */

import React, { useState, useEffect } from 'react';
import { notification } from 'antd';
import api from '../../utils/api';
import { Save, Loader2, ArrowRight, Edit, Building2, MapPin, Users, Calendar, Clock } from 'lucide-react';
// Import CSS from Admin if needed, or rely on Tailwind
import '../Admin/IdConfiguration.css';
import SocialMediaDashboard from '../../modules/social-media/SocialMediaDashboard';

const CompanySettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingKeys, setSavingKeys] = useState({});
    const [editingKeys, setEditingKeys] = useState({});

    // Data Models
    const [settings, setSettings] = useState({
        companyCode: '',
        branchCode: '',
        departmentCode: '',
        financialYear: '',
        resetPolicy: 'YEARLY'
    });
    const [documentTypes, setDocumentTypes] = useState([]);

    // UI State
    const [activeTab, setActiveTab] = useState('global');
    const [error, setError] = useState(null);

    useEffect(() => {
        loadConfiguration();

        // Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const oauthStatus = urlParams.get('oauth');
        const platform = urlParams.get('platform');
        const errorMessage = urlParams.get('message');

        if (oauthStatus === 'success' && platform) {
            // Activate Social Media tab
            setActiveTab('social');

            // Show success notification
            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            notification.success({
                message: 'OAuth Success',
                description: `${platformName} connected successfully! ✓`,
                duration: 4
            });

            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (oauthStatus === 'error') {
            // Show error notification
            notification.error({
                message: 'OAuth Failed',
                description: errorMessage || 'OAuth connection failed',
                duration: 5
            });

            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            // Calls the new enterprise controller
            const res = await api.get('/company-id-config');
            if (res.data.success) {
                setSettings(res.data.data.settings);
                setDocumentTypes(res.data.data.documentTypes);
            }
        } catch (err) {
            console.error('Failed to load ID Config:', err);
            setError('Could not load configuration engine.');
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleDocTypeChange = (key, field, value) => {
        setDocumentTypes(prev => prev.map(dt =>
            dt.key === key ? { ...dt, [field]: value } : dt
        ));
    };

    const handleSingleSave = async (docKey) => {
        try {
            setSavingKeys(prev => ({ ...prev, [docKey]: true }));
            const payload = {
                settings,
                documentTypes
            };

            await api.post('/company-id-config', payload);

            notification.success({
                message: 'Saved',
                description: `Sequence ${docKey} updated successfully.`,
                duration: 2
            });

            await loadConfiguration();
        } catch (err) {
            setError(err.response?.data?.message || 'Save failed');
            notification.error({ message: 'Error', description: 'Failed to save configuration' });
        } finally {
            setSavingKeys(prev => ({ ...prev, [docKey]: false }));
            setEditingKeys(prev => ({ ...prev, [docKey]: false }));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                settings,
                documentTypes
            };

            await api.post('/company-id-config', payload);

            // Show success notification
            notification.success({
                message: 'Settings Saved',
                description: 'Configuration verified and saved.',
                duration: 3
            });

            // Reload to refresh Next Numbers
            await loadConfiguration();
        } catch (err) {
            setError(err.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const getLivePreview = (doc) => {
        let template = doc.formatTemplate || '';
        // If lastNumber exists, next is +1. If not, next is startFrom (or 1)
        const currentSeq = doc.lastNumber !== undefined ? doc.lastNumber : (doc.startFrom ? doc.startFrom - 1 : 0);
        const nextNum = currentSeq + 1;
        const counterStr = String(nextNum).padStart(doc.paddingDigits || 4, '0');

        template = template.replace('{{COMPANY}}', settings.companyCode || 'AAA');
        template = template.replace('{{BRANCH}}', settings.branchCode || 'BBB');
        template = template.replace('{{DEPT}}', settings.departmentCode || 'CCC');
        template = template.replace('{{PREFIX}}', doc.prefix || 'DOC');
        template = template.replace('{{YEAR}}', settings.financialYear || 'YY-YY');
        template = template.replace('{{COUNTER}}', counterStr);

        return template;
    };

    if (loading) return <div className="p-8 flex justify-center text-gray-500">Loading Enterprise Engine...</div>;

    return (
        <div className="id-configuration-page max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Enterprise ID Engine</h1>
                {/* <p className="text-gray-500 mt-2">Configure master numbering sequences for multi-tenant document generation.</p> */}
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>}

            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'global' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('global')}
                >
                    Global Settings
                </button>
                <button
                    className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'docs' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('docs')}
                >
                    Document Sequences
                </button>
                <button
                    className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'social' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('social')}
                >
                    Social Media
                </button>
            </div>

            {activeTab === 'global' && (
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="bg-slate-50/50 p-8 border-b border-slate-100 pb-8">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                                <Building2 size={20} />
                            </div>
                            Master Configuration
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm ml-11">Manage your organization's core identification codes and fiscal settings.</p>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            {/* Company Code */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    <Building2 size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    Company Code
                                </label>
                                <div className="relative">
                                    <input
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 uppercase focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                                        value={settings.companyCode}
                                        onChange={(e) => handleGlobalChange('companyCode', e.target.value.toUpperCase())}
                                        placeholder="GTPL"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-100">
                                            &#123;&#123;COMPANY&#125;&#125;
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Branch Code */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    <MapPin size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    Branch Code
                                </label>
                                <div className="relative">
                                    <input
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 uppercase focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                                        value={settings.branchCode}
                                        onChange={(e) => handleGlobalChange('branchCode', e.target.value.toUpperCase())}
                                        placeholder="AHM"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-100">
                                            &#123;&#123;BRANCH&#125;&#125;
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Department Code */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    <Users size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    Default Dept Code
                                </label>
                                <div className="relative">
                                    <input
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 uppercase focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                                        value={settings.departmentCode}
                                        onChange={(e) => handleGlobalChange('departmentCode', e.target.value.toUpperCase())}
                                        placeholder="GEN"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-md border border-orange-100">
                                            Fallback
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Year */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    <Calendar size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    Financial Year
                                </label>
                                <div className="relative">
                                    <input
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 uppercase focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                                        value={settings.financialYear}
                                        onChange={(e) => handleGlobalChange('financialYear', e.target.value)}
                                        placeholder="25-26"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-xs font-bold text-slate-400">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Require Desktop Tracker Toggle */}
                            <div className="group col-span-1 md:col-span-2">
                                <div className="bg-indigo-50/50 border border-indigo-100/50 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex gap-4">
                                        <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-200">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-slate-800 font-bold">Mandatory Desktop Tracker</h4>
                                            <p className="text-slate-500 text-sm max-w-md">When enabled, employees must have the desktop agent running to access the HRMS dashboard.</p>
                                        </div>
                                    </div>

                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.requireDesktopTracker}
                                            onChange={(e) => handleGlobalChange('requireDesktopTracker', e.target.checked)}
                                        />
                                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                        <span className="ml-3 text-sm font-bold text-slate-600 uppercase tracking-wider">{settings.requireDesktopTracker ? 'Enabled' : 'Disabled'}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Idle Timeout Setting */}
                            <div className="group col-span-1 md:col-span-1">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    <Clock size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    Auto Logout Idle Timeout
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none"
                                        value={settings.idleTimeoutSeconds / 60}
                                        onChange={(e) => handleGlobalChange('idleTimeoutSeconds', parseInt(e.target.value) * 60)}
                                    >
                                        <option value={1}>1 Minute</option>
                                        <option value={3}>3 Minutes</option>
                                        <option value={5}>5 Minutes</option>
                                        <option value={10}>10 Minutes</option>
                                        <option value={30}>30 Minutes</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex justify-end pt-6 border-t border-slate-50">
                            <button
                                className="bg-slate-900 text-white px-8 py-4 rounded-xl hover:bg-black transition-all font-black shadow-lg shadow-slate-900/20 active:scale-95 flex items-center gap-3 text-sm tracking-wide"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Saving Settings...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Save Master Configuration</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {documentTypes.map(doc => (
                            <div key={doc.key} className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4 relative overflow-hidden hover:shadow-lg transition-all duration-300 group">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{doc.key}</span>
                                            {savingKeys[doc.key] && <Loader2 size={14} className="animate-spin text-indigo-500" />}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 leading-tight mt-3">{doc.name || 'Custom Document'}</h3>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                                            <span className="font-mono font-bold text-xs">{doc.prefix}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Inputs Grid */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format Template</label>
                                        <input
                                            className={`w-full mt-1.5 p-3 border-2 rounded-xl text-xs font-mono transition-all outline-none ${editingKeys[doc.key] ? 'bg-white border-indigo-100 focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                            value={doc.formatTemplate}
                                            onChange={(e) => handleDocTypeChange(doc.key, 'formatTemplate', e.target.value)}
                                            disabled={!editingKeys[doc.key]}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prefix</label>
                                            <input
                                                className={`w-full mt-1.5 p-3 border-2 rounded-xl text-xs font-bold uppercase transition-all outline-none ${editingKeys[doc.key] ? 'bg-white border-indigo-100 focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                value={doc.prefix}
                                                onChange={(e) => handleDocTypeChange(doc.key, 'prefix', e.target.value.toUpperCase())}
                                                disabled={!editingKeys[doc.key]}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start From (Min)</label>
                                            <input
                                                type="number"
                                                className={`w-full mt-1.5 p-3 border-2 rounded-xl text-xs font-bold transition-all outline-none ${editingKeys[doc.key] ? 'bg-white border-indigo-100 focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                value={doc.startFrom}
                                                onChange={(e) => handleDocTypeChange(doc.key, 'startFrom', parseInt(e.target.value))}
                                                disabled={!editingKeys[doc.key]}
                                            />
                                        </div>
                                    </div>

                                    {/* New Last Sequence Field - NOW ACTING AS NEXT SEQUENCE */}
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex justify-between">
                                            <span>Next Sequence (Start At)</span>
                                            {editingKeys[doc.key] && doc.paddingDigits > 0 && <span className="text-slate-400 italic font-normal">Padding: {doc.paddingDigits} digits</span>}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className={`w-full mt-1.5 p-2 bg-white border-2 border-indigo-100 rounded-lg text-sm font-black text-slate-800 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${!editingKeys[doc.key] && 'bg-slate-100 border-transparent text-slate-400'}`}
                                                /* Value is Next Number (Last + 1) */
                                                value={(doc.lastNumber !== undefined ? doc.lastNumber : ((doc.startFrom || 1) - 1)) + 1}
                                                /* On Change, we set Last Number to (Val - 1) so next is Val */
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    const start = doc.startFrom || 1;
                                                    const newLast = isNaN(val) ? (start - 1) : (val - 1);
                                                    handleDocTypeChange(doc.key, 'lastNumber', newLast);
                                                }}
                                                disabled={!editingKeys[doc.key]}
                                                placeholder={(doc.startFrom || 1).toString()}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                                            Set the <strong>next</strong> number to be used. If you enter <strong>0001</strong>, the system will generate <strong>0001</strong> as the next ID.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Padding</label>
                                            <input
                                                type="number"
                                                className={`w-full mt-1.5 p-3 border-2 rounded-xl text-xs font-bold transition-all outline-none ${editingKeys[doc.key] ? 'bg-white border-indigo-100 focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                value={doc.paddingDigits}
                                                onChange={(e) => handleDocTypeChange(doc.key, 'paddingDigits', parseInt(e.target.value))}
                                                disabled={!editingKeys[doc.key]}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reset Policy</label>
                                            <select
                                                className={`w-full mt-1.5 p-3 border-2 rounded-xl text-xs font-bold transition-all outline-none appearance-none ${editingKeys[doc.key] ? 'bg-white border-indigo-100 focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                value={doc.resetPolicy}
                                                onChange={(e) => handleDocTypeChange(doc.key, 'resetPolicy', e.target.value)}
                                                disabled={!editingKeys[doc.key]}
                                            >
                                                <option value="YEARLY">Yearly</option>
                                                <option value="NEVER">Never</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Live Preview Section */}
                                <div className="mt-auto pt-4 border-t border-slate-50">
                                    {!editingKeys[doc.key] ? (
                                        <>
                                            <div className="bg-slate-900 rounded-xl p-4 text-center relative group/preview overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-1000"></div>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1 relative z-10">Live Preview (Next ID)</p>
                                                <div className="text-sm font-mono font-black text-emerald-400 break-all relative z-10 tracking-wide">
                                                    {getLivePreview(doc)}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 px-2">
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    Last Used: <span className="font-bold text-slate-600">{doc.lastNumber !== undefined ? doc.lastNumber : '-'}</span>
                                                </span>
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                    FY: {settings.financialYear}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setEditingKeys(prev => ({ ...prev, [doc.key]: true }))}
                                                className="w-full mt-4 py-2 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-bold hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-100 uppercase tracking-wide flex items-center justify-center gap-2 group/edit"
                                            >
                                                <Edit size={14} className="group-hover/edit:text-indigo-600 transition-colors" />
                                                <span>Edit Sequence</span>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <button
                                                onClick={() => setEditingKeys(prev => ({ ...prev, [doc.key]: false }))}
                                                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wide"
                                                disabled={savingKeys[doc.key]}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSingleSave(doc.key)}
                                                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 uppercase tracking-wide flex items-center justify-center gap-2"
                                                disabled={savingKeys[doc.key]}
                                            >
                                                {savingKeys[doc.key] ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <Save size={14} />
                                                        <span>Save</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'social' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <SocialMediaDashboard />
                </div>
            )}
        </div>
    );
};

export default CompanySettings;
