import React, { useState, useEffect } from 'react';
import { Table, message, Select, Checkbox, Button, DatePicker, Tag, Tooltip, Drawer, Statistic, Row, Col, Space, Modal, Descriptions, Avatar, Progress, Card, Divider, Empty, Spin, Popconfirm } from 'antd';
import { PlayCircle, Calculator, FileText, AlertCircle, IndianRupee, Calendar, Eye, CheckCircle, Download, FileJson, AlertTriangle, Zap } from 'lucide-react';
import api from '../../../utils/api';
import dayjs from 'dayjs';

const { Option } = Select;

const ProcessPayroll = () => {
    const [month, setMonth] = useState(dayjs());
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [previews, setPreviews] = useState({}); // { empId: { gross, net, error, source } }

    // Merged States
    const [detailDrawer, setDetailDrawer] = useState({ visible: false, empId: null });
    const [detailData, setDetailData] = useState(null);
    const [payrollRunning, setPayrollRunning] = useState(false);
    const [payrollResult, setPayrollResult] = useState(null);

    // ✅ NEW: Compensation Source Toggle
    const [useCompensation, setUseCompensation] = useState(false);

    // Toast
    const [messageApi, contextHolder] = message.useMessage();

    // Fetch Templates on Mount
    useEffect(() => {
        api.get('/payroll/salary-templates')
            .then(res => setTemplates(res.data?.data || []))
            .catch(err => console.error("Failed templates", err));
    }, []);

    // Fetch Employees when month changes
    useEffect(() => {
        if (!month) return;
        fetchEmployees();
        setPreviews({});
        setSelectedRowKeys([]);
    }, [month]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const mStr = month.format('YYYY-MM');
            const res = await api.get(`/payroll/process/employees?month=${mStr}`);
            setEmployees(res.data.data.map(e => ({
                ...e,
                key: e._id,
                // Default to assigned template, or none
                selectedTemplateId: e.salaryTemplateId
            })));
        } catch (err) {
            messageApi.error(err.response?.data?.message || "Failed to fetch employees");
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateChange = (empId, val) => {
        setEmployees(prev => prev.map(e => e._id === empId ? { ...e, selectedTemplateId: val } : e));
        setPreviews(prev => {
            const next = { ...prev };
            delete next[empId];
            return next;
        });
    };

    const calculatePreview = async () => {
        // ✅ NEW: Support compensation source
        const itemsToPreview = employees
            .filter(e => selectedRowKeys.includes(e._id))
            .filter(e => {
                if (useCompensation) {
                    // For compensation, we just need the employee to exist
                    return true;
                } else {
                    // For template, require selectedTemplateId
                    return e.selectedTemplateId;
                }
            })
            .map(e => ({
                employeeId: e._id,
                ...(useCompensation ? { useCompensation: true } : { salaryTemplateId: e.selectedTemplateId })
            }));

        if (itemsToPreview.length === 0) {
            const msg = useCompensation
                ? "Select at least one employee to preview compensation"
                : "Select employees with templates assigned to preview";
            messageApi.warning(msg);
            return;
        }

        setCalculating(true);
        try {
            const res = await api.post('/payroll/process/preview', {
                month: month.format('YYYY-MM'),
                items: itemsToPreview,
                useCompensation // ✅ Pass flag
            });

            console.log('Preview Response:', res.data.data);

            const newPreviews = {};
            res.data.data.forEach(p => {
                newPreviews[p.employeeId] = p;
            });
            setPreviews(newPreviews);
            const sourceLabel = useCompensation ? 'compensation' : 'template';
            messageApi.success(`Calculated successfully for ${itemsToPreview.length} employee(s) using ${sourceLabel}`);
        } catch (err) {
            console.error('Calculation Error:', err);
            messageApi.error(err.response?.data?.message || "Calculation failed");
        } finally {
            setCalculating(false);
        }
    };

    const fetchPreviewForEmployee = async (emp) => {
        // ✅ NEW: Support compensation source
        if (!useCompensation && !emp.selectedTemplateId) {
            messageApi.warning('Select a template for this employee first');
            return;
        }

        try {
            const payload = {
                month: month.format('YYYY-MM'),
                items: [
                    {
                        employeeId: emp._id,
                        ...(useCompensation ? { useCompensation: true } : { salaryTemplateId: emp.selectedTemplateId })
                    }
                ],
                useCompensation
            };

            const res = await api.post('/payroll/process/preview', payload);

            const p = res.data.data && res.data.data[0];
            setPreviews(prev => ({ ...prev, [emp._id]: p }));
            setDetailData(p);
            setDetailDrawer({ visible: true, empId: emp._id });
        } catch (err) {
            messageApi.error('Failed to fetch preview');
        }
    };

    const runPayroll = async () => {
        // ✅ NEW: Support compensation source
        const itemsToProcess = employees
            .filter(e => selectedRowKeys.includes(e._id))
            .filter(e => {
                if (useCompensation) {
                    return true; // All employees can use compensation
                } else {
                    return e.selectedTemplateId; // Template source requires template
                }
            })
            .map(e => ({
                employeeId: e._id,
                ...(useCompensation ? { useCompensation: true } : { salaryTemplateId: e.selectedTemplateId })
            }));

        if (itemsToProcess.length === 0) {
            messageApi.error("No valid employees selected");
            return;
        }

        const sourceLabel = useCompensation ? 'Employee Compensation' : 'Salary Template';
        if (!window.confirm(
            `Are you sure you want to process payroll for ${itemsToProcess.length} employees using ${sourceLabel} for ${month.format('MMMM YYYY')}?`
        )) return;

        setPayrollRunning(true);
        try {
            const response = await api.post('/payroll/process/run', {
                month: month.format('YYYY-MM'),
                items: itemsToProcess,
                useCompensation // ✅ Pass flag
            });

            const result = response.data.data;
            setPayrollResult(result);
            setSelectedRowKeys([]);
            setPreviews({});

            messageApi.success(`Payroll processed successfully! ${result.processedEmployees} employees processed using ${sourceLabel}.`);

            // Refresh employee list
            await fetchEmployees();
        } catch (err) {
            messageApi.error(err.response?.data?.message || "Payroll run failed");
            console.error("Payroll error:", err);
        } finally {
            setPayrollRunning(false);
        }
    };

    const columns = [
        {
            title: 'Employee',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="flex items-center gap-3">
                    <Avatar size={36} style={{ backgroundColor: '#f0f2f5' }}>{(record.firstName || record.name || '').charAt(0)}</Avatar>
                    <div>
                        <div className="font-medium text-slate-800">{text}</div>
                        <div className="text-xs text-slate-500">{record.department} • {record.employeeId || ''}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Attendance',
            key: 'attendance',
            render: (_, record) => (
                <div className="text-xs">
                    <div>Present: <span className="font-bold text-green-600">{record.attendanceParams?.presentDays}</span> / {record.attendanceParams?.totalDays}</div>
                    {record.attendanceParams?.presentDays === 0 && <Tag color="red" className="mt-1">High Absenteeism</Tag>}
                </div>
            )
        },
        {
            title: 'Salary Template',
            key: 'template',
            // ✅ NEW: Hide when using compensation
            hidden: useCompensation,
            render: (_, record) => (
                <Select
                    className="w-48"
                    placeholder="Select Template"
                    value={record.selectedTemplateId}
                    onChange={(val) => handleTemplateChange(record._id, val)}
                    status={!record.selectedTemplateId ? 'error' : ''}
                    disabled={useCompensation} // ✅ Disable when compensation is ON
                    options={templates.map(t => ({
                        value: t._id,
                        label: `${t.templateName} (₹${t.annualCTC?.toLocaleString()})`
                    }))}
                />
            )
        },
        {
            title: 'Preview (Net Pay)',
            key: 'preview',
            width: 250,
            render: (_, record) => {
                const prev = previews[record._id];
                if (!prev) {
                    return (
                        <Tooltip title="Select this employee and click 'Calculate Preview' to see salary details">
                            <span className="text-slate-400 italic text-xs">--</span>
                        </Tooltip>
                    );
                }
                if (prev.error) return (
                    <Tooltip title={prev.error}>
                        <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-600">Error</span>
                        </div>
                    </Tooltip>
                );
                return (
                    <div className="space-y-1 bg-emerald-50 p-2 rounded">
                        {/* ✅ NEW: Show compensation source badge */}
                        {prev.compensationSource && (
                            <div className="flex items-center gap-1 mb-1">
                                {prev.isLegacyFallback ? (
                                    <Tag color="orange">ACTIVE (LEGACY)</Tag>
                                ) : prev.compensationSource === 'EMPLOYEE_CTC_VERSION' ? (
                                    <Tag color="blue">ACTIVE (CTC)</Tag>
                                ) : (
                                    <Tag color="cyan">{prev.compensationSource.toUpperCase()}</Tag>
                                )}
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">Basic:</span>
                            <span className="font-mono font-semibold text-slate-800">₹{Math.round(prev.gross || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">Net Pay:</span>
                            <span className="font-mono font-bold text-emerald-700">₹{Math.round(prev.net || 0).toLocaleString()}</span>
                        </div>
                        <Button
                            size="small"
                            type="text"
                            onClick={() => {
                                setDetailData(prev);
                                setDetailDrawer({ visible: true, empId: record._id });
                            }}
                            icon={<Eye size={14} />}
                            className="mt-1 text-blue-600 hover:text-blue-700 h-6"
                        >
                            Details
                        </Button>
                    </div>
                );
            }
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                // ✅ NEW: Show compensation status
                if (useCompensation) {
                    return <Tag color="cyan">ACTIVE COMPENSATION</Tag>;
                }
                if (!record.selectedTemplateId) return <Tag color="warning">Missing Template</Tag>;
                return <Tag color="blue">Ready</Tag>;
            }
        }
    ];

    const rowSelection = React.useMemo(() => ({
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    }), [selectedRowKeys]);

    // ✅ NEW: Filter columns based on compensation toggle
    const memoColumns = React.useMemo(() => {
        return columns.filter(col => {
            // Hide template column when using compensation
            if (useCompensation && col.key === 'template') {
                return false;
            }
            return true;
        });
    }, [templates, previews, useCompensation]);

    return (
        <div className="w-full px-4 py-4 space-y-4">
            {contextHolder}
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-600" />
                        Process Payroll
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">Calculate and generate payslips for a specific month.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* ✅ NEW: Compensation Source Toggle */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="text-xs font-medium text-slate-700">
                            Use Employee Compensation
                        </label>
                        <Checkbox
                            checked={useCompensation}
                            onChange={(e) => {
                                setUseCompensation(e.target.checked);
                                setPreviews({});
                                setSelectedRowKeys([]);
                                messageApi.info(
                                    e.target.checked
                                        ? 'Switched to Employee Compensation source'
                                        : 'Switched to Salary Template source'
                                );
                            }}
                        />
                    </div>
                    <DatePicker
                        picker="month"
                        value={month}
                        onChange={setMonth}
                        format="MMMM YYYY"
                        allowClear={false}
                        className="w-40"
                        size="small"
                    />
                </div>
            </div>

            {/* Main Table Area */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700 text-sm">Employee List ({employees.length})</h3>
                    <div className="flex gap-3 items-center">
                        <Space size="small">
                            <Button
                                icon={<IndianRupee size={14} />}
                                onClick={calculatePreview}
                                loading={calculating}
                                disabled={selectedRowKeys.length === 0}
                                size="small"
                            >
                                Calculate Preview
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlayCircle size={14} />}
                                onClick={runPayroll}
                                loading={payrollRunning}
                                disabled={selectedRowKeys.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700"
                                size="small"
                            >
                                Run Payroll
                            </Button>
                        </Space>
                        <div className="ml-3 flex items-center gap-2">
                            <Tag color="blue" className="text-xs">Selected: {selectedRowKeys.length}</Tag>
                            <Tag color="green" className="text-xs">Previews: {Object.keys(previews).length}</Tag>
                        </div>
                    </div>
                </div>

                <Table
                    rowSelection={rowSelection}
                    columns={memoColumns}
                    dataSource={employees}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 50, size: 'small' }}
                    size="small"
                />
            </div>

            {/* Payroll Result Modal */}
            <Modal
                title={`Payroll Run Results — ${month.format('MMMM YYYY')}`}
                open={!!payrollResult}
                onCancel={() => setPayrollResult(null)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setPayrollResult(null)}>
                        Close
                    </Button>
                ]}
                width={800}
            >
                {payrollResult && (
                    <div className="space-y-6">
                        <Row gutter={24}>
                            <Col span={8}>
                                <Card className="text-center">
                                    <Statistic
                                        title="Total Employees"
                                        value={payrollResult.totalEmployees || 0}
                                        prefix={<Calculator size={16} />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card className="text-center">
                                    <Statistic
                                        title="Processed"
                                        value={payrollResult.processedEmployees || 0}
                                        suffix={<CheckCircle size={16} className="text-green-600" />}
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card className="text-center">
                                    <Statistic
                                        title="Failed"
                                        value={payrollResult.failedEmployees || 0}
                                        suffix={payrollResult.failedEmployees > 0 ? <AlertTriangle size={16} className="text-red-600" /> : ''}
                                        valueStyle={{ color: payrollResult.failedEmployees > 0 ? '#ff4d4f' : '#1890ff' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <Divider />

                        <Row gutter={24}>
                            <Col span={12}>
                                <Card>
                                    <Statistic
                                        title="Total Gross Earnings"
                                        value={Math.round(payrollResult.totalGross || 0)}
                                        prefix="₹"
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card>
                                    <Statistic
                                        title="Total Net Payable"
                                        value={Math.round(payrollResult.totalNetPay || 0)}
                                        prefix="₹"
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        {payrollResult.errors && payrollResult.errors.length > 0 && (
                            <>
                                <Divider />
                                <Card className="bg-red-50 border-red-300">
                                    <h4 className="font-semibold text-red-800 mb-3">Processing Errors</h4>
                                    <div className="space-y-2">
                                        {payrollResult.errors.map((err, idx) => (
                                            <div key={idx} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                                                <strong>Employee:</strong> {err.employeeId} — {err.message}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                )}
            </Modal>

            {/* Payslip Preview Drawer */}
            <Drawer
                width={720}
                title={detailData ? `Payslip Preview — ${detailData.employeeInfo?.employeeId || ''}` : 'Payslip Preview'}
                placement="right"
                onClose={() => { setDetailDrawer({ visible: false, empId: null }); setDetailData(null); }}
                open={detailDrawer.visible}
            >
                {detailData ? (
                    <Spin spinning={false} className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-lg mb-3">Employee Details</h4>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Employee ID">{detailData.employeeInfo?.employeeId || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Name">{detailData.employeeInfo?.name || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Department">{detailData.employeeInfo?.department || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Designation">{detailData.employeeInfo?.designation || '--'}</Descriptions.Item>
                            </Descriptions>
                        </div>
                        <Divider />
                        <Row gutter={16}>
                            <Col span={12}>
                                <Card className="text-center">
                                    <Statistic title="Gross Earnings" value={Math.round(detailData.grossEarnings || 0)} prefix="₹" valueStyle={{ color: '#1890ff' }} />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card className="text-center">
                                    <Statistic title="Net Pay" value={Math.round(detailData.netPay || 0)} prefix="₹" valueStyle={{ color: '#52c41a' }} />
                                </Card>
                            </Col>
                        </Row>
                        <div>
                            <h4 className="font-semibold mb-3">Earnings</h4>
                            {detailData.earningsSnapshot && detailData.earningsSnapshot.length > 0 ? (
                                <Table size="small" dataSource={detailData.earningsSnapshot} pagination={false} rowKey={(r, i) => `${r.name}-${i}`} columns={[{ title: 'Component', dataIndex: 'name', width: '60%' }, { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }]} />
                            ) : <Empty description="No earnings data" />}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Pre-Tax Deductions</h4>
                            {detailData.preTaxDeductionsSnapshot && detailData.preTaxDeductionsSnapshot.length > 0 ? (
                                <Table size="small" dataSource={detailData.preTaxDeductionsSnapshot} pagination={false} rowKey={(r, i) => `pre-${r.name || i}`} columns={[{ title: 'Name', dataIndex: 'name', width: '60%' }, { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }]} />
                            ) : <Empty description="No pre-tax deductions" />}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Taxable Income & Tax</h4>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Taxable Income">₹{(detailData.taxableIncome || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Income Tax (TDS)">₹{(detailData.incomeTax || 0).toLocaleString()}</Descriptions.Item>
                            </Descriptions>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Post-Tax Deductions</h4>
                            {detailData.postTaxDeductionsSnapshot && detailData.postTaxDeductionsSnapshot.length > 0 ? (
                                <Table size="small" dataSource={detailData.postTaxDeductionsSnapshot} pagination={false} rowKey={(r, i) => `post-${r.name || i}`} columns={[{ title: 'Name', dataIndex: 'name', width: '60%' }, { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }]} />
                            ) : <Empty description="No post-tax deductions" />}
                        </div>
                        {detailData.employerContributionsSnapshot && detailData.employerContributionsSnapshot.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-3">Employer Contributions</h4>
                                <Table
                                    size="small"
                                    dataSource={detailData.employerContributionsSnapshot}
                                    pagination={false}
                                    rowKey={(r, i) => `employer-${r.name || i}`}
                                    columns={[
                                        { title: 'Name', dataIndex: 'name', width: '60%' },
                                        { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }
                                    ]}
                                />
                            </div>
                        )}
                    </Spin>
                ) : <Empty description="No preview available" />}
            </Drawer>
        </div>
    );
};

export default ProcessPayroll;
