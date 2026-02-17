import React, { useState } from 'react';
import { Star, CheckCircle2, XCircle, AlertCircle, Save } from 'lucide-react';

export default function FeedbackFormRenderer({ template, onSubmit, initialFeedback, submitting, availableStages = [] }) {
    const [answers, setAnswers] = useState(initialFeedback?.answers || []);
    const [decision, setDecision] = useState(initialFeedback?.decision || 'Hold');
    const [nextStage, setNextStage] = useState('');
    const [comments, setComments] = useState(initialFeedback?.comments || '');

    const handleAnswerChange = (label, type, value) => {
        const newAnswers = [...answers];
        const idx = newAnswers.findIndex(a => a.fieldLabel === label);
        if (idx >= 0) {
            newAnswers[idx].value = value;
        } else {
            newAnswers.push({ fieldLabel: label, fieldType: type, value });
        }
        setAnswers(newAnswers);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ answers, decision, nextStage, comments });
    };

    if (!template) return <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest">No evaluation form attached to this stage</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
                <h3 className="text-xl font-black tracking-tight">{template.name}</h3>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-1 opacity-80 italic">Standardized Interview Assessment</p>
            </div>

            <div className="space-y-6">
                {template.fields.map((field, idx) => {
                    const currentAnswer = answers.find(a => a.fieldLabel === field.label)?.value || '';

                    return (
                        <div key={idx} className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                {field.label} {field.required && <span className="text-rose-500">*</span>}
                            </label>

                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    required={field.required}
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerChange(field.label, field.type, e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-semibold text-slate-700"
                                    placeholder={field.placeholder || "Enter your assessment..."}
                                />
                            )}

                            {field.type === 'paragraph' && (
                                <textarea
                                    required={field.required}
                                    rows={4}
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerChange(field.label, field.type, e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-medium text-slate-600 resize-none"
                                    placeholder={field.placeholder || "Detailed qualitative feedback..."}
                                />
                            )}

                            {field.type === 'rating' && (
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleAnswerChange(field.label, field.type, num)}
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${currentAnswer === num ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            <Star size={20} fill={currentAnswer >= num ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {field.type === 'yes_no' && (
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleAnswerChange(field.label, field.type, 'Yes')}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${currentAnswer === 'Yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAnswerChange(field.label, field.type, 'No')}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${currentAnswer === 'No' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                    >
                                        No
                                    </button>
                                </div>
                            )}

                            {field.type === 'dropdown' && (
                                <select
                                    required={field.required}
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerChange(field.label, field.type, e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-semibold text-slate-700"
                                >
                                    <option value="">Select an option...</option>
                                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-8 border-t border-slate-100 space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-widest">Final Hiring Decision</label>
                    <div className="flex gap-4">
                        {[
                            { value: 'Pass', label: 'Move to Next Step', color: 'emerald', icon: CheckCircle2 },
                            { value: 'Hold', label: 'Potential Candidate', color: 'amber', icon: AlertCircle },
                            { value: 'Reject', label: 'Do Not Proceed', color: 'rose', icon: XCircle }
                        ].map(item => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setDecision(item.value)}
                                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 items-center text-center ${decision === item.value ? (item.color === 'emerald' ? 'border-emerald-500 bg-emerald-50' : item.color === 'amber' ? 'border-amber-500 bg-amber-50' : 'border-rose-500 bg-rose-50') : 'border-slate-100 bg-slate-50 opacity-60'}`}
                            >
                                <item.icon className={decision === item.value ? (item.color === 'emerald' ? 'text-emerald-600' : item.color === 'amber' ? 'text-amber-600' : 'text-rose-600') : 'text-slate-400'} size={24} />
                                <div>
                                    <span className={`block text-[10px] font-black uppercase tracking-tight ${decision === item.value ? (item.color === 'emerald' ? 'text-emerald-800' : item.color === 'amber' ? 'text-amber-800' : 'text-rose-800') : 'text-slate-500'}`}>{item.value}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">{item.label}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {decision === 'Pass' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Next Pipeline Stage</label>
                        <select
                            required
                            value={nextStage}
                            onChange={(e) => setNextStage(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-emerald-100 rounded-xl focus:border-emerald-500 transition-all outline-none font-bold text-slate-700"
                        >
                            <option value="">-- Choose Next Round --</option>
                            <option value="Selected">🎉 Final Selection / Hire</option>
                            {availableStages.map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Overall Evaluator Comments</label>
                    <textarea
                        rows={3}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Any additional context for the hiring manager..."
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-medium text-slate-600 resize-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || (decision === 'Pass' && !nextStage)}
                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {submitting ? 'Recording Assessment...' : (
                        <>
                            <Save size={20} /> Submit Stage Feedback
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
