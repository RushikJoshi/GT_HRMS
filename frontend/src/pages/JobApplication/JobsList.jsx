import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useParams, useNavigate } from 'react-router-dom';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import api from '../../utils/api';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import CandidateProfileMenu from '../../components/jobs/CandidateProfileMenu';
import {
    Search,
    Briefcase,
    Clock,
    ArrowRight,
    Star,
    Zap,
    Users,
    Globe,
    Calendar,
    ArrowLeft
} from 'lucide-react';
import CareerPreview from '../HR/CareerBuilder/CareerPreview';

export default function JobsList() {
    const [searchParams] = useSearchParams();
    const { companyId } = useParams();
    const companyCode = companyId;
    const tenantIdQuery = searchParams.get('tenantId');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { candidate, isInitialized } = useJobPortalAuth();

    const [resolvedTenantId, setResolvedTenantId] = useState(tenantIdQuery || null);
    const [myApplications, setMyApplications] = useState(new Set());
    const [companyName, setCompanyName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All Departments');
    const [filterExp, setFilterExp] = useState('All Experience');
    const [filterType, setFilterType] = useState('All Types');
    const [candidateName, setCandidateName] = useState(candidate?.name || '');
    const [customization, setCustomization] = useState(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        // SAFETY: If companyCode is a known portal route, redirect to the correct path
        const portalRoutes = ['dashboard', 'login', 'signup', 'applications', 'profile', 'open-positions'];
        if (portalRoutes.includes(companyCode)) {
            navigate(`/candidate/${companyCode}`, { replace: true });
            return;
        }

        if (candidate?.name) setCandidateName(candidate.name);

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [candidate, companyCode, navigate]);

    useEffect(() => {
        async function init() {
            let tid = resolvedTenantId;
            if (!tid && companyCode) {
                try {
                    const res = await api.get(`/public/resolve-code/${companyCode}`);
                    tid = res.data.tenantId;
                    setResolvedTenantId(tid);
                    setCompanyName(res.data.companyName);
                } catch (e) {
                    console.error("Resolve error:", e);
                    setError(e.response?.data?.error || e.message || 'Invalid Company Link');
                    return;
                }
            }

            if (!tid) {
                setError('Missing Company Information');
                return;
            }

            try {
                const jobsRes = await api.get(`/public/jobs?tenantId=${tid}`);
                setJobs(jobsRes.data || []);

                try {
                    // Use new optimized endpoint (reads from PublishedCareerPage)
                    const custRes = await api.get(`/career/public/${tid}`);
                    if (custRes.data && custRes.data.success !== false) {
                        setCustomization(custRes.data);
                    } else {
                        console.log('No published career customization found, using defaults.');
                        setCustomization(null);
                    }
                } catch (custErr) {
                    console.warn('Failed to load career customization:', custErr.message);
                    setCustomization(null);
                }

                if (candidate) {
                    try {
                        const dashRes = await api.get('/candidate/dashboard');
                        if (dashRes.data.applications) {
                            const appSet = new Set(dashRes.data.applications.map(app => app.requirementId?._id || app.requirementId));
                            setMyApplications(appSet);
                        }
                        if (dashRes.data.profile?.name) {
                            setCandidateName(dashRes.data.profile.name);
                        }
                    } catch (dashErr) {
                        console.warn('Failed to load candidate dashboard data:', dashErr.message);
                    }
                }
            } catch (err) {
                console.error("Portal Init Error:", err);
                setError('Failed to load portal data.');
            } finally {
                setLoading(false);
            }
        }

        if (isInitialized) {
            init();
        }
    }, [companyCode, resolvedTenantId, isInitialized, candidate]);

    // Apply SEO Settings
    useEffect(() => {
        if (customization && customization.seoSettings) {
            const { seo_title, seo_description, seo_keywords, seo_og_image } = customization.seoSettings;

            // 1. Update Title
            if (seo_title) document.title = seo_title;

            // 2. Update Meta Description
            let metaDesc = document.querySelector("meta[name='description']");
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = "description";
                document.head.appendChild(metaDesc);
            }
            if (seo_description) metaDesc.content = seo_description;

            // 3. Update Keywords
            if (seo_keywords && seo_keywords.length > 0) {
                let metaKeywords = document.querySelector("meta[name='keywords']");
                if (!metaKeywords) {
                    metaKeywords = document.createElement('meta');
                    metaKeywords.name = "keywords";
                    document.head.appendChild(metaKeywords);
                }
                metaKeywords.content = seo_keywords.join(', ');
            }

            // 4. Update OG Image
            if (seo_og_image) {
                let metaOgImage = document.querySelector("meta[property='og:image']");
                if (!metaOgImage) {
                    metaOgImage = document.createElement('meta');
                    metaOgImage.setAttribute('property', 'og:image');
                    document.head.appendChild(metaOgImage);
                }
                metaOgImage.content = seo_og_image;
            }
        } else if (companyName) {
            document.title = `${companyName} - Careers`;
        }
    }, [customization, companyName]);

    const departments = ['All Departments', ...new Set(jobs.map(j => j.department).filter(Boolean))];

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.jobTitle?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
            job.department?.toLowerCase()?.includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All Departments' || job.department === filterDept;
        return matchesSearch && matchesDept;
    });

    if (loading) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="h-16 w-16 border-4 border-indigo-600/20 rounded-full"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-slate-900 font-black text-[11px] uppercase tracking-[0.3em]">Preparing Portal</p>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Connecting to {companyName || 'Ecosystem'}...</p>
                </div>
            </div>
        </div>
    );

    if (error) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full">
                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Globe size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Access Denied</h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">{error}</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-full font-bold hover:shadow-lg transition-all">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-600">
            {/* Header / Navigation */}
            {/* Header / Navigation */}
            <nav className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-gray-100 bg-white/80 backdrop-blur-md`}>
                <div className="w-full px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-default">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                            <Briefcase size={20} />
                        </div>
                        <span className="text-xl font-black tracking-tight text-gray-900">
                            {companyName || 'GT HRMS'}
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        {candidate ? (
                            <CandidateProfileMenu identifier={resolvedTenantId} isTransparent={false} />
                        ) : (
                            <Link
                                to={`/candidate/login?tenantId=${resolvedTenantId}`}
                                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
                            >
                                Candidate Login
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content: Driven by Career Builder */}
            <main className="pt-20">
                <CareerPreview
                    config={customization && customization.sections?.length > 0 ? customization : {
                        sections: [
                            {
                                id: 'hero-default',
                                type: 'hero',
                                content: {
                                    title: "Join Our Amazing Team",
                                    subtitle: "Innovate, grow, and build the future with us.",
                                    bgType: "gradient",
                                    bgColor: "from-[#4F46E5] via-[#9333EA] to-[#EC4899]",
                                    ctaText: "Check Open Positions"
                                }
                            },
                            {
                                id: 'openings-default',
                                type: 'openings',
                                content: {
                                    title: "Open Positions",
                                    layout: "grid",
                                    gridColumns: 3,
                                    enabled: true
                                }
                            }
                        ],
                        theme: { primaryColor: '#4F46E5' }
                    }}
                    isBuilder={false}
                    jobs={filteredJobs}
                    searchTerm={searchTerm}
                    onSearch={setSearchTerm}
                    myApplications={myApplications}
                    onApply={(job) => {
                        if (myApplications.has(job._id)) {
                            navigate('/candidate/dashboard');
                        } else {
                            const tid = resolvedTenantId || job.tenant;
                            navigate(`/apply-job/${job._id}?tenantId=${tid}`);
                        }
                    }}
                />
            </main>

            {/* Simple Footer */}
            <footer className="bg-white border-t border-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} {companyName || 'Candidate Portal'}. Powered by Gitakshmi HRMS
                    </p>
                </div>
            </footer>
        </div>
    );
}