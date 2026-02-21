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
    <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden mb-4 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
        <div className="px-6 py-4 border-b border-dashed border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-50 text-teal-600/80 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    {Icon && <Icon size={18} strokeWidth={1.5} />}
                </div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
            </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            {children}
        </div>
    </div >
);

const DetailItem = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col gap-1 group/item">
        <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-medium text-slate-400 tracking-[0.15em]">{label}</span>
        </div>
        <div className="text-sm font-medium text-slate-600 pl-0.5 group-hover/item:text-slate-900 transition-colors">
            {value || <span className="text-slate-300 font-normal italic text-xs">Pending Verification</span>}
        </div>
    </div>
);

const FileDownloadLink = ({ url, label }) => {
    if (!url) return (
        <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-slate-300 py-3.5 border border-slate-100 border-dashed rounded-xl px-5 italic bg-slate-50/30">
            <FileText size={14} strokeWidth={1.5} /> {label}: Unavailable
        </div>
    );
    return (
        <a
            href={`${BACKEND_URL}${url}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 text-slate-600 bg-white px-5 py-3.5 rounded-xl transition-all border border-slate-200 hover:border-teal-400 hover:shadow-sm group hover:bg-teal-50/30"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={16} strokeWidth={1.5} className="shrink-0 text-slate-400 group-hover:text-teal-500 transition-colors" />
                <span className="text-[10px] font-semibold uppercase tracking-wider truncate text-slate-500 group-hover:text-teal-700 transition-colors">{label}</span>
            </div>
            <div className="shrink-0 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-teal-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
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
            <p className="font-semibold uppercase tracking-widest text-xs">No employee record found</p>
        </div>
    );

    const items = [
        {
            key: '1',
            label: <span className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider">Identity & Personal</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        <InfoGroup title="Personal Information" icon={User}>
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
                    </div>

                    <InfoGroup title="Address Information" icon={MapPin}>
                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80"></div> Temporary Address
                                </h4>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {emp.tempAddress?.line1}, {emp.tempAddress?.line2 && emp.tempAddress?.line2 + ', '}<br />
                                    {emp.tempAddress?.city}, {emp.tempAddress?.state} - {emp.tempAddress?.pinCode}<br />
                                    {emp.tempAddress?.country}
                                </p>
                            </div>
                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400/80"></div> Permanent Address
                                </h4>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
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
            label: <span className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider">Employment</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
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

                        <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden mb-4">
                            <div className="px-6 py-4 border-b border-dashed border-slate-100 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-50 text-teal-600/80">
                                    <Briefcase size={18} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Experience History</h3>
                            </div>
                            <div className="p-6">
                                {emp.experience && emp.experience.length > 0 ? (
                                    <div className="space-y-10">
                                        {emp.experience.map((exp, idx) => (
                                            <div key={idx} className="relative pl-10 border-l border-slate-100 last:border-0 pb-2">
                                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-teal-400 shadow-sm z-10 box-content"></div>
                                                <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-5">
                                                    <div>
                                                        <h4 className="text-base font-semibold text-slate-800">{exp.companyName}</h4>
                                                        <p className="text-teal-500 text-xs font-medium uppercase tracking-widest mt-1.5">{exp.designation}</p>
                                                    </div>
                                                    <div className="mt-2 sm:mt-0 px-4 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-semibold tracking-widest uppercase border border-slate-100">
                                                        {formatDateDDMMYYYY(exp.from)} - {formatDateDDMMYYYY(exp.to)}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/30 p-6 rounded-2xl border border-dashed border-slate-100">
                                                    <DetailItem label="Last Salary" value={exp.lastDrawnSalary} />
                                                    <DetailItem label="Mgr Name" value={exp.reportingPersonName} />
                                                    <DetailItem label="Mgr Contact" value={exp.reportingPersonContact} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-6 text-slate-400 text-sm italic font-normal">No prior experience records.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: '3',
            label: <span className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider">Education</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-2">
                    <InfoGroup title="Academic Background" icon={GraduationCap}>
                        <div className="col-span-full">
                            <Tag color="cyan" className="mb-8 font-semibold uppercase tracking-widest text-[10px] px-4 py-1.5 border border-teal-100 bg-teal-50 text-teal-700 rounded-lg">
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
            label: <span className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider">Docs & Bank</span>,
            children: (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        <InfoGroup title="Financial Information" icon={Landmark}>
                            <DetailItem label="Bank Name" value={emp.bankDetails?.bankName} icon={Landmark} />
                            <DetailItem label="Account Number" value={emp.bankDetails?.accountNumber} icon={CreditCard} />
                            <DetailItem label="IFSC Code" value={emp.bankDetails?.ifsc} />
                            <DetailItem label="Branch Name" value={emp.bankDetails?.branchName} />
                            <div className="col-span-full mt-4 border-t border-dashed border-slate-100 pt-4">
                                <FileDownloadLink url={emp.bankDetails?.bankProofUrl} label="Bank Proof (Passbook/Cheque)" />
                            </div>
                        </InfoGroup>

                        <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden">
                            <div className="px-6 py-4 border-b border-dashed border-slate-100 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-50 text-teal-600/80">
                                    <Shield size={18} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Identity Documents</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Aadhar Verification</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        <FileDownloadLink url={emp.documents?.aadharFront} label="Aadhar Front" />
                                        <FileDownloadLink url={emp.documents?.aadharBack} label="Aadhar Back" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Tax Identification</h4>
                                    <FileDownloadLink url={emp.documents?.panCard} label="PAN Card" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div id="printable-profile" className="space-y-6">
            <style>{`
                .ant-tabs-nav-wrap { padding: 0 1rem; }
                .ant-tabs-tab { padding: 16px 0 !important; margin: 0 20px !important; }
                .ant-tabs-tab-active .ant-tabs-tab-btn { color: #14B8A6 !important; }
                .ant-tabs-ink-bar { background: #14B8A6 !important; height: 3px !important; border-radius: 3px 3px 0 0; }
                
                @media print {
                    @page {
                        margin: 10mm;
                        size: portrait;
                    }

                    /* Global Layout Hiding */
                    .no-print, header, aside, .ant-tabs-nav, #root aside, #root header { 
                        display: none !important; 
                        height: 0 !important;
                    }
                    
                    /* Reset container margins */
                    .md\\:ml-20, .peer-hover\\:md\\:ml-72 { 
                        margin-left: 0 !important; 
                        padding: 0 !important;
                    }

                    body { 
                        background: white !important; 
                        color: #000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    #printable-profile {
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    .print-only { 
                        display: block !important; 
                    }

                    /* Hide live components during print */
                    .group\\/banner, .no-print { 
                        display: none !important; 
                    }
                    
                    /* Force visibility of data */
                    .bg-slate-50, .bg-slate-50\\/50, .bg-slate-50\\/30 { 
                        background-color: #f8fafc !important; 
                    }

                    .print-header {
                        border-bottom: 3px solid #14B8A6;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }

                    .print-data-grid {
                        display: grid;
                        grid-template-cols: repeat(2, 1fr);
                        gap: 20px;
                    }

                    .print-section {
                        page-break-inside: avoid;
                        margin-bottom: 25px;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        overflow: hidden;
                    }

                    .print-section-title {
                        background: #f1f5f9;
                        padding: 8px 15px;
                        font-weight: 800;
                        text-transform: uppercase;
                        font-size: 10pt;
                        letter-spacing: 0.1em;
                        border-bottom: 1px solid #e2e8f0;
                        color: #334155;
                    }

                    .print-label {
                        font-size: 8pt;
                        color: #64748b;
                        text-transform: uppercase;
                        font-weight: 700;
                        letter-spacing: 0.05em;
                        margin-bottom: 2px;
                    }

                    .print-value {
                        font-size: 10pt;
                        color: #1e293b;
                        font-weight: 600;
                    }

                    .print-avatar {
                        width: 120px;
                        height: 120px;
                        border-radius: 15px;
                        border: 2px solid #14B8A6;
                    }
                }
                .print-only { display: none; }
            `}</style>

            {/* 1. PREMIUM HEADER BANNER - CRYSTAL TEAL THEME */}
            <div className="group/banner relative overflow-hidden bg-gradient-to-br from-[#14B8A6] to-[#0F766E] rounded-[40px] shadow-2xl p-8 sm:p-12 text-white mb-8 border border-white/20">
                {/* Decorative Elements - Floating Orbs & Pattern */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none mix-blend-overlay"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-900/20 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[2s] ease-in-out"></div>

                <div className="relative flex flex-col lg:flex-row gap-12 items-center lg:items-start z-10">
                    {/* Avatar Section - Straight & Clean Look */}
                    <div className="relative shrink-0 perspective-1000">
                        <div className="w-44 h-44 rounded-[2.5rem] overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl relative group transition-all duration-500 hover:scale-[1.02]">
                            {emp.profilePic ? (
                                <img src={`${BACKEND_URL}${emp.profilePic}`} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/80 bg-white/5 uppercase tracking-tighter">
                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                            )}
                        </div>

                        {/* Status Indicator */}
                        <div className={`absolute -bottom-3 -right-3 w-10 h-10 rounded-xl border-2 border-white shadow-md flex items-center justify-center ${emp.status === 'Active' ? 'bg-[#34D399]' : 'bg-rose-400'}`} title={emp.status}>
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-sm"></div>
                        </div>
                    </div>

                    {/* Meta Section */}
                    <div className="flex-1 w-full text-center lg:text-left pt-2">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                            <div className="space-y-3">
                                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                                    {emp.firstName} {emp.lastName}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                    <span className="px-4 py-1.5 rounded-xl bg-white/20 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/20">
                                        {emp.role}
                                    </span>
                                    <span className="text-teal-50 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-200 animate-pulse"></div>
                                        {emp.department} Unit
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-3 mx-auto lg:mx-0">
                                <Button
                                    icon={<Printer size={16} />}
                                    onClick={() => window.print()}
                                    className="no-print rounded-xl font-bold uppercase tracking-widest text-[10px] h-10 px-6 border-white/30 bg-white/10 text-white hover:bg-white hover:text-[#14B8A6] hover:border-white transition-all backdrop-blur-sm"
                                >
                                    Print Dossier
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-teal-400/30 pt-6">
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm text-white group-hover:bg-white group-hover:text-[#14B8A6] transition-all">
                                    <Mail size={18} />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mb-0.5">Email Address</p>
                                    <p className="text-sm font-bold text-white truncate" title={emp.email}>{emp.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm text-white group-hover:bg-white group-hover:text-[#14B8A6] transition-all">
                                    <Phone size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mb-0.5">Contact No</p>
                                    <p className="text-sm font-bold text-white">{emp.contactNo || emp.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm text-white group-hover:bg-white group-hover:text-[#14B8A6] transition-all">
                                    <Shield size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mb-0.5">System Code</p>
                                    <p className="text-sm font-bold text-white">{emp.employeeId}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. TABBED CONTENT CONTAINER WITH BLURRY BORDER STYLE */}
            <div className="no-print bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[40px] overflow-hidden p-1">
                <div className="bg-white/50 rounded-[36px] overflow-hidden">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={items}
                        className="p-4 ant-tabs-modern"
                    />
                </div>
            </div>

            {/* 3. PRINT ONLY VIEW (Custom Redesigned for Paper) */}
            <div className="print-only">
                <div className="print-header flex justify-between items-end">
                    <div className="flex items-center gap-6">
                        {emp.profilePic ? (
                            <img src={`${BACKEND_URL}${emp.profilePic}`} alt="" className="print-avatar" />
                        ) : (
                            <div className="print-avatar bg-slate-100 flex items-center justify-center text-4xl font-black text-slate-300">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">
                                {emp.firstName} {emp.middleName} {emp.lastName}
                            </h1>
                            <div className="flex items-center gap-4">
                                <span className="bg-[#14B8A6] text-white px-3 py-1 rounded text-[10pt] font-bold uppercase tracking-widest">
                                    {emp.role}
                                </span>
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[8pt]">
                                    {emp.department} Unit
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[8pt] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Employee Record</div>
                        <div className="text-[12pt] font-black pointer-events-none text-slate-300">#{emp.employeeId}</div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Identity & Personal */}
                    <div className="print-section">
                        <div className="print-section-title">Identity & Personal Information</div>
                        <div className="p-5 print-data-grid">
                            <div>
                                <div className="print-label">Date of Birth</div>
                                <div className="print-value">{formatDateDDMMYYYY(emp.dob)}</div>
                            </div>
                            <div>
                                <div className="print-label">Gender / Marital</div>
                                <div className="print-value">{emp.gender} / {emp.maritalStatus}</div>
                            </div>
                            <div>
                                <div className="print-label">Blood Group</div>
                                <div className="print-value">{emp.bloodGroup}</div>
                            </div>
                            <div>
                                <div className="print-label">Nationality</div>
                                <div className="print-value">{emp.nationality}</div>
                            </div>
                            <div>
                                <div className="print-label">Father's Name</div>
                                <div className="print-value">{emp.fatherName}</div>
                            </div>
                            <div>
                                <div className="print-label">Mother's Name</div>
                                <div className="print-value">{emp.motherName}</div>
                            </div>
                        </div>
                    </div>

                    {/* Employment */}
                    <div className="print-section">
                        <div className="print-section-title">Employment Details</div>
                        <div className="p-5 print-data-grid">
                            <div>
                                <div className="print-label">Joining Date</div>
                                <div className="print-value">{formatDateDDMMYYYY(emp.joiningDate)}</div>
                            </div>
                            <div>
                                <div className="print-label">Job Type</div>
                                <div className="print-value">{emp.jobType}</div>
                            </div>
                            <div>
                                <div className="print-label">Email Address</div>
                                <div className="print-value">{emp.email}</div>
                            </div>
                            <div>
                                <div className="print-label">Contact Number</div>
                                <div className="print-value">{emp.contactNo || emp.phone}</div>
                            </div>
                        </div>
                    </div>

                    {/* Banking & Identity Docs */}
                    <div className="print-section">
                        <div className="print-section-title">Banking & Documents</div>
                        <div className="p-5 print-data-grid">
                            <div>
                                <div className="print-label">Bank Name</div>
                                <div className="print-value">{emp.bankDetails?.bankName}</div>
                            </div>
                            <div>
                                <div className="print-label">Account / Branch</div>
                                <div className="print-value">{emp.bankDetails?.accountNumber} / {emp.bankDetails?.branchName}</div>
                            </div>
                            <div>
                                <div className="print-label">IFSC Code</div>
                                <div className="print-value">{emp.bankDetails?.ifsc}</div>
                            </div>
                            <div>
                                <div className="print-label">Identity Verify</div>
                                <div className="print-value">Aadhar Card / PAN Card Verified</div>
                            </div>
                        </div>
                    </div>

                    {/* Address Section */}
                    <div className="print-section">
                        <div className="print-section-title">Contact Addresses</div>
                        <div className="p-5 grid grid-cols-2 gap-8">
                            <div>
                                <div className="print-label mb-2">Permanent Address</div>
                                <div className="text-[9pt] leading-relaxed">
                                    {emp.permAddress?.line1}, {emp.permAddress?.line2}<br />
                                    {emp.permAddress?.city}, {emp.permAddress?.state} - {emp.permAddress?.pinCode}
                                </div>
                            </div>
                            <div>
                                <div className="print-label mb-2">Medical / Emergency</div>
                                <div className="text-[9pt] leading-relaxed">
                                    Contact: {emp.emergencyContactName}<br />
                                    Phone: {emp.emergencyContactNumber}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-10 border-t border-slate-100 flex justify-between items-center text-[7pt] text-slate-400 font-bold uppercase tracking-widest">
                    <div>System Generated Profile Dossier • {new Date().toLocaleDateString()}</div>
                    <div>Page 1 of 1</div>
                </div>
            </div>
        </div>
    );
}

