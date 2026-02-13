import React, { useState, useEffect } from 'react';
import { CheckSquare, Clock, AlertCircle, CheckCircle, XCircle, User, Calendar, FileText, ChevronRight } from 'lucide-react';
import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const MyTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedTask, setSelectedTask] = useState(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);

    useEffect(() => {
        fetchMyTasks();
    }, []);

    const fetchMyTasks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bgv/tasks/my-tasks');
            setTasks(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
            showToast('error', 'Error', 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        return task.taskStatus === filter;
    });

    const getStatusBadge = (status) => {
        const styles = {
            ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-200',
            IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
            COMPLETED: 'bg-purple-100 text-purple-700 border-purple-200',
            APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
            ESCALATED: 'bg-orange-100 text-orange-700 border-orange-200'
        };
        return styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ASSIGNED': return <Clock size={16} />;
            case 'IN_PROGRESS': return <AlertCircle size={16} />;
            case 'COMPLETED': return <CheckSquare size={16} />;
            case 'APPROVED': return <CheckCircle size={16} />;
            case 'REJECTED': return <XCircle size={16} />;
            default: return <FileText size={16} />;
        }
    };

    const getSLAStatus = (deadline) => {
        const now = dayjs();
        const slaDate = dayjs(deadline);
        const hoursLeft = slaDate.diff(now, 'hours');

        if (hoursLeft < 0) return { text: 'BREACHED', color: 'text-rose-600', bg: 'bg-rose-50' };
        if (hoursLeft < 24) return { text: 'CRITICAL', color: 'text-orange-600', bg: 'bg-orange-50' };
        if (hoursLeft < 48) return { text: 'WARNING', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { text: 'ON TRACK', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-200">
                        <CheckSquare size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            My BGV Tasks
                        </h1>
                        <p className="text-slate-600 font-medium mt-1">
                            Verification tasks assigned to you
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Tasks"
                        value={tasks.length}
                        icon={<FileText size={24} />}
                        color="blue"
                    />
                    <StatCard
                        title="Pending"
                        value={tasks.filter(t => t.taskStatus === 'ASSIGNED').length}
                        icon={<Clock size={24} />}
                        color="amber"
                    />
                    <StatCard
                        title="Completed"
                        value={tasks.filter(t => t.taskStatus === 'COMPLETED').length}
                        icon={<CheckSquare size={24} />}
                        color="purple"
                    />
                    <StatCard
                        title="Approved"
                        value={tasks.filter(t => t.taskStatus === 'APPROVED').length}
                        icon={<CheckCircle size={24} />}
                        color="emerald"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 mb-6">
                <div className="flex gap-2 overflow-x-auto">
                    {['all', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${filter === status
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {status === 'all' ? 'All Tasks' : status.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tasks List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
                    <CheckSquare size={64} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Tasks Found</h3>
                    <p className="text-slate-600">You don't have any {filter !== 'all' ? filter.toLowerCase() : ''} tasks at the moment.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTasks.map((task) => {
                        const slaStatus = getSLAStatus(task.slaDeadline);
                        return (
                            <div
                                key={task._id}
                                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-black uppercase ${getStatusBadge(task.taskStatus)}`}>
                                                {getStatusIcon(task.taskStatus)}
                                                {task.taskStatus.replace(/_/g, ' ')}
                                            </span>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${slaStatus.bg} ${slaStatus.color}`}>
                                                SLA: {slaStatus.text}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                                            {task.taskType?.replace(/_/g, ' ')} - {task.caseId}
                                        </h3>
                                        <p className="text-slate-600 text-sm">
                                            {task.instructions || 'No instructions provided'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Case ID</p>
                                        <p className="font-bold text-slate-900">{task.caseId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Check Type</p>
                                        <p className="font-bold text-slate-900">{task.checkType?.replace(/_/g, ' ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Priority</p>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${task.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                                                task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">SLA Deadline</p>
                                        <p className="font-bold text-slate-900">{dayjs(task.slaDeadline).format('MMM DD, YYYY')}</p>
                                        <p className="text-xs text-slate-500">{dayjs(task.slaDeadline).fromNow()}</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t-2 border-slate-100">
                                    {task.taskStatus === 'ASSIGNED' && (
                                        <button
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setShowCompleteModal(true);
                                            }}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <CheckSquare size={18} />
                                            Complete Task
                                        </button>
                                    )}
                                    {task.taskStatus === 'COMPLETED' && task.maker?.userId !== task.assignedTo && (
                                        <button
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setShowApproveModal(true);
                                            }}
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} />
                                            Review & Approve
                                        </button>
                                    )}
                                    <button
                                        onClick={() => window.location.href = `/hr/bgv-case/${task.caseId}`}
                                        className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                                    >
                                        View Case
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals would go here - CompleteTaskModal and ApproveTaskModal */}
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => {
    const colorStyles = {
        blue: 'from-blue-500 to-indigo-500',
        amber: 'from-amber-500 to-yellow-500',
        purple: 'from-purple-500 to-pink-500',
        emerald: 'from-emerald-500 to-teal-500'
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${colorStyles[color]} rounded-xl shadow-lg`}>
                    <div className="text-white">{icon}</div>
                </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</div>
        </div>
    );
};

export default MyTasks;
