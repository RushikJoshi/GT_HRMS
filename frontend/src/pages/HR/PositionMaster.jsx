import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { message, Modal, Form, Input, Select, InputNumber, Button, Table, Tag, Card, Row, Col, Statistic, Tooltip, Popconfirm } from 'antd';
import { Target, Users, Landmark, Plus, Search, Edit3, Trash2, ShieldCheck, Briefcase } from 'lucide-react';

const { Option } = Select;

const PositionMaster = () => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [summary, setSummary] = useState({ total: 0, vacant: 0, filled: 0 });
    const [nextId, setNextId] = useState('');

    const fetchNextId = async () => {
        try {
            setNextId('Loading...');
            const res = await api.post('/company-id-config/next', { entityType: 'POS', increment: false });
            if (res.data?.data?.id) {
                setNextId(res.data.data.id);
            } else {
                setNextId('Error');
            }
        } catch (error) {
            console.error("Failed to fetch next ID", error);
            setNextId('Auto-Generate');
        }
    };

    useEffect(() => {
        fetchPositions();
    }, []);

    const fetchPositions = async () => {
        try {
            setLoading(true);
            const res = await api.get('/positions');
            if (res.data.success) {
                setPositions(res.data.data);
                calculateSummary(res.data.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            message.error('Failed to load positions');
        } finally {
            setLoading(false);
        }
    };

    const calculateSummary = (data) => {
        const total = data.length;
        const vacant = data.filter(p => p.status === 'Vacant').length;
        const filled = data.filter(p => p.status === 'Filled').length;
        setSummary({ total, vacant, filled });
    };

    const handleCreate = () => {
        setEditingId(null);
        form.resetFields();
        fetchNextId();
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditingId(record._id);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            const res = await api.delete(`/positions/${id}`);
            if (res.data.success) {
                message.success('Position deleted');
                fetchPositions();
            }
        } catch (error) {
            message.error('Failed to delete position');
        }
    };

    const onFinish = async (values) => {
        try {
            setSubmitting(true);
            if (editingId) {
                await api.put(`/positions/${editingId}`, values);
                message.success('Position updated');
            } else {
                await api.post('/positions', values);
                message.success('New position created with automated ID');
            }
            setIsModalOpen(false);
            fetchPositions();
        } catch (error) {
            message.error('Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            title: 'Position ID',
            dataIndex: 'positionId',
            key: 'positionId',
            render: (id) => <Tag color="blue" className="font-mono">{id}</Tag>
        },
        {
            title: 'Job Title',
            dataIndex: 'jobTitle',
            key: 'jobTitle',
            render: (text) => <span className="font-semibold text-gray-700">{text}</span>
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'gold';
                if (status === 'Vacant') color = 'orange';
                if (status === 'Filled') color = 'green';
                if (status === 'Cancelled') color = 'red';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Hiring',
            dataIndex: 'hiringStatus',
            key: 'hiringStatus',
            render: (hiring) => (
                <Tag color={hiring === 'Open' ? 'processing' : 'default'}>{hiring}</Tag>
            )
        },
        {
            title: 'Salary Range',
            key: 'salary',
            render: (_, record) => (
                <span className="text-gray-500 text-sm">
                    {record.baseSalaryRange?.min?.toLocaleString()} - {record.baseSalaryRange?.max?.toLocaleString()}
                </span>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <div className="flex gap-2 justify-end">
                    <Tooltip title="Edit">
                        <Button type="text" icon={<Edit3 size={16} />} onClick={() => handleEdit(record)} />
                    </Tooltip>
                    <Popconfirm title="Delete this position?" onConfirm={() => handleDelete(record._id)}>
                        <Button type="text" danger icon={<Trash2 size={16} />} />
                    </Popconfirm>
                </div>
            )
        }
    ];

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Target size={28} />
                        </div>
                        Position Master
                    </h1>
                    <p className="text-slate-500 mt-1">Manage and track company positions and vacancies.</p>
                </div>
                <Button
                    type="primary"
                    size="large"
                    icon={<Plus size={20} />}
                    onClick={handleCreate}
                    className="h-12 px-6 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-100 flex items-center gap-2 border-none"
                >
                    Create New Position
                </Button>
            </div>

            <Row gutter={24} className="mb-8">
                <Col span={8}>
                    <Card variant="borderless" className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <Statistic
                            title="Total Positions"
                            value={summary.total}
                            prefix={<ShieldCheck className="text-indigo-600 mr-2" size={24} />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card variant="borderless" className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <Statistic
                            title="Vacant"
                            value={summary.vacant}
                            valueStyle={{ color: '#f59e0b' }}
                            prefix={<Users className="text-amber-500 mr-2" size={24} />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card variant="borderless" className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <Statistic
                            title="Filled"
                            value={summary.filled}
                            valueStyle={{ color: '#10b981' }}
                            prefix={<Landmark className="text-emerald-500 mr-2" size={24} />}
                        />
                    </Card>
                </Col>
            </Row>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <Table
                    columns={columns}
                    dataSource={positions}
                    loading={loading}
                    rowKey="_id"
                    pagination={{ pageSize: 8 }}
                    className="custom-table"
                />
            </div>

            <Modal
                title={<h3 className="text-xl font-bold">{editingId ? 'Edit Position' : 'Create Custom Position'}</h3>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={800}
                className="custom-modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ status: 'Vacant', hiringStatus: 'Closed' }}
                    className="mt-6"
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="jobTitle" label="Job Title" rules={[{ required: true }]}>
                                <Input prefix={<Briefcase size={16} className="text-gray-400" />} placeholder="e.g. Senior Solution Architect" className="h-10 rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                                <Select placeholder="Select Department" className="h-10 rounded-lg">
                                    <Option value="IT">IT & Development</Option>
                                    <Option value="HR">Human Resources</Option>
                                    <Option value="Sales">Sales & Marketing</Option>
                                    <Option value="Operations">Operations</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="status" label="Position Status">
                                <Select className="h-10 rounded-lg">
                                    <Option value="Vacant">Vacant</Option>
                                    <Option value="Filled">Filled</Option>
                                    <Option value="Cancelled">Cancelled</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="hiringStatus" label="Hiring Stage">
                                <Select className="h-10 rounded-lg">
                                    <Option value="Open">Hiring Open</Option>
                                    <Option value="Closed">Hiring Closed</Option>
                                    <Option value="Paused">Paused</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="isReplacement" label="Replacement?" valuePropName="checked">
                                <Select className="h-10 rounded-lg">
                                    <Option value={false}>No (New Position)</Option>
                                    <Option value={true}>Yes (Replacement)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <div className="bg-slate-50 p-4 rounded-xl mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Target Salary Range (CTC)</label>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name={['baseSalaryRange', 'min']} label="Minimum">
                                    <InputNumber className="w-full h-10 rounded-lg" formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['baseSalaryRange', 'max']} label="Maximum">
                                    <InputNumber className="w-full h-10 rounded-lg" formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {!editingId && (
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-4 mb-6">
                            <div className="bg-blue-600 p-2 rounded-lg text-white">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-blue-900 leading-tight">
                                    Next Position ID: <span className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-blue-200">{nextId || 'Loading...'}</span>
                                </div>
                                <div className="text-xs text-blue-700 mt-0.5">Automated sequence based on Company Settings.</div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button size="large" onClick={() => setIsModalOpen(false)} className="rounded-lg px-8">Cancel</Button>
                        <Button
                            type="primary"
                            size="large"
                            htmlType="submit"
                            loading={submitting}
                            className="bg-indigo-600 rounded-lg px-8 border-none"
                        >
                            {editingId ? 'Update Master' : 'Create Position'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default PositionMaster;
