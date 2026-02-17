import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Tag, Space, Popconfirm } from 'antd';
import { Plus, Edit, Trash2, Settings, List } from 'lucide-react';
import api from '../../utils/api';

const { Option } = Select;

export default function CustomFieldConfig() {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();
    const [fieldType, setFieldType] = useState('text');

    useEffect(() => {
        fetchFields();
    }, []);

    const fetchFields = async () => {
        try {
            setLoading(true);
            const res = await api.get('/hrms/custom-fields');
            setFields(res.data);
        } catch (err) {
            message.error('Failed to load custom fields');
        } finally {
            setLoading(false);
        }
    };

    const handleData = async (values) => {
        try {
            // Auto-generate key if new
            if (!editingId && !values.key) {
                values.key = values.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
            }

            if (editingId) {
                await api.put(`/hrms/custom-fields/${editingId}`, values);
                message.success('Field updated successfully');
            } else {
                await api.post('/hrms/custom-fields', values);
                message.success('Field created successfully');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingId(null);
            fetchFields();
        } catch (err) {
            message.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/hrms/custom-fields/${id}`);
            message.success('Field deactivated');
            fetchFields();
        } catch (err) {
            message.error('Delete failed');
        }
    };

    const columns = [
        {
            title: 'Label',
            dataIndex: 'label',
            key: 'label',
            render: (text, record) => (
                <div>
                    <div className="font-semibold text-slate-700">{text}</div>
                    <div className="text-xs text-slate-400 font-mono">{record.key}</div>
                </div>
            )
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color="blue">{type.toUpperCase()}</Tag>
        },
        {
            title: 'Options',
            dataIndex: 'options',
            key: 'options',
            render: (opts) => (
                <div className="flex flex-wrap gap-1">
                    {opts && opts.slice(0, 3).map(o => <Tag key={o}>{o}</Tag>)}
                    {opts && opts.length > 3 && <Tag>+{opts.length - 3}</Tag>}
                </div>
            )
        },
        {
            title: 'Required',
            dataIndex: 'isRequired',
            key: 'required',
            render: (bool) => bool ? <Tag color="red">Yes</Tag> : <Tag>No</Tag>
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<Edit size={14} />}
                        size="small"
                        onClick={() => {
                            setEditingId(record._id);
                            form.setFieldsValue(record);
                            setFieldType(record.type);
                            setIsModalOpen(true);
                        }}
                    />
                    <Popconfirm title="Deactivate field?" onConfirm={() => handleDelete(record._id)}>
                        <Button icon={<Trash2 size={14} />} size="small" danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings className="text-indigo-600" />
                        Custom Fields Configuration
                    </h2>
                    <p className="text-slate-500 text-sm">Manage dynamic fields for Job Requirements</p>
                </div>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => {
                    setEditingId(null);
                    form.resetFields();
                    setIsModalOpen(true);
                }}>
                    Add Field
                </Button>
            </div>

            <Table
                dataSource={fields}
                columns={columns}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingId ? "Edit Field" : "Create New Field"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                className="custom-modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleData}
                    initialValues={{ type: 'text', isRequired: false, isPublic: true }}
                >
                    <Form.Item name="label" label="Field Label" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Budget Code" />
                    </Form.Item>

                    {!editingId && (
                        <Form.Item name="key" label="Unique Key" extra="Auto-generated if left blank (e.g. budget_code)" rules={[{ pattern: /^[a-zA-Z0-9_]+$/, message: 'Only alphanumeric and _ allowed' }]}>
                            <Input placeholder="optional_manual_key" />
                        </Form.Item>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="type" label="Input Type">
                            <Select onChange={setFieldType}>
                                <Option value="text">Text (Single Line)</Option>
                                <Option value="textarea">Textarea</Option>
                                <Option value="number">Number</Option>
                                <Option value="date">Date</Option>
                                <Option value="dropdown">Dropdown</Option>
                                <Option value="multiSelect">Multi Select</Option>
                                <Option value="checkbox">Checkbox (Yes/No)</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="section" label="Section">
                            <Select>
                                <Option value="Additional Specifications">Additional Specifications</Option>
                                <Option value="Candidate Info">Candidate Info</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    {(fieldType === 'dropdown' || fieldType === 'multiSelect') && (
                        <Form.Item
                            name="options"
                            label="Options"
                            tooltip="Type option and press Enter"
                            rules={[{ required: true, message: 'Please add at least one option' }]}
                        >
                            <Select mode="tags" placeholder="Type options..." tokenSeparators={[',']} />
                        </Form.Item>
                    )}

                    <div className="flex gap-8 mb-4">
                        <Form.Item name="isRequired" valuePropName="checked" label="Mandatory?">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="isPublic" valuePropName="checked" label="Show on Career Page?">
                            <Switch />
                        </Form.Item>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit">Save Configuration</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
