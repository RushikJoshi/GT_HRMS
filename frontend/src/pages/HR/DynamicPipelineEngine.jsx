import React, { useState, useEffect } from 'react';
import CandidateCard from './components/CandidateCard';
import RoundContainer from './components/RoundContainer';
import { getNextStage, normalizeStatus } from './PipelineStatusManager';
import api from '../../utils/api';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import { Modal } from 'antd';
import { ArrowRight, Calendar, UserCheck } from 'lucide-react';

export default function DynamicPipelineEngine({
    applicants,
    activeTab, // The current viewed tab from parent (optional if we want to show all)
    workflow, // ['Applied', 'Shortlisted', 'Interview', ...]
    onUpdateStatus,
    onScheduleInterview,
    onAddInterviewRound,
    availableRounds,
    onAddCustomRound,
    viewResume
}) {
    const [proceedModal, setProceedModal] = React.useState({ visible: false, applicant: null, nextStage: '' });

    // Helper to filter applicants for a specific round/stage
    const getApplicantsForStage = (stageName) => {
        return applicants.filter(app => {
            // Basic Check
            if (app.status === 'Rejected') {
                // Rejected candidates stay in their "origin" stage visually but marked rejection?
                // Requirement: "Candidate stays in rejected status but REMAINS in first stage container" (for part 1)
                // This implies we need to know at which stage they were rejected.
                // If the backend doesn't store "rejectedAtStage", we might just check where they "should" be or dump them in 'Rejected' tab if activeTab is 'Rejected'.

                // BUT, user requirement PART 1: "Candidate stays in rejected status but REMAINS in first stage container."
                // This implies we default them to 'Applied' if status is Rejected AND we are viewing Applied?
                // OR we rely on a property like `app.stageName`. 

                // Let's assume `app.stageName` or `app.processStage` field exists, or we infer:
                // If status is 'Rejected', showing them in 'Applied' container might be confusing unless we know they were rejected at Applied.

                // For now, let's strictly follow status === stageName. 
                // If status is "Rejected", they show up only if we have a "Rejected" container or filter.
                // However, for PART 1 compliance: "REMAINS in first stage container".
                // Use `app.stage` field if available. If not, and status is Rejected, maybe render in current tab?

                return activeTab === 'Applied' || activeTab === 'Rejected'; // Fallback
            }

            // Standard Match
            return app.status === stageName;
        });
    };

    // PROCEED LOGIC (Part 3)
    // Updated: Now shows a Choice Modal instead of immediate confirm
    const handleProceed = (applicant) => {
        const nextStage = getNextStage(applicant.status, workflow);
        setProceedModal({ visible: true, applicant, nextStage });
    };

    const confirmMoveToNext = () => {
        const { applicant, nextStage } = proceedModal;
        if (!applicant) return;

        if (nextStage === 'Finalized') {
            onUpdateStatus(applicant, 'Finalized');
        } else {
            onUpdateStatus(applicant, nextStage);
        }
        setProceedModal({ visible: false, applicant: null, nextStage: '' });
    };

    const confirmScheduleInterview = () => {
        const { applicant } = proceedModal;
        if (!applicant) return;

        if (onScheduleInterview) {
            onScheduleInterview(applicant);
        }
        setProceedModal({ visible: false, applicant: null, nextStage: '' });
    };


    // RENDER LOGIC
    // We render RoundContainers based on the Workflow.
    // If activeTab is 'all', we might render all? 
    // Usually standard HRMS has tabs. If activeTab is specific, we only render that RoundContainer.

    // If activeTab is passed, we check if it matches a workflow stage.
    // If "All Pipeline", we map workflow.

    const stagesToRender = activeTab && activeTab !== 'all' ? [activeTab] : workflow;

    return (
        <div className="w-full">
            {stagesToRender.map(stage => {
                // Filter applicants for this stage
                // Enhanced Filter for "Rejected" staying in stage
                const stageApplicants = applicants.filter(app => {
                    // If we are viewing a specific tab, we trust the parent's filtered list
                    if (activeTab && activeTab !== 'all') {
                        return true;
                    }

                    if (app.status === 'Rejected') {
                        return activeTab === stage;
                    }
                    return normalizeStatus(app.status) === stage;
                });

                return (
                    <RoundContainer
                        key={stage}
                        stageName={stage}
                        count={stageApplicants.length}
                    >
                        {stageApplicants.map(applicant => (
                            <CandidateCard
                                key={applicant._id}
                                applicant={applicant}
                                stage={stage}
                                availableRounds={availableRounds}
                                onShortlist={(app) => onUpdateStatus(app, 'Shortlisted')}
                                onReject={(app) => onUpdateStatus(app, 'Rejected')}
                                onScheduleInterview={onScheduleInterview}
                                onProceed={handleProceed}
                                onMoveToRound={(app, round) => onUpdateStatus(app, round)}
                                onAddCustomRound={onAddCustomRound}
                                viewResume={viewResume}
                            />
                        ))}
                    </RoundContainer>
                );
            })}

            {stagesToRender.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">No stages found in workflow.</p>
                </div>
            )}

            {/* Premium Proceed Choice Modal */}
            <Modal
                title={null}
                open={proceedModal.visible}
                onCancel={() => setProceedModal({ ...proceedModal, visible: false })}
                footer={null}
                centered
                width={450}
                className="premium-modal"
            >
                <div className="p-4 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <UserCheck size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">What's Next?</h3>
                        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            {proceedModal.applicant?.name} has completed this round.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={confirmMoveToNext}
                            className="group p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-left hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-[0.98] border border-blue-400/20"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="block text-[10px] font-black text-blue-100 uppercase tracking-widest opacity-80">Next Major Step</span>
                                    <span className="block text-base font-black text-white">Move to {proceedModal.nextStage}</span>
                                </div>
                                <ArrowRight className="text-white group-hover:translate-x-1 transition-transform" size={24} />
                            </div>
                        </button>

                        {proceedModal.nextStage !== 'Finalized' && (
                            <button
                                onClick={confirmScheduleInterview}
                                className="group p-5 bg Fast rounded-2xl text-left hover:border-blue-400 hover:shadow-xl hover:shadow-slate-100 transition-all active:scale-[0.98] border border-slate-200 bg-white"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Action</span>
                                        <span className="block text-base font-black text-slate-700">Schedule Interview</span>
                                    </div>
                                    <Calendar className="text-slate-300 group-hover:text-blue-500 transition-colors" size={24} />
                                </div>
                            </button>
                        )}
                    </div>

                    <div className="text-center pt-2">
                        <button
                            onClick={() => setProceedModal({ ...proceedModal, visible: false })}
                            className="text-[11px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
