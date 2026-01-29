import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
    Briefcase, Calendar, CheckCircle, Clock,
    XCircle, ChevronRight, AlertCircle, Search, ArrowLeft
} from 'lucide-react';

export default function CandidateApplications() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchApps = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Using /jobs/candidate/dashboard endpoint
            const res = await api.get('/jobs/candidate/dashboard');
            const data = res.data || {};
            const apps = data.applications || [];

            setApplications(Array.isArray(apps) ? apps : (apps.items || []));
        } catch (err) {
            console.error("Fetch Apps Error:", err);
            setError("Failed to load your applications. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApps();
    }, [fetchApps]);

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase() || '';
        if (['hired', 'selected'].includes(s)) return 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10';
        if (['rejected'].includes(s)) return 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10';
        if (['offered'].includes(s)) return 'bg-violet-50 text-violet-600 border-violet-100 ring-violet-500/10';
        if (['interview'].includes(s)) return 'bg-orange-50 text-orange-600 border-orange-100 ring-orange-500/10';
        if (['shortlisted'].includes(s)) return 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/10';
        return 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-500/10';
    };

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Loading Applications...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-900 mb-2">Oops! Something went wrong</h3>
                <p className="text-gray-500 font-medium mb-6">{error}</p>
                <button
                    onClick={fetchApps}
                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                        Active Applications<span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-3 text-lg">Track the progress of your active career applications.</p>
                </div>
            </div>

            {/* Applications List */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-gray-50 overflow-hidden relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-10 py-8 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Job Details</th>
                                <th className="px-10 py-8 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Applied On</th>
                                <th className="px-10 py-8 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Status</th>
                                <th className="px-10 py-8 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {applications.length > 0 ? applications.map(app => (
                                <tr key={app?._id} className="group hover:bg-blue-50/30 transition-all duration-300">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-sm border border-gray-100">
                                                <Briefcase className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors text-lg">{app?.requirementId?.jobTitle || 'Role Name'}</h4>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1.5">{app?.requirementId?.department || 'Department'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center justify-center gap-2.5 text-gray-500 font-bold text-sm tracking-tight">
                                            <Calendar className="w-4 h-4 text-gray-300" />
                                            {app?.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex justify-center">
                                            <div className={`w-fit px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border flex items-center gap-2.5 ${getStatusStyle(app?.status)} shadow-sm`}>
                                                <div className="w-2 h-2 rounded-full bg-current"></div>
                                                {app?.status || 'Applied'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => navigate(`/candidate/application/${app?._id}`)}
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-black text-[11px] uppercase tracking-widest group-hover:translate-x-2 transition-all p-4 rounded-xl hover:bg-white"
                                            >
                                                Track Journey <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                                <Search className="w-10 h-10 text-gray-200" />
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">No applications found</h3>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2 mb-8">You haven't applied to any roles yet.</p>
                                            <button
                                                onClick={() => navigate('/candidate/open-positions')}
                                                className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
                                            >
                                                Explore Career Opportunities
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
