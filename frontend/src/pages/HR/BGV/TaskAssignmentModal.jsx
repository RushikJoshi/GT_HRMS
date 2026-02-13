import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';

const TaskAssignmentModal = ({ isOpen, onClose, checkData, caseId, onTaskAssigned }) => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        taskType: 'VERIFICATION',
        assignToUserId: '',
        userType: 'VERIFIER',
        priority: 'MEDIUM',
        instructions: '',
        slaDays: 3
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users'); // Adjust endpoint as needed
            setUsers(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.assignToUserId) {
            showToast('error', 'Error', 'Please select a user to assign');
            return;
        }

        setLoading(true);

        try {
            const res = await api.post(`/bgv/check/${checkData._id}/assign-task`, formData);

            showToast('success', 'Success', 'Task assigned successfully');
            onTaskAssigned(res.data.data);
            onClose();
        } catch (err) {
            console.error('Failed to assign task:', err);
            showToast('error', 'Error', err.response?.data?.message || 'Failed to assign task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Assign Task</h2>
                            <p className="text-indigo-100 text-sm">Assign verification task to a user</p>
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
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                        <h3 className="font-bold text-indigo-900 mb-2">Check Details</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-indigo-600 font-medium">Check Type:</span>
                                <span className="ml-2 text-indigo-900 font-bold">
                                    {checkData.type?.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div>
                                <span className="text-indigo-600 font-medium">Case ID:</span>
                                <span className="ml-2 text-indigo-900 font-bold">{caseId}</span>
                            </div>
                        </div>
                    </div>

                    {/* Task Type */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            Task Type: <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.taskType}
                            onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-medium"
                            required
                        >
                            <option value="VERIFICATION">Verification</option>
                            <option value="DOCUMENT_REVIEW">Document Review</option>
                            <option value="FIELD_VISIT">Field Visit</option>
                            <option value="REFERENCE_CHECK">Reference Check</option>
                            <option value="APPROVAL">Approval</option>
                        </select>
                    </div>

                    {/* Assign To User */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            Assign To: <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.assignToUserId}
                            onChange={(e) => setFormData({ ...formData, assignToUserId: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-medium"
                            required
                        >
                            <option value="">-- Select User --</option>
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* User Type */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            User Role: <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {['VERIFIER', 'REVIEWER', 'APPROVER'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, userType: type })}
                                    className={`p-3 border-2 rounded-xl font-bold transition-all ${formData.userType === type
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            Priority: <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {['LOW', 'MEDIUM', 'HIGH'].map((priority) => (
                                <button
                                    key={priority}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority })}
                                    className={`p-3 border-2 rounded-xl font-bold transition-all ${formData.priority === priority
                                            ? priority === 'HIGH'
                                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                                : priority === 'MEDIUM'
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-slate-500 bg-slate-50 text-slate-700'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {priority}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SLA Days */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            SLA (Days): <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={formData.slaDays}
                            onChange={(e) => setFormData({ ...formData, slaDays: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-medium"
                            required
                        />
                        <p className="text-sm text-slate-500 mt-1">
                            Task must be completed within {formData.slaDays} days
                        </p>
                    </div>

                    {/* Instructions */}
                    <div>
                        <label className="block font-bold text-slate-900 mb-2">
                            Instructions:
                        </label>
                        <textarea
                            value={formData.instructions}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            placeholder="Provide detailed instructions for the verifier..."
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none resize-none"
                        />
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
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Assign Task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskAssignmentModal;
