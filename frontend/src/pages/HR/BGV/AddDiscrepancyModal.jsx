import React, { useState } from 'react';
import { X, AlertTriangle, Save } from 'lucide-react';
import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';

const AddDiscrepancyModal = ({ isOpen, onClose, checkData, caseId, onDiscrepancyAdded }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: '',
        description: '',
        severity: 'MINOR'
    });

    // All 30+ discrepancy types from backend
    const discrepancyTypes = [
        { value: 'MINOR_DATE_MISMATCH', label: 'Minor Date Mismatch', points: 5 },
        { value: 'MAJOR_DATE_MISMATCH', label: 'Major Date Mismatch (>6 months)', points: 15 },
        { value: 'NAME_SPELLING_VARIATION', label: 'Name Spelling Variation', points: 3 },
        { value: 'ADDRESS_MISMATCH_MINOR', label: 'Address Mismatch - Minor', points: 5 },
        { value: 'ADDRESS_MISMATCH_MAJOR', label: 'Address Mismatch - Major', points: 20 },
        { value: 'SALARY_MISMATCH_MINOR', label: 'Salary Mismatch - Minor (<10%)', points: 10 },
        { value: 'SALARY_MISMATCH_MAJOR', label: 'Salary Mismatch - Major (>10%)', points: 25 },
        { value: 'DESIGNATION_MISMATCH', label: 'Designation Mismatch', points: 15 },
        { value: 'EMPLOYMENT_GAP_UNEXPLAINED', label: 'Employment Gap - Unexplained', points: 20 },
        { value: 'EMPLOYMENT_GAP_EXPLAINED', label: 'Employment Gap - Explained', points: 5 },
        { value: 'EMPLOYER_NOT_REACHABLE', label: 'Employer Not Reachable', points: 15 },
        { value: 'EMPLOYER_REFUSED_INFO', label: 'Employer Refused Information', points: 25 },
        { value: 'NEGATIVE_FEEDBACK', label: 'Negative Feedback from Employer', points: 30 },
        { value: 'FAKE_EMPLOYER', label: 'Fake Employer', points: 50 },
        { value: 'DEGREE_NOT_VERIFIED', label: 'Degree Not Verified', points: 30 },
        { value: 'UNIVERSITY_NOT_RECOGNIZED', label: 'University Not Recognized', points: 40 },
        { value: 'FAKE_DEGREE', label: 'Fake Degree Certificate', points: 60 },
        { value: 'MARKS_MISMATCH', label: 'Marks/Grade Mismatch', points: 20 },
        { value: 'YEAR_OF_PASSING_MISMATCH', label: 'Year of Passing Mismatch', points: 15 },
        { value: 'CRIMINAL_RECORD_MINOR', label: 'Criminal Record - Minor Offense', points: 40 },
        { value: 'CRIMINAL_RECORD_MAJOR', label: 'Criminal Record - Major Offense', points: 60 },
        { value: 'PENDING_COURT_CASE', label: 'Pending Court Case', points: 35 },
        { value: 'IDENTITY_DOCUMENT_MISMATCH', label: 'Identity Document Mismatch', points: 25 },
        { value: 'FAKE_IDENTITY_DOCUMENT', label: 'Fake Identity Document', points: 60 },
        { value: 'REFERENCE_NOT_REACHABLE', label: 'Reference Not Reachable', points: 10 },
        { value: 'REFERENCE_REFUSED', label: 'Reference Refused to Provide Info', points: 20 },
        { value: 'NEGATIVE_REFERENCE', label: 'Negative Reference Feedback', points: 30 },
        { value: 'SOCIAL_MEDIA_RED_FLAG', label: 'Social Media Red Flag', points: 15 },
        { value: 'CREDIT_SCORE_ISSUE', label: 'Credit Score Issue', points: 20 },
        { value: 'DRUG_TEST_FAILED', label: 'Drug Test Failed', points: 50 },
        { value: 'OTHER', label: 'Other Discrepancy', points: 10 }
    ];

    if (!isOpen) return null;

    const selectedType = discrepancyTypes.find(d => d.value === formData.type);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.type) {
            showToast('error', 'Error', 'Please select a discrepancy type');
            return;
        }

        if (!formData.description.trim()) {
            showToast('error', 'Error', 'Please provide a description');
            return;
        }

        setLoading(true);

        try {
            const res = await api.post(`/bgv/check/${checkData._id}/add-discrepancy`, {
                type: formData.type,
                description: formData.description,
                severity: formData.severity
            });

            showToast('success', 'Success', `Discrepancy added. Risk score updated to ${res.data.data.totalRiskScore} points`);
            onDiscrepancyAdded(res.data.data);
            onClose();
        } catch (err) {
            console.error('Failed to add discrepancy:', err);
            showToast('error', 'Error', err.response?.data?.message || 'Failed to add discrepancy');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Add Discrepancy</h2>
                            <p className="text-orange-100 text-sm">Report verification issue</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Check Information */}
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                        <h3 className="font-bold text-orange-900 mb-2">Check Details</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-orange-600 font-medium">Check Type:</span>
                                <span className="ml-2 text-orange-900 font-bold">
                                    {checkData.type?.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div>
                                <span className="text-orange-600 font-medium">Current Status:</span>
                                <span className="ml-2 text-orange-900 font-bold">{checkData.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Discrepancy Type */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            Discrepancy Type: <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none font-medium"
                            required
                        >
                            <option value="">-- Select Discrepancy Type --</option>
                            {discrepancyTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label} ({type.points} points)
                                </option>
                            ))}
                        </select>

                        {selectedType && (
                            <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-amber-900">
                                        Risk Points:
                                    </span>
                                    <span className="text-2xl font-black text-amber-600">
                                        +{selectedType.points}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Severity */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            Severity: <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {['MINOR', 'MODERATE', 'MAJOR'].map((severity) => (
                                <button
                                    key={severity}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, severity })}
                                    className={`p-3 border-2 rounded-xl font-bold transition-all ${formData.severity === severity
                                            ? severity === 'MINOR'
                                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                                : severity === 'MODERATE'
                                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                    : 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {severity}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            Detailed Description: <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Provide detailed information about the discrepancy found..."
                            rows={5}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none resize-none"
                            required
                        />
                        <p className="text-sm text-slate-500 mt-1">
                            {formData.description.length} characters
                        </p>
                    </div>

                    {/* Warning */}
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-900">
                                <p className="font-bold mb-1">Important:</p>
                                <p>Adding a discrepancy will automatically update the risk score and may affect the hiring recommendation. Ensure all information is accurate and verified.</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Add Discrepancy
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDiscrepancyModal;
