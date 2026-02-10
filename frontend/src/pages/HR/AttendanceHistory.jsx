import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, TrendingUp, Users, Download, Filter, Search,
  ChevronLeft, ChevronRight, UserCheck, AlertCircle, MapPin,
  MoreVertical, Edit2, FileText, BarChart3, PieChart,
  Camera, CheckCircle, XCircle, Trash2, RefreshCw, Loader2, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../utils/api';

export default function AttendanceHistory() {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 1)); // Default to Jan 2026
  const selectedMonth = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [attendance, setAttendance] = useState([]);
  const [newAttendance, setNewAttendance] = useState({});
  const [faceStatusMap, setFaceStatusMap] = useState({});
  const [loadingFaceStatus, setLoadingFaceStatus] = useState({});
  const [deletingFaceId, setDeletingFaceId] = useState(null);
  const [showFaceRegistrationModal, setShowFaceRegistrationModal] = useState(false);
  const [selectedEmployeeForFace, setSelectedEmployeeForFace] = useState(null);
  const [registeringFaceId, setRegisteringFaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = 10;

  const calculateStats = () => {
    if (Object.keys(newAttendance).length === 0) {
      return [
        { label: 'Total Employees', value: '0', icon: Users, color: 'blue', bgColor: 'bg-blue-500' },
        { label: 'Avg Attendance', value: '0', icon: TrendingUp, color: 'green', bgColor: 'bg-green-500' },
        { label: 'Total Working Hours', value: '0', icon: Clock, color: 'cyan', bgColor: 'bg-cyan-500' },
        // { label: 'Total Weekly Offs', value: '0', icon: Calendar, color: 'purple', bgColor: 'bg-purple-500' },
      ];
    }

    const employees = Object.values(newAttendance);
    const totalEmployees = employees.length;
    const avgAttendance = Math.round(
      employees.reduce((sum, emp) => sum + (emp.attendanceRate || 0), 0) / employees.length
    );
    const totalWorkingHours = employees.reduce((sum, emp) => sum + (emp.workingHours || 0), 0);
    const totalWeeklyOffs = employees.reduce((sum, emp) => sum + (emp.weeklyOffDays?.size || 0), 0);

    return [
      { label: 'Total Employees', value: totalEmployees.toString(), icon: Users, color: 'blue', bgColor: 'bg-blue-500' },
      { label: 'Avg Attendance', value: `${avgAttendance}%`, icon: TrendingUp, color: 'green', bgColor: 'bg-green-500' },
      { label: 'Total Working Hours', value: `${totalWorkingHours.toFixed(1)}h`, icon: Clock, color: 'cyan', bgColor: 'bg-cyan-500' },
      // { label: 'Total Weekly Offs', value: totalWeeklyOffs.toString(), icon: Calendar, color: 'purple', bgColor: 'bg-purple-500' },
    ];
  };

  const stats = calculateStats();
  const departmentStats = [];

  const getAttendanceColor = (rate) => {
    if (rate >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (rate >= 85) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (rate >= 75) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Export to Excel functionality
  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
    setCurrentPage(1);
  };

  const handleExportReport = async () => {
    try {
      setExporting(true);
      console.log(newAttendance);
      // Prepare data for export
      const i = 1;
      const exportData = Object.values(newAttendance).map((emp, i) => ({
        'Sr No.': i + 1,
        'Employee Name': emp.name,
        'Employee ID': emp.employeeId,
        'Role': emp.role,
        'Present Days': emp.presentDays.size,
        'Absent Days': emp.absentDays.size,
        'Leave Days': emp.leaveDays.size,
        'Holiday Days': emp.holidayDays.size,
        // 'Weekly Offs': emp.weeklyOffDays.size,
        'Half Day': emp.halfDayDays.size,
        'Total Working Hours': emp.workingHours.toFixed(2),
        'Attendance Rate (%)': emp.attendanceRate,
        'Late Arrivals': emp.lateArrivals,
        'Total Days': emp.days.size
      }));

      if (exportData.length === 0) {
        alert('No attendance data to export');
        setExporting(false);
        return;
      }

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

      // Add summary sheet
      const summaryData = [
        ['Attendance Report Summary'],
        ['Report Generated Date', new Date().toLocaleDateString('en-IN')],
        ['Report Month', selectedMonth],
        ['Total Employees', Object.keys(newAttendance).length],
        ['Average Attendance Rate', stats[1].value],
        ['Total Working Hours', stats[2].value],
        // ['Total Weekly Offs', stats[3].value]
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Generate filename with date
      const fileName = `Attendance_Report_${selectedMonth.replace(/\\s+/g, '_')}_${new Date().getTime()}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);

      console.log('✅ Report exported successfully');
      alert('Report exported successfully!');
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      alert('Error exporting report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getEmployeeAttendance = async () => {
    try {
      const res = await api.get('/attendance/all');
      console.log('Attendance API Response:', res.data);
      return res.data;
    } catch (error) {
      console.log('Error fetching attendance data:', error);
      throw error;
    }
  };

  // Refresh attendance data manually
  const handleRefreshData = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Manually refreshing attendance data...');
      const newData = await getEmployeeAttendance();
      console.log('✅ Fresh data received:', newData.length, 'records');
      setAttendance(newData);
      processAttendanceData(newData);
      alert('✅ Data refreshed successfully!');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      alert('Error refreshing data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch employee face registration status
  const checkFaceRegistration = async (employeeId) => {
    try {
      setLoadingFaceStatus(prev => ({ ...prev, [employeeId]: true }));
      const res = await api.get(`/attendance/face/status?employeeId=${employeeId}`);
      setFaceStatusMap(prev => ({
        ...prev,
        [employeeId]: res.data.isRegistered
      }));
      return res.data.isRegistered;
    } catch (err) {
      console.error('Error checking face status:', err);
      setFaceStatusMap(prev => ({
        ...prev,
        [employeeId]: false
      }));
      return false;
    } finally {
      setLoadingFaceStatus(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  // Delete face registration for an employee
  const handleDeleteFace = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee\'s face registration?')) {
      return;
    }

    try {
      setDeletingFaceId(employeeId);
      const res = await api.delete(`/attendance/face/delete?employeeId=${employeeId}`);

      if (res.data.success) {
        setFaceStatusMap(prev => ({
          ...prev,
          [employeeId]: false
        }));
        alert('Face registration deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting face:', err);
      alert(err.response?.data?.message || 'Failed to delete face registration');
    } finally {
      setDeletingFaceId(null);
    }
  };

  // Refresh face registration status
  const handleRefreshFaceStatus = async (employeeId) => {
    await checkFaceRegistration(employeeId);
  };

  // Handle face registration button click
  const handleRegisterFace = (employee) => {
    setSelectedEmployeeForFace(employee);
    setShowFaceRegistrationModal(true);
  };

  // Handle closing the face registration modal
  const closeFaceRegistrationModal = () => {
    setShowFaceRegistrationModal(false);
    setSelectedEmployeeForFace(null);
  };

  // Submit face registration
  const handleSubmitFaceRegistration = async () => {
    if (!selectedEmployeeForFace) return;

    try {
      setRegisteringFaceId(selectedEmployeeForFace._id);
      const res = await api.post(`/attendance/face/register`, {
        employeeId: selectedEmployeeForFace._id,
        status: 'pending'
      });

      if (res.data.success) {
        alert('Face registration initiated. Please ask the employee to complete registration.');
        closeFaceRegistrationModal();
        await checkFaceRegistration(selectedEmployeeForFace._id);
      }
    } catch (err) {
      console.error('Error initiating face registration:', err);
      alert(err.response?.data?.message || 'Failed to initiate face registration');
    } finally {
      setRegisteringFaceId(null);
    }
  };

  // Handle viewing employee report
  const handleViewReport = (empId) => {
    const employee = newAttendance[empId];
    if (employee) {
      setSelectedEmployeeForDetails(employee);
      setShowReportModal(true);
    }
  };

  // Close report modal
  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedEmployeeForDetails(null);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadErrors(['Please select a file to upload']);
      setUploadedFile(null);
      return;
    }

    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    const validExtensions = /\.(xlsx|xls|csv)$/i;

    if (!validExtensions.test(file.name) && !validTypes.includes(file.type)) {
      setUploadErrors(['Invalid file format. Please upload Excel (.xlsx, .xls) or CSV (.csv) file']);
      setUploadedFile(null);
      return;
    }

    setUploadedFile(file);
    setUploadErrors([]);

    // Read and preview file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setUploadErrors(['File is empty or corrupted. Please check your Excel file']);
          return;
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate data
        if (jsonData.length === 0) {
          setUploadErrors(['File is empty. Please check your Excel file']);
          return;
        }

        // Check required columns (more flexible - check for partial matches)
        const fileColumns = Object.keys(jsonData[0]);
        const requiredColumns = ['Employee ID', 'Date', 'Status', 'Check In', 'Check Out'];
        const missingColumns = requiredColumns.filter(col =>
          !fileColumns.some(fc => fc.toLowerCase().includes(col.toLowerCase()))
        );

        if (missingColumns.length > 0) {
          setUploadErrors([
            'Missing required columns:',
            ...missingColumns.map(col => `• ${col}`)
          ]);
          setUploadedFile(null);
          return;
        }

        // Check what months are in the data
        const dateColumn = Object.keys(jsonData[0]).find(col => col.toLowerCase().includes('date'));
        const dataMonths = new Set();
        let firstDate = null;
        let lastDate = null;

        jsonData.forEach(row => {
          try {
            if (row[dateColumn]) {
              let date = new Date(row[dateColumn]);
              // Handle Excel date numbers
              if (typeof row[dateColumn] === 'number') {
                date = new Date(Math.round((row[dateColumn] - 25569) * 86400 * 1000));
              }
              if (!isNaN(date.getTime())) {
                dataMonths.add(`${date.getMonth() + 1}/${date.getFullYear()}`);
                if (!firstDate || date < firstDate) firstDate = date;
                if (!lastDate || date > lastDate) lastDate = date;
              }
            }
          } catch (e) {
            // Skip invalid dates
          }
        });

        const currentMonth = `${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;
        const warnings = [];
        if (dataMonths.size > 0 && !dataMonths.has(currentMonth)) {
          warnings.push(`⚠️ Month Mismatch: File has data for ${Array.from(dataMonths).join(', ')} but you're on month ${currentMonth}`);
        }

        // Show preview (first 5 rows)
        setUploadPreview(jsonData.slice(0, 5));
        setUploadErrors(warnings);


      } catch (error) {
        console.error('File read error:', error);
        setUploadErrors([`Error reading file: ${error.message}`]);
        setUploadedFile(null);
      }
    };

    reader.onerror = () => {
      setUploadErrors(['Error reading file. Please try again.']);
      setUploadedFile(null);
    };

    reader.readAsArrayBuffer(file);
  };

  // Submit upload
  const handleSubmitUpload = async () => {
    if (!uploadedFile) {
      setUploadErrors(['Please select a file first']);
      return;
    }

    if (uploadErrors.length > 0) {
      alert('Please fix the errors in your file before uploading');
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          let jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validate data before sending
          if (jsonData.length === 0) {
            setUploadErrors(['File is empty']);
            setUploading(false);
            return;
          }

          // Normalize dates to UTC ISO strings - CRITICAL FIX
          jsonData = jsonData.map(row => {
            const normalized = { ...row };
            for (const key in normalized) {
              const val = normalized[key];
              // Check if this is a date field
              if (key.toLowerCase().includes('date') || key.toLowerCase().includes('punch')) {
                let date = null;
                
                if (val instanceof Date) {
                  date = val;
                } else if (typeof val === 'number') {
                  // Excel date number format
                  date = new Date(Math.round((val - 25569) * 86400 * 1000));
                } else if (typeof val === 'string') {
                  date = new Date(val);
                } else {
                  continue;
                }

                if (date && !isNaN(date.getTime())) {
                  // Convert to UTC midnight for date fields
                  if (key.toLowerCase().includes('date') && !key.toLowerCase().includes('time')) {
                    const utcDate = new Date(
                      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
                    );
                    normalized[key] = utcDate.toISOString();
                  } else {
                    // For time fields, keep the full timestamp
                    normalized[key] = date.toISOString();
                  }
                }
              }
            }
            return normalized;
          });

          console.log('📋 Normalized data sample:', jsonData[0]);

          // Send to backend
          const response = await api.post('/attendance/bulk-upload', {
            records: jsonData
          });

          console.log('📤 Upload response:', {
            success: response.data.success,
            uploadedCount: response.data.uploadedCount,
            failedCount: response.data.failedCount,
            errors: response.data.errors
          });

          if (response.data.success) {
            alert(`✅ Successfully uploaded ${response.data.uploadedCount} attendance records`);
            if (response.data.errors?.length > 0) {
              alert(`⚠️ ${response.data.errors.length} records failed:\n${response.data.errors.slice(0, 5).join('\n')}`);
            }

            // Wait longer for backend to process
            console.log('⏳ Waiting for backend to process...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Refresh attendance data
            const newData = await getEmployeeAttendance();
            console.log('📥 Fresh data from API after upload:', {
              totalRecords: newData.length,
              uniqueEmployees: new Set(newData.map(d => d.employee?._id)).size,
              dateRange: newData.length > 0 ? `${new Date(newData[newData.length - 1]?.date).toLocaleDateString()} to ${new Date(newData[0]?.date).toLocaleDateString()}` : 'N/A'
            });
            
            // Extract what months are in the fresh data
            const monthsInData = new Set();
            const datesInData = new Set();
            newData.forEach(record => {
              const date = new Date(record.date);
              monthsInData.add(`${date.getMonth() + 1}/${date.getFullYear()}`);
              datesInData.add(record.date.split('T')[0]);
            });
            
            console.log('📅 Months in uploaded data:', Array.from(monthsInData).join(', '));
            console.log('📊 Total unique dates:', datesInData.size);
            
            // Store raw data AND process it
            setAttendance(newData);
            processAttendanceData(newData);
            
            // Navigate to first available month in the uploaded data
            if (monthsInData.size > 0) {
              const firstMonth = Array.from(monthsInData)[0];
              const [month, year] = firstMonth.split('/');
              const targetDate = new Date(year, parseInt(month) - 1, 1);
              if (targetDate.getTime() !== selectedDate.getTime()) {
                console.log(`🔄 Auto-navigating to month: ${firstMonth}`);
                setSelectedDate(targetDate);
              }
            }

            // Close modal and reset
            setTimeout(() => {
              setShowUploadModal(false);
              setUploadedFile(null);
              setUploadPreview([]);
              setUploadErrors([]);
            }, 300);
            
          } else {
            setUploadErrors([response.data.message || 'Upload failed']);
          }
        } catch (error) {
          console.error('Upload error:', error);
          setUploadErrors([error.response?.data?.message || error.message || 'Error uploading file']);
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setUploadErrors(['Error reading file']);
        setUploading(false);
      };

      reader.readAsArrayBuffer(uploadedFile);
    } catch (error) {
      setUploadErrors([error.message]);
      setUploading(false);
    }
  };

  // Close upload modal
  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadedFile(null);
    setUploadPreview([]);
    setUploadErrors([]);
  };

  // Process attendance data
  const processAttendanceData = (data) => {
    try {
      const selMonth = selectedDate.getMonth();
      const selYear = selectedDate.getFullYear();

      console.log(`🔍 Processing attendance data for ${selMonth + 1}/${selYear}`);
      console.log(`📊 Total records received: ${data.length}`);
      
      // Debug: Show date range info
      if (data.length > 0) {
        const dates = data.map(d => new Date(d.date).toLocaleDateString());
        console.log(`📅 Date range in data: ${Math.min(...dates.map(d => new Date(d).getTime()))} to ${Math.max(...dates.map(d => new Date(d).getTime()))}`);
      }

      const result = data.reduce((acc, item, idx) => {
        try {
          // Validate item has required fields
          if (!item || !item.employee || !item.date) {
            console.warn('⚠️ Skipping invalid attendance record:', item);
            return acc;
          }

          const itemDate = new Date(item.date);
          const itemMonth = itemDate.getMonth();
          const itemYear = itemDate.getFullYear();
          
          // Debug: Log first few records to check date filtering
          if (idx < 3) {
            console.log(`  Record ${idx}: Date=${itemDate.toLocaleDateString()}, Month=${itemMonth + 1}, Year=${itemYear}, FilterMonth=${selMonth + 1}, FilterYear=${selYear}, Match=${itemMonth === selMonth && itemYear === selYear}`);
          }
          
          // Filter by selected month/year
          if (itemMonth !== selMonth || itemYear !== selYear) {
            return acc;
          }

          const empId = item.employee._id;
          const empName = `${item.employee.firstName || ''} ${item.employee.lastName || ''}`.trim();
          const empRole = item.employee.role || 'N/A';
          const day = item.date.split('T')[0];
          const status = item.status || 'unknown';
          const employeeId = item.employee.employeeId;

          if (!acc[empId]) {
            acc[empId] = {
              _id: empId,
              empId: item.employee.empId || empId,
              name: empName,
              role: empRole,
              employeeId: employeeId,
              avatar: item.employee.firstName?.charAt(0).toUpperCase() || 'E',
              days: new Set(),
              presentDays: new Set(),
              absentDays: new Set(),
              leaveDays: new Set(),
              holidayDays: new Set(),
              weeklyOffDays: new Set(),
              halfDayDays: new Set(),
              missedPunchDays: new Set(),
              lateArrivals: 0,
              leaves: 0,
              workingHours: 0,
              attendanceRate: 0
            };
          }

          acc[empId].days.add(day);

          // Calculate working hours - prioritize punch logs, fallback to pre-calculated hours
          if (item.checkIn && item.checkOut) {
            const checkInTime = new Date(item.checkIn);
            const checkOutTime = new Date(item.checkOut);
            const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
            if (hoursWorked > 0) {
              acc[empId].workingHours += parseFloat(hoursWorked.toFixed(2));
            }
          } else if (item.workingHours && item.workingHours > 0) {
            // Fallback to pre-calculated working hours if punch logs are incomplete
            // This handles Excel-uploaded records with workingHours field
            acc[empId].workingHours += parseFloat(item.workingHours);
          }

          // Track status by category
          if (status === 'present') {
            acc[empId].presentDays.add(day);
          } else if (status === 'absent') {
            acc[empId].absentDays.add(day);
          } else if (status === 'leave') {
            acc[empId].leaveDays.add(day);
          } else if (status === 'holiday') {
            acc[empId].holidayDays.add(day);
          } else if (status === 'weekly_off') {
            acc[empId].weeklyOffDays.add(day);
          } else if (status === 'half_day') {
            acc[empId].halfDayDays.add(day);
          } else if (status === 'missed_punch') {
            acc[empId].missedPunchDays.add(day);
          }

          return acc;
        } catch (itemError) {
          console.error('❌ Error processing individual attendance record:', itemError, item);
          return acc;
        }
      }, {});

      console.log(`✅ Processed ${Object.keys(result).length} employees for ${selMonth + 1}/${selYear}`);

      // Calculate attendance rates
      Object.keys(result).forEach(empId => {
        const employee = result[empId];
        const totalDays = employee.days.size;
        const presentDays = employee.presentDays.size + employee.halfDayDays.size * 0.5;
        const workingDays = totalDays - employee.weeklyOffDays.size - employee.holidayDays.size;
        
        // Use working days for attendance rate, fallback to total days if no working days calculated
        employee.attendanceRate = workingDays > 0 
          ? Math.round((employee.presentDays.size / workingDays) * 100) 
          : (totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0);
      });

      setNewAttendance(result);
    } catch (error) {
      console.error('❌ Error processing attendance data:', error);
      setNewAttendance({});
    }
  };

  // Re-process when selected month changes
  useEffect(() => {
    if (attendance.length > 0) {
      console.log('Month changed, re-processing attendance data');
      processAttendanceData(attendance);
    }
  }, [selectedDate]);

  // Load face status for all employees when attendance data is loaded
  useEffect(() => {
    if (Object.keys(newAttendance).length > 0) {
      Object.keys(newAttendance).forEach(empId => {
        if (!faceStatusMap.hasOwnProperty(empId)) {
          checkFaceRegistration(empId);
        }
      });
    }
  }, [newAttendance]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const data = await getEmployeeAttendance();
        
        if (!data || !Array.isArray(data)) {
          console.error('Invalid attendance data received:', data);
          setAttendance([]);
          setNewAttendance({});
          setLoading(false);
          return;
        }

        console.log(`Received ${data.length} attendance records from API`);
        
        // Store raw data for filtering by month later
        setAttendance(data);
        
        // Process with month filter on initial load
        processAttendanceData(data);
        
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setAttendance([]);
        setNewAttendance({});
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  // Helper function to get status category based on attendance rate
  const getStatusCategory = (rate) => {
    if (rate >= 95) return 'Excellent (95%+)';
    if (rate >= 85) return 'Good (85%+)';
    if (rate >= 75) return 'Average (75%+)';
    return 'Poor (<75%)';
  };

  // Filter employees based on search term, department, and status
  const filteredEmployees = Object.keys(newAttendance).filter((empId) => {
    const employee = newAttendance[empId];
    const searchLower = searchTerm.toLowerCase();

    // Search filter
    const matchesSearch =
      employee.name.toLowerCase().includes(searchLower) ||
      employee.empId.toLowerCase().includes(searchLower) ||
      employee.role.toLowerCase().includes(searchLower);

    // Department filter
    const matchesDepartment =
      selectedDepartment === 'All Departments' ||
      employee.role === selectedDepartment;

    // Status filter
    let matchesStatus = true;
    if (selectedStatus !== 'All Status') {
      const employeeStatus = getStatusCategory(employee.attendanceRate);
      matchesStatus = employeeStatus === selectedStatus;
    }

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = filteredEmployees
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg font-bold">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.bgColor} shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-2">{stat.label}</p>
              <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Department Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Department Overview</h2>
          </div>
          <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            View Analytics
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {departmentStats.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No department data available</p>
          ) : (
            departmentStats.map((dept, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-lg transition-all">
                <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-3">{dept.department}</p>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{dept.present}</span>
                  <span className="text-sm font-bold text-slate-400">/ {dept.total}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                    style={{ width: dept.rate }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase">{dept.rate} Present</p>
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400">{dept.avgHours} avg</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition"
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
              className="w-full sm:w-48 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition"
            >
              <option>All Departments</option>
              <option>Engineering</option>
              <option>Sales</option>
              <option>Marketing</option>
              <option>Finance</option>
              <option>HR</option>
              <option>Design</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
              className="w-full sm:w-40 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition"
            >
              <option>All Status</option>
              <option>Excellent (95%+)</option>
              <option>Good (85%+)</option>
              <option>Average (75%+)</option>
              <option>Poor (&lt;75%)</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <span className="font-black text-slate-700 dark:text-slate-300 px-2 text-xs uppercase tracking-widest">{selectedMonth}</span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshData}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh attendance data"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Refresh
                  </>
                )}
              </button>
              <button
                onClick={handleExportReport}
                disabled={exporting || Object.keys(newAttendance).length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
            {/* <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Upload className="w-5 h-5" />
              Upload Excel
            </button> */}
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Monthly Attendance History</h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">{selectedMonth} - Complete Records</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Showing {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Present Days</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Absent</th>
                {/* <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Leaves</th> */}
                {/* <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Weekly Offs</th> */}
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Late Arrivals</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hours</th>
                {/* <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance</th> */}
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Face Registration</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {paginatedEmployees.map((empId) => {
                const employee = newAttendance[empId];
                console.log(employee);
                return (
                  <tr key={empId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-lg">
                          {employee.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{employee.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-green-600 dark:text-green-400 tracking-tighter">{employee.presentDays.size}</span>
                        <span className="text-xs font-bold text-slate-400">days</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-black text-red-600 dark:text-red-400 tracking-tighter">{employee.absentDays.size}</span>
                    </td>
                    {/* <td className="px-6 py-4">
                      <span className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-tighter">{employee.leaveDays.size}</span>
                    </td> */}
                    {/* <td className="px-6 py-4">
                      <span className="text-lg font-black text-purple-600 dark:text-purple-400 tracking-tighter">{employee.weeklyOffDays.size}</span>
                    </td> */}
                    <td className="px-6 py-4">
                      <span className="text-lg font-black text-orange-600 dark:text-orange-400 tracking-tighter">{employee.lateArrivals}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">
                        {parseFloat(employee.workingHours).toFixed(2)}
                        <span className="text-[10px] text-slate-400 ml-1">hrs</span>
                      </span>
                    </td>
                    {/* <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border ${getAttendanceColor(employee.attendanceRate)}`}>
                        <TrendingUp size={12} />
                        {employee.attendanceRate}%
                      </span>
                    </td> */}
                    <td className="px-6 py-4">
                      {loadingFaceStatus[empId] ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin text-blue-600" />
                          <span className="text-xs font-bold text-slate-500">Checking...</span>
                        </div>
                      ) : faceStatusMap[empId] ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl w-fit">
                          <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Registered</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl w-fit">
                          <XCircle size={14} className="text-red-600 dark:text-red-400" />
                          <span className="text-xs font-bold text-red-700 dark:text-red-300">Not Registered</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewReport(empId)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 group-hover:text-blue-600 transition"
                          title="View Report"
                        >
                          <FileText size={16} />
                        </button>
                        {faceStatusMap[empId] && (
                          <button
                            onClick={() => handleDeleteFace(empId)}
                            disabled={deletingFaceId === empId}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 disabled:opacity-50 rounded-xl transition"
                            title="Delete Face Registration"
                          >
                            {deletingFaceId === empId ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                        {faceStatusMap[empId] && (
                          <button
                            onClick={() => handleRefreshFaceStatus(empId)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 rounded-xl transition"
                            title="Refresh Face Status"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        {/* {!faceStatusMap[empId] && !loadingFaceStatus[empId] && (
                          <button
                            onClick={() => handleRegisterFace(employee)}
                            disabled={registeringFaceId === empId}
                            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 disabled:opacity-50 rounded-xl transition"
                            title="Register Face"
                          >
                            {registeringFaceId === empId ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Camera size={16} />
                            )}
                          </button>
                        )} */}
                        <button
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 group-hover:text-slate-600 transition"
                          title="More Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedEmployees.length === 0 && (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-12 h-12 text-slate-300" />
                      <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">
                        {Object.keys(newAttendance).length === 0 ? 'No attendance records found' : 'No matching employees found'}
                      </p>
                      <p className="text-slate-400 dark:text-slate-500 text-sm">
                        {Object.keys(newAttendance).length === 0
                          ? 'There are no employee attendance records to display'
                          : `No employees match your search "${searchTerm}"`}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {Math.max(1, totalPages)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              Previous
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Face Registration Modal */}
      {showFaceRegistrationModal && selectedEmployeeForFace && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-8 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                Face Registration
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Register face for <span className="font-bold text-slate-800 dark:text-white">{selectedEmployeeForFace.name}</span>
              </p>
            </div>

            {/* Employee Info */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-lg">
                  {selectedEmployeeForFace.avatar}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                    {selectedEmployeeForFace.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {selectedEmployeeForFace.empId} • {selectedEmployeeForFace.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-bold">
                <span className="block font-black mb-1">📸 Registration Process</span>
                Click "Start Registration" to initiate the face registration process. The employee will need to use their camera to capture face data.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={closeFaceRegistrationModal}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFaceRegistration}
                disabled={registeringFaceId === selectedEmployeeForFace._id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {registeringFaceId === selectedEmployeeForFace._id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera size={16} />
                    Start Registration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedEmployeeForDetails && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-900 p-6 border-b border-emerald-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-lg">
                    {selectedEmployeeForDetails.avatar}
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">
                      Attendance Report - {selectedEmployeeForDetails.name}
                    </p>
                    <p className="text-sm text-emerald-100">
                      {selectedEmployeeForDetails.employeeId} • {selectedEmployeeForDetails.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeReportModal}
                  className="text-white hover:bg-white/20 p-2 rounded-xl transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">
                  📊 Key Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Attendance Rate</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedEmployeeForDetails.attendanceRate}%</p>
                    </div>
                    <div className="text-right">
                      {selectedEmployeeForDetails.attendanceRate >= 95 && <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-black">Excellent</span>}
                      {selectedEmployeeForDetails.attendanceRate >= 85 && selectedEmployeeForDetails.attendanceRate < 95 && <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-black">Good</span>}
                      {selectedEmployeeForDetails.attendanceRate >= 75 && selectedEmployeeForDetails.attendanceRate < 85 && <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-black">Average</span>}
                      {selectedEmployeeForDetails.attendanceRate < 75 && <span className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-black">Poor</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">
                  📋 Attendance Breakdown
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-widest mb-2">Present</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-green-600 dark:text-green-400">{selectedEmployeeForDetails.presentDays.size}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-bold">days</p>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest mb-2">Absent</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-red-600 dark:text-red-400">{selectedEmployeeForDetails.absentDays.size}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-bold">days</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2">Leave</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-orange-600 dark:text-orange-400">{selectedEmployeeForDetails.leaveDays.size}</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">days</p>
                    </div>
                  </div>
                  {/* <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-widest mb-2">Weekly Offs</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{selectedEmployeeForDetails.weeklyOffDays.size}</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-bold">days</p>
                    </div>
                  </div> */}
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-widest mb-2">Holiday</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{selectedEmployeeForDetails.holidayDays.size}</p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 font-bold">days</p>
                    </div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest mb-2">Half Day</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{selectedEmployeeForDetails.halfDayDays.size}</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">
                Working Hours
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Total Hours Worked</p>
                  <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{selectedEmployeeForDetails.workingHours.toFixed(2)} <span className="text-xl">hrs</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-bold">Average per day: {(selectedEmployeeForDetails.workingHours / Math.max(selectedEmployeeForDetails.presentDays.size, 1)).toFixed(2)} hrs</p>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">
                  ✅ Summary
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                    <strong>{selectedEmployeeForDetails.name}</strong> has worked <strong>{selectedEmployeeForDetails.presentDays.size}</strong> days with an attendance rate of <strong>{selectedEmployeeForDetails.attendanceRate}%</strong>.
                    Total working hours recorded: <strong>{selectedEmployeeForDetails.workingHours.toFixed(2)} hours</strong>.
                    Absences: <strong>{selectedEmployeeForDetails.absentDays.size} days</strong>, Leave: <strong>{selectedEmployeeForDetails.leaveDays.size} days</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={closeReportModal}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 p-6 border-b border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Upload Attendance Records</h3>
                    <p className="text-xs text-blue-100 mt-1 font-bold">Import attendance data from Excel file</p>
                  </div>
                </div>
                <button
                  onClick={closeUploadModal}
                  className="text-white hover:bg-white/20 p-2 rounded-xl transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* File Upload Section */}
              <div>
                {!uploadedFile ? (
                  <div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="block cursor-pointer">
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer group">
                        <div className="flex justify-center mb-4">
                          <Upload className="w-12 h-12 text-slate-400 group-hover:text-blue-500 transition" />
                        </div>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-widest">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                          Supports: Excel (.xlsx, .xls) and CSV files
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadPreview([]);
                        setUploadErrors([]);
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
                  <div className="text-sm text-red-700 dark:text-red-300 font-bold space-y-1">
                    {uploadErrors.map((error, idx) => (
                      <p key={idx}>{error}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Section */}
              {uploadPreview.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">
                    📋 Preview (First 5 Records)
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          {Object.keys(uploadPreview[0] || {}).map((header) => (
                            <th key={header} className="px-4 py-3 text-left font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-widest whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                            {Object.values(row).map((value, cellIdx) => (
                              <td key={cellIdx} className="px-4 py-3 text-slate-600 dark:text-slate-400 font-bold">
                                {String(value).substring(0, 30)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                  <span className="block font-black mb-2">📝 Required Columns:</span>
                  Your Excel file must have these columns: <strong>Employee ID</strong>, <strong>Date</strong>, <strong>Status</strong>, <strong>Check In</strong>, <strong>Check Out</strong>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800 flex gap-3">
              <button
                onClick={closeUploadModal}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition"
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
      )}
    </div>
  );
}
