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
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-6 lg:px-12 font-sans selection:bg-indigo-100 selection:text-indigo-600">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header Section */}
                <div className="mb-10 pl-2">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Plus size={20} />
                        </div>
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            <span>Recruitment</span>
                            <span className="text-slate-200">/</span>
                            <span className="text-indigo-600 tracking-widest">New Requirement</span>
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tighter mb-2">Create New Recruitment</h1>
                    <p className="text-slate-500 font-medium text-lg max-w-2xl">Set up your hiring channel and define the candidate evaluation pipeline with precision.</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
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
