import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { FileText, Download, Calendar, Eye, X, Check, Search } from 'lucide-react';

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

  if (loading) return (
    <div className="h-[calc(100vh-7rem)] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-7rem)] w-full bg-white overflow-hidden flex flex-col animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="px-6 py-4 flex-shrink-0 flex items-center justify-end">
        {/* Year Filter */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest hidden sm:inline-block">Filter Year</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={14} />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="pl-9 pr-8 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#111827] focus:ring-1 focus:ring-[#14B8A6] outline-none shadow-sm appearance-none cursor-pointer hover:bg-[#F9FAFB] transition-colors"
            >
              {availableYears.length > 0 ? (
                availableYears.map(y => <option key={y} value={y}>{y}</option>)
              ) : (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Payslips Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <div className="p-4 bg-white rounded-full border border-slate-200 mb-4 shadow-sm">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">No payslips available for {selectedYear}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
      </div>

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
    <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E5E7EB] flex justify-between items-center bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-[#E5E7EB] rounded-lg text-[#14B8A6]">
            <FileText size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">{monthName}</h3>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{payslip.year}</p>
          </div>
        </div>
        <div className="bg-[#ECFDF5] border border-[#D1FAE5] px-2 py-1 rounded-md">
          <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider flex items-center gap-1">
            <Check size={10} strokeWidth={3} /> Paid
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1">
        <div className="flex justify-between items-end mb-4">
          <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Net Pay</div>
          <div className="text-xl font-black text-[#111827]">₹ {payslip.totals?.netSalary?.toLocaleString()}</div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[#6B7280]">
            <span>Basic</span>
            <span className="font-medium text-[#374151]">₹ {payslip.earnings?.find(e => e.label === 'Basic Salary')?.amount?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between text-xs text-[#6B7280]">
            <span>Deductions</span>
            <span className="font-medium text-[#EF4444]">- ₹ {payslip.totals?.totalDeductions?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-3 pb-3 pt-0 flex gap-2">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111827] hover:border-[#D1D5DB] transition-all"
        >
          <Eye size={14} /> Preview
        </button>
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-bold text-[#0F766E] hover:bg-[#E6FFFA] hover:border-[#99F6E4] hover:shadow-sm transition-all"
        >
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  );
}

// Modal Component
function PayslipPreviewModal({ payslip, onClose, onDownload }) {
  useEffect(() => {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    return () => document.body.style.overflow = 'unset';
  }, []);

  const monthName = new Date(0, payslip.month - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#14B8A6]">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">Payslip Preview</h2>
              <p className="text-xs font-medium text-[#6B7280]">{monthName}, {payslip.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-teal-500/20"
            >
              <Download size={16} /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content - Payslip Detail */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
          <div className="max-w-3xl mx-auto bg-white shadow-xl shadow-slate-200/50 rounded-none min-h-[800px] p-12 relative print-container">
            {/* Payslip Header */}
            <div className="flex flex-col items-center mb-12 border-b-2 border-slate-100 pb-8">
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-1">Global Tech</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Hiring & Staffing Solutions</p>
            </div>

            <div className="text-center mb-10">
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide border inline-block px-6 py-2 rounded-lg border-slate-200 bg-slate-50">Payslip</h2>
              <p className="text-sm font-bold text-slate-500 mt-2">{monthName} {payslip.year}</p>
            </div>

            {/* Employee Info Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-10 text-sm">
              <div>
                < p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee Name</p>
                <p className="font-bold text-slate-700">{payslip.employeeId?.name || "Name Unavailable"}</p>
              </div>
              <div className="text-right">
                < p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee ID</p>
                <p className="font-bold text-slate-700">#{payslip.employeeId?.employeeId || "0000"}</p>
              </div>
              <div>
                < p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                <p className="font-bold text-slate-700">{payslip.employeeId?.department || "General"}</p>
              </div>
              <div className="text-right">
                < p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Designation</p>
                <p className="font-bold text-slate-700">{payslip.employeeId?.designation || "Employee"}</p>
              </div>
            </div>

            {/* Earnings & Deductions Table */}
            <div className="grid grid-cols-2 border border-slate-200 mb-8">
              {/* Earnings Col */}
              <div className="border-r border-slate-200">
                <div className="bg-emerald-50/50 p-3 border-b border-slate-200">
                  <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest">Earnings</h3>
                </div>
                <div className="p-4 space-y-3">
                  {payslip.earnings?.map((e, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">{e.label}</span>
                      <span className="text-slate-800 font-bold">₹ {e.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Col */}
              <div>
                <div className="bg-rose-50/50 p-3 border-b border-slate-200">
                  <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest">Deductions</h3>
                </div>
                <div className="p-4 space-y-3">
                  {payslip.deductions?.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">{d.label}</span>
                      <span className="text-slate-800 font-bold">₹ {d.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex items-center justify-between bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Net Payable Salary</p>
                <h3 className="text-3xl font-black text-slate-800">₹ {payslip.totals?.netSalary?.toLocaleString()}</h3>
                <p className="text-xs font-bold text-slate-400 italic mt-1">*(Total Earnings - Total Deductions)</p>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xs font-bold text-slate-500">Gross Earnings: <span className="text-emerald-600">₹ {payslip.totals?.totalEarnings?.toLocaleString()}</span></div>
                <div className="text-xs font-bold text-slate-500">Total Deductions: <span className="text-rose-600">₹ {payslip.totals?.totalDeductions?.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="text-center mt-20">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">This is a system generated slip</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
