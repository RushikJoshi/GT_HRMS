/**
 * HrmsRoutes.jsx
 * COMPLETELY ISOLATED routing for HRMS system
 * INCLUDES: SuperAdmin, HR Admin, Employee, Manager
 * NO Job Portal components or auth
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layouts
import PsaLayout from '../layouts/PsaLayout';
import HrLayout from '../layouts/HrLayout';
import EssLayout from '../layouts/EssLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import ProtectedModule from '../components/common/ProtectedModule';

// Auth Pages
import Login from '../pages/Auth/Login';
import HRLogin from '../pages/Auth/HRLogin';
import EmployeeLogin from '../pages/Auth/EmployeeLogin';

// PSA Pages
import Dashboard from '../pages/PSA/Dashboard';
import CompanyList from '../pages/PSA/CompanyList';
import AddCompany from '../pages/PSA/AddCompany';
import EditCompany from '../pages/PSA/EditCompany';
import ViewCompany from '../pages/PSA/ViewCompany';
import ModuleConfig from '../pages/PSA/ModuleConfig';
import Activities from '../pages/PSA/Activities';

// HR Pages
import HRDashboard from '../pages/HR/HRDashboard';
import Employees from '../pages/HR/Employees';
import Departments from '../pages/HR/Departments';
import LeavePolicies from '../pages/HR/LeavePolicies';
import LeaveApprovals from '../pages/HR/LeaveApprovals';
import RegularizationApprovals from '../pages/HR/RegularizationApprovals';
import OrgStructure from '../pages/HR/OrgStructure';
import UserManagement from '../pages/HR/UserManagement';
import CeoOrg from '../pages/HR/CeoOrg';
import AccessControl from '../pages/HR/AccessControl';
import OfferTemplates from '../pages/HR/OfferTemplates';
import RequirementPage from '../pages/HR/RequirementPage';
import Applicants from '../pages/HR/Applicants';
import AttendanceAdmin from '../pages/HR/AttendanceAdmin';
import CalendarManagement from '../pages/HR/CalendarManagement';
import CandidateStatusTracker from '../pages/HR/CandidateStatusTracker';
import CandidateTimeline from '../pages/HR/CandidateStatusTracker/CandidateTimeline';
import PaySlipDesign from '../pages/HR/Payroll/PaySlipDesign';
import AttendanceHistory from '../pages/HR/AttendanceHistory';

// Letter modules
import LetterTemplates from '../pages/HR/LetterTemplates';
import LetterSettings from '../pages/HR/LetterSettings';
import TemplatePreview from '../pages/HR/TemplatePreview';
import SalaryStructure from '../pages/HR/SalaryStructure';
import CreateRequirement from '../pages/HR/CreateRequirement';
import VendorList from '../pages/HR/VendorList';
import VendorFormStep1 from '../pages/HR/VendorFormStep1';
import VendorFormStep2 from '../pages/HR/VendorFormStep2';
import VendorDetails from '../pages/HR/VendorDetails';

// Settings
import CompanySettings from '../pages/settings/CompanySettings';

// Career Builder
import CareerBuilder from '../pages/HR/CareerBuilder/CareerBuilder';
import ApplyPageBuilder from '../pages/HR/CareerBuilder/ApplyPageBuilder';

// Payroll
import SalaryComponents from '../pages/HR/Payroll/SalaryComponents';
import NewEarning from '../pages/HR/Payroll/NewEarning';
import NewBenefit from '../pages/HR/Payroll/NewBenefit';
import NewSalaryTemplate from '../pages/HR/Payroll/NewSalaryTemplate';
import NewDeduction from '../pages/HR/Payroll/Deductions/NewDeduction';
import PayrollRules from '../pages/Admin/PayrollRules';
import RunPayroll from '../pages/HR/Payroll/RunPayroll';
import Payslips from '../pages/HR/Payroll/Payslips';
import ProcessPayroll from '../pages/HR/Payroll/ProcessPayroll';
import PayrollDashboard from '../pages/HR/Payroll/PayrollDashboard';

// Employee Self-Service
import ESSPayslips from '../pages/ESS/Payslips';

// 🔥 NEW: BGV Pages
import MyTasks from '../pages/HR/BGV/MyTasks';


// Employee
import EmployeeDashboard from '../pages/Employee/EmployeeDashboard';
import FaceAttendance from '../pages/Employee/FaceAttendance';

// Global
import EntityDetail from '../pages/Global/EntityDetail';
import MyRequests from '../pages/Global/MyRequests';
import NotFound from '../pages/NotFound';
import VerifyCompany from '../pages/VerifyCompany';

// Helper for Outlet
import { Outlet } from 'react-router-dom';
const OutletProxy = () => <Outlet />;

/**
 * HRMS Routes - PSA + HR + Employee
 * Prefix: /*
 */
export default function HrmsRoutes() {
  return (
    <Routes>
      {/* PUBLIC HRMS AUTH ROUTES */}
      <Route path="login" element={<Login />} />
      <Route path="login/hr" element={<HRLogin />} />
      <Route path="login/employee" element={<EmployeeLogin />} />

      {/* PSA (SUPER ADMIN) ROUTES */}
      <Route
        path="psa"
        element={
          <ProtectedRoute allowedRoles={['psa']}>
            <PsaLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="companies" element={<CompanyList />} />
        <Route path="companies/add" element={<AddCompany />} />
        <Route path="companies/edit/:id" element={<EditCompany />} />
        <Route path="companies/view/:id" element={<ViewCompany />} />
        <Route path="modules" element={<ModuleConfig />} />
        <Route path="modules/:id" element={<ModuleConfig />} />
        <Route path="activities" element={<Activities />} />
      </Route>

      {/* HR (ADMIN) ROUTES */}
      <Route
        path="hr"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <HrLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HRDashboard />} />
        {/* --- HR MODULE --- */}
        <Route element={<ProtectedModule module="hr"><Outlet /></ProtectedModule>}>
          <Route path="employees" element={<Employees />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="departments" element={<Departments />} />
          <Route path="leaves" element={<Navigate to="leave-approvals" replace />} />
          <Route path="leave-approvals" element={<LeaveApprovals />} />
          <Route path="leave-approvals/regularization" element={<RegularizationApprovals category="Leave" />} />
          <Route path="leave-policies" element={<LeavePolicies />} />
          <Route path="org" element={<OrgStructure />} />
          <Route path="org-tree" element={<CeoOrg />} />
          <Route path="access" element={<AccessControl />} />

          {/* Letters */}
          <Route path="letter-templates" element={<LetterTemplates />} />
          <Route path="letter-templates/:templateId/preview" element={<TemplatePreview />} />
          <Route path="letter-settings" element={<LetterSettings />} />

          {/* BGV */}
          <Route path="my-tasks" element={<MyTasks />} />
        </Route>

        {/* --- ATTENDANCE MODULE --- */}
        <Route element={<ProtectedModule module="attendance"><Outlet /></ProtectedModule>}>
          <Route path="attendance" element={<AttendanceAdmin />} />
          <Route path="attendance/correction" element={<RegularizationApprovals category="Attendance" />} />
          <Route path="attendance-calendar" element={<CalendarManagement />} />
          <Route path="attendance-history" element={<AttendanceHistory />} />
          <Route path="face-attendance" element={<FaceAttendance />} />
        </Route>

        {/* --- RECRUITMENT MODULE --- */}
        <Route element={<ProtectedModule module="recruitment"><Outlet /></ProtectedModule>}>
          <Route path="requirements" element={<RequirementPage />} />
          <Route path="create-requirement" element={<CreateRequirement />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="job/:jobId/candidates" element={<Applicants jobSpecific={true} />} />
          <Route path="internal-applicants" element={<Applicants internalMode={true} />} />
          <Route path="candidate-status" element={<CandidateStatusTracker />} />
          <Route path="candidate-status/:id" element={<CandidateTimeline />} />
          <Route path="offer-templates" element={<OfferTemplates />} />

          {/* Vendor Management */}
          <Route path="vendor/list" element={<VendorList />} />
          <Route path="vendor/step1" element={<VendorFormStep1 />} />
          <Route path="vendor/step2/:vendorId" element={<VendorFormStep2 />} />
          <Route path="vendor/details/:id" element={<VendorDetails />} />

          {/* Career Builder */}
          <Route path="career-builder" element={<CareerBuilder />} />
          <Route path="apply-builder" element={<ApplyPageBuilder />} />
        </Route>

        {/* --- PAYROLL MODULE --- */}
        <Route element={<ProtectedModule module="payroll"><Outlet /></ProtectedModule>}>
          <Route path="salary-structure/:candidateId" element={<SalaryStructure />} />
          <Route path="payroll/dashboard" element={<PayrollDashboard />} />
          <Route path="payroll/salary-components" element={<SalaryComponents />} />
          <Route path="payroll/earnings/new" element={<NewEarning />} />
          <Route path="payroll/earnings/edit/:id" element={<NewEarning />} />
          <Route path="payroll/deductions/new" element={<NewDeduction />} />
          <Route path="payroll/deductions/edit/:id" element={<NewDeduction />} />
          <Route path="payroll/benefits/new" element={<NewBenefit />} />
          <Route path="payroll/benefits/edit/:id" element={<NewBenefit />} />
          <Route path="payroll/salary-templates/new" element={<NewSalaryTemplate />} />
          <Route path="payroll/rules" element={<PayrollRules />} />
          <Route path="payroll/process" element={<ProcessPayroll />} />
          <Route path="payroll/run" element={<RunPayroll />} />
          <Route path="payroll/payslips" element={<Payslips />} />
          <Route path="payroll/payslip-design" element={<PaySlipDesign />} />
        </Route>

        {/* Global inside HR */}
        <Route path="details/:entityType/:entityId" element={<EntityDetail />} />
        <Route path="my-requests" element={<MyRequests />} />
        <Route path="face-attendance" element={<FaceAttendance />} />
      </Route>

      {/* EMPLOYEE / MANAGER ROUTES */}
      <Route
        path="employee"
        element={
          <ProtectedRoute allowedRoles={['employee', 'manager']}>
            <ProtectedModule module="employeePortal">
              <EssLayout />
            </ProtectedModule>
          </ProtectedRoute>
        }
      >
        <Route index element={<EmployeeDashboard />} />
        <Route path="payslips" element={<ESSPayslips />} />
        <Route path="details/:entityType/:entityId" element={<EntityDetail />} />
        <Route path="my-requests" element={<MyRequests />} />
        <Route path="face-attendance" element={<FaceAttendance />} />
      </Route>

      <Route path="verify-company/:token" element={<VerifyCompany />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
