import React, { useState, useRef } from 'react';
import api, { API_ROOT } from '../../utils/api';
import { Upload, Download, X, AlertCircle, CheckCircle, Loader2, Info, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const BACKEND_URL = API_ROOT || 'https://hrms.gitakshmi.com';

// Validation rules for required columns
const REQUIRED_COLUMNS = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Joining Date'];
const OPTIONAL_COLUMNS = ['Middle Name', 'Contact No', 'Gender', 'Date of Birth', 'Department', 'Role', 'Job Type'];

// Validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,}$/;
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9\-_]{1,50}$/;

export default function EmployeeExcelUploadModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Validate individual row data
  const validateRow = (row, rowIndex) => {
    const errors = [];
    const warnings = [];

    // Helper: Normalize column names
    const normalize = (s) => s ? s.toString().toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '') : '';

    // Extract values with flexible column matching
    let empId = '';
    let firstName = '';
    let lastName = '';
    let email = '';
    let joiningDate = null;

    // Field pattern definitions - must match validateFileStructure patterns
    const fieldPatterns = [
      { field: 'empId', patterns: ['employeeid', 'empid'] },
      { field: 'firstName', patterns: ['firstname', 'first'] },
      { field: 'lastName', patterns: ['lastname', 'last'] },
      { field: 'email', patterns: ['email', 'emailaddress'] },
      { field: 'joiningDate', patterns: ['joiningdate', 'doj'] }
    ];

    // Find values from row with flexible matching
    for (const key of Object.keys(row)) {
      const normKey = normalize(key);
      const val = row[key];

      // Check each field pattern
      for (const { field, patterns } of fieldPatterns) {
        // Use includes for flexible matching - checks if normalized key contains any pattern
        if (patterns.some(p => normKey.includes(p) || normKey === p)) {
          if (field === 'empId') empId = val ? val.toString().trim() : '';
          else if (field === 'firstName') firstName = val ? val.toString().trim() : '';
          else if (field === 'lastName') lastName = val ? val.toString().trim() : '';
          else if (field === 'email') email = val ? val.toString().trim().toLowerCase() : '';
          else if (field === 'joiningDate') joiningDate = val;
          break; // Found match for this key, move to next key
        }
      }
    }

    // Employee ID validation
    if (!empId) {
      errors.push('Employee ID is required');
    } else if (!EMPLOYEE_ID_REGEX.test(empId)) {
      errors.push('Employee ID format invalid (alphanumeric, dash, underscore only)');
    }

    // First Name validation
    if (!firstName) {
      errors.push('First Name is required');
    } else if (firstName.length < 2) {
      warnings.push('First Name should be at least 2 characters');
    }

    // Last Name validation
    if (!lastName) {
      errors.push('Last Name is required');
    } else if (lastName.length < 2) {
      warnings.push('Last Name should be at least 2 characters');
    }

    // Email validation
    if (!email) {
      errors.push('Email is required');
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push('Invalid email format');
    }

    // Joining Date validation
    if (!joiningDate) {
      errors.push('Joining Date is required');
    } else {
      const joinDate = joiningDate;
      const dateStr = joinDate instanceof Date ? joinDate.toISOString().split('T')[0] : joinDate.toString().trim();
      if (!DATE_REGEX.test(dateStr)) {
        errors.push('Joining Date format must be YYYY-MM-DD');
      } else {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          errors.push('Invalid Joining Date');
        } else if (date > new Date()) {
          warnings.push('Joining Date is in the future');
        }
      }
    }

    return { errors, warnings };
  };

  // Validate file structure
  const validateFileStructure = (data) => {
    const errors = [];
    const warnings = [];

    if (!data || data.length === 0) {
      errors.push('Excel file is empty');
      return { errors, warnings };
    }

    // Helper: Normalize column names (match backend logic)
    const normalize = (s) => s ? s.toString().toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '') : '';

    // Check required columns (flexible matching)
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    const normalizedAvailable = availableColumns.map(col => normalize(col));

    // Required columns with their normalizations
    const requiredChecks = [
      { display: 'Employee ID', patterns: ['employeeid', 'empid'] },
      { display: 'First Name', patterns: ['firstname', 'first'] },
      { display: 'Last Name', patterns: ['lastname', 'last'] },
      { display: 'Email', patterns: ['email', 'emailaddress'] },
      { display: 'Joining Date', patterns: ['joiningdate', 'doj'] }
    ];

    requiredChecks.forEach(({ display, patterns }) => {
      const found = normalizedAvailable.some(norm => patterns.some(p => norm.includes(p) || norm === p));
      if (!found) {
        errors.push(`Missing required column: ${display}`);
      }
    });

    // If columns are missing, don't validate individual rows yet
    if (errors.length > 0) {
      return { errors, warnings };
    }

    // Validate each row
    data.forEach((row, idx) => {
      const { errors: rowErrors, warnings: rowWarnings } = validateRow(row, idx + 2);
      rowErrors.forEach(err => errors.push(`Row ${idx + 2}: ${err}`));
      rowWarnings.forEach(warn => warnings.push(`Row ${idx + 2}: ${warn}`));
    });

    return { errors, warnings };
  };

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

        // Validate file structure and data
        const { errors, warnings } = validateFileStructure(jsonData);

        if (errors.length > 0) {
          setUploadErrors(errors);
          setValidationWarnings([]);
          setUploadedFile(null);
          setUploadedData(null);
          return;
        }

        setUploadErrors([]);
        setValidationWarnings(warnings);
        setUploadedFile(file);

        // Prepare preview data (first 10 rows)
        const previewData = jsonData.slice(0, 10);

        setUploadedData({
          fileName: file.name,
          rowCount: jsonData.length,
          previewData: previewData,
          allData: jsonData,
          validationStats: {
            totalRecords: jsonData.length,
            warningCount: warnings.length
          }
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
      setUploadResult(null);

      const payload = {
        records: uploadedData.allData
      };

      const res = await api.post('/hr/bulk/upload', payload);

      if (res.data.success) {
        // Store result
        const result = {
          uploadedCount: res.data.uploadedCount,
          failedCount: res.data.failedCount,
          totalRecords: uploadedData.rowCount,
          successRate: ((res.data.uploadedCount / uploadedData.rowCount) * 100).toFixed(2),
          errors: res.data.errors || [],
          warnings: res.data.warnings || []
        };

        setUploadResult(result);
        setShowSuccessMessage(true);

        // Reset state
        setUploadedFile(null);
        setUploadPreview([]);
        setUploadErrors([]);
        setValidationWarnings([]);
        setUploadedData(null);
        setShowUploadPreview(false);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Call success callback
        if (onSuccess) onSuccess(result);
      } else {
        setUploadErrors([res.data.message || 'Upload failed']);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      setUploadErrors([errorMessage || 'Failed to upload employees. Please try again.']);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  // Show result message
  if (showSuccessMessage && uploadResult) {
    const isSuccess = uploadResult.failedCount === 0;
    const isPartial = uploadResult.uploadedCount > 0 && uploadResult.failedCount > 0;
    const isFailure = uploadResult.uploadedCount === 0;

    let title = "Upload Successful! ✅";
    let icon = <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />;
    let bgPulse = "bg-green-400/20";
    let bgCircle = "bg-green-100 dark:bg-green-900/30";

    if (isFailure) {
      title = "Upload Failed! ❌";
      icon = <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />;
      bgPulse = "bg-red-400/20";
      bgCircle = "bg-red-100 dark:bg-red-900/30";
    } else if (isPartial) {
      title = "Completed with Errors ⚠️";
      icon = <TrendingUp className="w-12 h-12 text-amber-600 dark:text-amber-400" />;
      bgPulse = "bg-amber-400/20";
      bgCircle = "bg-amber-100 dark:bg-amber-900/30";
    }

    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className={`absolute inset-0 ${bgPulse} rounded-full blur-lg`}></div>
              <div className={`relative p-4 ${bgCircle} rounded-full`}>
                {icon}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{title}</h2>

          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-black text-green-600 dark:text-green-400">{uploadResult.uploadedCount}</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">Uploaded</div>
              </div>
              <div>
                <div className="text-2xl font-black text-red-600 dark:text-red-400">{uploadResult.failedCount}</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{uploadResult.successRate}%</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">Success</div>
              </div>
            </div>
          </div>

          {uploadResult.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-left max-h-48 overflow-y-auto">
              <p className="text-xs font-black text-red-700 dark:text-red-400 mb-2">Errors ({uploadResult.errors.length})</p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                {uploadResult.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx} className="truncate">• {err}</li>
                ))}
                {uploadResult.errors.length > 5 && <li className="text-red-500">... and {uploadResult.errors.length - 5} more</li>}
              </ul>
            </div>
          )}

          {uploadResult.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-left max-h-48 overflow-y-auto">
              <p className="text-xs font-black text-amber-700 dark:text-amber-400 mb-2">Warnings ({uploadResult.warnings.length})</p>
              <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                {uploadResult.warnings.slice(0, 5).map((warn, idx) => (
                  <li key={idx} className="truncate">⚠️ {warn}</li>
                ))}
                {uploadResult.warnings.length > 5 && <li className="text-amber-500">... and {uploadResult.warnings.length - 5} more</li>}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setShowSuccessMessage(false);
              setUploadedFile(null);
              setUploadPreview([]);
              setUploadErrors([]);
              setValidationWarnings([]);
              setUploadedData(null);
              setShowUploadPreview(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
              onClose();
            }}
            className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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
                    setValidationWarnings([]);
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
              <p className="text-xs font-black text-red-700 dark:text-red-300 uppercase tracking-widest mb-2">❌ Validation Errors</p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                {uploadErrors.slice(0, 8).map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
                {uploadErrors.length > 8 && <li>... and {uploadErrors.length - 8} more errors</li>}
              </ul>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && uploadErrors.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <p className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2">⚠️ Warnings ({validationWarnings.length})</p>
              <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 max-h-32 overflow-y-auto">
                {validationWarnings.slice(0, 8).map((warn, idx) => (
                  <li key={idx}>• {warn}</li>
                ))}
                {validationWarnings.length > 8 && <li>... and {validationWarnings.length - 8} more warnings</li>}
              </ul>
            </div>
          )}



          {/* Required Columns Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed space-y-2">
                <div>
                  <span className="font-black block mb-1">📝 Required Columns:</span>
                  <span>Employee ID, First Name, Last Name, Email, Joining Date (YYYY-MM-DD format)</span>
                </div>
                <div>
                  <span className="font-black block mb-1">💡 Supported Optional Columns:</span>
                  <span>Middle Name, Contact No, Gender, Date of Birth, Department, Role, Job Type, Marital Status, Bank Details, Address fields</span>
                </div>
              </div>
            </div>
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
                Upload Records ({uploadedData?.rowCount || 0})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
