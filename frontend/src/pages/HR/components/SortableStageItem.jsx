import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Trash2, Clock, Globe, Settings } from 'lucide-react';

export function SortableStageItem({ stage, index, isLocked, onEdit, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: stage.stageName,
        disabled: isLocked
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                flex items-center gap-4 p-4 rounded-xl border mb-2 transition-all group
                ${isDragging ? 'bg-indigo-50 border-indigo-200 shadow-lg scale-[1.02]' : 'bg-white border-slate-100 hover:border-slate-200'}
                ${isLocked ? 'opacity-80' : ''}
            `}
        >
            {/* Drag Handle */}
            {!isLocked ? (
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                >
                    <GripVertical className="w-5 h-5" />
                </div>
            ) : (
                <div className="p-1 text-slate-300">
                    <Lock className="w-4 h-4" />
                </div>
            )}

            {/* Stage Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Stage {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-black text-slate-500 uppercase">
                        {stage.stageType || 'Round'}
                    </div>
                </div>
                <div className="text-sm font-bold text-slate-700 truncate">
                    {stage.stageName}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium">
                    {stage.durationMinutes && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {stage.durationMinutes}m</span>
                    )}
                    {stage.mode && (
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {stage.mode}</span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isLocked && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(stage); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit Stage Config"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(stage); }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Stage"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Status Indicator (Compact) */}
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                {isLocked ? 'Locked' : 'Open'}
            </div>
        </div>
    );
}
