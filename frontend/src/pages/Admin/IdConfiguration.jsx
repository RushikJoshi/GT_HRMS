/**
 * ═══════════════════════════════════════════════════════════════════════
 * ENTERPRISE ID ENGINE CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Centralized configuration for all Document IDs in the system.
 * Manages Company Codes, Branch Codes, and Financial Year rollover.
 * 
 * @version 3.0 (Enterprise)
 */

import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './IdConfiguration.css';

const IdConfiguration = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadConfiguration();
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

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                settings,
                documentTypes
            };

            await api.post('/company-id-config', payload);
            setSuccess('Configuration verified and saved.');

            // Reload to refresh Next Numbers
            await loadConfiguration();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="spinner"></div></div>;

    return (
        <div className="id-configuration-page max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Enterprise ID Engine</h1>
                <p className="text-gray-500 mt-2">Configure master numbering sequences for multi-tenant document generation.</p>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 p-4 rounded mb-6">{success}</div>}

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
            </div>

            {activeTab === 'global' && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold mb-6">Master Configuration</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="form-group">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Code</label>
                            <input
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 uppercase"
                                value={settings.companyCode}
                                onChange={(e) => handleGlobalChange('companyCode', e.target.value.toUpperCase())}
                                placeholder="GTPL"
                            />
                            <p className="text-xs text-gray-500 mt-1">Used in &#123;&#123;COMPANY&#125;&#125; token</p>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code</label>
                            <input
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 uppercase"
                                value={settings.branchCode}
                                onChange={(e) => handleGlobalChange('branchCode', e.target.value.toUpperCase())}
                                placeholder="AHM"
                            />
                            <p className="text-xs text-gray-500 mt-1">Used in &#123;&#123;BRANCH&#125;&#125; token</p>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Dept Code</label>
                            <input
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 uppercase"
                                value={settings.departmentCode}
                                onChange={(e) => handleGlobalChange('departmentCode', e.target.value.toUpperCase())}
                                placeholder="GEN"
                            />
                            <p className="text-xs text-gray-500 mt-1">Fallback for &#123;&#123;DEPT&#125;&#125;</p>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                            <input
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                                value={settings.financialYear}
                                onChange={(e) => handleGlobalChange('financialYear', e.target.value)}
                                placeholder="25-26"
                            />
                            <p className="text-xs text-gray-500 mt-1">Current Active Fiscal Year</p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Global Settings'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="grid grid-cols-1 gap-6">
                    {documentTypes.map(doc => (
                        <div key={doc.key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-indigo-100 text-indigo-700 p-2 rounded text-sm font-bold w-12 text-center">
                                        {doc.key}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">{doc.name || 'Custom Document'}</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Prefix</label>
                                        <input
                                            className="w-full mt-1 p-2 border rounded text-sm uppercase"
                                            value={doc.prefix}
                                            onChange={(e) => handleDocTypeChange(doc.key, 'prefix', e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Format Template</label>
                                        <input
                                            className="w-full mt-1 p-2 border rounded text-sm font-mono text-gray-600"
                                            value={doc.formatTemplate}
                                            onChange={(e) => handleDocTypeChange(doc.key, 'formatTemplate', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 mt-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Start From</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 p-2 border rounded text-sm"
                                            value={doc.startFrom}
                                            onChange={(e) => handleDocTypeChange(doc.key, 'startFrom', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Padding</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 p-2 border rounded text-sm"
                                            value={doc.paddingDigits}
                                            onChange={(e) => handleDocTypeChange(doc.key, 'paddingDigits', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Reset Policy</label>
                                        <select
                                            className="w-full mt-1 p-2 border rounded text-sm"
                                            value={doc.resetPolicy}
                                            onChange={(e) => handleDocTypeChange(doc.key, 'resetPolicy', e.target.value)}
                                        >
                                            <option value="YEARLY">Yearly</option>
                                            <option value="NEVER">Never</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-80 bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-center">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Live Preview (Next ID)</label>
                                <div className="text-xl font-mono font-bold text-indigo-600 bg-white p-3 rounded border border-indigo-100 text-center break-all shadow-sm">
                                    {doc.previewId || 'Generating...'}
                                </div>
                                <div className="mt-4 flex justify-between text-xs text-gray-500 border-t pt-3">
                                    <span>Last Used: {doc.lastNumber >= doc.startFrom ? doc.lastNumber : 'None'}</span>
                                    <span>FY: {settings.financialYear}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 flex justify-end">
                        <button
                            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save All Sequences'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdConfiguration;
