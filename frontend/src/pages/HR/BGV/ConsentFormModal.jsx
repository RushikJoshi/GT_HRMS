import React, { useState, useRef } from 'react';
import { X, CheckCircle, FileText, MapPin, Smartphone } from 'lucide-react';
import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';

const ConsentFormModal = ({ isOpen, onClose, caseData, onConsentCaptured }) => {
    const [loading, setLoading] = useState(false);
    const [consentGiven, setConsentGiven] = useState(false);
    const [signatureType, setSignatureType] = useState('TYPED_NAME');
    const [typedName, setTypedName] = useState('');
    const [scopeAgreed, setScopeAgreed] = useState([]);
    const [location, setLocation] = useState({ city: '', country: 'India' });
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    if (!isOpen) return null;

    const handleCheckChange = (checkType) => {
        if (scopeAgreed.find(s => s.checkType === checkType)) {
            setScopeAgreed(scopeAgreed.filter(s => s.checkType !== checkType));
        } else {
            setScopeAgreed([...scopeAgreed, {
                checkType,
                agreedAt: new Date().toISOString()
            }]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!consentGiven) {
            showToast('error', 'Error', 'Please provide consent to proceed');
            return;
        }

        if (scopeAgreed.length === 0) {
            showToast('error', 'Error', 'Please select at least one check type');
            return;
        }

        if (signatureType === 'TYPED_NAME' && !typedName.trim()) {
            showToast('error', 'Error', 'Please enter your name');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                consentGiven: true,
                signatureType,
                signatureData: signatureType === 'TYPED_NAME' ? typedName : 'Digital Signature',
                scopeAgreed,
                location
            };

            const res = await api.post(`/bgv/case/${caseData._id}/consent`, payload);

            showToast('success', 'Success', 'Consent captured successfully');
            onConsentCaptured(res.data.data);
            onClose();
        } catch (err) {
            console.error('Failed to capture consent:', err);
            showToast('error', 'Error', err.response?.data?.message || 'Failed to capture consent');
        } finally {
            setLoading(false);
        }
    };

    const startDrawing = (e) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Digital Consent Form</h2>
                            <p className="text-blue-100 text-sm">Background Verification Authorization</p>
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
                    {/* Case Information */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h3 className="font-bold text-blue-900 mb-2">Verification Details</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-blue-600 font-medium">Case ID:</span>
                                <span className="ml-2 text-blue-900 font-bold">{caseData.caseId}</span>
                            </div>
                            <div>
                                <span className="text-blue-600 font-medium">Package:</span>
                                <span className="ml-2 text-blue-900 font-bold">{caseData.package}</span>
                            </div>
                        </div>
                    </div>

                    {/* Consent Text */}
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                        <h3 className="font-bold text-slate-900 mb-3">Consent Declaration</h3>
                        <div className="text-sm text-slate-700 space-y-2 max-h-40 overflow-y-auto">
                            <p>I hereby authorize the company to conduct background verification checks as selected below. I understand that:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>All information provided by me is true and accurate</li>
                                <li>The company may contact my previous employers, educational institutions, and references</li>
                                <li>Any false information may result in rejection or termination</li>
                                <li>My personal data will be processed securely and in compliance with data protection laws</li>
                                <li>I have the right to withdraw consent at any time</li>
                            </ul>
                        </div>
                    </div>

                    {/* Scope Selection */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-3">
                            Select Verification Checks You Consent To:
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {caseData.checks?.map((check) => (
                                <label
                                    key={check._id}
                                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${scopeAgreed.find(s => s.checkType === check.type)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-blue-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={scopeAgreed.find(s => s.checkType === check.type)}
                                        onChange={() => handleCheckChange(check.type)}
                                        className="w-5 h-5 text-blue-600 rounded"
                                    />
                                    <span className="font-medium text-slate-900">
                                        {check.type.replace(/_/g, ' ')}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Signature Type */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-3">Signature Type:</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setSignatureType('TYPED_NAME')}
                                className={`flex-1 p-3 border-2 rounded-xl font-medium transition-all ${signatureType === 'TYPED_NAME'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-600 hover:border-blue-300'
                                    }`}
                            >
                                Typed Name
                            </button>
                            <button
                                type="button"
                                onClick={() => setSignatureType('DIGITAL')}
                                className={`flex-1 p-3 border-2 rounded-xl font-medium transition-all ${signatureType === 'DIGITAL'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-600 hover:border-blue-300'
                                    }`}
                            >
                                Draw Signature
                            </button>
                        </div>
                    </div>

                    {/* Signature Input */}
                    {signatureType === 'TYPED_NAME' ? (
                        <div>
                            <label className="block font-bold text-slate-900 mb-2">Enter Your Full Name:</label>
                            <input
                                type="text"
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-medium"
                                required
                            />
                            {typedName && (
                                <div className="mt-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
                                    <p className="text-sm text-slate-600 mb-2">Signature Preview:</p>
                                    <p className="text-3xl font-signature text-blue-600">{typedName}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block font-bold text-slate-900 mb-2">Draw Your Signature:</label>
                            <div className="border-2 border-slate-200 rounded-xl p-2 bg-white">
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={150}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    className="w-full border border-slate-200 rounded-lg cursor-crosshair"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={clearCanvas}
                                className="mt-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
                            >
                                Clear Signature
                            </button>
                        </div>
                    )}

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-slate-900 mb-2">
                                <MapPin size={16} className="inline mr-1" />
                                City:
                            </label>
                            <input
                                type="text"
                                value={location.city}
                                onChange={(e) => setLocation({ ...location, city: e.target.value })}
                                placeholder="Mumbai"
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-900 mb-2">Country:</label>
                            <input
                                type="text"
                                value={location.country}
                                onChange={(e) => setLocation({ ...location, country: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                            />
                        </div>
                    </div>

                    {/* Consent Checkbox */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded mt-1"
                                required
                            />
                            <span className="text-sm text-slate-700">
                                <strong className="text-blue-900">I hereby provide my consent</strong> for the company to conduct the selected background verification checks. I confirm that I have read and understood the terms above.
                            </span>
                        </label>
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
                            disabled={loading || !consentGiven}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    Submit Consent
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConsentFormModal;
