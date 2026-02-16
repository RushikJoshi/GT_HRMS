
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getToken, isValidToken } from '../utils/token';

// Layouts
import PsaLayout from '../layouts/PsaLayout';
import HrLayout from '../layouts/HrLayout';
import EssLayout from '../layouts/EssLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import ProtectedModule from '../components/common/ProtectedModule';
import CandidateProtectedRoute from '../routes/CandidateProtectedRoute';
import CandidateLayout from '../layouts/CandidateLayout';

// PSA Pages
import Dashboard from '../pages/PSA/Dashboard';
import CompanyList from '../pages/PSA/CompanyList';
import AddCompany from '../pages/PSA/AddCompany';
import EditCompany from '../pages/PSA/EditCompany';
import ViewCompany from '../pages/PSA/ViewCompany';
import ModuleConfig from '../pages/PSA/ModuleConfig';
import Activities from '../pages/PSA/Activities';

// Auth
import Login from '../pages/Auth/Login';
import HRLogin from '../pages/Auth/HRLogin';
import EmployeeLogin from '../pages/Auth/EmployeeLogin';

// New Role-Specific Login Pages (for new URL structure)
import SuperAdminLogin from '../pages/Auth/SuperAdminLogin';
import TenantLogin from '../pages/Auth/TenantLogin';
import EmployeeLoginPage from '../pages/Auth/EmployeeLoginPage';

// HR Pages
import HRDashboard from '../pages/HR/HRDashboard';
import Employees from '../pages/HR/Employees';
import Departments from '../pages/HR/Departments';
import LeavePolicies from '../pages/HR/LeavePolicies';
import Leaves from '../pages/HR/Leaves';
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
import BGVManagement from '../pages/HR/BGVManagement';
import FaceUpdateRequest from '../pages/HR/FaceUpdateRequests';
import BGVEmailManagement from '../pages/HR/BGVEmailManagement';

// Letter modules
import LetterDashboard from '../pages/HR/Letters/LetterDashboard';
import IssueLetterWizard from '../pages/HR/Letters/IssueLetterWizard';
import LetterTemplates from '../pages/HR/LetterTemplates';
import LetterSettings from '../pages/HR/LetterSettings';
import TemplatePreview from '../pages/HR/TemplatePreview';
import MyDocuments from '../pages/Employee/MyDocuments';
import SalaryStructure from '../pages/HR/SalaryStructure';
import CreateRequirement from '../pages/HR/CreateRequirement';
import PositionMaster from '../pages/HR/PositionMaster';
import VendorList from '../pages/HR/VendorList';
import VendorFormStep1 from '../pages/HR/VendorFormStep1';
import VendorFormStep2 from '../pages/HR/VendorFormStep2';
import VendorDetails from '../pages/HR/VendorDetails';

// Career Builder
import CareerBuilder from '../pages/HR/CareerBuilder/CareerBuilder';
import ApplyPageBuilder from '../pages/HR/CareerBuilder/ApplyPageBuilder';
import VendorCustomization from '../pages/HR/Customization/Vendor/VendorCustomization';

// Settings
import CompanySettings from '../pages/settings/CompanySettings';
import SocialMediaPage from '../pages/settings/SocialMediaPage';

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
import Compensation from '../pages/HR/Compensation';
import PayrollDashboard from '../pages/HR/Payroll/PayrollDashboard';
import PayslipTemplates from '../pages/HR/Payroll/PayslipTemplates';
import PayslipBuilder from '../pages/HR/Payroll/PayslipBuilder/PayslipBuilder';


// Employee
import EmployeeDashboard from '../pages/Employee/EmployeeDashboard';
import ESSPayslips from '../pages/ESS/Payslips';


// Global
import EntityDetail from '../pages/Global/EntityDetail';
import MyRequests from '../pages/Global/MyRequests';
import NotFound from '../pages/NotFound';
import VerifyCompany from '../pages/VerifyCompany';
import JobApplication from '../pages/JobApplication/JobApplication';
import Jobs from '../pages/JobApplication/JobsList';
import FaceAttendance from '../pages/Employee/FaceAttendance';

// Candidate Pages
import CandidateLogin from '../pages/Candidate/CandidateLogin';
import CandidateSignup from '../pages/Candidate/CandidateRegister';
import CandidateDashboard from '../pages/Candidate/CandidateDashboard';
import CandidateOpenPositions from '../pages/Candidate/CandidateOpenPositions';
import CandidateApplications from '../pages/Candidate/CandidateApplications';
import CandidateProfile from '../pages/Candidate/CandidateProfile';
import ApplicationTrack from '../pages/ApplicationTrack';

// Helper for Candidate Outlet
const OutletProxy = () => <Outlet />;

export default function AppRoutes() {
    return (
        <Routes>
            {/* Root - Auto Redirect based on Auth */}
            <Route path="/" element={<AutoHome />} />



            {/* --- PUBLIC AUTH ROUTES (EXISTING - KEEP FOR BACKWARD COMPATIBILITY) --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/login/hr" element={<HRLogin />} />
            <Route path="/login/employee" element={<EmployeeLogin />} />

            {/* --- NEW ROLE-SPECIFIC LOGIN ROUTES --- */}
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route path="/tenant/login" element={<TenantLogin />} />
            <Route path="/employee/login" element={<EmployeeLoginPage />} />

            {/* --- PUBLIC CANDIDATE ROUTES --- */}
            <Route path="/candidate/login" element={<CandidateLogin />} />
            <Route path="/candidate/signup" element={<CandidateSignup />} />
            <Route path="/jobs/:companyId" element={<Jobs />} />

            {/* --- PROTECTED CANDIDATE ROUTES --- */}
            <Route path="/candidate" element={
                <CandidateProtectedRoute>
                    <CandidateLayout />
                </CandidateProtectedRoute>
            }>
                <Route path="dashboard" element={<CandidateDashboard />} />
                <Route path="open-positions" element={<CandidateOpenPositions />} />
                <Route path="applications" element={<CandidateApplications />} />
                <Route path="profile" element={<CandidateProfile />} />
            </Route>

            <Route element={<CandidateProtectedRoute><OutletProxy /></CandidateProtectedRoute>}>
                <Route path="/candidate/application/:applicationId" element={<ApplicationTrack />} />
            </Route>


            <Route path="/apply-job/:requirementId" element={<JobApplication />} />

            {/* --- HRMS REDIRECTION (For Backward Compatibility) ---
            <Route path="/*" element={<HrmsRedirectHandler />} /> */}

            {/* --- NEW SUPER ADMIN ROUTES --- */}
            <Route
                path="/super-admin"
                element={
                    <ProtectedRoute allowedRoles={['psa']}>
                        <PsaLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="companies" element={<CompanyList />} />
                <Route path="companies/add" element={<AddCompany />} />
                <Route path="companies/edit/:id" element={<EditCompany />} />
                <Route path="companies/view/:id" element={<ViewCompany />} />
                <Route path="modules" element={<ModuleConfig />} />
                <Route path="modules/:id" element={<ModuleConfig />} />
                <Route path="activities" element={<Activities />} />
            </Route>

            {/* --- PSA ROUTES (EXISTING - KEEP FOR BACKWARD COMPATIBILITY) --- */}
            <Route
                path="/psa"
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

            {/* --- NEW TENANT ROUTES --- */}
            <Route path="/tenant" element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                    <HrLayout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/tenant/dashboard" replace />} />
                <Route path="dashboard" element={<HRDashboard />} />
                <Route path="employees" element={<Employees />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="departments" element={<Departments />} />
                <Route path="leaves" element={<Navigate to="leave-approvals" replace />} />
                <Route path="leave-approvals" element={<ProtectedModule module="leave"><LeaveApprovals /></ProtectedModule>} />
                <Route path="leave-requests" element={<ProtectedModule module="leave"><Leaves /></ProtectedModule>} />
                <Route path="leave-approvals/regularization" element={<ProtectedModule module="leave"><RegularizationApprovals category="Leave" /></ProtectedModule>} />
                <Route path="attendance" element={<AttendanceAdmin />} />
                <Route path="attendance/correction" element={<RegularizationApprovals category="Attendance" />} />
                <Route path="attendance-calendar" element={<CalendarManagement />} />
                <Route path="leave-policies" element={<ProtectedModule module="leave"><LeavePolicies /></ProtectedModule>} />
                <Route path="requirements" element={<RequirementPage />} />
                <Route path="create-requirement" element={<CreateRequirement />} />
                <Route path="applicants" element={<Applicants />} />
                <Route path="internal-applicants" element={<Applicants internalMode={true} />} />
                <Route path="candidate-status" element={<CandidateStatusTracker />} />
                <Route path="candidate-status/:id" element={<CandidateTimeline />} />
                <Route path="org" element={<OrgStructure />} />
                <Route path="org-tree" element={<CeoOrg />} />
                <Route path="access" element={<AccessControl />} />
                <Route path="attendance-history" element={<AttendanceHistory />} />



                <Route path="bgv" element={<ProtectedModule module="backgroundVerification"><BGVManagement /></ProtectedModule>} />
                <Route path="bgv/emails" element={<ProtectedModule module="backgroundVerification"><BGVEmailManagement /></ProtectedModule>} />

                {/* Letters */}
                <Route path="letters" element={<ProtectedModule module="documentManagement"><LetterDashboard /></ProtectedModule>} />
                <Route path="letters/issue" element={<ProtectedModule module="documentManagement"><IssueLetterWizard /></ProtectedModule>} />
                <Route path="letter-templates" element={<LetterTemplates />} />
                <Route path="letter-templates/:templateId/preview" element={<TemplatePreview />} />
                <Route path="letter-settings" element={<LetterSettings />} />

                {/* Career Builder */}
                <Route path="career-builder" element={<CareerBuilder />} />
                <Route path="apply-builder" element={<ApplyPageBuilder />} />
                <Route path="customization/vendor" element={<VendorCustomization />} />

                {/* Payroll */}
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
                <Route path="payroll/compensation" element={<Compensation />} />
                <Route path="payroll/run" element={<RunPayroll />} />
                <Route path="payroll/payslips" element={<Payslips />} />
                <Route path="payroll/payslip-design" element={<PaySlipDesign />} />
                <Route path="payslip-templates" element={<PayslipTemplates />} />
                <Route path="payroll/payslip-builder/:id" element={<PayslipBuilder />} />

                {/* Settings */}
                <Route path="settings/company" element={<CompanySettings />} />
                <Route path="settings/social-media" element={<ProtectedModule module="socialMediaIntegration"><SocialMediaPage /></ProtectedModule>} />

                {/* Global inside Tenant */}
                <Route path="details/:entityType/:entityId" element={<EntityDetail />} />
                <Route path="my-requests" element={<MyRequests />} />
                <Route path="face-attendance" element={<FaceAttendance />} />
            </Route>

            {/* --- HR ROUTES (EXISTING - KEEP FOR BACKWARD COMPATIBILITY) --- */}
            <Route path="/hr" element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                    <HrLayout />
                </ProtectedRoute>
            }>
                <Route index element={<HRDashboard />} />
                <Route path="employees" element={<Employees />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="departments" element={<Departments />} />
                <Route path="leaves" element={<Navigate to="leave-approvals" replace />} />
                <Route path="leave-approvals" element={<ProtectedModule module="leave"><LeaveApprovals /></ProtectedModule>} />
                <Route path="leave-requests" element={<ProtectedModule module="leave"><Leaves /></ProtectedModule>} />
                <Route path="leave-approvals/regularization" element={<ProtectedModule module="leave"><RegularizationApprovals category="Leave" /></ProtectedModule>} />
                <Route path="attendance" element={<AttendanceAdmin />} />
                <Route path="attendance/correction" element={<RegularizationApprovals category="Attendance" />} />
                <Route path="attendance-calendar" element={<CalendarManagement />} />
                <Route path="leave-policies" element={<ProtectedModule module="leave"><LeavePolicies /></ProtectedModule>} />
                <Route path="requirements" element={<RequirementPage />} />
                <Route path="create-requirement" element={<CreateRequirement />} />
                <Route path="positions" element={<PositionMaster />} />
                <Route path="applicants" element={<Applicants />} />
                <Route path="applicants/all" element={<Applicants />} />
                <Route path="job/:jobId/candidates" element={<Applicants jobSpecific={true} />} />
                <Route path="internal-applicants" element={<Applicants internalMode={true} />} />
                <Route path="candidate-status" element={<CandidateStatusTracker />} />
                <Route path="candidate-status/:id" element={<CandidateTimeline />} />
                <Route path="org" element={<OrgStructure />} />
                <Route path="org-tree" element={<CeoOrg />} />
                <Route path="access" element={<AccessControl />} />
                <Route path="offer-templates" element={<OfferTemplates />} />
                <Route path="attendance-history" element={<AttendanceHistory />} />



                <Route path="bgv" element={<ProtectedModule module="backgroundVerification"><BGVManagement /></ProtectedModule>} />
                <Route path="face-update-requests" element={<FaceUpdateRequest />} />
                <Route path="bgv/emails" element={<ProtectedModule module="backgroundVerification"><BGVEmailManagement /></ProtectedModule>} />

                {/* Letters */}
                <Route path="letters" element={<ProtectedModule module="documentManagement"><LetterDashboard /></ProtectedModule>} />
                <Route path="letters/issue" element={<ProtectedModule module="documentManagement"><IssueLetterWizard /></ProtectedModule>} />
                <Route path="letter-templates" element={<LetterTemplates />} />
                <Route path="letter-templates/:templateId/preview" element={<TemplatePreview />} />
                <Route path="letter-settings" element={<LetterSettings />} />

                {/* Career Builder */}
                <Route path="career-builder" element={<CareerBuilder />} />
                <Route path="apply-builder" element={<ApplyPageBuilder />} />

                {/* Payroll */}
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
                <Route path="payroll/compensation" element={<Compensation />} />
                <Route path="payroll/run" element={<RunPayroll />} />

                <Route path="payroll/payslips" element={<Payslips />} />
                <Route path="payroll/payslip-design" element={<PaySlipDesign />} />
                <Route path="payslip-templates" element={<PayslipTemplates />} />
                <Route path="payroll/payslip-builder/:id" element={<PayslipBuilder />} />

                {/* Settings */}
                <Route path="settings/company" element={<CompanySettings />} />
                <Route path="settings/social-media" element={<ProtectedModule module="socialMediaIntegration"><SocialMediaPage /></ProtectedModule>} />

                {/* Global inside HR */}
                <Route path="details/:entityType/:entityId" element={<EntityDetail />} />
                <Route path="my-requests" element={<MyRequests />} />
                <Route path="face-attendance" element={<FaceAttendance />} />
            </Route>


            {/* --- EMPLOYEE / MANAGER ROUTES --- */}
            <Route
                path="/employee"
                element={
                    <ProtectedRoute allowedRoles={['employee', 'manager']}>
                        <EssLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/employee/dashboard" replace />} />
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="leaves" element={<EmployeeDashboard />} />
                <Route path="attendance" element={<EmployeeDashboard />} />
                <Route path="regularization" element={<EmployeeDashboard />} />
                <Route path="profile" element={<EmployeeDashboard />} />
                <Route path="team-attendance" element={<EmployeeDashboard />} />
                <Route path="team-leaves" element={<EmployeeDashboard />} />
                <Route path="team-regularization" element={<EmployeeDashboard />} />
                <Route path="internal-jobs" element={<EmployeeDashboard />} />
                <Route path="my-applications" element={<EmployeeDashboard />} />
                <Route path="payslips" element={<ESSPayslips />} />
                <Route path="details/:entityType/:entityId" element={<EntityDetail />} />
                <Route path="my-requests" element={<MyRequests />} />
                <Route path="my-documents" element={<MyDocuments />} />
                <Route path="face-attendance" element={<FaceAttendance />} />

                {/* Vendor Management (Moved from HR) */}
                <Route path="vendor/list" element={<VendorList />} />
                <Route path="vendor/step1" element={<VendorFormStep1 />} />
                <Route path="vendor/step2/:vendorId?" element={<VendorFormStep2 />} />
                <Route path="vendor/details/:id" element={<VendorDetails />} />
            </Route>


            <Route path="/verify-company/:token" element={<VerifyCompany />} />
            <Route path="*" element={<NotFound />} />

        </Routes>
    );
}

function AutoHome() {
    const { user, isInitialized } = useAuth();
    if (!isInitialized) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    const token = getToken();
    if (!isValidToken(token)) return <Navigate to="/login" replace />;

    // Redirect to new role-specific dashboard URLs
    if (user?.role === 'psa') return <Navigate to="/super-admin/dashboard" replace />;
    if (user?.role === 'hr' || user?.role === 'admin') return <Navigate to="/tenant/dashboard" replace />;
    if (user?.role === 'employee' || user?.role === 'manager') return <Navigate to="/employee/dashboard" replace />;

    return <Navigate to="/login" replace />;
}

