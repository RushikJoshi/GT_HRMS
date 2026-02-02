import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, InputNumber, Select, message, Tag, Button, Alert, Space, Divider } from 'antd';
import { AlertCircle, ArrowRight, History, Save, X } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';

const { Option } = Select;

const PayrollCorrectionModal = ({ visible, onCancel, payrollRun }) => {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Correction State
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [correctionType, setCorrectionType] = useState('MANUAL_ADJUSTMENT');
    const [correctionAmount, setCorrectionAmount] = useState(0);
    const [reason, setReason] = useState('');
    const [targetMonth, setTargetMonth] = useState('');

    // Audit History state
    const [existingCorrections, setExistingCorrections] = useState([]);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        if (visible && payrollRun) {
            fetchPayslips();
            fetchExistingCorrections();

            // Default target month is next month
            const nextMonth = dayjs(`${payrollRun.year}-${payrollRun.month}-01`).add(1, 'month').format('YYYY-MM');
            setTargetMonth(nextMonth);

            // Reset form
            setSelectedEmployeeId(null);
            setCorrectionAmount(0);
            setReason('');
        }
    }, [visible, payrollRun]);

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            // Fetch payslips for this run to show original pay
            const res = await api.get(`/payroll/payslips?payrollRunId=${payrollRun._id}`);
            const data = res.data?.data || [];
            setEmployees(data);
        } catch (err) {
            message.error("Failed to load employee list from this payroll run");
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingCorrections = async () => {
        try {
            const res = await api.get(`/payroll/corrections/run/${payrollRun._id}`);
            setExistingCorrections(res.data?.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmitCorrection = async () => {
        if (!selectedEmployeeId) return message.warning("Please select an employee");
        if (correctionAmount === 0) return message.warning("Correction amount cannot be zero");
        if (!reason || reason.trim().length < 5) return message.warning("Please provide a detailed reason (min 5 chars)");

        const employee = employees.find(e => e.employeeId === selectedEmployeeId || e._id === selectedEmployeeId);

        setSubmitting(true);
        try {
            await api.post('/payroll/corrections', {
                employeeId: employee.employeeId?._id || employee.employeeId,
                payrollRunId: payrollRun._id,
                adjustmentMonth: targetMonth,
                adjustmentType: correctionType,
                adjustmentAmount: correctionAmount,
                reason: reason.trim(),
                metadata: {
                    originalGross: employee.grossEarnings,
                    originalNet: employee.netPay,
                    correctedBy: 'Admin'
                }
            });

            message.success("Adjustment scheduled for " + targetMonth);
            fetchExistingCorrections();

            // Reset form
            setSelectedEmployeeId(null);
            setCorrectionAmount(0);
            setReason('');
        } catch (err) {
            message.error(err.response?.data?.message || "Failed to create correction");
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id) => {
        setApproving(true);
        try {
            await api.patch(`/payroll/corrections/${id}/approve`);
            message.success("Adjustment approved");
            fetchExistingCorrections();
        } catch (err) {
            message.error(err.response?.data?.message || "Failed to approve");
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async (id) => {
        Modal.confirm({
            title: 'Reject Adjustment',
            content: (
                <div className="mt-4">
                    <label className="block text-xs font-bold mb-1">Rejection Reason (Required)</label>
                    <Input.TextArea id="rejection_reason" rows={3} />
                </div>
            ),
            okText: 'Reject',
            okType: 'danger',
            onOk: async () => {
                const reason = document.getElementById('rejection_reason').value;
                if (!reason || reason.length < 5) {
                    message.error("Please provide a valid rejection reason");
                    return Promise.reject();
                }
                try {
                    await api.patch(`/payroll/corrections/${id}/reject`, { approvalReason: reason });
                    message.success("Adjustment rejected");
                    fetchExistingCorrections();
                } catch (err) {
                    message.error(err.response?.data?.message || "Failed to reject");
                }
            }
        });
    };
    const getEmployeeName = (record) => {
        return record.employeeInfo?.name || record.employeeId?.name || "Unknown";
    };

    const correctionColumns = [
        {
            title: 'Employee',
            key: 'employee',
            render: (_, record) => (
                <div>
                    <div className="font-medium">{record.employeeId?.firstName} {record.employeeId?.lastName}</div>
                    <div className="text-xs text-gray-500">{record.employeeId?.employeeId}</div>
                </div>
            )
        },
        {
            title: 'Type',
            dataIndex: 'adjustmentType',
            key: 'type',
            render: (type) => <Tag color="blue">{type}</Tag>
        },
        {
            title: 'Amount',
            dataIndex: 'adjustmentAmount',
            key: 'amount',
            render: (amt) => (
                <span className={amt >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {amt >= 0 ? '+' : ''}₹{amt.toLocaleString()}
                </span>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'gold';
                if (status === 'APPLIED') color = 'green';
                if (status === 'APPROVED') color = 'cyan';
                if (status === 'REJECTED') color = 'red';
                if (status === 'CANCELLED') color = 'default';
                return <Tag color={color}>{status.replace('_', ' ')}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.status === 'PENDING_APPROVAL' && (
                        <>
                            <Button size="small" type="primary" ghost onClick={() => handleApprove(record._id)} loading={approving}>Approve</Button>
                            <Button size="small" danger ghost onClick={() => handleReject(record._id)}>Reject</Button>
                        </>
                    )}
                </Space>
            )
        }
    ];

    return (
        <Modal
            title={<div className="flex items-center gap-2"><History className="w-5 h-5 text-blue-600" /> Payroll Correction — {dayjs(new Date(0, payrollRun?.month - 1)).format('MMMM')} {payrollRun?.year}</div>}
            open={visible}
            onCancel={onCancel}
            footer={[
                <Button key="close" onClick={onCancel}>Close</Button>
            ]}
            width={1000}
            className="top-5"
        >
            <div className="space-y-6 py-2">
                <Alert
                    message="Safe Correction Policy"
                    description="History remains untouched. Any corrections added here will be applied as an adjustment in the NEXT payroll cycle."
                    type="info"
                    showIcon
                    icon={<AlertCircle className="w-4 h-4" />}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Selection & Form */}
                    <div className="md:col-span-1 border-r pr-6 space-y-4">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2">
                            <Save className="w-4 h-4" /> New Adjustment
                        </h4>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Employee</label>
                            <Select
                                className="w-full"
                                placeholder="Choose employee..."
                                value={selectedEmployeeId}
                                onChange={setSelectedEmployeeId}
                                showSearch
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {employees.map(emp => (
                                    <Option key={emp._id} value={emp._id}>
                                        {getEmployeeName(emp)} (Net: ₹{emp.netPay?.toLocaleString()})
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {selectedEmployeeId && (
                            <div className="bg-gray-50 p-3 rounded-lg border text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Original Gross:</span>
                                    <span className="font-bold">₹{employees.find(e => e._id === selectedEmployeeId)?.grossEarnings?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Original Net:</span>
                                    <span className="font-bold">₹{employees.find(e => e._id === selectedEmployeeId)?.netPay?.toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correction Type</label>
                            <Select className="w-full" value={correctionType} onChange={setCorrectionType}>
                                <Option value="ATTENDANCE_CORRECTION">Attendance Correction</Option>
                                <Option value="ALLOWANCE_MISSED">Allowance Missed</Option>
                                <Option value="ALLOWANCE_EXTRA_RECOVERY">Extra Allowance Recovery</Option>
                                <Option value="DEDUCTION_ERROR">Deduction Error</Option>
                                <Option value="SALARY_INCREMENT_BACKDATED">Backdated Increment Arrear</Option>
                                <Option value="MANUAL_ADJUSTMENT">Manual Adjustment</Option>
                                <Option value="OTHER">Other</Option>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adjustment Amount (+/-)</label>
                            <InputNumber
                                className="w-full"
                                placeholder="0.00"
                                value={correctionAmount}
                                onChange={setCorrectionAmount}
                                formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Note: Negative values will be deducted from next net pay.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mandatory Reason</label>
                            <Input.TextArea
                                placeholder="Why is this correction needed?"
                                rows={3}
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payout Month</label>
                            <Input
                                value={targetMonth}
                                onChange={e => setTargetMonth(e.target.value)}
                                placeholder="YYYY-MM"
                            />
                        </div>

                        <Button
                            type="primary"
                            block
                            onClick={handleSubmitCorrection}
                            loading={submitting}
                            disabled={!selectedEmployeeId}
                        >
                            Schedule Adjustment
                        </Button>
                    </div>

                    {/* Right: History of this run */}
                    <div className="md:col-span-2 space-y-4">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2">
                            <History className="w-4 h-4" /> Correction Audit Log
                        </h4>

                        <Table
                            dataSource={existingCorrections}
                            columns={correctionColumns}
                            rowKey="_id"
                            size="small"
                            pagination={{ pageSize: 5 }}
                            locale={{ emptyText: 'No corrections found for this payroll run.' }}
                        />

                        {existingCorrections.length > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-xs text-blue-700">
                                    <strong>Impact:</strong> These adjustments will appear automatically when you run payroll for the respective scheduled months. Original payslips for {dayjs(new Date(0, payrollRun?.month - 1)).format('MMMM')} remain locked and untouched.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PayrollCorrectionModal;
