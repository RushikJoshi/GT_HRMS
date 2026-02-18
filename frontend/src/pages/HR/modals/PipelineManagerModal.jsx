import React, { useState, useEffect } from 'react';
import { Modal, Button, message } from 'antd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Trash2, Settings, Check, Save, X, Layout, Clock, Lock } from 'lucide-react';
import api from '../../../utils/api';
import StageModal from '../../../components/StageModal';
import FeedbackTemplateBuilder from '../../../components/FeedbackTemplateBuilder';

export default function PipelineManagerModal({ visible, onClose, requirement, onUpdate }) {
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Sub-modals
    const [showStageModal, setShowStageModal] = useState(() => window.triggerAddStage === true);
    const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
    const [templateBuilderData, setTemplateBuilderData] = useState(null);

    useEffect(() => {
        if (visible && requirement) {
            // Clone and sort stages
            let rawStages = [...(requirement.pipelineStages || [])];
            rawStages.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

            // Ensure Applied (System Start) exists
            const hasSystemStart = rawStages.length > 0 && rawStages[0].isSystemStage;
            if (!hasSystemStart) {
                // Prepend default Applied stage if missing or if first stage is not system
                rawStages.unshift({
                    stageId: 'stage_applied_system',
                    stageName: 'Applied',
                    stageType: 'System',
                    isSystemStage: true, // Critical for locking
                    orderIndex: 0,
                    mode: 'N/A',
                    durationMinutes: 0
                });
            }

            // Ensure Finalized (System End) exists
            const hasSystemEnd = rawStages.length > 0 && rawStages[rawStages.length - 1].isSystemStage;
            if (!hasSystemEnd) {
                // Append default Finalized stage
                rawStages.push({
                    stageId: 'stage_finalized_system',
                    stageName: 'Finalized',
                    stageType: 'System',
                    isSystemStage: true,
                    orderIndex: 999,
                    mode: 'N/A',
                    durationMinutes: 0
                });
            }

            // Map and normalize
            const mapped = rawStages.map((s, i) => ({
                ...s,
                tempId: s.stageId || `stage_${Date.now()}_${i}`,
                stageId: s.stageId || s.id,
                mode: s.mode || 'Online',
                durationMinutes: s.durationMinutes || 30,
                assignedInterviewer: (s.assignedInterviewers && s.assignedInterviewers.length > 0)
                    ? (typeof s.assignedInterviewers[0] === 'object' ? s.assignedInterviewers[0]._id : s.assignedInterviewers[0])
                    : ''
            }));

            setStages(mapped);
            fetchTemplates();
            fetchEmployees();
        }
    }, [visible, requirement]);

    // Conditional Add Trigger
    useEffect(() => {
        if (visible && window.triggerAddStage === true) {
            setShowStageModal(true);
            window.triggerAddStage = false;
        }
    }, [visible]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/feedback/templates');
            setTemplates(res.data);
        } catch (e) {
            console.error("Failed to fetch templates", e);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/hr/employees?limit=500');
            const data = res.data;
            setEmployees(Array.isArray(data) ? data : data.data || data.employees || []);
        } catch (e) {
            console.error("Failed to fetch employees", e);
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const sourceIdx = result.source.index;
        const destIdx = result.destination.index;

        if (sourceIdx === destIdx) return;

        // The index comes from the Draggable list which excludes first and last system stages
        // We render stages[1] at index 0, stages[2] at index 1...
        // So Source Index 0 maps to Stages Index 1.
        const realSourceIdx = sourceIdx + 1;
        const realDestIdx = destIdx + 1;

        const newStages = Array.from(stages);
        const [moved] = newStages.splice(realSourceIdx, 1);
        newStages.splice(realDestIdx, 0, moved);
        setStages(newStages);
    };

    const handleStageAdd = (stageData) => {
        const template = templates.find(t => t._id === stageData.feedbackTemplateId);

        const newStage = {
            stageId: `stage_${Date.now()}`,
            stageName: stageData.name,
            feedbackFormId: stageData.feedbackTemplateId,
            evaluationCriteria: template ? template.criteria.map(c => c.label) : [],
            stageType: stageData.stageType || 'Interview',
            mode: stageData.mode || 'Online',
            durationMinutes: stageData.durationMinutes || 45,
            assignedInterviewer: '',
            isSystemStage: false
        };

        // Insert before Finalized (last element)
        const newWorkflow = [...stages];
        if (newWorkflow.length > 0 && newWorkflow[newWorkflow.length - 1].isSystemStage) {
            newWorkflow.splice(newWorkflow.length - 1, 0, newStage);
        } else {
            newWorkflow.push(newStage);
        }

        setStages(newWorkflow);
        setShowStageModal(false);
    };

    const deleteStage = (index) => {
        setStages(stages.filter((_, idx) => idx !== index));
    };

    const updateStage = (index, field, value) => {
        setStages(prev => {
            const newStages = [...prev];
            // Immutable update of the specific stage object
            newStages[index] = { ...newStages[index], [field]: value };
            return newStages;
        });
    };

    const openTemplateBuilder = (index) => {
        const stage = stages[index];
        const existing = stage.feedbackFormId ? templates.find(t => t._id === stage.feedbackFormId) : null;

        setTemplateBuilderData({
            stageIndex: index,
            initialTemplate: existing ? {
                templateName: existing.templateName,
                criteria: existing.criteria || []
            } : {
                templateName: stage.stageName + ' Feedback',
                criteria: []
            }
        });
        setShowTemplateBuilder(true);
    };

    const handleTemplateSave = async (data) => {
        try {
            const res = await api.post('/feedback/template', {
                templateName: data.templateName,
                criteria: data.criteria
            });
            const newTemplate = res.data;
            setTemplates([...templates, newTemplate]);

            if (templateBuilderData) {
                const idx = templateBuilderData.stageIndex;
                const newWorkflow = [...stages];
                newWorkflow[idx].feedbackFormId = newTemplate._id;
                newWorkflow[idx].evaluationCriteria = data.criteria.map(c => c.label);
                setStages(newWorkflow);
            }
            setShowTemplateBuilder(false);
            setTemplateBuilderData(null);
        } catch (e) {
            message.error("Failed to save template");
        }
    };

    const handleSavePipeline = async () => {
        if (!requirement?._id) return;
        setLoading(true);
        try {
            // Prepare payload
            const updatedStages = stages.map((s, i) => ({
                stageId: s.stageId || `stage_${Date.now()}_${i}`,
                stageName: s.stageName,
                isSystemStage: s.isSystemStage || false,
                orderIndex: i + 1,
                assignedInterviewers: s.assignedInterviewer ? [s.assignedInterviewer] : [],
                feedbackFormId: s.feedbackFormId || null,
                mode: s.mode,
                durationMinutes: s.durationMinutes,
                stageType: s.stageType || 'Interview',
                evaluationCriteria: s.evaluationCriteria || []
            }));

            await api.put(`/requirements/${requirement._id}`, {
                pipelineStages: updatedStages
            });

            message.success("Pipeline updated successfully");
            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            message.error("Failed to update pipeline");
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    // Filter for rendering loop
    // But we iterate 'stages' and conditionally check constraints
    // RequirementForm structure:
    // 1. Applied stage
    // 2. DragDropContext (Custom Stages)
    // 3. Finalized Stage

    // We assume index 0 is Applied and index length-1 is Finalized if they are System/Locked.
    // We'll robustly handle this.

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            title={
                <div className="flex items-center gap-2 text-slate-800">
                    <Layout size={20} className="text-indigo-600" />
                    <span className="font-bold text-lg">Manage Pipeline Stages</span>
                </div>
            }
            width={1100}
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button key="save" type="primary" onClick={handleSavePipeline} loading={loading} icon={<Save size={16} />}>
                    Save Changes
                </Button>
            ]}
            className="pipeline-manager-modal"
            styles={{
                body: { overflowX: 'hidden' },
                mask: { visibility: showStageModal ? 'hidden' : 'visible' }
            }}
            style={{ visibility: showStageModal ? 'hidden' : 'visible' }}
        >
            <div className="py-6 px-2">
                <div className="max-w-4xl mx-auto space-y-6 relative">
                    {/* Decorative Center Line (Vertical) */}
                    <div className="absolute left-[2.45rem] top-6 bottom-6 w-0.5 bg-slate-100 rounded-full z-0"></div>

                    {/* System Stage: Applied */}
                    {stages.length > 0 && (
                        <div className="flex items-center gap-6 p-4 bg-slate-50 border-2 border-slate-100 border-dashed rounded-2xl opacity-75 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-black">1</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700">{stages[0].stageName}</h4>
                                <p className="text-[10px] uppercase font-bold text-slate-400">System Stage • Locked</p>
                            </div>
                            <Lock size={16} className="text-slate-400" />
                        </div>
                    )}

                    {/* Draggable Stages */}
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="pipeline-editor-modal" direction="horizontal" ignoreContainerClipping={true}>
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="flex gap-6 overflow-x-auto pb-8 my-4 relative z-10 min-h-[400px]"
                                >
                                    {stages.map((stg, index) => {
                                        // Skip system stages at starts/ends for the partial list
                                        if (index === 0 || index === stages.length - 1) return null;

                                        // DnD index is relative to this list (0, 1, 2...)
                                        const draggableIndex = index - 1;

                                        return (
                                            <Draggable key={stg.tempId || stg.stageId} draggableId={stg.tempId || stg.stageId} index={draggableIndex}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`w-80 flex-shrink-0 relative flex flex-col gap-4 group transition-all ${snapshot.isDragging ? 'rotate-2 scale-105 z-50' : ''}`}
                                                    >
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="absolute top-4 right-4 text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing z-20"
                                                        >
                                                            <GripVertical size={20} />
                                                        </div>

                                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100 mt-3 mx-auto">
                                                            {index + 1}
                                                        </div>

                                                        <div className="flex-1 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 min-h-[240px] flex flex-col">
                                                            {/* Inputs */}
                                                            <div className="flex flex-col gap-4 flex-1">
                                                                <div>
                                                                    <input
                                                                        value={stg.stageName}
                                                                        onChange={e => updateStage(index, 'stageName', e.target.value)}
                                                                        className="text-lg font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-slate-300 mb-2"
                                                                        placeholder="Stage Name"
                                                                    />
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                                                                            <Clock size={12} className="text-indigo-500" />
                                                                            <input
                                                                                type="number"
                                                                                value={stg.durationMinutes || 30}
                                                                                onChange={e => updateStage(index, 'durationMinutes', parseInt(e.target.value))}
                                                                                className="w-8 bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold text-indigo-700"
                                                                            />
                                                                            <span className="text-[10px] font-bold text-indigo-400">min</span>
                                                                        </div>
                                                                        <select
                                                                            value={stg.mode || 'Online'}
                                                                            onChange={e => updateStage(index, 'mode', e.target.value)}
                                                                            className="bg-slate-50 border-none text-[10px] font-bold text-slate-600 rounded-lg py-1 pl-2 pr-6 focus:ring-0"
                                                                        >
                                                                            <option value="Online">Online</option>
                                                                            <option value="In-person">In-person</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Config Grid */}
                                                                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100 mt-auto">
                                                                    <div>
                                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Interviewer</label>
                                                                        <select
                                                                            value={stg.assignedInterviewer || ''}
                                                                            onChange={e => updateStage(index, 'assignedInterviewer', e.target.value)}
                                                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300 transition-all"
                                                                        >
                                                                            <option value="">Select Interviewer...</option>
                                                                            {employees.map(emp => (
                                                                                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Feedback Form</label>
                                                                        <button
                                                                            onClick={() => openTemplateBuilder(index)}
                                                                            className={`w-full text-left bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-xs font-bold flex items-center justify-between hover:bg-white hover:border-indigo-300 transition-all ${stg.feedbackFormId ? 'text-emerald-600 border-emerald-100' : 'text-slate-500'}`}
                                                                        >
                                                                            <span className="truncate max-w-[140px]">
                                                                                {stg.feedbackFormId ? (templates.find(t => t._id === stg.feedbackFormId)?.templateName || 'Configured') : 'Select / Build Template'}
                                                                            </span>
                                                                            <Settings size={14} className="flex-shrink-0" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-end pt-2">
                                                                    <button
                                                                        onClick={() => deleteStage(index)}
                                                                        className="text-slate-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 transition-all"
                                                                        title="Delete Stage"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {/* Add Stage Button - Full Width Row */}
                    <button
                        onClick={() => setShowStageModal(true)}
                        className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-3xl flex items-center justify-center gap-2 text-indigo-500 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all group relative z-10"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={16} />
                        </div>
                        Add Interview Stage
                    </button>

                    {/* System Stage: Finalized */}
                    {stages.length > 0 && (
                        <div className="flex items-center gap-6 p-4 bg-emerald-50 border-2 border-emerald-100 border-dashed rounded-2xl opacity-75 mt-8 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-emerald-200 flex items-center justify-center text-emerald-600 font-black">
                                {stages.length}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-emerald-800">{stages[stages.length - 1].stageName}</h4>
                                <p className="text-[10px] uppercase font-bold text-emerald-500">System Stage • Locked</p>
                            </div>
                            <Lock size={16} className="text-emerald-400" />
                        </div>
                    )}
                </div>
            </div>

            {/* Sub Modals */}
            {showStageModal && (
                <StageModal
                    visible={showStageModal}
                    onCancel={() => setShowStageModal(false)}
                    onSave={handleStageAdd}
                    templates={templates}
                    onCreateTemplate={() => {
                        setTemplateBuilderData(null);
                        setShowTemplateBuilder(true);
                    }}
                />
            )}

            {showTemplateBuilder && (
                <Modal
                    open={showTemplateBuilder}
                    onCancel={() => setShowTemplateBuilder(false)}
                    footer={null}
                    closable={false}
                    centered
                    width={800}
                    styles={{ body: { padding: 0 } }}
                >
                    <FeedbackTemplateBuilder
                        initialTemplate={templateBuilderData?.initialTemplate}
                        onSave={handleTemplateSave}
                        onCancel={() => setShowTemplateBuilder(false)}
                    />
                </Modal>
            )}
        </Modal>
    );
}
