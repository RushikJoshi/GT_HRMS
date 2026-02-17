import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock } from 'lucide-react';

export function DraggableStageTab({
    stage,
    index,
    isActive,
    count,
    onClick,
    isLocked,
    totalStages,
    isManageMode
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: stage,
        disabled: isLocked || !isManageMode
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isFinal = stage === 'Finalized';
    const isRejected = stage === 'Rejected';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex-shrink-0 rounded-2xl transition-all duration-300 ease-out snap-center
                flex items-center gap-2 border
                ${isDragging ? 'z-50 shadow-2xl scale-105' : ''}
                ${isActive
                    ? (isFinal ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200/50 border-transparent scale-105' :
                        isRejected ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-200/50 border-transparent scale-105' :
                            'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/50 border-transparent scale-105')
                    : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-100 hover:bg-indigo-50/30 hover:text-indigo-600'}
                ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
            `}
        >
            {/* Drag Handle */}
            {!isLocked && isManageMode && (
                <div
                    {...attributes}
                    {...listeners}
                    className={`
                        px-2 py-3 cursor-grab active:cursor-grabbing
                        ${isActive ? 'text-white/60 hover:text-white/90' : 'text-slate-300 hover:text-indigo-400'}
                    `}
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            )}

            {/* Lock Icon for Locked Stages */}
            {isLocked && (
                <div className="px-2 py-3">
                    <Lock className={`w-3 h-3 ${isActive ? 'text-white/60' : 'text-slate-300'}`} />
                </div>
            )}

            {/* Stage Content */}
            <button
                onClick={onClick}
                className="flex items-center gap-3 px-4 py-3 flex-1"
            >
                <div className="flex flex-col items-start">
                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-indigo-400'}`}>
                        Stage {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-black tracking-tight">
                        {stage}
                    </span>
                </div>
                <span className={`
                    flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full text-[11px] font-black
                    ${isActive
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}
                `}>
                    {count}
                </span>
            </button>
        </div>
    );
}
