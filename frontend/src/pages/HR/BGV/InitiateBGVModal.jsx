import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';
import {
    X, Shield, Package, Calendar, CheckCircle, AlertCircle, User, Briefcase
} from 'lucide-react';

const BGV_PACKAGES = {
    BASIC: {
        name: 'Basic',
        checks: ['Identity', 'Address', 'Employment'],
        description: 'Essential verification for entry-level positions',
        color: 'slate',
        recommended: 'Entry-level, Interns'
    },
    STANDARD: {
        name: 'Standard',
        checks: ['Identity', 'Address', 'Employment', 'Education', 'Criminal'],
        description: 'Comprehensive verification for most positions',
        color: 'blue',
        recommended: 'Most positions, Standard hiring'
    },
    PREMIUM: {
        name: 'Premium',
        checks: ['Identity', 'Address', 'Employment', 'Education', 'Criminal', 'Social Media', 'Reference'],
        description: 'Complete verification for critical roles',
        color: 'purple',
        recommended: 'Senior positions, Critical roles'
    }
};

const InitiateBGVModal = ({ onClose, onSuccess, preselectedApplicant = null }) => {
    const [applicants, setApplicants] = useState([]);
    const [selectedApplicant, setSelectedApplicant] = useState(preselectedApplicant?.id || '');
    const [selectedPackage, setSelectedPackage] = useState('STANDARD');
    const [slaDays, setSlaDays] = useState(7);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchApplicants();
    }, []);

    const fetchApplicants = async () => {
        try {
            // Fetch applicants who don't have BGV initiated yet
            const res = await api.get('/applicants', {
                params: {
                    status: 'Selected', // Or appropriate status
                    limit: 100
                }
            });
            setApplicants(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch applicants:', err);
            showToast('error', 'Error', 'Failed to load applicants');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedApplicant) {
            showToast('error', 'Error', 'Please select an applicant');
            return;
        }

        setLoading(true);
        try {
            await api.post('/bgv/initiate', {
                applicationId: selectedApplicant,
                package: selectedPackage,
                slaDays
            });

            showToast('success', 'Success', 'BGV initiated successfully');
            onSuccess();
        } catch (err) {
            console.error('Failed to initiate BGV:', err);
            showToast('error', 'Error', err.response?.data?.message || 'Failed to initiate BGV');
        } finally {
            setLoading(false);
        }
    };

    const filteredApplicants = applicants.filter(app =>
        app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getPackageColor = (color) => {
        const colors = {
            slate: 'from-slate-500 to-slate-600 border-slate-300',
            blue: 'from-blue-500 to-blue-600 border-blue-300',
            purple: 'from-purple-500 to-purple-600 border-purple-300'
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Shield size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">Initiate Background Verification</h2>
                            <p className="text-blue-100 text-sm mt-1">Select candidate and verification package</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-all"
                    >
                        <X size={24} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Step 1: Select Applicant */}
                    <div className="mb-8">
                        <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">
                            <User size={16} className="inline mr-2" />
                            Step 1: Select Candidate
                        </label>

                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl mb-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                        />

                        {/* Applicants List */}
                        <div className="border-2 border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                            {filteredApplicants.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <User size={48} className="mx-auto mb-2 opacity-50" />
                                    <p>No applicants found</p>
                                </div>
                            ) : (
                                filteredApplicants.map((app) => (
                                    <label
                                        key={app._id}
                                        className={`flex items-center gap-4 p-4 border-b border-slate-100 cursor-pointer hover:bg-blue-50 transition-all ${selectedApplicant === app._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="applicant"
                                            value={app._id}
                                            checked={selectedApplicant === app._id}
                                            onChange={(e) => setSelectedApplicant(e.target.value)}
                                            className="w-5 h-5 text-blue-600"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900">{app.name}</div>
                                            <div className="text-sm text-slate-500">{app.email}</div>
                                            {app.requirementId?.jobTitle && (
                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                    <Briefcase size={12} />
                                                    {app.requirementId.jobTitle}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Step 2: Select Package */}
                    <div className="mb-8">
                        <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">
                            <Package size={16} className="inline mr-2" />
                            Step 2: Select Verification Package
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(BGV_PACKAGES).map(([key, pkg]) => (
                                <label
                                    key={key}
                                    className={`relative border-3 rounded-2xl p-6 cursor-pointer transition-all ${selectedPackage === key
                                            ? `border-${pkg.color}-500 bg-${pkg.color}-50 shadow-lg scale-105`
                                            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="package"
                                        value={key}
                                        checked={selectedPackage === key}
                                        onChange={(e) => setSelectedPackage(e.target.value)}
                                        className="sr-only"
                                    />

                                    {/* Package Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase bg-gradient-to-r ${getPackageColor(pkg.color)} text-white`}>
                                            <Package size={12} />
                                            {pkg.name}
                                        </span>
                                        {selectedPackage === key && (
                                            <CheckCircle size={20} className="text-blue-600" />
                                        )}
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-slate-600 mb-4">{pkg.description}</p>

                                    {/* Checks */}
                                    <div className="space-y-2 mb-4">
                                        {pkg.checks.map((check, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                <CheckCircle size={14} className="text-emerald-600" />
                                                <span className="text-slate-700">{check}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recommended */}
                                    <div className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                                        <strong>Recommended for:</strong> {pkg.recommended}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Step 3: SLA */}
                    <div className="mb-8">
                        <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">
                            <Calendar size={16} className="inline mr-2" />
                            Step 3: Set SLA (Service Level Agreement)
                        </label>

                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="1"
                                max="30"
                                value={slaDays}
                                onChange={(e) => setSlaDays(parseInt(e.target.value))}
                                className="w-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-center font-bold text-lg"
                            />
                            <div>
                                <div className="font-bold text-slate-900">Days to complete verification</div>
                                <div className="text-sm text-slate-500">
                                    Due date: {new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* SLA Presets */}
                        <div className="flex gap-2 mt-4">
                            {[3, 5, 7, 10, 14].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() => setSlaDays(days)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${slaDays === days
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                >
                                    {days} days
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-blue-200">
                        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                            <AlertCircle size={20} className="text-blue-600" />
                            Verification Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-slate-500 font-bold mb-1">Package</div>
                                <div className="text-slate-900 font-black">{BGV_PACKAGES[selectedPackage].name}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 font-bold mb-1">Total Checks</div>
                                <div className="text-slate-900 font-black">{BGV_PACKAGES[selectedPackage].checks.length}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 font-bold mb-1">SLA</div>
                                <div className="text-slate-900 font-black">{slaDays} days</div>
                            </div>
                            <div>
                                <div className="text-slate-500 font-bold mb-1">Due Date</div>
                                <div className="text-slate-900 font-black">
                                    {new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedApplicant}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Initiating...
                                </span>
                            ) : (
                                'Initiate BGV'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InitiateBGVModal;
