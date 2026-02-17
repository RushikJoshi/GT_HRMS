import React from 'react';
import { useNavigate } from 'react-router-dom';
import RequirementForm from '../../components/RequirementForm';
import { Plus } from 'lucide-react';

export default function CreateRequirement() {
    const navigate = useNavigate();

    const handleSuccess = () => {
        navigate('/hr/requirements');
    };

    const handleClose = () => {
        navigate('/hr/requirements');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-6 lg:px-12 font-sans selection:bg-indigo-100 selection:text-indigo-600">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header Section */}
                <div className="mb-10 pl-2">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                            <Plus size={24} />
                        </div>
                        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            <span>Recruitment</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-indigo-600 tracking-widest">New Requirement</span>
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-3">Create <span className="text-indigo-600">Requirement</span></h1>
                    <p className="text-slate-500 font-medium text-lg max-w-2xl leading-relaxed">Set up your hiring channel and define the candidate evaluation pipeline with precision.</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden relative">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <RequirementForm
                        isModal={false}
                        onSuccess={handleSuccess}
                        onClose={handleClose}
                    />
                </div>
            </div>
        </div>
    );
}
