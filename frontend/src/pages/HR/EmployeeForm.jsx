import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../../utils/api';
import { DatePicker } from 'antd';
import { showToast } from '../../utils/uiNotifications';
import {
  IndianRupee,
  GraduationCap,
  FileCheck,
  ShieldCheck,
  Fingerprint,
  Lock,
  CreditCard,
  Landmark,
  Briefcase,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  Search,
  Trash2,
  Edit2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Camera,
  Upload,
  Check,
  X,
  AlertCircle,
  Workflow,
  Heart,
  CheckCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://hrms.gitakshmi.com';
const NATIONALITIES = ['Indian', 'American', 'British', 'Canadian', 'Australian', 'Other'];

export default function EmployeeForm({ employee, onClose, viewOnly = false }) {
  const [step, setStep] = useState((employee?.status === 'Draft' ? employee?.lastStep : 1) || 1);

  const [firstName, setFirstName] = useState(employee?.firstName || '');
  const [middleName, setMiddleName] = useState(employee?.middleName || '');
  const [lastName, setLastName] = useState(employee?.lastName || '');
  const [gender, setGender] = useState(employee?.gender || '');
  const [dob, setDob] = useState(employee?.dob ? new Date(employee.dob).toISOString().slice(0, 10) : '');
  const [contactNo, setContactNo] = useState(employee?.contactNo || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(employee?.profilePic || null);
  const [maritalStatus, setMaritalStatus] = useState(employee?.maritalStatus || '');
  const [bloodGroup, setBloodGroup] = useState(employee?.bloodGroup || '');
  const [nationality, setNationality] = useState(employee?.nationality || '');
  const [fatherName, setFatherName] = useState(employee?.fatherName || '');
  const [motherName, setMotherName] = useState(employee?.motherName || '');
  const [emergencyContactName, setEmergencyContactName] = useState(employee?.emergencyContactName || '');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState(employee?.emergencyContactNumber || '');

  const [tempAddress, setTempAddress] = useState(employee?.tempAddress || { line1: '', line2: '', city: '', state: '', pinCode: '', country: '' });
  const [permAddress, setPermAddress] = useState(employee?.permAddress || { line1: '', line2: '', city: '', state: '', pinCode: '', country: '' });
  const [sameAsTemp, setSameAsTemp] = useState(false);

  const [experience, setExperience] = useState(employee?.experience?.length ? employee.experience.map(e => ({
    ...e,
    payslips: e.payslips || (e.payslipUrl ? [e.payslipUrl] : [])
  })) : []);
  const [jobType, setJobType] = useState(employee?.jobType || 'Full-Time');

  const [bankName, setBankName] = useState(employee?.bankDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(employee?.bankDetails?.accountNumber || '');
  const [ifsc, setIfsc] = useState(employee?.bankDetails?.ifsc || '');
  const [branchName, setBranchName] = useState(employee?.bankDetails?.branchName || '');
  const [bankLocation, setBankLocation] = useState(employee?.bankDetails?.location || '');
  const [currentBankProof, setCurrentBankProof] = useState(employee?.bankDetails?.bankProofUrl || null);

  const [role, setRole] = useState(employee?.role || 'Employee');
  const [department, setDepartment] = useState(employee?.department || '');
  const [departmentId, setDepartmentId] = useState(employee?.departmentId?._id || employee?.departmentId || '');
  const [manager, setManager] = useState(employee?.manager?._id || employee?.manager || '');
  const [joiningDate, setJoiningDate] = useState(employee?.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '');
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [_departmentHead, _setDepartmentHead] = useState(employee?.departmentHead || false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);

  // Payroll / Compensation State (Step 8)
  const [salaryTemplateId, setSalaryTemplateId] = useState(employee?.salaryTemplateId?._id || employee?.salaryTemplateId || '');
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [salaryStatus, setSalaryStatus] = useState('Active');
  const [salaryTemplates, setSalaryTemplates] = useState([]);
  const [selectedTemplateDetails, setSelectedTemplateDetails] = useState(null);

  const loadSalaryTemplates = useCallback(async () => {
    try {
      const res = await api.get('/payroll/salary-templates');
      setSalaryTemplates(res.data?.data || []);
      // Pre-select if existing
      if (salaryTemplateId && !selectedTemplateDetails) {
        const found = (res.data?.data || []).find(t => t._id === salaryTemplateId);
        if (found) setSelectedTemplateDetails(found);
      }
    } catch (err) { console.error("Failed to load salary templates", err); }
  }, [salaryTemplateId]);

  useEffect(() => {
    if (step === 8) loadSalaryTemplates();
  }, [step, loadSalaryTemplates]);

  const handleTemplateChange = (e) => {
    const tid = e.target.value;
    setSalaryTemplateId(tid);
    const found = salaryTemplates.find(t => t._id === tid);
    setSelectedTemplateDetails(found || null);
  };

  const saveSalaryAssignment = async () => {
    if (!salaryTemplateId) { showToast('error', 'Validation Error', "Please select a Salary Template"); return; }
    if (!employee?._id) { showToast('error', 'Validation Error', "Please save employee draft first"); return; }

    setSaving(true);
    try {
      await api.post(`/hr/employees/${employee._id}/salary-assignment`, {
        salaryTemplateId,
        effectiveFrom: salaryEffectiveDate,
        status: salaryStatus
      });
      showToast('success', 'Success', "Salary assigned successfully!");
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', err.response?.data?.message || "Failed to assign salary");
    } finally {
      setSaving(false);
    }
  };

  // Leave Policy
  const [leavePolicy, setLeavePolicy] = useState(employee?.leavePolicy || '');
  const [policies, setPolicies] = useState([]);

  const loadPolicies = useCallback(async () => {
    try {
      const res = await api.get('/hr/leave-policies');
      setPolicies(res.data || []);
    } catch (err) { console.error("Failed to load policies", err); }
  }, []);


  // Education State
  const [eduType, setEduType] = useState(employee?.education?.type || 'Diploma');
  const [class10Marksheet, setClass10Marksheet] = useState(employee?.education?.class10Marksheet || null);
  const [class12Marksheet, setClass12Marksheet] = useState(employee?.education?.class12Marksheet || null);
  const [diplomaCertificate, setDiplomaCertificate] = useState(employee?.education?.diplomaCertificate || null);
  const [bachelorDegree, setBachelorDegree] = useState(employee?.education?.bachelorDegree || null);
  const [masterDegree, setMasterDegree] = useState(employee?.education?.masterDegree || null);

  // Alternative: Last 3 Sem Marksheets
  const [lastSem1, setLastSem1] = useState(employee?.education?.lastSem1Marksheet || null);
  const [lastSem2, setLastSem2] = useState(employee?.education?.lastSem2Marksheet || null);
  const [lastSem3, setLastSem3] = useState(employee?.education?.lastSem3Marksheet || null);

  // Step 6: Identity Documents
  // Step 6: Identity Documents
  const [aadharFront, setAadharFront] = useState(employee?.documents?.aadharFront || null);
  const [aadharBack, setAadharBack] = useState(employee?.documents?.aadharBack || null);
  const [panCard, setPanCard] = useState(employee?.documents?.panCard || null);

  const bankProofRef = useRef(null);
  const c10Ref = useRef(null);
  const c12Ref = useRef(null);
  const diplomaRef = useRef(null);
  const bachelorRef = useRef(null);
  const masterRef = useRef(null);
  const ls1Ref = useRef(null);
  const ls2Ref = useRef(null);
  const ls3Ref = useRef(null);
  const aadharFrontRef = useRef(null);
  const aadharBackRef = useRef(null);
  const panRef = useRef(null);
  const profilePicRef = useRef(null);
  const ignoreAutoFill = useRef(false);


  // Fetch departments for dropdown
  const loadDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      let res;
      try {
        res = await api.get('/hr/departments');
      } catch {
        // Backward-compatible fallback for older backend mount shape
        res = await api.get('/hr/hr/departments');
      }
      const deptList = res.data?.data || res.data || [];
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (err) {
      console.error('Failed to load departments', err);
      // Keep existing departments (if any) and show a visible error
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error || '';
      const maybeModuleBlocked = /module|access denied|forbidden/i.test(String(backendMsg));
      const errorMsg =
        err?.hrms?.message ||
        (maybeModuleBlocked ? 'HR module is disabled or access is denied for this company.' : backendMsg) ||
        err?.message ||
        'Failed to load departments';
      showToast('error', 'Departments', errorMsg);
    }
    finally {
      setDepartmentsLoading(false);
    }
  }, []);

  // Fetch employees for manager dropdown
  const loadManagers = useCallback(async () => {
    try {
      const res = await api.get('/hr/employees');
      const empList = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setManagers(empList.filter(e => !employee || e._id !== employee._id)); // Exclude self
    } catch (err) {
      console.error('Failed to load managers', err);
      setManagers([]);
    }
  }, [employee]);

  // Step 7: Fetch Employee Code Preview
  const loadEmployeeCodePreview = useCallback(async () => {
    if (step !== 7) return;
    try {
      const payload = {
        firstName: firstName,
        lastName: lastName,
        department: department || 'GEN'
      };
      console.log('Fetching preview with:', payload);
      const res = await api.post('/hr/employees/preview', payload);
      if (res.data && res.data.preview) {
        setEmployeeCode(res.data.preview);
      } else {
        setEmployeeCode('Error: No ID returned');
      }
    } catch (err) {
      console.error('Failed to load employee code preview', err);
      setEmployeeCode('Error: Failed to generate');
    }
  }, [step, firstName, lastName, department]);

  useEffect(() => {
    loadDepartments();
    loadManagers();
    loadPolicies();
    if (step === 7 && !employee) loadEmployeeCodePreview();
  }, [loadDepartments, loadManagers, loadEmployeeCodePreview, step, employee]);

  const [employeeCode, setEmployeeCode] = useState('');

  const phoneRe = /^\d{10,15}$/;
  const pinRe = useMemo(() => /^\d{5,10}$/, []);
  const ifscRe = useMemo(() => /^[A-Z]{4}0[0-9A-Z]{6}$/, []);

  const handlePincodeLookup = useCallback(async (pin, target = 'temp') => {
    try {
      if (!pin || !pinRe.test(pin)) return;
      setPincodeLoading(true);
      const key = 'pincode_cache';
      let cache = {};
      try { cache = JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch { cache = {}; }
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const c = cache[pin];
        if (c) {
          if (target === 'temp') setTempAddress(p => {
            const next = { ...p, city: c.city || p.city, state: c.stateVal || p.state, country: c.countryVal || p.country };
            return (next.city === p.city && next.state === p.state && next.country === p.country) ? p : next;
          });
          else setPermAddress(p => {
            const next = { ...p, city: c.city || p.city, state: c.stateVal || p.state, country: c.countryVal || p.country };
            return (next.city === p.city && next.state === p.state && next.country === p.country) ? p : next;
          });
        }
        return;
      }
      const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
      let city = '', stateVal = '', countryVal = '';
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? data[0] : null;
        const po = entry && Array.isArray(entry.PostOffice) ? entry.PostOffice[0] : null;
        city = (po && (po.District || po.Name)) || '';
        stateVal = (po && po.State) || '';
        countryVal = (po && po.Country) || '';
      }
      if (city || stateVal || countryVal) {
        if (ignoreAutoFill.current) return; // Prevent overwriting city if triggered by city lookup

        const v = { city, stateVal, countryVal, ts: Date.now() };
        cache[pin] = v;
        try { sessionStorage.setItem(key, JSON.stringify(cache)); } catch { /* ignore sessionStorage errors */ }
        if (target === 'temp') setTempAddress(p => {
          const next = { ...p, city: city || p.city, state: stateVal || p.state, country: countryVal || p.country };
          return (next.city === p.city && next.state === p.state && next.country === p.country) ? p : next;
        });
        else setPermAddress(p => {
          const next = { ...p, city: city || p.city, state: stateVal || p.state, country: countryVal || p.country };
          return (next.city === p.city && next.state === p.state && next.country === p.country) ? p : next;
        });
      }
    } finally {
      setPincodeLoading(false);
    }
  }, [pinRe]);

  const handleIfscLookup = useCallback(async (code) => {
    try {
      if (!code || !ifscRe.test(code)) return;
      setIfscLoading(true);
      const key = 'ifsc_cache';
      let cache = {};
      try { cache = JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch { cache = {}; }
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const c = cache[code];
        if (c) {
          setBankName(prev => c.BANK || prev);
          setBranchName(prev => c.BRANCH || prev);
        }
        return;
      }
      const res = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setBankName(prev => data.BANK || prev);
        setBranchName(prev => data.BRANCH || prev);
        setBankLocation(prev => data.CITY || data.DISTRICT || prev); // Auto-populate location
        const v = { ...data, ts: Date.now() };
        cache[code] = v;
        try { sessionStorage.setItem(key, JSON.stringify(cache)); } catch { /* ignore sessionStorage errors */ }
      }
    } finally {
      setIfscLoading(false);
    }
  }, [ifscRe]);

  const handleCityLookup = useCallback(async (city, target = 'temp') => {
    try {
      if (!city || city.length < 3) { setPincodeLoading(false); return; }

      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) { setPincodeLoading(false); return; }

      const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(city)}`);
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? data[0] : null;
        if (entry && entry.Status === 'Success' && Array.isArray(entry.PostOffice) && entry.PostOffice.length > 0) {
          const list = entry.PostOffice;
          const inputCity = city.trim().toLowerCase();

          // Priority 1: Exact Match on District
          let po = list.find(item => item.District && item.District.toLowerCase() === inputCity);

          // Priority 2: Exact Match on Region
          if (!po) po = list.find(item => item.Region && item.Region.toLowerCase() === inputCity);

          // Priority 3: Fuzzy Match on Name (Starts with input + space, or exact)
          // e.g. Input "Dhari" matches "Dhari S.O"
          if (!po) {
            const nameRegex = new RegExp(`^${inputCity}( |$|\\.)`, 'i');
            const nameMatches = list.filter(item => item.Name && nameRegex.test(item.Name));

            if (nameMatches.length > 0) {
              // Sort by State (A-Z) -> Gujarat comes before Uttarakhand
              nameMatches.sort((a, b) => (a.State || '').localeCompare(b.State || ''));
              po = nameMatches[0];
            }
          }

          // Fallback: Just take the first one if we can't find a direct match
          if (!po) po = list[0];

          const stateVal = po.State || '';
          const countryVal = po.Country || 'India';
          const pinVal = po.Pincode || '';

          if (target === 'temp') {
            ignoreAutoFill.current = true;
            setTempAddress(p => ({ ...p, state: stateVal || p.state, country: countryVal || p.country, pinCode: pinVal }));
            setTimeout(() => { ignoreAutoFill.current = false; }, 2000);
          } else {
            ignoreAutoFill.current = true;
            setPermAddress(p => ({ ...p, state: stateVal || p.state, country: countryVal || p.country, pinCode: pinVal }));
            setTimeout(() => { ignoreAutoFill.current = false; }, 2000);
          }
        } else {
          // Fallback to Global Search (Nominatim)
          throw new Error("No Indian match found");
        }

      } else {
        throw new Error("Indian API Failed");
      }
    } catch (e) {
      console.log("Indian API missed, trying global...", e);

      // Clear stale data immediately to prevent wrong info persistence
      if (target === 'temp') setTempAddress(p => ({ ...p, state: '', country: '', pinCode: '' }));
      else setPermAddress(p => ({ ...p, state: '', country: '', pinCode: '' }));

      try {
        const globalRes = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&addressdetails=1&limit=1`, {
          headers: { 'Accept-Language': 'en' } // Prefer English results
        });
        if (globalRes.ok) {
          const gData = await globalRes.json();
          const gEntry = Array.isArray(gData) ? gData[0] : null;
          if (gEntry && gEntry.address) {
            const stateVal = gEntry.address.state || gEntry.address.county || '';
            const countryVal = gEntry.address.country || '';
            const pinVal = gEntry.address.postcode || '';

            if (target === 'temp') {
              ignoreAutoFill.current = true;
              setTempAddress(p => ({ ...p, state: stateVal || p.state, country: countryVal || p.country, pinCode: pinVal }));
              setTimeout(() => { ignoreAutoFill.current = false; }, 2000);
            } else {
              ignoreAutoFill.current = true;
              setPermAddress(p => ({ ...p, state: stateVal || p.state, country: countryVal || p.country, pinCode: pinVal }));
              setTimeout(() => { ignoreAutoFill.current = false; }, 2000);
            }
          }
        }
      } catch (err2) {
        console.error("Global lookup failed", err2);
      }
    } finally {
      setPincodeLoading(false);
    }
  }, []);

  // Debounced Effect for City Lookup - Temp Address
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tempAddress.city && tempAddress.city.length > 2) handleCityLookup(tempAddress.city, 'temp');
    }, 800);
    return () => clearTimeout(timer);
  }, [tempAddress.city, handleCityLookup]);

  // Debounced Effect for City Lookup - Perm Address
  useEffect(() => {
    if (sameAsTemp) return;
    const timer = setTimeout(() => {
      if (permAddress.city && permAddress.city.length > 2) handleCityLookup(permAddress.city, 'perm');
    }, 800);
    return () => clearTimeout(timer);
  }, [permAddress.city, sameAsTemp, handleCityLookup]);

  // ... (renderFilePreview and validateStep unchanged)

  // ...

  // Helper to render file preview
  const renderFilePreview = (fileOrUrl, altText) => {
    if (!fileOrUrl) return null;
    const isFile = fileOrUrl instanceof File;
    const isPdf = isFile ? (fileOrUrl.type === 'application/pdf') : fileOrUrl.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return <div className="text-red-500 font-bold text-xs p-2 text-center border rounded bg-slate-50">PDF Document</div>;
    }

    let src = '';
    if (isFile) {
      src = URL.createObjectURL(fileOrUrl);
    } else {
      if (fileOrUrl.startsWith('http')) {
        src = fileOrUrl;
      } else {
        // Normalize URL: remove /api from end if present (for static files), remove trailing slash
        const backendUrl = BACKEND_URL || '';
        const baseUrl = backendUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        const cleanPath = (fileOrUrl || '').replace(/\\/g, '/');
        const path = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
        src = `${baseUrl}${path}`;
      }
    }

    return <img src={src} alt={altText} className="w-full h-full object-contain" />;
  };

  const validateStep = (stepNum) => {
    const e = {};
    if (stepNum === 1) {
      if (!firstName || firstName.length < 3 || !/^[A-Za-z\s.]+$/.test(firstName)) e.firstName = 'First name required (min 3 chars, letters, spaces, dots allowed)';
      if (!middleName || middleName.length < 3) e.middleName = 'Middle name is required (min 3 chars)';
      if (!lastName || lastName.length < 3) e.lastName = 'Last name is required (min 3 chars)';
      if (!gender) e.gender = 'Gender is required';
      if (!departmentId) e.department = 'Department is required';
      if (!joiningDate) e.joiningDate = 'Joining Date is required';
      if (!dob) e.dob = 'Date of birth required';
      else {
        const birth = new Date(dob); const age = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        if (age < 18) e.dob = 'Employee must be at least 18 years old';
      }
      const getDigitCount = (str) => String(str || '').replace(/\D/g, '').length;
      const indianPhoneRe = /^[6-9]\d{9}$/;
      if (!contactNo || !indianPhoneRe.test(contactNo)) e.contactNo = 'Valid 10-digit Indian phone required (starts with 6-9)';
      // Email and Password validation removed

      if (!maritalStatus) e.maritalStatus = 'Marital Status is required';

      const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
      if (!bloodGroup) e.bloodGroup = 'Blood Group is required';
      else if (!validBloodGroups.includes(bloodGroup.toUpperCase())) e.bloodGroup = 'Invalid Blood Group (Allowed: A+, A-, B+, B-, O+, O-, AB+, AB-)';

      if (!nationality) e.nationality = 'Nationality is required';

      // Father/Mother remain optional, but validate if entered
      if (fatherName && fatherName.length < 3) e.fatherName = 'Father name must be at least 3 chars';
      if (motherName && motherName.length < 3) e.motherName = 'Mother name must be at least 3 chars';

      if (!emergencyContactName || emergencyContactName.length < 3) e.emergencyContactName = 'Emergency contact name required (min 3 chars)';
      if (!emergencyContactNumber || !indianPhoneRe.test(emergencyContactNumber)) e.emergencyContactNumber = 'Valid 10-digit Indian emergency contact required (6-9)';
    }

    if (stepNum === 2) {
      if (!tempAddress.line1) e.tempLine1 = 'Temporary address line1 required';
      if (!tempAddress.city) e.tempCity = 'Temporary city required';
      if (!tempAddress.state) e.tempState = 'Temporary state required';
      if (!tempAddress.pinCode || !pinRe.test(tempAddress.pinCode)) e.tempPin = 'Temporary pin code invalid';
      if (!tempAddress.country) e.tempCountry = 'Temporary country required';
      if (!sameAsTemp) {
        if (!permAddress.line1) e.permLine1 = 'Permanent address line1 required';
        if (!permAddress.city) e.permCity = 'Permanent city required';
        if (!permAddress.state) e.permState = 'Permanent state required';
        if (!permAddress.pinCode || !pinRe.test(permAddress.pinCode)) e.permPin = 'Permanent pin code invalid';
        if (!permAddress.country) e.permCountry = 'Permanent country required';
      }
    }

    if (stepNum === 3) {
      experience.forEach((exp, idx) => {
        if (exp.from && exp.to) {
          const f = new Date(exp.from); const t = new Date(exp.to);
          if (f > t) e[`exp_${idx}`] = 'From date must be before To date';
        }
        // Mandatory fields check
        if (!exp.companyName) e[`exp_${idx}`] = 'Company Name is required';
        if (!exp.reportingPersonName) e[`exp_${idx}`] = 'Reporting Person Name is required';
        if (!exp.reportingPersonEmail) e[`exp_${idx}`] = 'Reporting Person Email is required';
        if (!exp.payslips || exp.payslips.filter(Boolean).length !== 3) e[`exp_${idx}`] = 'Exactly 3 payslips are required';
      });
    }

    if (stepNum === 4) {
      if (!employee) {
        if (!bankName) e.bankName = 'Bank name required';
        if (!accountNumber || !/^[0-9]{9,18}$/.test(accountNumber)) e.accountNumber = 'Account Number must be 9-18 digits';
        if (!ifsc || !ifscRe.test(ifsc)) e.ifsc = 'IFSC invalid';
        if (!branchName) e.branchName = 'Branch name required';
        // Bank Proof Mandatory Validation
        if (!currentBankProof) e.bankProof = 'Bank Proof (Cheque/Passbook Photo) is required';
      }
    }

    if (stepNum === 5) {
      if (!eduType) { e.eduType = 'Education Type is required'; return false; }

      // Common Rule: 10th Marksheet is always required
      if (!class10Marksheet) e.class10 = '10th Marksheet is required';

      if (eduType === 'Diploma') {
        // Diploma: Require Diploma Certificate OR (Last 3 Sem Marksheets)
        const hasDegree = !!diplomaCertificate;
        const hasAlt = lastSem1 && lastSem2 && lastSem3;
        if (!hasDegree && !hasAlt) {
          e.diploma = 'Diploma Certificate OR Last 3 Sem Marksheets required';
        }
      } else if (eduType === 'Bachelor') {
        if (!class12Marksheet) e.class12 = '12th Marksheet is required';
        // Bachelor: Require Bachelor Degree OR (Last 3 Sem Marksheets)
        const hasDegree = !!bachelorDegree;
        const hasAlt = lastSem1 && lastSem2 && lastSem3;
        if (!hasDegree && !hasAlt) {
          e.bachelor = 'Bachelor Degree OR Last 3 Sem Marksheets required';
        }
      }
    }

    if (stepNum === 6) {
      // Identity Documents validation
      if (!aadharFront && !employee?.documents?.aadharFront) e.aadharFront = 'Aadhar Front is required';
      if (!aadharBack && !employee?.documents?.aadharBack) e.aadharBack = 'Aadhar Back is required';
      if (!panCard && !employee?.documents?.panCard) e.panCard = 'PAN Card is required';
    }

    if (stepNum === 7) {
      // Step 7: Account Credentials
      // Employee Code is read-only
      if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = 'Valid Email is required';

      // Password is now mandatory for both New/Draft AND Edit modes
      if (!password && !employee?._id) { // Only mandatory if new? Actually old code said "password || employee ? .. : valid"
        // Re-reading logic: new employee needs password. Edit doesn't unless changing.
        if (password && password.length < 6) e.password = 'Password min 6 chars';
        if (!employee && !password) e.password = 'Password is required';
      }
    }

    if (stepNum === 8) {
      if (!salaryTemplateId) e.salaryTemplate = "Salary Template is required";
      if (!salaryEffectiveDate) e.effectiveDate = "Effective Date is required";
      if (joiningDate && salaryEffectiveDate < joiningDate) e.effectiveDate = "Cannot be before Joining Date";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };


  const handlePrev = () => {
    setStep(step - 1);
  };

  useEffect(() => {
    if (sameAsTemp) setPermAddress({ ...tempAddress });
  }, [sameAsTemp, tempAddress]);

  useEffect(() => {
    const t = setTimeout(() => {
      const pin = tempAddress.pinCode;
      if (pin && pinRe.test(pin)) handlePincodeLookup(pin, 'temp');
    }, 500);
    return () => clearTimeout(t);
  }, [tempAddress.pinCode, handlePincodeLookup, pinRe]);

  useEffect(() => {
    const t = setTimeout(() => {
      const pin = permAddress.pinCode;
      if (pin && pinRe.test(pin) && !sameAsTemp) handlePincodeLookup(pin, 'perm');
    }, 500);
    return () => clearTimeout(t);
  }, [permAddress.pinCode, sameAsTemp, handlePincodeLookup, pinRe]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (ifsc && ifscRe.test(ifsc)) handleIfscLookup(ifsc);
    }, 500);
    return () => clearTimeout(t);
  }, [ifsc, handleIfscLookup, ifscRe]);

  async function submit(e) {
    e.preventDefault();
    if (!validateStep(7)) return;
    setSaving(true);
    try {
      // Upload Current Bank Proof if changed
      let currentBankProofUrl = employee?.bankDetails?.bankProofUrl;
      if (currentBankProof && currentBankProof instanceof File) {
        try {
          const fd = new FormData();
          fd.append('file', currentBankProof);
          const up = await api.post('/uploads/doc', fd);
          if (up?.data?.success) currentBankProofUrl = up.data.url;
        } catch (e) { console.warn('Bank proof upload failed', e) }
      } else if (currentBankProof) {
        currentBankProofUrl = currentBankProof; // string
      } else {
        currentBankProofUrl = ''; // removed
      }
      /* Profile Pic removed
      let profilePicUrl = employee?.profilePic || undefined;
      if (profilePic && profilePic instanceof File) { ... } 
      */

      // Process experience file uploads
      let processedExperience = [];
      if (experience && experience.length > 0) {
        processedExperience = await Promise.all(experience.map(async (exp) => {
          let pSlips = [];
          if (exp.payslips && exp.payslips.length > 0) {
            for (const item of exp.payslips) {
              if (item instanceof File) {
                const fd = new FormData();
                fd.append('file', item);
                try {
                  const up = await api.post('/uploads/doc', fd);
                  if (up?.data?.success) pSlips.push(up.data.url);
                } catch (e) { console.warn('Payslip upload failed', e); }
              } else if (typeof item === 'string') { pSlips.push(item); }
            }
          }
          return { ...exp, payslips: pSlips };
        }));
      }

      // Education File Uploads
      let c10Url = employee?.education?.class10Marksheet;
      let c12Url = employee?.education?.class12Marksheet;
      let diplomaUrl = employee?.education?.diplomaCertificate;
      let bachelorUrl = employee?.education?.bachelorDegree;
      let masterUrl = employee?.education?.masterDegree;
      let ls1Url = employee?.education?.lastSem1Marksheet;
      let ls2Url = employee?.education?.lastSem2Marksheet;
      let ls3Url = employee?.education?.lastSem3Marksheet;

      const uploadFile = async (file) => {
        if (!file || !(file instanceof File)) return null;
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await api.post('/uploads/doc', fd);
          return res?.data?.success ? res.data.url : null;
        } catch (e) {
          console.warn('File upload failed', e);
          return null;
        }
      };

      if (class10Marksheet instanceof File) { c10Url = await uploadFile(class10Marksheet) || c10Url; }
      if (class12Marksheet instanceof File) { c12Url = await uploadFile(class12Marksheet) || c12Url; }
      if (diplomaCertificate instanceof File) { diplomaUrl = await uploadFile(diplomaCertificate) || diplomaUrl; }
      if (bachelorDegree instanceof File) { bachelorUrl = await uploadFile(bachelorDegree) || bachelorUrl; }
      if (masterDegree instanceof File) { masterUrl = await uploadFile(masterDegree) || masterUrl; }

      if (lastSem1 instanceof File) { ls1Url = await uploadFile(lastSem1) || ls1Url; }
      if (lastSem2 instanceof File) { ls2Url = await uploadFile(lastSem2) || ls2Url; }
      if (lastSem3 instanceof File) { ls3Url = await uploadFile(lastSem3) || ls3Url; }

      // Step 6 Documents

      // Step 6 Documents
      let aadharFrontUrl = employee?.documents?.aadharFront;
      let aadharBackUrl = employee?.documents?.aadharBack;
      let panUrl = employee?.documents?.panCard;
      let profilePicUrl = employee?.profilePic; // Existing URL

      if (profilePic instanceof File) { profilePicUrl = await uploadFile(profilePic) || profilePicUrl; }
      if (aadharFront instanceof File) { aadharFrontUrl = await uploadFile(aadharFront) || aadharFrontUrl; }
      if (aadharBack instanceof File) { aadharBackUrl = await uploadFile(aadharBack) || aadharBackUrl; }
      if (panCard instanceof File) { panUrl = await uploadFile(panCard) || panUrl; }

      const payload = {
        firstName, middleName, lastName, gender, dob: dob || undefined,
        contactNo, email, password: password || undefined,
        maritalStatus, bloodGroup, nationality, fatherName, motherName,
        emergencyContactName, emergencyContactNumber,
        tempAddress, permAddress: sameAsTemp ? tempAddress : permAddress,
        experience: processedExperience,
        jobType,
        bankDetails: { bankName, accountNumber, ifsc, branchName, location: bankLocation, bankProofUrl: currentBankProofUrl },
        education: {
          type: eduType,
          class10Marksheet: c10Url,
          class12Marksheet: c12Url,
          diplomaCertificate: diplomaUrl,
          bachelorDegree: bachelorUrl,
          masterDegree: masterUrl,
          lastSem1Marksheet: ls1Url,
          lastSem2Marksheet: ls2Url,
          lastSem3Marksheet: ls3Url
        },
        documents: {
          aadharFront: aadharFrontUrl,
          aadharBack: aadharBackUrl,
          panCard: panUrl
        },
        role,
        department: department || (departments.find(d => d._id === departmentId)?.name || ''),
        departmentId: departmentId || undefined,
        manager: manager || undefined,
        joiningDate: joiningDate || new Date().toISOString(),
        departmentHead: _departmentHead,
        profilePic: profilePicUrl,
        status: 'Active',
        lastStep: 7,
        leavePolicy: leavePolicy || undefined,
      };

      let empResult;
      if (employee) {
        empResult = await api.put(`/hr/employees/${employee._id}`, payload);
      } else {
        empResult = await api.post('/hr/employees', payload);
      }

      // If employee is marked as "Dep Head", update the department's head field
      if (role === 'Dep Head' && departmentId) {
        const empId = empResult?.data?.data?._id || empResult?.data?._id || employee?._id;
        if (empId) {
          await api.put(`/hr/departments/${departmentId}`, { head: empId })
            .catch(err => console.error('Failed to update department head', err?.response?.data?.message || err.message));
        }
      }

      onClose();
    } catch (err) {
      console.error('Employee save error:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to save employee';
      showToast('error', 'Error', errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(e) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const uploadFile = async (file) => {
        if (!file || !(file instanceof File)) return null;
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await api.post('/uploads/doc', fd);
          return res?.data?.success ? res.data.url : null;
        } catch (e) { console.warn('File upload failed', e); return null; }
      };

      // Bank Proof
      let currentBankProofUrl = employee?.bankDetails?.bankProofUrl;
      if (currentBankProof && currentBankProof instanceof File) {
        currentBankProofUrl = await uploadFile(currentBankProof) || currentBankProofUrl;
      } else if (currentBankProof) { currentBankProofUrl = currentBankProof; }
      else { currentBankProofUrl = ''; }

      // Profile Pic
      let profilePicUrl = employee?.profilePic;
      if (profilePic && profilePic instanceof File) {
        profilePicUrl = await uploadFile(profilePic) || profilePicUrl;
      } else if (profilePic) { profilePicUrl = profilePic; }

      // Payslips
      let processedExperience = [];
      if (experience && experience.length > 0) {
        processedExperience = await Promise.all(experience.map(async (exp) => {
          let pSlips = [];
          if (exp.payslips && exp.payslips.length > 0) {
            for (const item of exp.payslips) {
              if (item instanceof File) {
                const u = await uploadFile(item);
                if (u) pSlips.push(u);
              } else if (typeof item === 'string') { pSlips.push(item); }
            }
          }
          return { ...exp, payslips: pSlips };
        }));
      }

      // Education
      let c10Url = employee?.education?.class10Marksheet;
      let c12Url = employee?.education?.class12Marksheet;
      let diplomaUrl = employee?.education?.diplomaCertificate;
      let bachelorUrl = employee?.education?.bachelorDegree;
      let masterUrl = employee?.education?.masterDegree;
      let ls1Url = employee?.education?.lastSem1Marksheet;
      let ls2Url = employee?.education?.lastSem2Marksheet;
      let ls3Url = employee?.education?.lastSem3Marksheet;

      if (class10Marksheet instanceof File) { c10Url = await uploadFile(class10Marksheet) || c10Url; }
      if (class12Marksheet instanceof File) { c12Url = await uploadFile(class12Marksheet) || c12Url; }
      if (diplomaCertificate instanceof File) { diplomaUrl = await uploadFile(diplomaCertificate) || diplomaUrl; }
      if (bachelorDegree instanceof File) { bachelorUrl = await uploadFile(bachelorDegree) || bachelorUrl; }
      if (masterDegree instanceof File) { masterUrl = await uploadFile(masterDegree) || masterUrl; }

      if (lastSem1 instanceof File) { ls1Url = await uploadFile(lastSem1) || ls1Url; }
      if (lastSem2 instanceof File) { ls2Url = await uploadFile(lastSem2) || ls2Url; }
      if (lastSem3 instanceof File) { ls3Url = await uploadFile(lastSem3) || ls3Url; }

      let aadharFrontUrl = employee?.documents?.aadharFront;
      let aadharBackUrl = employee?.documents?.aadharBack;
      let panUrl = employee?.documents?.panCard;
      if (aadharFront instanceof File) { aadharFrontUrl = await uploadFile(aadharFront) || aadharFrontUrl; }
      if (aadharBack instanceof File) { aadharBackUrl = await uploadFile(aadharBack) || aadharBackUrl; }
      if (panCard instanceof File) { panUrl = await uploadFile(panCard) || panUrl; }

      const payload = {
        firstName, middleName, lastName,
        gender: gender || undefined,
        dob: dob || undefined,
        contactNo, email,
        password: password || undefined,
        maritalStatus: maritalStatus || undefined,
        bloodGroup,
        nationality: nationality || undefined,
        fatherName, motherName,
        emergencyContactName, emergencyContactNumber,
        tempAddress, permAddress: sameAsTemp ? tempAddress : permAddress,
        experience: processedExperience,
        jobType: jobType || undefined,
        bankDetails: { bankName, accountNumber, ifsc, branchName, location: bankLocation, bankProofUrl: currentBankProofUrl },
        education: {
          type: eduType,
          class10Marksheet: c10Url,
          class12Marksheet: c12Url,
          diplomaCertificate: diplomaUrl,
          bachelorDegree: bachelorUrl,
          masterDegree: masterUrl,
          lastSem1Marksheet: ls1Url,
          lastSem2Marksheet: ls2Url,
          lastSem3Marksheet: ls3Url
        },
        documents: {
          aadharFront: aadharFrontUrl,
          aadharBack: aadharBackUrl,
          panCard: panUrl
        },
        role, department: department || undefined, departmentId: departmentId || undefined,
        manager: manager || undefined, joiningDate: joiningDate || undefined,
        profilePic: profilePicUrl,
        status: 'Draft',
        lastStep: step,
        leavePolicy: leavePolicy || undefined, // Add Leave Policy
      };

      if (employee?._id) {
        await api.put(`/hr/employees/${employee._id}`, payload);
      } else {
        await api.post('/hr/employees', payload);
        // If new employee created, we might want to set it so future saves are updates?
        // But for now just alert.
      }
      showToast('success', 'Success', 'Draft saved successfully!');
      // onClose(); // Removed as requested: User wants to stay on form
    } catch (err) {
      console.error("Failed to save draft", err);
      showToast('error', 'Error', "Failed to save draft: " + (err.response?.data?.message || err.message));
    } finally { setSaving(false); }
  }

  const stepTitles = ['General Details', 'Address', 'Experience', 'Bank & Job', 'Education Details', 'Identity Documents', 'Account Credentials', 'Payroll / Compensation'];

  return (
    <div>
      <form onSubmit={submit} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm w-full">
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">{employee ? 'Edit' : 'Add'} Employee - Step {step} of {stepTitles.length}</h3>
          <div className="text-xs text-slate-500">{stepTitles[step - 1]}</div>
        </div>

        {/* Draft Badge */}
        {employee?.status === 'Draft' && (
          <div className="mb-4 bg-amber-50 text-amber-800 text-sm px-3 py-2 rounded border border-amber-200">
            This is a <strong>Draft</strong>. You are currently on Step {step}.
          </div>
        )}

        {/* Step 1: General Details */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Profile Picture Upload */}
            <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col md:flex-row items-center gap-8 group">
              <div className="relative">
                <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                  {profilePreview ? (
                    <img src={profilePreview instanceof File ? URL.createObjectURL(profilePreview) : `${BACKEND_URL}${profilePreview}`} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-300">
                      <User size={40} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => profilePicRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-[#14B8A6] text-white p-3 rounded-2xl shadow-xl hover:bg-[#0D9488] hover:scale-110 transition-all border-4 border-white dark:border-slate-900"
                  title="Upload Photo"
                >
                  <Camera size={18} />
                </button>
                <input ref={profilePicRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files[0]; if (file) { setProfilePic(file); setProfilePreview(file); } }} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="text-[10px] font-black text-[#14B8A6] uppercase tracking-[0.2em] mb-1">Visual Identity</p>
                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Profile Photo</h4>
                <p className="text-[11px] font-medium text-slate-400 mt-1 max-w-xs">Upload a clear professional photo for the company directory. Supporting JPG, PNG up to 2MB.</p>
                {profilePic && (
                  <button
                    type="button"
                    onClick={() => { setProfilePic(null); setProfilePreview(null); if (profilePicRef.current) profilePicRef.current.value = ''; }}
                    className="mt-4 flex items-center gap-2 group/btn px-4 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-900/30"
                  >
                    <Trash2 size={14} />
                    Remove Image
                  </button>
                )}
              </div>
            </div>

            {/* Section: Identity Details */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-4 mb-8 border-l-[4px] border-[#14B8A6] pl-5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-[#14B8A6]">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Identity Details</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Core personnel information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">First Name <span className="text-rose-500">*</span></label>
                  <input required value={firstName} onChange={e => { const v = e.target.value; setFirstName(v ? v.charAt(0).toUpperCase() + v.slice(1) : v); }} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all duration-300 text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 ${errors.firstName ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-slate-900'}`} placeholder="John" />
                  {errors.firstName && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest animate-shake"><AlertCircle size={12} /> {errors.firstName}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Middle Name</label>
                  <input value={middleName} onChange={e => { const v = e.target.value; setMiddleName(v ? v.charAt(0).toUpperCase() + v.slice(1) : v); }} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" placeholder="Ex: D." />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Last Name <span className="text-rose-500">*</span></label>
                  <input required value={lastName} onChange={e => { const v = e.target.value; setLastName(v ? v.charAt(0).toUpperCase() + v.slice(1) : v); }} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all duration-300 text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 ${errors.lastName ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-slate-900'}`} placeholder="Doe" />
                  {errors.lastName && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest animate-shake"><AlertCircle size={12} /> {errors.lastName}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.gender ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Date of Birth</label>
                  <DatePicker
                    className={`w-full h-auto px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all ${errors.dob ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`}
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    allowClear={false}
                    value={dob ? dayjs(dob) : null}
                    onChange={(date) => setDob(date ? date.format('YYYY-MM-DD') : '')}
                  />
                </div>
              </div>
            </div>

            {/* Section: Official Information */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-4 mb-8 border-l-[4px] border-[#14B8A6] pl-5">
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Official Records</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Employment & Role placement</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Department <span className="text-rose-500">*</span></label>
                  <select
                    value={departmentId}
                    onChange={e => {
                      const selectedDept = departments.find(d => d._id === e.target.value);
                      setDepartmentId(e.target.value);
                      setDepartment(selectedDept?.name || '');
                    }}
                    className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.department ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`}
                    required
                    disabled={departmentsLoading}
                  >
                    <option value="">{departmentsLoading ? 'Loading...' : 'Select Department'}</option>
                    {departments.map((d) => (
                      <option key={d._id || d} value={d._id || d}>{typeof d === 'string' ? d : d.name}</option>
                    ))}
                  </select>
                  {errors.department && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest">{errors.department}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Manager</label>
                  <select
                    value={manager}
                    onChange={e => setManager(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="">No Manager (Top Level)</option>
                    {managers
                      .filter(m => {
                        if (!departmentId && !department) return true;
                        const mgrDeptId = m?.departmentId?._id || m?.departmentId;
                        if (departmentId && mgrDeptId && String(mgrDeptId) === String(departmentId)) return true;
                        if (department && m?.department && String(m.department) === String(department)) return true;
                        return false;
                      })
                      .map((m) => (
                        <option key={m._id} value={m._id}>
                          {[m.firstName, m.lastName].filter(Boolean).join(' ')} ({m.employeeId})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Leave Policy</label>
                  <select
                    value={leavePolicy}
                    onChange={e => setLeavePolicy(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Select Policy</option>
                    {policies.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Joining Date <span className="text-rose-500">*</span></label>
                  <DatePicker
                    className="w-full h-auto px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    allowClear={false}
                    value={joiningDate ? dayjs(joiningDate) : null}
                    onChange={(date) => setJoiningDate(date ? date.format('YYYY-MM-DD') : '')}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Designation / Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option>Employee</option>
                    <option>Manager</option>
                    <option>Dep Head</option>
                    <option>HR</option>
                    <option>Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Job Type</label>
                  <select
                    value={jobType}
                    onChange={e => setJobType(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Internship</option>
                    <option>Contract</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Personal Profiles */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-4 mb-8 border-l-[4px] border-[#14B8A6] pl-5">
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
                  <Heart size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Personal Profile</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Personal & Family metadata</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Marital Status</label>
                  <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200">
                    <option value="">Select</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                    className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.bloodGroup ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`}
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                  {errors.bloodGroup && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest">{errors.bloodGroup}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nationality</label>
                  <select
                    value={nationality}
                    onChange={e => setNationality(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Select Country</option>
                    {NATIONALITIES.map((nat) => (
                      <option key={nat} value={nat}>{nat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Father's Name</label>
                  <input value={fatherName} onChange={e => { const v = e.target.value; setFatherName(v ? v.charAt(0).toUpperCase() + v.slice(1) : v); }} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" placeholder="Ex: Robert Smith" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mother's Name</label>
                  <input value={motherName} onChange={e => { const v = e.target.value; setMotherName(v ? v.charAt(0).toUpperCase() + v.slice(1) : v); }} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" placeholder="Ex: Mary Smith" />
                </div>
              </div>
            </div>

            {/* Section: Contact Information */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-4 mb-8 border-l-[4px] border-[#14B8A6] pl-5">
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Communication</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Verified connection methods</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Phone <span className="text-rose-500">*</span></label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-[#14B8A6] transition-colors">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      maxLength="10"
                      onInput={e => e.target.value = e.target.value.replace(/\D/g, '')}
                      value={contactNo}
                      onChange={e => setContactNo(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.contactNo ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`}
                      placeholder="10-digit mobile"
                    />
                  </div>
                  {errors.contactNo && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.contactNo}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Emergency Name <span className="text-rose-500">*</span></label>
                  <input value={emergencyContactName} onChange={e => { const v = e.target.value; setEmergencyContactName(v ? v.charAt(0).toUpperCase() + v.slice(1) : v); }} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.emergencyContactName ? 'border-rose-100' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`} placeholder="Contact name" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Emergency Ph. <span className="text-rose-500">*</span></label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-[#14B8A6] transition-colors">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      maxLength="10"
                      onInput={e => e.target.value = e.target.value.replace(/\D/g, '')}
                      value={emergencyContactNumber}
                      onChange={e => setEmergencyContactNumber(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.emergencyContactNumber ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`}
                      placeholder="10-digit mobile"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Address */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Temporary Address Section */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-4 mb-8 border-l-[4px] border-[#14B8A6] pl-5">
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
                  <Home size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Temporary Residence</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Current living location</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Address Line 1 <span className="text-rose-500">*</span></label>
                  <input value={tempAddress.line1} onChange={e => setTempAddress(p => ({ ...p, line1: e.target.value }))} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.tempLine1 ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`} placeholder="Street, Sector, Area" />
                  {errors.tempLine1 && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.tempLine1}</div>}
                </div>
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Address Line 2 (Optional)</label>
                  <input value={tempAddress.line2} onChange={e => setTempAddress(p => ({ ...p, line2: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" placeholder="Landmark, Building Name" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">City <span className="text-rose-500">*</span></label>
                  <div className="relative group/city">
                    <input
                      value={tempAddress.city}
                      onChange={e => {
                        setTempAddress(p => ({ ...p, city: e.target.value }));
                        setPincodeLoading(true);
                      }}
                      className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.tempCity ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`}
                      placeholder="Start typing..."
                    />
                    {pincodeLoading && tempAddress.city.length > 2 && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#14B8A6] animate-pulse font-bold uppercase tracking-tighter">Searching</div>}
                  </div>
                  {errors.tempCity && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.tempCity}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">State</label>
                  <input value={tempAddress.state} onChange={e => setTempAddress(p => ({ ...p, state: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-900/30 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-500 cursor-not-allowed" disabled />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pin / Zip Code <span className="text-rose-500">*</span></label>
                  <input value={tempAddress.pinCode} onChange={e => setTempAddress(p => ({ ...p, pinCode: e.target.value }))} onBlur={() => handlePincodeLookup(tempAddress.pinCode, 'temp')} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.tempPin ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`} placeholder="6-digit code" />
                  {errors.tempPin && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.tempPin}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Country</label>
                  <input value={tempAddress.country} onChange={e => setTempAddress(p => ({ ...p, country: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-900/30 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-500 cursor-not-allowed" disabled />
                </div>
              </div>
            </div>

            {/* Same As Temp Checkbox */}
            <label className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 group cursor-pointer transition-all hover:bg-white dark:hover:bg-slate-900">
              <input
                type="checkbox"
                checked={sameAsTemp}
                onChange={e => {
                  const checked = e.target.checked;
                  setSameAsTemp(checked);
                  if (!checked) {
                    setPermAddress({ line1: '', line2: '', city: '', state: '', pinCode: '', country: '' });
                  }
                }}
                className="w-6 h-6 rounded-lg text-[#14B8A6] focus:ring-[#14B8A6] border-2 border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              />
              <span className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Permanent Address is same as Temporary Address</span>
            </label>

            {/* Permanent Address Section */}
            <div className={`transition-all duration-500 ${sameAsTemp ? 'opacity-40 grayscale pointer-events-none scale-95 blur-[1px]' : 'opacity-100 grayscale-0 scale-100 blur-0'}`}>
              <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="flex items-center gap-4 mb-8 border-l-[4px] border-[#14B8A6] pl-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Permanent Address</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Legal birthplace/home</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Address Line 1 <span className="text-rose-500">*</span></label>
                    <input value={permAddress.line1} onChange={e => setPermAddress(p => ({ ...p, line1: e.target.value }))} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.permLine1 ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`} disabled={sameAsTemp} />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Address Line 2</label>
                    <input value={permAddress.line2} onChange={e => setPermAddress(p => ({ ...p, line2: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" disabled={sameAsTemp} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">City <span className="text-rose-500">*</span></label>
                    <input value={permAddress.city} onChange={e => setPermAddress(p => ({ ...p, city: e.target.value }))} onBlur={() => handleCityLookup(permAddress.city, 'perm')} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.permCity ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`} disabled={sameAsTemp} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">State</label>
                    <input value={permAddress.state} onChange={e => setPermAddress(p => ({ ...p, state: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-900/30 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-500 cursor-not-allowed" disabled={sameAsTemp} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pin / Zip Code <span className="text-rose-500">*</span></label>
                    <input value={permAddress.pinCode} onChange={e => setPermAddress(p => ({ ...p, pinCode: e.target.value }))} onBlur={() => handlePincodeLookup(permAddress.pinCode, 'perm')} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.permPin ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6]'}`} disabled={sameAsTemp} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Country</label>
                    <input value={permAddress.country} onChange={e => setPermAddress(p => ({ ...p, country: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-900/30 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-500 cursor-not-allowed" disabled={sameAsTemp} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Experience */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between gap-4 p-8 bg-white dark:bg-slate-900/40 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-4 border-l-[4px] border-[#14B8A6] pl-5">
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Professional History</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Previous work experience & proofs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExperience([...experience, { companyName: '', from: '', to: '', lastDrawnSalary: '', reportingPersonName: '', reportingPersonEmail: '', reportingPersonContact: '', payslips: [] }])}
                className="flex items-center gap-2 px-6 py-3 bg-[#14B8A6] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0D9488] shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
              >
                <Plus size={16} />
                Add Entry
              </button>
            </div>
            {experience.map((exp, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative group animate-in zoom-in-95 duration-300">
                {experience.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...experience];
                      copy.splice(idx, 1);
                      setExperience(copy);
                    }}
                    className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-all p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl"
                    title="Remove Entry"
                  >
                    <Trash2 size={20} />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-teal-500 rounded-full"></div>
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Company Details</h5>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Organization <span className="text-rose-500">*</span></label>
                      <input placeholder="Ex. Tech Solutions Inc." value={exp.companyName} onChange={e => { const v = e.target.value; const copy = [...experience]; copy[idx].companyName = v ? v.charAt(0).toUpperCase() + v.slice(1) : v; setExperience(copy); }} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">From Date</label>
                        <DatePicker
                          className="w-full h-auto px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all"
                          format="DD-MM-YYYY"
                          placeholder="DD-MM-YYYY"
                          value={exp.from ? dayjs(exp.from) : null}
                          onChange={(date) => { const copy = [...experience]; copy[idx].from = date ? date.format('YYYY-MM-DD') : ''; setExperience(copy); }}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">To Date</label>
                        <DatePicker
                          className="w-full h-auto px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all"
                          format="DD-MM-YYYY"
                          placeholder="DD-MM-YYYY"
                          value={exp.to ? dayjs(exp.to) : null}
                          onChange={(date) => { const copy = [...experience]; copy[idx].to = date ? date.format('YYYY-MM-DD') : ''; setExperience(copy); }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Last Drawn Salary</label>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-[#14B8A6] transition-colors">
                          <IndianRupee size={16} />
                        </div>
                        <input type="number" placeholder="0.00" value={exp.lastDrawnSalary} onChange={e => { const copy = [...experience]; copy[idx].lastDrawnSalary = e.target.value; setExperience(copy); }} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-teal-500 rounded-full"></div>
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Reporting Authority</h5>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Manager Name <span className="text-rose-500">*</span></label>
                      <input placeholder="Ex. Robert Smith" value={exp.reportingPersonName || ''} onChange={e => { const v = e.target.value; const copy = [...experience]; copy[idx].reportingPersonName = v ? v.charAt(0).toUpperCase() + v.slice(1) : v; setExperience(copy); }} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Manager Email <span className="text-rose-500">*</span></label>
                      <input placeholder="robert@company.com" value={exp.reportingPersonEmail || ''} onChange={e => { const copy = [...experience]; copy[idx].reportingPersonEmail = e.target.value; setExperience(copy); }} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Manager Phone</label>
                      <input placeholder="Optional contact number" value={exp.reportingPersonPhone || ''} onChange={e => { const copy = [...experience]; copy[idx].reportingPersonPhone = e.target.value; setExperience(copy); }} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all text-sm font-bold text-slate-700 dark:text-slate-200" />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <FileText size={16} /> Verification Documents
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Recent Payslips (Last 3 Months) <span className="text-rose-500">*</span></label>
                          <div className="flex gap-4">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="flex-1 group/upload">
                                <label className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:border-[#14B8A6] hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all aspect-square min-h-[90px]">
                                  <div className="text-[9px] font-black text-slate-400 group-hover/upload:text-[#14B8A6] mb-1">MO-{i + 1}</div>
                                  <Upload size={18} className="text-slate-300 group-hover/upload:text-[#14B8A6] transition-colors" />
                                </label>
                                <input type="file" className="hidden" onChange={(e) => { const file = e.target.files[0]; const copy = [...experience]; if (!copy[idx].payslips) copy[idx].payslips = []; copy[idx].payslips[i] = file; setExperience(copy); }} />
                                {exp.payslips && exp.payslips[i] && (
                                  <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-[#14B8A6] px-2 animate-in fade-in duration-300">
                                    <CheckCircle size={10} />
                                    <span className="truncate max-w-[50px]">{exp.payslips[i].name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Bank Proof (Cheque/Passbook) <span className="text-rose-500">*</span></label>
                          <label className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:border-[#14B8A6] hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all min-h-[90px] group/bank">
                            <Upload size={24} className="text-slate-300 group-hover/bank:text-[#14B8A6] transition-colors mb-1" />
                            <div className="text-[10px] font-black text-slate-400 group-hover/bank:text-[#14B8A6]">Upload proof</div>
                          </label>
                          <input type="file" className="hidden" onChange={(e) => { const file = e.target.files[0]; const copy = [...experience]; copy[idx].chequebook = file; setExperience(copy); }} />
                          {exp.chequebook && (
                            <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-[#14B8A6] px-2 animate-in fade-in duration-300 uppercase tracking-widest">
                              <CheckCircle size={12} /> {exp.chequebook.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}



            <button
              type="button"
              onClick={() => setExperience([...experience, { companyName: '', from: '', to: '', lastDrawnSalary: '', reportingPersonName: '', reportingPersonEmail: '', reportingPersonContact: '', payslips: [] }])}
              className="w-full py-3 border-2 border-dashed border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold transition flex items-center justify-center gap-2 hover:border-blue-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Another Experience
            </button>
          </div>
        )}

        {/* Step 4: Bank & Job */}
        {/* Step 4: Bank & Job */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Bank Details Section */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-500"></div>

              <div className="flex items-center gap-4 mb-8 border-l-[4px] border-emerald-500 pl-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Bank Repository</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Salary disbursement details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Financial Institution</label>
                  <input value={bankName} onChange={e => setBankName(e.target.value)} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.bankName ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-emerald-500'}`} placeholder="Ex. HDFC Bank, SBI" />
                  {errors.bankName && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.bankName}</div>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Account Identifier</label>
                  <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.accountNumber ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-emerald-500'}`} placeholder="Standard account number" />
                  {errors.accountNumber && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.accountNumber}</div>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">IFSC Signature</label>
                  <div className="relative group/ifsc">
                    <input value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} onBlur={() => handleIfscLookup(ifsc)} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.ifsc ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-emerald-500'}`} placeholder="Ex. HDFC0001234" />
                    {ifscLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500 animate-pulse uppercase tracking-widest">Validating</div>}
                  </div>
                  {errors.ifsc && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.ifsc}</div>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Branch Identity</label>
                  <input value={branchName} onChange={e => setBranchName(e.target.value)} className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 ${errors.branchName ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-emerald-500'}`} placeholder="Branch specific name" />
                  {errors.branchName && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.branchName}</div>}
                </div>

                <div className="md:col-span-2 flex flex-col gap-2 mt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" /> Verification Document <span className="text-rose-500">*</span>
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-[2rem] cursor-pointer bg-slate-50/50 dark:bg-slate-900/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 hover:border-emerald-500 transition-all group/upload">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover/upload:text-emerald-500 group-hover/upload:scale-110 group-hover/upload:rotate-3 transition-all duration-300 mb-4">
                        <Upload size={28} />
                      </div>
                      <p className="mb-2 text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">Drop Cheque or Passbook</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SVG, PNG, JPG or PDF up to 2MB</p>
                    </div>
                    <input ref={bankProofRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={e => setCurrentBankProof(e.target.files[0])} />
                  </label>

                  {currentBankProof && (
                    <div className="mt-4 flex items-center justify-between bg-emerald-500/5 dark:bg-emerald-500/10 px-6 py-4 rounded-2xl border border-emerald-500/20 animate-in zoom-in-95 duration-300">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                          <FileCheck size={20} />
                        </div>
                        <div className="flex flex-col">
                          {currentBankProof instanceof File ? (
                            <>
                              <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-[200px] uppercase tracking-tighter">{currentBankProof.name}</span>
                              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Ready to vault</span>
                            </>
                          ) : (
                            <a href={`${BACKEND_URL}${currentBankProof}`} target="_blank" rel="noreferrer" className="text-xs font-black text-emerald-600 dark:text-emerald-400 underline uppercase tracking-tight">View Stored Asset</a>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => { setCurrentBankProof(null); if (bankProofRef.current) bankProofRef.current.value = ''; }} className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  {errors.bankProof && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest mt-1">{errors.bankProof}</div>}
                </div>
              </div>
            </div>

            {/* Employment Details Section */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#14B8A6]/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-[#14B8A6]/10 transition-colors duration-500"></div>

              <div className="flex items-center gap-4 mb-8 border-l-[4px] border-[#14B8A6] pl-5">
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
                  <Workflow size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Employment Matrix</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Role & structural assignment</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contract Nature</label>
                  <div className="relative group/select">
                    <select value={jobType} onChange={e => setJobType(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                      <option>Full-Time</option>
                      <option>Part-Time</option>
                      <option>Internship</option>
                      <option>Contract</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within/select:rotate-180 transition-transform duration-300" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">System Privilege</label>
                  <div className="relative group/select">
                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                      <option value="Employee">Standard (Employee)</option>
                      <option value="Dep Head">Dept. Head</option>
                      <option value="Manager">Line Manager</option>
                      <option value="HR">HR Partner</option>
                      <option value="Admin">System Admin</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within/select:rotate-180 transition-transform duration-300" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Organizational Unit</label>
                  <div className="relative group/select">
                    <select
                      value={departmentId}
                      onChange={e => {
                        const selectedDept = departments.find(d => d._id === e.target.value);
                        setDepartmentId(e.target.value);
                        setDepartment(selectedDept?.name || '');
                      }}
                      className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                      disabled={departmentsLoading}
                    >
                      <option value="">{departmentsLoading ? 'Scanning...' : 'Select Department'}</option>
                      {departments.map(dept => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform duration-300" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Direct Reporting</label>
                  <div className="relative group/select">
                    <select
                      value={manager}
                      onChange={e => setManager(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] appearance-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="">Top Level (C-Suite)</option>
                      {managers
                        .filter(m => {
                          if (!departmentId && !department) return true;
                          const mgrDeptId = m?.departmentId?._id || m?.departmentId;
                          if (departmentId && mgrDeptId && String(mgrDeptId) === String(departmentId)) return true;
                          if (department && m?.department && String(m.department) === String(department)) return true;
                          return false;
                        })
                        .map((m) => (
                          <option key={m._id} value={m._id}>
                            {[m.firstName, m.lastName].filter(Boolean).join(' ')}
                          </option>
                        ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform duration-300" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Joining Onboard Date</label>
                  <DatePicker
                    className="w-full h-auto px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#14B8A6] transition-all"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    allowClear={false}
                    value={joiningDate ? dayjs(joiningDate) : null}
                    onChange={(date) => setJoiningDate(date ? date.format('YYYY-MM-DD') : '')}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Education Details */}
        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-3 mb-8 border-l-[3px] border-[#14B8A6] pl-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Academic Details</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Educational background & qualification</p>
                </div>
              </div>

              {/* Track Selection */}
              <div className="mb-10">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">Education Track <span className="text-rose-500">*</span></label>
                <div className="flex gap-4">
                  {['Diploma', 'Bachelor'].map((type) => (
                    <label
                      key={type}
                      className={`relative flex-1 cursor-pointer group transition-all duration-300`}
                    >
                      <input
                        type="radio"
                        name="eduType"
                        value={type}
                        checked={eduType === type}
                        onChange={e => setEduType(e.target.value)}
                        className="peer hidden"
                      />
                      <div className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 peer-checked:border-[#14B8A6] peer-checked:bg-teal-50/30 dark:peer-checked:bg-teal-950/20 border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${eduType === type ? 'bg-[#14B8A6] text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'}`}>
                          <GraduationCap size={20} />
                        </div>
                        <div>
                          <p className={`text-sm font-black uppercase tracking-tight ${eduType === type ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>{type} Track</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Primary Pathway</p>
                        </div>
                        {eduType === type && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-[#14B8A6] flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Main Uploads Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 10th Standard (Always Required) */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">10th Marksheet <span className="text-rose-500">*</span></label>
                  <div className={`relative group border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 ${class10Marksheet ? 'border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-[#14B8A6]/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${class10Marksheet ? 'bg-[#14B8A6] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        {class10Marksheet ? <FileCheck size={24} /> : <Upload size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {class10Marksheet ? (
                          <>
                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate pr-8">
                              {class10Marksheet instanceof File ? class10Marksheet.name : 'View Uploaded File'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {!(class10Marksheet instanceof File) && (
                                <a href={`${BACKEND_URL}${class10Marksheet}`} target="_blank" className="text-[9px] font-black text-[#14B8A6] uppercase tracking-widest hover:underline">View Document</a>
                              )}
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Saved Successfully</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Click to upload 10th marksheet</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">PDF, JPG or PNG (MAX. 5MB)</p>
                          </>
                        )}
                      </div>
                      {class10Marksheet && (
                        <button type="button" onClick={() => { setClass10Marksheet(null); if (c10Ref.current) c10Ref.current.value = ''; }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-100 dark:border-rose-900/30">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <input ref={c10Ref} type="file" accept="image/*,application/pdf" onChange={e => setClass10Marksheet(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                  {errors.class10 && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest"><AlertCircle size={12} /> {errors.class10}</div>}
                </div>

                {/* Conditional Fields Based on Track */}
                {eduType === 'Diploma' ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Diploma Certificate <span className="text-rose-500">*</span></label>
                      <div className={`relative group border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 ${diplomaCertificate ? 'border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-[#14B8A6]/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${diplomaCertificate ? 'bg-[#14B8A6] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {diplomaCertificate ? <FileCheck size={24} /> : <Upload size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {diplomaCertificate ? (
                              <>
                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate pr-8">
                                  {diplomaCertificate instanceof File ? diplomaCertificate.name : 'View Uploaded File'}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {!(diplomaCertificate instanceof File) && (
                                    <a href={`${BACKEND_URL}${diplomaCertificate}`} target="_blank" className="text-[9px] font-black text-[#14B8A6] uppercase tracking-widest hover:underline">View Document</a>
                                  )}
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verified</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Upload Diploma Certificate</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Required Qualification</p>
                              </>
                            )}
                          </div>
                          {diplomaCertificate && (
                            <button type="button" onClick={() => { setDiplomaCertificate(null); if (diplomaRef.current) diplomaRef.current.value = ''; }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-100 dark:border-rose-900/30">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <input ref={diplomaRef} type="file" accept="image/*,application/pdf" onChange={e => setDiplomaCertificate(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      {errors.diploma && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest"><AlertCircle size={12} /> {errors.diploma}</div>}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Optional Degree</label>
                      <div className={`relative group border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 ${bachelorDegree ? 'border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-[#14B8A6]/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${bachelorDegree ? 'bg-[#14B8A6] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {bachelorDegree ? <FileCheck size={24} /> : <Upload size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {bachelorDegree ? (
                              <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate pr-8">
                                {bachelorDegree instanceof File ? bachelorDegree.name : 'View Uploaded File'}
                              </p>
                            ) : (
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Higher Degree (If any)</p>
                            )}
                          </div>
                          {bachelorDegree && (
                            <button type="button" onClick={() => { setBachelorDegree(null); if (bachelorRef.current) bachelorRef.current.value = ''; }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-100 dark:border-rose-900/30">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <input ref={bachelorRef} type="file" accept="image/*,application/pdf" onChange={e => setBachelorDegree(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">12th Marksheet <span className="text-rose-500">*</span></label>
                      <div className={`relative group border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 ${class12Marksheet ? 'border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-[#14B8A6]/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${class12Marksheet ? 'bg-[#14B8A6] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {class12Marksheet ? <FileCheck size={24} /> : <Upload size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {class12Marksheet ? (
                              <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate pr-8">
                                {class12Marksheet instanceof File ? class12Marksheet.name : 'View Uploaded File'}
                              </p>
                            ) : (
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Upload 12th Marksheet</p>
                            )}
                          </div>
                          {class12Marksheet && (
                            <button type="button" onClick={() => { setClass12Marksheet(null); if (c12Ref.current) c12Ref.current.value = ''; }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-100 dark:border-rose-900/30">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <input ref={c12Ref} type="file" accept="image/*,application/pdf" onChange={e => setClass12Marksheet(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      {errors.class12 && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest"><AlertCircle size={12} /> {errors.class12}</div>}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bachelor Degree <span className="text-rose-500">*</span></label>
                      <div className={`relative group border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 ${bachelorDegree ? 'border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-[#14B8A6]/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${bachelorDegree ? 'bg-[#14B8A6] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {bachelorDegree ? <FileCheck size={24} /> : <Upload size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {bachelorDegree ? (
                              <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate pr-8">
                                {bachelorDegree instanceof File ? bachelorDegree.name : 'View Uploaded File'}
                              </p>
                            ) : (
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bachelor Qualification</p>
                            )}
                          </div>
                          {bachelorDegree && (
                            <button type="button" onClick={() => { setBachelorDegree(null); if (bachelorRef.current) bachelorRef.current.value = ''; }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-100 dark:border-rose-900/30">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <input ref={bachelorRef} type="file" accept="image/*,application/pdf" onChange={e => setBachelorDegree(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      {errors.bachelor && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest"><AlertCircle size={12} /> {errors.bachelor}</div>}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Master Degree (Optional)</label>
                      <div className={`relative group border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 ${masterDegree ? 'border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-[#14B8A6]/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${masterDegree ? 'bg-[#14B8A6] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {masterDegree ? <FileCheck size={24} /> : <Upload size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {masterDegree ? (
                              <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate pr-8">
                                {masterDegree instanceof File ? masterDegree.name : 'View Uploaded File'}
                              </p>
                            ) : (
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Master Qualification</p>
                            )}
                          </div>
                          {masterDegree && (
                            <button type="button" onClick={() => { setMasterDegree(null); if (masterRef.current) masterRef.current.value = ''; }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-100 dark:border-rose-900/30">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <input ref={masterRef} type="file" accept="image/*,application/pdf" onChange={e => setMasterDegree(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Alternative Section */}
              <div className="mt-12 pt-10 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-800"></div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Alternative Verification</h5>
                </div>

                <p className="text-[10px] text-slate-500 mb-6 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 w-fit">
                  <AlertCircle size={14} className="text-teal-500" />
                  If degree certificates are pending, please upload last 3 semester marksheets.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[ls1Ref, ls2Ref, ls3Ref].map((ref, i) => {
                    const stateVal = i === 0 ? lastSem1 : i === 1 ? lastSem2 : lastSem3;
                    const setter = i === 0 ? setLastSem1 : i === 1 ? setLastSem2 : setLastSem3;
                    return (
                      <div key={i} className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Semester {i + 1} Marksheet</label>
                        <div className={`relative group border-[1.5px] rounded-2xl p-3 transition-all duration-300 ${stateVal ? 'border-teal-500/20 bg-teal-50/10 dark:bg-teal-950/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${stateVal ? 'bg-[#14B8A6] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              {stateVal ? <Check size={16} /> : <Upload size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase truncate">
                                {stateVal ? (stateVal instanceof File ? stateVal.name : 'View Upload') : 'Upload File'}
                              </p>
                            </div>
                            {stateVal && (
                              <button type="button" onClick={() => { setter(null); if (ref.current) ref.current.value = ''; }} className="text-rose-400 hover:text-rose-600 transition-colors">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          <input ref={ref} type="file" accept="image/*,application/pdf" onChange={e => setter(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Documents & Identity */}
        {/* Step 6: Documents & Identity */}
        {step === 6 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Section 1: Education Documents Preview (Read-Only) */}
            <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-3 mb-8 border-l-[3px] border-[#14B8A6] pl-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Education Verification</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Review uploaded academic records</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: '10th Marksheet', file: class10Marksheet },
                  { label: '12th Marksheet', file: class12Marksheet, show: eduType !== 'Diploma' },
                  { label: 'Diploma Cert', file: diplomaCertificate, show: eduType === 'Diploma' },
                  { label: 'Bachelor Degree', file: bachelorDegree },
                  { label: 'Master Degree', file: masterDegree },
                  { label: 'Sem 1', file: lastSem1 },
                  { label: 'Sem 2', file: lastSem2 },
                  { label: 'Sem 3', file: lastSem3 },
                ].map((item, idx) => {
                  if (item.show === false || !item.file) return null;
                  return (
                    <div key={idx} className="group bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:border-[#14B8A6]/20">
                      <div className="relative aspect-[4/3] bg-white dark:bg-slate-900 rounded-xl mb-3 overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300 shadow-inner">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-slate-900/20 backdrop-blur-[2px] transition-all flex items-center justify-center z-10">
                          <a href={item.file instanceof File ? '#' : `${BACKEND_URL}${item.file}`} target="_blank" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2 rounded-xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            <Search size={16} />
                          </a>
                        </div>
                        {renderFilePreview(item.file, item.label)}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest truncate">{item.label}</span>
                        <div className="w-4 h-4 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
                          <Check size={8} className="text-[#14B8A6]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {![class10Marksheet, class12Marksheet, diplomaCertificate, bachelorDegree, masterDegree, lastSem1, lastSem2, lastSem3].some(f => f) && (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 dark:bg-slate-900/20 rounded-[1.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Documents Uploaded</p>
                  <p className="text-[9px] font-bold text-slate-400/60 uppercase tracking-widest mt-1">Please go back to Step 5 to upload academic records</p>
                </div>
              )}
            </div>

            {/* Section 2: Personal Identity (Aadhar/Pan) */}
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-3 mb-10 border-l-[3px] border-[#14B8A6] pl-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Identity Verification</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Government Issued Identification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Identity Cards */}
                {[
                  { label: 'Aadhar Front', state: aadharFront, setter: setAadharFront, ref: aadharFrontRef, icon: <Fingerprint size={24} />, required: true },
                  { label: 'Aadhar Back', state: aadharBack, setter: setAadharBack, ref: aadharBackRef, icon: <Fingerprint size={24} />, required: true },
                  { label: 'PAN Card', state: panCard, setter: setPanCard, ref: panRef, icon: <ShieldCheck size={24} />, required: true },
                ].map((idCard, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      {idCard.label} {idCard.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className={`relative group border-2 border-dashed rounded-[2rem] p-4 h-[240px] flex flex-col transition-all duration-300 ${idCard.state ? 'border-teal-500/30 bg-teal-50/10 dark:bg-teal-950/5' : 'border-slate-100 dark:border-slate-800 hover:border-[#14B8A6]/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                      {idCard.state ? (
                        <>
                          <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner group-hover:scale-[1.01] transition-transform duration-500">
                            {renderFilePreview(idCard.state, idCard.label)}
                            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                              {!(idCard.state instanceof File) && (
                                <a href={`${BACKEND_URL}${idCard.state}`} target="_blank" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
                                  <Search size={18} />
                                </a>
                              )}
                              <button type="button" onClick={() => { idCard.setter(null); if (idCard.ref.current) idCard.ref.current.value = ''; }} className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all delay-75">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between px-1">
                            <div>
                              <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">
                                {idCard.state instanceof File ? idCard.state.name : `${idCard.label} Verified`}
                              </p>
                              <p className="text-[8px] font-bold text-[#14B8A6] uppercase tracking-[0.2em] mt-0.5">Stored Securely</p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-[#14B8A6] flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                              <Check size={16} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                            {idCard.icon}
                          </div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                            Click or Drag to upload<br />{idCard.label}
                          </p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-4">Required Document</p>
                        </div>
                      )}
                      <input ref={idCard.ref} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,application/pdf" onChange={e => idCard.setter(e.target.files[0])} />
                    </div>
                    {errors[i === 0 ? 'aadharFront' : i === 1 ? 'aadharBack' : 'panCard'] && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest animate-shake">
                        <AlertCircle size={12} /> {errors[i === 0 ? 'aadharFront' : i === 1 ? 'aadharBack' : 'panCard']}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Account Credentials */}
        {step === 7 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-3 mb-10 border-l-[3px] border-[#14B8A6] pl-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Access Credentials</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">System login & identification</p>
                </div>
              </div>

              {/* ID Card Display */}
              <div className="bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-[#14B8A6] flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                    <User size={32} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#14B8A6] uppercase tracking-[0.2em] mb-1">Generated Employee ID</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                      {employeeCode || (employee?.employeeId ? employee.employeeId : 'SYSTEM_GEN')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {(!employeeCode && !employee?.employeeId) || employeeCode.startsWith('Error') ? (
                    <button
                      type="button"
                      onClick={() => { setEmployeeCode('Generating...'); loadEmployeeCodePreview(); }}
                      className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:border-[#14B8A6] hover:text-[#14B8A6] transition-all"
                    >
                      <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                      Regenerate ID
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/50">
                      <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse"></div>
                      <span className="text-[10px] font-black text-[#14B8A6] uppercase tracking-widest">Active System ID</span>
                    </div>
                  )}
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Auto-generated via sequence</p>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Login Email <span className="text-rose-500">*</span></label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#14B8A6]">
                      <Mail size={18} className="text-slate-400 group-focus-within:text-[#14B8A6]" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all duration-300 text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 ${errors.email ? 'border-rose-100 dark:border-rose-900/30 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-slate-900'}`}
                      placeholder="employee@gitakshmi.com"
                      disabled={viewOnly && step !== 7}
                    />
                  </div>
                  {errors.email && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest"><AlertCircle size={12} /> {errors.email}</div>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Security Password <span className="text-rose-500">*</span></label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#14B8A6]">
                      <Lock size={18} className="text-slate-400 group-focus-within:text-[#14B8A6]" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={`w-full pl-12 pr-12 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all duration-300 text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 ${errors.password ? 'border-rose-100 dark:border-rose-900/30 focus:border-rose-500' : 'border-slate-100 dark:border-slate-800 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-slate-900'}`}
                      placeholder="Create secret access"
                      disabled={viewOnly && step !== 7}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14B8A6] transition-colors">
                      {showPassword ? <X size={18} /> : <div className="w-5 h-5 flex items-center justify-center font-black text-[8px] uppercase border-2 border-slate-200 rounded-md">Show</div>}
                    </button>
                  </div>
                  {errors.password && <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 px-2 mt-1 uppercase tracking-widest"><AlertCircle size={12} /> {errors.password}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Payroll / Compensation */}
        {step === 8 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center justify-between mb-10 border-l-[3px] border-[#14B8A6] pl-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Compensation Setup</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Payroll mapping & salary scale</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${salaryStatus === 'Active' ? 'bg-teal-50 text-[#14B8A6] border border-teal-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                  {salaryStatus} Status
                </div>
              </div>

              {/* Salary Config Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Salary Template <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Landmark size={18} className="text-slate-400" />
                    </div>
                    <select
                      className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none appearance-none transition-all ${errors.salaryTemplate ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 focus:border-[#14B8A6] focus:bg-white dark:border-slate-800'}`}
                      value={salaryTemplateId}
                      onChange={handleTemplateChange}
                    >
                      <option value="">Select Template</option>
                      {salaryTemplates.map(t => (
                        <option key={t._id} value={t._id}>{t.name} (₹{t.annualCTC})</option>
                      ))}
                    </select>
                  </div>
                  {errors.salaryTemplate && <div className="text-[9px] font-bold text-rose-500 px-2 uppercase tracking-widest">{errors.salaryTemplate}</div>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Effective From <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="date"
                      className={`w-full pl-12 pr-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none transition-all ${errors.effectiveDate ? 'border-rose-100 focus:border-rose-500' : 'border-slate-100 focus:border-[#14B8A6] focus:bg-white dark:border-slate-800'}`}
                      value={salaryEffectiveDate}
                      onChange={e => setSalaryEffectiveDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pay Cycle</label>
                  <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Monthly Disbursement
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Employment Status</label>
                  <div className="flex p-1.5 bg-slate-50 dark:bg-slate-900/30 rounded-[1.2rem] border border-slate-100 dark:border-slate-800">
                    {['Active', 'Inactive'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSalaryStatus(status)}
                        className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${salaryStatus === status ? 'bg-[#14B8A6] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selection Preview */}
              {selectedTemplateDetails ? (
                <div className="mt-8 p-8 bg-slate-50/50 dark:bg-slate-950/20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-6 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-[#14B8A6]">
                        <IndianRupee size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#14B8A6] uppercase tracking-[0.2em] mb-1">Financial Forecast</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{selectedTemplateDetails.name}</h4>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Annual CTC</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">₹{selectedTemplateDetails.annualCTC?.toLocaleString()}</p>
                      </div>
                      <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-[8px] font-black text-[#14B8A6] uppercase tracking-widest mb-1">Take Home (Est.)</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">₹{selectedTemplateDetails.monthlyGross?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Earnings */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-[#14B8A6]">
                          <Plus size={14} />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Earnings / Allowances</p>
                      </div>
                      <div className="space-y-2">
                        {selectedTemplateDetails.earnings.map((e, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-50 dark:border-slate-800/50">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{e.salaryComponentId?.name || 'Component'}</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">₹{e.monthlyAmount?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500">
                          <Trash2 size={14} />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Statutory Deductions</p>
                      </div>
                      <div className="space-y-2">
                        {selectedTemplateDetails.deductions.map((d, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-50 dark:border-slate-800/50">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{d.salaryComponentId?.name || 'Component'}</span>
                            <span className="text-xs font-black text-rose-600 tracking-tight">-₹{d.monthlyAmount?.toLocaleString()}</span>
                          </div>
                        ))}
                        {selectedTemplateDetails.deductions.length === 0 && (
                          <p className="text-[10px] text-slate-400 italic py-4 text-center">No deductions configured</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {!viewOnly && (
                    <div className="mt-10 flex justify-end">
                      <button
                        type="button"
                        onClick={saveSalaryAssignment}
                        className="group flex items-center gap-3 px-8 py-3 bg-[#14B8A6] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-teal-500/30 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                        disabled={saving}
                      >
                        {saving ? 'Processing...' : 'Assign Compensation'}
                        {!saving && <Check size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6">
                    <Landmark size={32} />
                  </div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Select a template to view forecast</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Navigation Footer */}
        <div className="flex items-center justify-between gap-6 pt-10 mt-10 border-t border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => step > 1 ? handlePrev() : onClose()}
            className="group flex items-center gap-3 px-6 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:-translate-x-1 transition-transform">
              <ArrowLeft size={16} />
            </div>
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">
              {step > 1 ? 'Go Back' : (viewOnly ? 'Finish' : 'Cancel')}
            </span>
          </button>

          <div className="flex items-center gap-4">
            {!viewOnly && (
              <button
                type="button"
                onClick={(e) => saveDraft(e)}
                className="hidden md:flex items-center gap-3 px-6 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-100 dark:border-slate-800/40 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] hover:bg-white dark:hover:bg-slate-900 transition-all"
                disabled={saving}
              >
                Save Draft
              </button>
            )}

            {step < 8 ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleNext(); }}
                className="group flex items-center gap-4 px-10 py-4 bg-slate-900 dark:bg-[#14B8A6] text-white rounded-[1.5rem] shadow-2xl transition-all hover:-translate-y-1 hover:shadow-[#14B8A6]/20"
              >
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Continue</span>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={18} />
                </div>
              </button>
            ) : (
              (!viewOnly) ? (
                <button
                  onClick={(e) => submit(e)}
                  disabled={saving}
                  className="group flex items-center gap-4 px-10 py-4 bg-[#14B8A6] text-white rounded-[1.5rem] shadow-2xl shadow-teal-500/30 transition-all hover:-translate-y-1"
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">
                    {saving ? 'Processing...' : 'Complete Profile'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    {saving ? <Plus size={18} className="animate-spin" /> : <Check size={18} />}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl"
                >
                  Close
                </button>
              )
            )}
          </div>
        </div>
      </form>

      {/* View Only Overlay style for inputs */}
      {viewOnly && (
        <style>{`
          .employee-form input, .employee-form select, .employee-form textarea {
             pointer-events: none;
             background-color: #f8fafc;
             color: #475569;
          }
          .employee-form input[type="file"] {
             display: none;
          }
           /* Keep buttons clickable */
           .employee-form button { pointer-events: auto; }
           .employee-form a { pointer-events: auto; }
        `}</style>
      )}
    </div>
  );
}

