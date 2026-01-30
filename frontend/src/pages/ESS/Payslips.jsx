import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { FileText, Download, Calendar, Eye, X, DollarSign } from 'lucide-react';

export default function Payslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [previewPayslip, setPreviewPayslip] = useState(null);

  useEffect(() => {
    loadMyPayslips();
  }, [selectedYear]);

  async function loadMyPayslips() {
    setLoading(true);
    try {
      const res = await api.get('/payroll/payslips/my');
      setPayslips(res.data?.data || []);
    } catch (err) {
      console.error('Error loading payslips:', err);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF(payslip) {
    try {
      const res = await api.post(`/payroll/payslips/${payslip._id}/generate-pdf`, {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Payslip_${payslip.month}-${payslip.year}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download PDF. Please try again.");
    }
  }

  // Filter by selected year
  const filtered = payslips.filter(p => p.year === selectedYear);

  // Get unique years from payslips
  const availableYears = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a);

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Payslips</h1>
          <p className="text-slate-600 mt-1">View and download your salary payslips</p>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
          >
            {availableYears.length > 0 ? (
              availableYears.map(y => <option key={y} value={y}>{y}</option>)
            ) : (
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            )}
          </select>
        </div>
      </div>

      {/* Payslips Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading your payslips...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Payslips Found</h3>
          <p className="text-slate-600">No payslips available for {selectedYear}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(payslip => (
            <PayslipCard
              key={payslip._id}
              payslip={payslip}
              onPreview={() => setPreviewPayslip(payslip)}
              onDownload={() => downloadPDF(payslip)}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewPayslip && (
        <PayslipPreviewModal
          payslip={previewPayslip}
          onClose={() => setPreviewPayslip(null)}
          onDownload={() => downloadPDF(previewPayslip)}
        />
      )}
    </div>
  );
}

// Payslip Card Component
function PayslipCard({ payslip, onPreview, onDownload }) {
  const monthName = new Date(0, payslip.month - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-white" />
            <h3 className="text-lg font-semibold text-white">{monthName} {payslip.year}</h3>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-medium text-white">Paid</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Gross Earnings */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <span className="text-sm text-slate-600">Gross Earnings</span>
          <span className="text-lg font-semibold text-slate-900">
            ₹{Math.round(payslip.grossEarnings || 0).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Deductions */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <span className="text-sm text-slate-600">Total Deductions</span>
          <span className="text-lg font-semibold text-red-600">
            -₹{Math.round((payslip.preTaxDeductionsTotal || 0) + (payslip.postTaxDeductionsTotal || 0) + (payslip.incomeTax || 0)).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Net Pay */}
        <div className="bg-emerald-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-emerald-900">Net Pay</span>
            <span className="text-2xl font-bold text-emerald-600">
              ₹{Math.round(payslip.netPay || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Generated Date */}
        <div className="text-xs text-slate-500 text-center">
          Generated on {formatDateDDMMYYYY(payslip.generatedAt)}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={onPreview}
          className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Eye className="h-4 w-4" /> Preview
        </button>
        <button
          onClick={onDownload}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="h-4 w-4" /> Download
        </button>
      </div>
    </div>
  );
}

// Preview Modal Component
function PayslipPreviewModal({ payslip, onClose, onDownload }) {
  const monthName = new Date(0, payslip.month - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Payslip - {monthName} {payslip.year}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Payslip Content */}
        <div className="p-8 space-y-6">
          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{payslip.employeeInfo?.name}</h3>
              <p className="text-sm text-slate-600">Employee ID: {payslip.employeeInfo?.employeeId}</p>
              <p className="text-sm text-slate-600">Department: {payslip.employeeInfo?.department}</p>
              <p className="text-sm text-slate-600">Designation: {payslip.employeeInfo?.designation}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">{monthName} {payslip.year}</p>
              <p className="text-sm text-slate-600">Generated: {formatDateDDMMYYYY(payslip.generatedAt)}</p>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Earnings</h4>
            <table className="w-full text-sm">
              <tbody>
                {payslip.earningsSnapshot?.map((e, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{e.name}</td>
                    <td className="py-2 text-right font-medium">₹{Math.round(e.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 text-slate-900">Gross Earnings</td>
                  <td className="py-2 text-right text-slate-900">₹{Math.round(payslip.grossEarnings || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Deductions</h4>
            <table className="w-full text-sm">
              <tbody>
                {payslip.preTaxDeductionsSnapshot?.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{d.name}</td>
                    <td className="py-2 text-right font-medium">₹{Math.round(d.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {payslip.incomeTax > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">Income Tax (TDS)</td>
                    <td className="py-2 text-right font-medium">₹{Math.round(payslip.incomeTax || 0).toLocaleString('en-IN')}</td>
                  </tr>
                )}
                {payslip.postTaxDeductionsSnapshot?.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{d.name}</td>
                    <td className="py-2 text-right font-medium">₹{Math.round(d.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 text-slate-900">Total Deductions</td>
                  <td className="py-2 text-right text-slate-900">
                    ₹{Math.round((payslip.preTaxDeductionsTotal || 0) + (payslip.incomeTax || 0) + (payslip.postTaxDeductionsTotal || 0)).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Pay */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-emerald-900">Net Pay</span>
              <span className="text-2xl font-bold text-emerald-600">₹{Math.round(payslip.netPay || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Attendance Summary */}
          {payslip.attendanceSummary && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Attendance Summary</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Total Days</p>
                  <p className="font-semibold text-slate-900">{payslip.attendanceSummary.totalDays}</p>
                </div>
                <div>
                  <p className="text-slate-600">Present</p>
                  <p className="font-semibold text-emerald-600">{payslip.attendanceSummary.presentDays}</p>
                </div>
                <div>
                  <p className="text-slate-600">Leaves</p>
                  <p className="font-semibold text-blue-600">{payslip.attendanceSummary.leaveDays || 0}</p>
                </div>
                <div>
                  <p className="text-slate-600">LOP Days</p>
                  <p className="font-semibold text-red-600">{payslip.attendanceSummary.lopDays || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
          >
            Close
          </button>
          <button
            onClick={onDownload}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
