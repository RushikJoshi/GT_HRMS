import React, { useState, useEffect } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import useOrgStructure from '../../hooks/useOrgStructure';
import { useNavigate } from 'react-router-dom';
import { Spin, Empty, Button, Tooltip, Avatar, Badge, Tag } from 'antd';
import {
    ApartmentOutlined,
    UserOutlined,
    CaretDownOutlined,
    CaretUpOutlined,
    ArrowLeftOutlined,
    InfoCircleOutlined,
    EyeOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://hrms.gitakshmi.com';

export default function OrgStructure() {
    const { getTopLevelEmployees, getDirectReports } = useOrgStructure();
    const navigate = useNavigate();
    const [roots, setRoots] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial load of roots
    useEffect(() => {
        const fetchRoots = async () => {
            setLoading(true);
            const res = await getTopLevelEmployees();
            if (res.success) {
                setRoots(res.data.employees.map(emp => ({
                    ...emp,
                    isExpanded: false,
                    loaded: false,
                    children: []
                })));
            }
            setLoading(false);
        };
        fetchRoots();
    }, []);

    const toggleNode = async (nodeId, currentRoots) => {
        const updateRecursive = async (nodes) => {
            return Promise.all(nodes.map(async (node) => {
                if (node._id === nodeId) {
                    if (node.isExpanded) return { ...node, isExpanded: false };
                    if (!node.loaded) {
                        const res = await getDirectReports(node._id);
                        if (res.success) {
                            return {
                                ...node,
                                isExpanded: true,
                                loaded: true,
                                children: res.data.map(child => ({
                                    ...child,
                                    isExpanded: false,
                                    loaded: false,
                                    children: []
                                }))
                            };
                        }
                    }
                    return { ...node, isExpanded: true };
                }
                if (node.children?.length > 0) {
                    return { ...node, children: await updateRecursive(node.children) };
                }
                return node;
            }));
        };
        const newRoots = await updateRecursive(currentRoots);
        setRoots(newRoots);
    };

    const EmployeeNode = ({ employee, siblingCount = 1 }) => {
        const isExpanded = employee.isExpanded;
        const [isHovered, setIsHovered] = useState(false);

        // Ultra-Adaptive Density Engine: Multiple tiers for perfect screen fit
        const getDensityClass = () => {
            if (siblingCount <= 2) return 'density-xl';
            if (siblingCount <= 4) return 'density-normal';
            if (siblingCount <= 8) return 'density-compact';
            if (siblingCount <= 12) return 'density-tight';
            if (siblingCount <= 20) return 'density-nano';
            return 'density-micro';
        };

        const densityClass = getDensityClass();

        return (
            <div
                className={`org-node inline-flex flex-col items-center relative group transition-all duration-300 ${densityClass} hover:z-[100]`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Avatar Core - Adaptive Fluidity */}
                <div className={`
                    node-avatar-box relative transition-all duration-300 p-0.5 rounded-full
                    ${isExpanded ? 'ring-[3px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-950 shadow-2xl shadow-indigo-500/30' : ''}
                `}>
                    <Avatar
                        src={employee.profilePic ? (employee.profilePic.startsWith('http') ? employee.profilePic : `${BACKEND_URL}${employee.profilePic}`) : null}
                        icon={<UserOutlined />}
                        className="node-avatar border-2 border-slate-200 dark:border-slate-800 shadow-lg transition-all duration-300"
                        style={{
                            width: 'clamp(44px, 5.5vw, 68px)',
                            height: 'clamp(44px, 5.5vw, 68px)',
                            fontSize: 'clamp(18px, 2.8vw, 26px)'
                        }}
                    />

                    {/* Active Status Highlight - Adaptive Size */}
                    <div className="status-dot-wrapper absolute -bottom-1 -right-1 bg-white dark:bg-slate-950 rounded-full flex items-center justify-center shadow-lg">
                        <div className={`status-dot rounded-full ${employee.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    </div>
                </div>

                {/* Vertical Text Stack - Fluid Sizing */}
                <div className="mt-1.5 text-center pointer-events-none transition-all duration-300 flex flex-col items-center">
                    <div className="node-name font-black text-slate-800 dark:text-slate-100 leading-[1.1] tracking-tight uppercase truncate"
                        style={{ fontSize: 'clamp(9px, 1.1vw, 13px)' }}>
                        {employee.firstName} {employee.lastName}
                    </div>
                    <div className="node-label font-bold text-slate-500 uppercase tracking-[0.25em] mt-0.5 opacity-70"
                        style={{ fontSize: 'clamp(6px, 0.6vw, 8px)' }}>
                        Employee
                    </div>
                </div>

                {/* Hover-Revealed Expansion Arrow - Strictly Scoped Toggle */}
                <div
                    className={`
                        absolute -bottom-5 left-1/2 -translate-x-1/2 transition-all duration-300 cursor-pointer z-10
                        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
                        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-md
                    `}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(employee._id, roots);
                    }}
                >
                    {isExpanded ? <CaretUpOutlined style={{ fontSize: '8px' }} /> : <CaretDownOutlined style={{ fontSize: '10px' }} />}
                </div>

                {/* Adaptive Floating Panel - Smooth CSS Hover Bridge */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-8 h-20 -translate-x-1 bg-transparent z-[9998] pointer-events-auto" />

                <div className={`
                    absolute left-full ml-5 top-1/2 -translate-y-1/2 w-auto min-w-max bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 p-3 z-[9999] text-left
                    transition-all duration-300 origin-left ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[transform,opacity]
                    opacity-0 scale-95 translate-x-4 pointer-events-none
                    group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 group-hover:pointer-events-auto
                `}>
                    <div className="space-y-2.5">
                        <div className="org-panel-row">
                            <span className="org-label">ID</span>
                            <span className="org-separator">:</span>
                            <span className="org-value">{employee._id?.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="org-panel-row">
                            <span className="org-label">Department</span>
                            <span className="org-separator">:</span>
                            <span className="org-value truncate" title={employee.department || 'General'}>
                                {employee.department || 'General'}
                            </span>
                        </div>
                        <div className="org-panel-row">
                            <span className="org-label">Branch</span>
                            <span className="org-separator">:</span>
                            <span className="org-value truncate" title={employee.branch || 'Headquarters'}>
                                {employee.branch || 'Headquarters'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRecursive = (nodes) => {
        return nodes.map((node) => (
            <TreeNode key={node._id} label={<EmployeeNode employee={node} siblingCount={nodes.length} />}>
                {node.isExpanded && node.children && node.children.length > 0 && renderRecursive(node.children)}
                {node.isExpanded && node.loaded && node.children.length === 0 && (
                    <TreeNode label={
                        <div className="flex justify-center mt-2">
                            <div className="py-1 px-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-[6px] font-bold text-slate-300 uppercase tracking-widest opacity-40">
                                End Authority
                            </div>
                        </div>
                    } />
                )}
            </TreeNode>
        ));
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
            <div className="flex flex-col items-center gap-6">
                <Spin size="large" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Corporate DNA</p>
            </div>
        </div>
    );

    return (
        <div className="org-structure-page h-screen w-full flex flex-col bg-[#f8fafc] dark:bg-slate-950 overflow-hidden select-none relative">
            {/* Minimal Header - Maximize Viewport */}
            <div className="h-20 px-8 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 shrink-0 z-[100]">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                    >
                        <ArrowLeftOutlined style={{ fontSize: '14px' }} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">Organization Map</h1>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5 flex items-center gap-2">
                            <Badge status="processing" color="indigo" /> 100% Viewport Adaptive
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Live Hierarchy</span>
                    </div>
                </div>
            </div>

            {/* Tree Canvas: Absolute 100% Viewport / Gravity Flow */}
            <div className={`
                flex-1 w-full relative overflow-hidden flex flex-col items-center 
                bg-[#fdfdfe] dark:bg-slate-950/20 pt-10
            `}>
                {roots.length === 0 ? (
                    <div className="flex items-center justify-center w-full h-full">
                        <Empty description="No Records Found" />
                    </div>
                ) : (
                    <div className="org-tree-wrapper w-full flex-1 flex flex-col items-center">
                        <Tree
                            lineWidth={'1.5px'}
                            lineColor={'#cbd5e1'}
                            lineHeight={'40px'}
                            lineBorderRadius={'12px'}
                            label={
                                <div className="mb-8">
                                    <div className="inline-block px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-xl ring-2 ring-indigo-500/10">
                                        Executive Root
                                    </div>
                                </div>
                            }
                        >
                            {renderRecursive(roots)}
                        </Tree>
                    </div>
                )}
            </div>

            {/* Viewport Adaptive Scoped Styles */}
            <style>{`
                /* FORCE 100% WIDTH & DISABLE SCROLLING */
                .org-structure-page .react-organizational-chart { 
                    width: 100% !important; 
                    margin: 0 !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: flex-start !important;
                }
                .org-structure-page .react-organizational-chart table {
                    width: 100% !important;
                    table-layout: fixed !important;
                    margin: 0 auto !important;
                }
                .org-structure-page .react-organizational-chart .node-content { 
                    display: block !important; 
                    width: 100% !important;
                }
                .org-structure-page .react-organizational-chart .tree-node {
                    padding-top: 15px;
                }

                /* Node Scaling Engine - Absolute Fluidity */
                .org-structure-page .org-node .node-avatar {
                    width: clamp(20px, 4vw, 32px);
                    height: clamp(20px, 4vw, 32px);
                }
                .org-structure-page .org-node .node-name {
                    font-size: clamp(6px, 1.2vw, 9px);
                    max-width: 90%;
                    margin: 0 auto;
                }
                .org-structure-page .org-node .node-label {
                    font-size: clamp(5px, 0.8vw, 7px);
                }

                /* Adaptive Density States - Hyper Aggressive Scaling */
                .org-structure-page .org-node { 
                    transform-origin: top center; 
                    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
                    backface-visibility: hidden;
                    -webkit-font-smoothing: antialiased;
                    transform: translateZ(0);
                }
                .org-structure-page .org-node.density-xl { transform: scale(1.2) translateZ(0); }
                .org-structure-page .org-node.density-normal { transform: scale(1.05) translateZ(0); }
                .org-structure-page .org-node.density-compact { transform: scale(0.9) translateZ(0); }
                .org-structure-page .org-node.density-tight { transform: scale(0.8) translateZ(0); }
                .org-structure-page .org-node.density-nano { transform: scale(0.7) translateZ(0); }
                .org-structure-page .org-node.density-micro { transform: scale(0.55) translateZ(0); }

                /* Status Dot Scaling */
                .org-structure-page .status-dot-wrapper {
                    width: clamp(8px, 1.5vw, 10px);
                    height: clamp(8px, 1.5vw, 10px);
                }
                .org-structure-page .status-dot {
                    width: clamp(4px, 1vw, 6px);
                    height: clamp(4px, 1vw, 6px);
                }

                /* Scrollbar Removal */
                .org-structure-page *::-webkit-scrollbar { display: none !important; }
                .org-structure-page * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
                
                /* Line Color Refinement */
                .org-structure-page .react-organizational-chart .tree-node::before,
                .org-structure-page .react-organizational-chart .tree-node::after {
                    border-color: #cbd5e1 !important;
                }
                .dark .org-structure-page .react-organizational-chart .tree-node::before,
                .dark .org-structure-page .react-organizational-chart .tree-node::after {
                    border-color: #334155 !important;
                }

                /* Hover Panel Alignment Styles */
                .org-structure-page .org-panel-row {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    line-height: 1.2;
                    white-space: nowrap;
                }
                .org-structure-page .org-label {
                    width: 70px;
                    flex-shrink: 0;
                    font-size: 8px;
                    font-weight: 900;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .org-structure-page .org-separator {
                    color: #e2e8f0;
                    font-size: 9px;
                    font-weight: bold;
                }
                .org-structure-page .org-value {
                    font-size: 10px;
                    font-weight: 700;
                    color: #475569;
                }
                .dark .org-structure-page .org-value {
                    color: #cbd5e1;
                }

                /* Node highlight logic */
                .org-structure-page .node-avatar-box {
                    background: transparent;
                }
                .org-structure-page .group:hover .node-avatar {
                    transform: scale(1.1);
                    border-color: #6366f1;
                }
            `}</style>
        </div>
    );
}
