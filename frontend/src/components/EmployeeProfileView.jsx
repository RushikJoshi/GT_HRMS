import React, { useState } from 'react';
import { Tabs, Tag, Button } from 'antd';
import {
    User, Briefcase, FileText, MapPin,
    Calendar, Mail, Phone, Shield,
    GraduationCap, Landmark, Printer,
    CreditCard, Heart, Globe, Users
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://hrms.gitakshmi.com';

const InfoGroup = ({ title, children, icon: Icon }) => (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden mb-6 transition-all hover:shadow-md group">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {Icon && <Icon size={18} />}
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h3>
            </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children}
        </div>
    </div >
);

const DetailItem = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col gap-1 group/item">
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        </div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 pl-0.5">
            {value || <span className="text-slate-400 dark:text-slate-600 font-normal italic">Pending Verification</span>}
        </div>
    </div>
);

const FileDownloadLink = ({ url, label }) => {
    if (!url) return (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700 py-3 border border-slate-100 dark:border-slate-800 border-dashed rounded-xl px-4 italic">
            <FileText size={12} /> {label}: Unavailable
        </div>
    );
    return (
        <a
            href={`${BACKEND_URL}${url}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 px-4 py-3 rounded-xl transition-all border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-900/40 group"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={16} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest truncate">{label}</span>
            </div>
            <div className="shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </div>
        </a>
    );
};

export default function EmployeeProfileView({ employee, profile }) {
    const [activeTab, setActiveTab] = useState('1');
    const emp = employee || profile;

    if (!emp) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <User size={48} className="mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">No employee record found</p>
        </div>
    );

    const items = [
        {
            key: '1',
            label: <span className="flex items-center gap-2 px-2"><User size={16} /> Personal</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <InfoGroup title="Identity & Personal" icon={User}>
                        <DetailItem label="Full Name" value={`${emp.firstName} ${emp.middleName ? emp.middleName + ' ' : ''}${emp.lastName}`} icon={User} />
                        <DetailItem label="Date of Birth" value={formatDateDDMMYYYY(emp.dob)} icon={Calendar} />
                        <DetailItem label="Gender" value={emp.gender} icon={Users} />
                        <DetailItem label="Blood Group" value={emp.bloodGroup} icon={Heart} />
                        <DetailItem label="Marital Status" value={emp.maritalStatus} icon={Users} />
                        <DetailItem label="Nationality" value={emp.nationality} icon={Globe} />
                    </InfoGroup>

                    <InfoGroup title="Family Details" icon={Users}>
                        <DetailItem label="Father's Name" value={emp.fatherName} />
                        <DetailItem label="Mother's Name" value={emp.motherName} />
                        <DetailItem label="Emergency Contact" value={emp.emergencyContactName} />
                        <DetailItem label="Emergency No." value={emp.emergencyContactNumber} />
                    </InfoGroup>

                    <InfoGroup title="Address Information" icon={MapPin}>
                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Temporary Address
                                </h4>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                    {emp.tempAddress?.line1}, {emp.tempAddress?.line2 && emp.tempAddress?.line2 + ', '}<br />
                                    {emp.tempAddress?.city}, {emp.tempAddress?.state} - {emp.tempAddress?.pinCode}<br />
                                    {emp.tempAddress?.country}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Permanent Address
                                </h4>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                    {emp.permAddress?.line1}, {emp.permAddress?.line2 && emp.permAddress?.line2 + ', '}<br />
                                    {emp.permAddress?.city}, {emp.permAddress?.state} - {emp.permAddress?.pinCode}<br />
                                    {emp.permAddress?.country}
                                </p>
                            </div>
                        </div>
                    </InfoGroup>
                </div>
            )
        },
        {
            key: '2',
            label: <span className="flex items-center gap-2 px-2"><Briefcase size={16} /> Employment</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <InfoGroup title="Organization Details" icon={Shield}>
                        <DetailItem label="Employee ID" value={emp.employeeId} icon={Shield} />
                        <DetailItem label="Joining Date" value={formatDateDDMMYYYY(emp.joiningDate)} icon={Calendar} />
                        <DetailItem label="Designation" value={emp.role} icon={Briefcase} />
                        <DetailItem label="Department" value={emp.department} icon={Globe} />
                        <DetailItem label="Job Type" value={emp.jobType} icon={Briefcase} />
                        <DetailItem label="Reporting Manager" value={
                            emp.manager
                                ? (typeof emp.manager === 'object' ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'Assigned')
                                : 'Top Level'
                        } icon={Users} />
                    </InfoGroup>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <Briefcase size={18} className="text-blue-600" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Experience History</h3>
                        </div>
                        <div className="p-6">
                            {emp.experience && emp.experience.length > 0 ? (
                                <div className="space-y-6">
                                    {emp.experience.map((exp, idx) => (
                                        <div key={idx} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-4">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-sm z-10"></div>
                                            <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="text-base font-bold text-slate-900">{exp.companyName}</h4>
                                                    <p className="text-blue-600 text-xs font-bold uppercase tracking-tight">{exp.designation}</p>
                                                </div>
                                                <div className="mt-2 sm:mt-0 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black tracking-widest uppercase">
                                                    {formatDateDDMMYYYY(exp.from)} - {formatDateDDMMYYYY(exp.to)}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
                                                <DetailItem label="Last Salary" value={exp.lastDrawnSalary} />
                                                <DetailItem label="Mgr Name" value={exp.reportingPersonName} />
                                                <DetailItem label="Mgr Contact" value={exp.reportingPersonContact} />
                                                {/* Payslips if any */}
                                                {exp.payslips && exp.payslips.length > 0 && (
                                                    <div className="col-span-full pt-2 flex flex-wrap gap-2">
                                                        {exp.payslips.map((p, i) => (
                                                            <a key={i} href={`${BACKEND_URL}${p}`} target="_blank" rel="noreferrer" className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md hover:border-blue-500 hover:text-blue-600 transition flex items-center gap-1.5">
                                                                <FileText size={12} /> Payslip {i + 1}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-6 text-slate-400 text-sm italic">No prior experience records.</p>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: '3',
            label: <span className="flex items-center gap-2 px-2"><GraduationCap size={16} /> Education</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <InfoGroup title="Academic Background" icon={GraduationCap}>
                        <div className="col-span-full">
                            <Tag color="blue" className="mb-6 font-bold uppercase tracking-widest text-[10px] px-3 py-1">
                                {emp.education?.type || 'Standard'} Qualification
                            </Tag>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FileDownloadLink url={emp.education?.class10Marksheet} label="10th Marksheet" />
                                {emp.education?.type === 'Bachelor' ? (
                                    <>
                                        <FileDownloadLink url={emp.education?.class12Marksheet} label="12th Marksheet" />
                                        <FileDownloadLink url={emp.education?.bachelorDegree} label="Bachelor Degree" />
                                        <FileDownloadLink url={emp.education?.masterDegree} label="Master Degree" />
                                    </>
                                ) : (
                                    <>
                                        <FileDownloadLink url={emp.education?.diplomaCertificate} label="Diploma Certificate" />
                                        <FileDownloadLink url={emp.education?.lastSem1Marksheet} label="Sem 1 Marksheet" />
                                        <FileDownloadLink url={emp.education?.lastSem2Marksheet} label="Sem 2 Marksheet" />
                                        <FileDownloadLink url={emp.education?.lastSem3Marksheet} label="Sem 3 Marksheet" />
                                    </>
                                )}
                            </div>
                        </div>
                    </InfoGroup>
                </div>
            )
        },
        {
            key: '4',
            label: <span className="flex items-center gap-2 px-2"><Shield size={16} /> Docs & Bank</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <InfoGroup title="Financial Information" icon={Landmark}>
                        <DetailItem label="Bank Name" value={emp.bankDetails?.bankName} icon={Landmark} />
                        <DetailItem label="Account Number" value={emp.bankDetails?.accountNumber} icon={CreditCard} />
                        <DetailItem label="IFSC Code" value={emp.bankDetails?.ifsc} />
                        <DetailItem label="Branch Name" value={emp.bankDetails?.branchName} />
                        <div className="col-span-full mt-2">
                            <FileDownloadLink url={emp.bankDetails?.bankProofUrl} label="Bank Proof (Passbook/Cheque)" />
                        </div>
                    </InfoGroup>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <Shield size={18} className="text-blue-600" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Identity Documents</h3>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Aadhar Verification</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FileDownloadLink url={emp.documents?.aadharFront} label="Aadhar Front" />
                                    <FileDownloadLink url={emp.documents?.aadharBack} label="Aadhar Back" />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tax Identification</h4>
                                <FileDownloadLink url={emp.documents?.panCard} label="PAN Card" />
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <style>{`
                .ant-tabs-nav-wrap { padding: 0 1rem; }
                .ant-tabs-tab { padding: 12px 0 !important; margin: 0 16px !important; }
                .ant-tabs-tab-active .ant-tabs-tab-btn { color: #10b981 !important; font-weight: 600 !important; }
                .ant-tabs-ink-bar { background: #10b981 !important; height: 3px !important; border-radius: 3px 3px 0 0; }
                
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; font-size: 10pt !important; }
                    .bg-white { box-shadow: none !important; border: 1px solid #eee !important; }
                    .bg-slate-50\/50, .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
                    .ant-tabs-nav { display: none !important; }
                    .ant-tabs-content-holder { display: block !important; }
                    .print-section { page-break-inside: avoid; margin-bottom: 2rem; }
                }
                .print-only { display: none; }
            `}</style>

            {/* 1. PREMIUM HEADER BANNER */}
            <div className="relative overflow-hidden bg-emerald-600 rounded-[2.5rem] shadow-xl p-8 sm:p-12 text-white mb-8">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                <div className="relative flex flex-col lg:flex-row gap-10 items-center lg:items-start z-10">
                    {/* Avatar Section */}
                    <div className="relative shrink-0">
                        <div className="w-40 h-40 rounded-full overflow-hidden bg-white/20 backdrop-blur-md border-4 border-white/40 shadow-2xl relative group">
                            {emp.profilePic ? (
                                <img src={`${BACKEND_URL}${emp.profilePic}`} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/40 bg-white/10 uppercase">
                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                            )}
                        </div>
                        <div className={`absolute bottom-3 right-3 w-8 h-8 rounded-full border-4 border-emerald-600 shadow-lg ${emp.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} title={emp.status}></div>
                    </div>

                    {/* Meta Section */}
                    <div className="flex-1 w-full text-center lg:text-left pt-2">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                            <div className="space-y-2">
                                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                                    {emp.firstName} {emp.lastName}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                    <span className="px-4 py-1.5 rounded-xl bg-white/20 text-white text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/20 ring-4 ring-white/5">
                                        {emp.role}
                                    </span>
                                    <span className="text-emerald-100 text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></div>
                                        {emp.department} Unit
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-3 mx-auto lg:mx-0">
                                <Button
                                    icon={<Printer size={18} />}
                                    onClick={() => window.print()}
                                    className="no-print rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 border-white/30 bg-white/20 text-white hover:bg-white/30 hover:border-white/50 hover:text-white transition-all backdrop-blur-sm"
                                >
                                    Print Dossier
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/10 pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white">
                                    <Mail size={18} />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <p className="text-xs font-medium text-emerald-100 uppercase tracking-widest">Email Address</p>
                                    <p className="text-sm font-semibold text-white truncate" title={emp.email}>{emp.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white">
                                    <Phone size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-medium text-emerald-100 uppercase tracking-widest">Contact No</p>
                                    <p className="text-sm font-semibold text-white">{emp.contactNo || emp.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white">
                                    <Shield size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-medium text-emerald-100 uppercase tracking-widest">System Code</p>
                                    <p className="text-sm font-semibold text-white">{emp.employeeId}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. TABBED CONTENT */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden no-print">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                    className="p-2 ant-tabs-modern"
                />
            </div>

            {/* 3. PRINT ONLY VIEW (Full dump) */}
            <div className="print-only">
                <h2 className="text-xl font-bold uppercase mb-8 border-b-4 border-slate-900 pb-2">Employee Master Record</h2>
                {items.map(item => (
                    <div key={item.key} className="print-section">
                        {item.children}
                    </div>
                ))}
            </div>
        </div>
    );
}
