import React, { useState, useRef } from 'react';
import api, { API_ROOT } from '../../utils/api';
import { Upload, Download, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const BACKEND_URL = API_ROOT || 'https://hrms.gitakshmi.com';

export default function EmployeeExcelUploadModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Handle Template Download
  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const res = await api.get('/hr/bulk/template', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Employee_Template_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download failed:', err);
      alert('❌ Failed to download template. Please try again.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadErrors(['Please select a file to upload']);
      setUploadedFile(null);
      return;
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    const validExtensions = /\.(xlsx|xls|csv)$/i;

    if (!validExtensions.test(file.name) && !validTypes.includes(file.type)) {
      setUploadErrors(['Invalid file format. Please upload .xlsx, .xls, or .csv file']);
      setUploadedFile(null);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadErrors(['File size exceeds 5MB limit']);
      setUploadedFile(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          setUploadErrors(['Excel file is empty. Please add employee records.']);
          setUploadedFile(null);
          return;
        }

        if (jsonData.length > 1000) {
          setUploadErrors(['File contains more than 1000 records. Please split into multiple files.']);
          setUploadedFile(null);
          return;
        }

        setUploadErrors([]);
        setUploadedFile(file);

        // Prepare preview data (first 10 rows)
        const previewData = jsonData.slice(0, 10);

        setUploadedData({
          fileName: file.name,
          rowCount: jsonData.length,
          previewData: previewData,
          allData: jsonData
        });

        setShowUploadPreview(true);
      } catch (err) {
        console.error('File parsing error:', err);
        setUploadErrors(['Failed to read file. Make sure it is a valid Excel file.']);
        setUploadedFile(null);
      }
    };

    reader.onerror = () => {
      setUploadErrors(['Failed to read the file']);
      setUploadedFile(null);
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Upload Confirmation
  const handleSubmitUpload = async () => {
    if (!uploadedData) return;

    try {
      setUploading(true);

      const payload = {
        records: uploadedData.allData
      };

      const res = await api.post('/hr/bulk/upload', payload);

      if (res.data.success) {
        // Success
        alert(
          `✅ Upload Successful\n\n` +
          `Uploaded: ${res.data.uploadedCount} employees\n` +
          `Failed: ${res.data.failedCount} records\n\n` +
          (res.data.warnings.length > 0
            ? `⚠️ Warnings:\n${res.data.warnings.slice(0, 5).join('\n')}${res.data.warnings.length > 5 ? `\n... and ${res.data.warnings.length - 5} more` : ''}`
            : '')
        );

        // Reset state
        setUploadedFile(null);
        setUploadPreview([]);
        setUploadErrors([]);
        setUploadedData(null);
        setShowUploadPreview(false);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Call success callback
        if (onSuccess) onSuccess(res.data);
      } else {
        setUploadErrors([res.data.message || 'Upload failed']);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      setUploadErrors([errorMessage || 'Failed to upload employees']);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 p-6 border-b border-blue-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Bulk Add Employees</h3>
              <p className="text-xs text-blue-100 mt-1 font-bold">Import employee data from Excel file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-xl transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Download Section */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg">
                  <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Download Excel Template</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Get the template with all required columns and examples</p>
                </div>
              </div>
              <button
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm uppercase tracking-widest transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {downloadingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          <div>
            {!uploadedFile ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="employee-file-upload"
                />
                <label htmlFor="employee-file-upload" className="block cursor-pointer">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer group">
                    <div className="flex justify-center mb-4">
                      <Upload className="w-12 h-12 text-slate-400 group-hover:text-blue-500 transition" />
                    </div>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-widest">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      Supports: Excel (.xlsx, .xls) and CSV files • Max 5MB • Max 1000 records
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <span className="text-lg">📄</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                      {(uploadedFile.size / 1024).toFixed(2)} KB • {uploadedData?.rowCount} records
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadPreview([]);
                    setUploadErrors([]);
                    setUploadedData(null);
                    setShowUploadPreview(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition text-slate-600 dark:text-slate-400"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Error Messages */}
          {uploadErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
              <p className="text-xs font-black text-red-700 dark:text-red-300 uppercase tracking-widest mb-2">❌ Errors</p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                {uploadErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
                {uploadErrors.length > 5 && <li>... and {uploadErrors.length - 5} more errors</li>}
              </ul>
            </div>
          )}

          {/* Preview Modal */}
          {showUploadPreview && uploadedData && (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Preview Data</h4>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    File: {uploadedData.fileName} • Total Records: {uploadedData.rowCount}
                  </p>
                </div>
              </div>

              {uploadedData.previewData.length > 0 ? (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        {Object.keys(uploadedData.previewData[0]).map((header, idx) => (
                          <th key={idx} className="px-3 py-2 text-left font-black text-slate-700 dark:text-slate-300">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedData.previewData.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">
                          {Object.values(row).map((val, colIdx) => (
                            <td key={colIdx} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                              {val || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">No preview data available</p>
              )}
            </div>
          )}

          {/* Required Columns Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
              <span className="block font-black mb-2">📝 Required Columns:</span>
              Your Excel file must have these columns: <strong>Employee ID</strong>, <strong>First Name</strong>, <strong>Last Name</strong>, <strong>Email</strong>, <strong>Joining Date</strong>
              <br />
              <span className="block font-black mt-2">💡 Optional Columns:</span>
              Middle Name, Contact No, Gender, Date of Birth, Department, Role, Job Type, Bank Details, Address fields, and more
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitUpload}
            disabled={!uploadedFile || uploading || uploadErrors.length > 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Records
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
