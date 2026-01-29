
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Table, Tag, Input, Select, Button, Tooltip, Pagination } from 'antd';
import { Search, Filter, Briefcase, ChevronRight, User, Mail, Phone, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

export default function InternalApplicants() {
    const navigate = useNavigate();
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadApplicants();
    }, []);

    const loadApplicants = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hrms/requirements/applicants');
            // Filter initially for internal sources or internal jobs
            const allApps = res.data || [];
            const internalApps = allApps.filter(app =>
                app.source === 'Internal' ||
                app.requirementId?.visibility === 'Internal' ||
                app.requirementId?.visibility === 'Both' // Include Both as they can be internal
            );
            setApplicants(internalApps);
        } catch (err) {
            console.error("Failed to load applicants", err);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredApplicants = () => {
        let filtered = applicants;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(app =>
                app.name?.toLowerCase().includes(lowerQuery) ||
                app.email?.toLowerCase().includes(lowerQuery) ||
                app.requirementId?.jobTitle?.toLowerCase().includes(lowerQuery)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(app => app.status === statusFilter);
        }

        return filtered;
    };

    const columns = [
        {
            title: 'Candidate Profile',
            key: 'profile',
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        {record.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <div className="font-bold text-slate-700">{record.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail size={10} /> {record.email}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Applied For',
            key: 'job',
            render: (_, record) => (
                <div>
                    <div className="font-semibold text-slate-700">{record.requirementId?.jobTitle || 'Unknown Job'}</div>
                    <div className="text-xs text-slate-500">{record.requirementId?.department}</div>
                </div>
            )
        },
        {
            title: 'Applied Date',
            dataIndex: 'createdAt',
            key: 'date',
            render: (date) => (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Calendar size={14} />
                    {dayjs(date).format('DD MMM YYYY')}
                </div>
            )
        },
        {
            title: 'Current Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                if (status === 'Selected' || status === 'Finalized') color = 'success';
                if (status === 'Rejected') color = 'error';
                if (status === 'Interview') color = 'processing';

                return (
                    <Tag color={color} className="uppercase font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md border-0">
                        {status}
                    </Tag>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="default"
                    size="small"
                    icon={<ChevronRight size={14} />}
                    onClick={() => {
                        // Navigate to main applicants page with filters to find this specific applicant
                        // Or open a details modal (for now redirecting to main list for full management)
                        navigate('/hrms/hr/applicants', { state: { applicantId: record._id } });
                    }}
                >
                    View
                </Button>
            )
        }
    ];

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Briefcase className="text-indigo-600" />
                        Internal Applicants
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage applications from existing employees.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                        {applicants.length} Total
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <Input
                    prefix={<Search size={16} className="text-slate-400" />}
                    placeholder="Search applicants..."
                    className="max-w-md rounded-xl py-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select
                    defaultValue="all"
                    style={{ width: 150 }}
                    onChange={setStatusFilter}
                    options={[
                        { value: 'all', label: 'All Status' },
                        { value: 'Applied', label: 'Applied' },
                        { value: 'Interview', label: 'Interview' },
                        { value: 'Selected', label: 'Selected' },
                        { value: 'Rejected', label: 'Rejected' },
                    ]}
                />
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Table
                    dataSource={getFilteredApplicants()}
                    columns={columns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    rowClassName="hover:bg-slate-50 transition-colors"
                />
            </div>
        </div>
    );
}
