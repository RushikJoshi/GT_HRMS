import React, { useState, useEffect } from 'react';
import { X, Save, Info, AlertCircle, Code, List, Sparkles, BookOpen, Layers, Settings2, CheckCircle2 } from 'lucide-react';
import { showToast } from '../../../utils/uiNotifications';
import api from '../../../utils/api';

const PRESETS = [
    {
        id: 'INITIATION',
        icon: <Sparkles size={20} />,
        name: 'Welcome & Invitation',
        category: 'Onboarding',
        description: 'Standard invitation to start BGV process',
        emailType: 'BGV_IN_PROGRESS',
        subject: 'Welcome to the Team! Let\'s Start Your Verification',
        htmlBody: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); padding: 40px 20px; text-align: center; border-radius: 20px 20px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Background Verification</h1>
    </div>
    <div style="padding: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 20px 20px;">
        <p style="font-size: 18px; font-weight: 600;">Dear {{candidate_name}},</p>
        <p style="line-height: 1.6;">We are excited to have you join us! To complete your onboarding, we need to initiate your background verification for the <strong>{{job_title}}</strong> role.</p>
        <div style="margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">CASE REFERENCE</p>
            <p style="margin: 5px 0 0; font-weight: 700; color: #1e293b;">{{bgv_case_id}}</p>
        </div>
        <p style="line-height: 1.6;">Please keep your documents ready. Our team will contact you if any additional information is required.</p>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #94a3b8;">
            Best Regards,<br>Onboarding Team
        </div>
    </div>
</div>`
    },
    {
        id: 'REMINDER',
        icon: <AlertCircle size={20} />,
        name: 'Urgent Reminder',
        category: 'Follow-up',
        description: 'Request missing documents from candidate',
        emailType: 'DOCUMENT_PENDING',
        subject: 'Action Required: Pending Verification Documents',
        htmlBody: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
    <div style="background-color: #ef4444; padding: 30px 20px; text-align: center; border-radius: 20px 20px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Action Required</h1>
    </div>
    <div style="padding: 40px; background: white; border: 1px solid #fecaca; border-radius: 0 0 20px 20px;">
        <p>Hi {{candidate_name}},</p>
        <p>Your verification process is currently <strong>on hold</strong>. We require the following documents to proceed:</p>
        <div style="background: #fff1f2; padding: 20px; border-radius: 12px; color: #be123c; font-weight: 600;">
            {{pending_documents}}
        </div>
        <p style="margin-top: 25px;">Please upload these by <strong>{{sla_date}}</strong> to avoid delays in your joining date.</p>
    </div>
</div>`
    },
    {
        id: 'SUCCESS',
        icon: <CheckCircle2 size={20} />,
        name: 'Verified - Success',
        category: 'Completion',
        description: 'Congratulatory email on passing BGV',
        emailType: 'BGV_COMPLETED_VERIFIED',
        subject: 'Verification Successful - Welcome Aboard!',
        htmlBody: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
    <div style="background: #10b981; padding: 40px 20px; text-align: center; border-radius: 20px 20px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Verification Complete</h1>
    </div>
    <div style="padding: 40px; background: white; border: 1px solid #d1fae5; border-radius: 0 0 20px 20px; text-align: center;">
        <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
        <p style="font-size: 20px; font-weight: 700; color: #065f46;">Great News, {{candidate_name}}!</p>
        <p>Your background verification is now <strong>successfully completed</strong>. We're looking forward to having you with us.</p>
        <div style="display: inline-block; background: #ecfdf5; padding: 10px 25px; border-radius: 30px; color: #059669; font-weight: 800; font-size: 12px; text-transform: uppercase;">
            Status: Fully Verified
        </div>
    </div>
</div>`
    }
];

const BGVEmailTemplateModal = ({ template, onClose, onSuccess }) => {
    const isEditing = !!template;
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activePresetCategory, setActivePresetCategory] = useState('All');

    const [formData, setFormData] = useState({
        emailType: '',
        name: '',
        description: '',
        subject: '',
        htmlBody: '',
        supportedVariables: ['candidate_name', 'bgv_case_id', 'job_title'] // Default essentials
    });

    useEffect(() => {
        if (template) {
            setFormData({
                emailType: template.emailType || '',
                name: template.name || '',
                description: template.description || '',
                subject: template.subject || '',
                htmlBody: template.htmlBody || '',
                supportedVariables: template.supportedVariables || []
            });
        }
    }, [template]);

    const applyPreset = (preset) => {
        setFormData(prev => ({
            ...prev,
            emailType: preset.emailType,
            name: preset.name,
            description: preset.description,
            subject: preset.subject,
            htmlBody: preset.htmlBody
        }));
        showToast('info', 'Loaded', `Applied ${preset.name} design`);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleVariableChange = (e) => {
        const value = e.target.value;
        setFormData(prev => ({
            ...prev,
            supportedVariables: value.split(',').map(v => v.trim()).filter(v => v !== '')
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/bgv/email-template', formData);
            showToast('success', 'Success', `Email template ${isEditing ? 'updated' : 'created'} successfully`);
            onSuccess();
        } catch (err) {
            console.error('Failed to save template:', err);
            const msg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} template`;
            showToast('error', 'Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 font-inter">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-white/20">
                {/* Header */}
                <div className="bg-slate-900 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Layers size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                {isEditing ? 'Refine Design' : 'Design New Template'}
                                {!isEditing && <span className="text-[10px] bg-blue-500 px-2 py-0.5 rounded-full">BETA</span>}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-80">
                                    Visual Communication Suite
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center text-white/50 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left Side: Template Library */}
                    {!isEditing && (
                        <div className="w-full md:w-80 bg-slate-50/80 border-r border-slate-100 p-8 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-6 text-slate-900">
                                <BookOpen size={18} className="text-blue-600" />
                                <span className="font-black text-sm uppercase tracking-widest">Design Library</span>
                            </div>

                            <div className="space-y-4">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => applyPreset(preset)}
                                        className="w-full text-left p-4 bg-white rounded-2xl border-2 border-transparent hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100 transition-all group lg:scale-100 active:scale-95"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                {preset.icon}
                                            </div>
                                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{preset.category}</div>
                                        </div>
                                        <h4 className="font-black text-slate-800 group-hover:text-blue-700">{preset.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{preset.description}</p>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8 p-4 bg-blue-600 rounded-2xl text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Pro Tip</p>
                                <p className="text-xs font-medium leading-relaxed">Select a template to auto-fill high-quality designs. You can then customize the text easily.</p>
                            </div>
                        </div>
                    )}

                    {/* Right Side: Editor */}
                    <div className="flex-1 overflow-y-auto p-10 bg-white">
                        <div className="max-w-3xl mx-auto space-y-8">
                            {/* Main Content Fields */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                        Email Subject Header
                                    </label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        placeholder="e.g. Welcome to your Background Verification Portal"
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-black text-lg text-slate-900 shadow-inner"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            Template Content (HTML/Design)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded">Design Ready</span>
                                        </div>
                                    </div>
                                    <textarea
                                        name="htmlBody"
                                        value={formData.htmlBody}
                                        onChange={handleChange}
                                        rows="12"
                                        placeholder="Paste your design here or pick from the library..."
                                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[2rem] outline-none transition-all font-mono text-xs leading-relaxed resize-none h-[350px] shadow-inner lg:text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Technical Meta - Simplified/Toggle */}
                            <div className="pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                                >
                                    <Settings2 size={14} />
                                    {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings & IDs'}
                                </button>

                                {showAdvanced && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-50 rounded-[2rem] animate-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Internal Reference Name</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">System Trigger ID</label>
                                                <input
                                                    type="text"
                                                    name="emailType"
                                                    value={formData.emailType}
                                                    onChange={handleChange}
                                                    disabled={isEditing}
                                                    className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold disabled:opacity-50"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Internal Description</label>
                                                <textarea
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleChange}
                                                    className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none"
                                                    rows="4"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-900 px-10 py-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg">
                            <Info className="text-blue-400" size={16} />
                        </div>
                        <p className="text-white/40 text-[10px] font-medium leading-tight max-w-[300px]">
                            Design templates are saved with responsive HTML blocks by default for max device compatibility.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 rounded-2xl font-black text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest shadow-lg shadow-black/20"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-xs shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Save size={18} />
                            )}
                            {isEditing ? 'Save Design Changes' : 'Publish Template'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BGVEmailTemplateModal;
