import React from 'react';
import { Briefcase, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../../../utils/dateUtils';
import { API_ROOT } from '../../../../utils/api';

export default function JobCard({ job, config = {}, onApply, isApplied }) {
    const {
        cardStyle = 'rounded',
        cardBackground = '#ffffff',
        showDept = true,
        showExperience = true,
        showPostedDate = true,
        showLocation = true,
        showDescription = true,
        showApplyButton = true,
        // showJobId = false, // Not using job ID in the target design
        // applyButtonText = 'Apply Now', // Defaulting to 'Apply Now'
        applyButtonColor = '#2563EB', // blue-600
        applyButtonStyle = 'filled',
    } = config;

    // Container Styles
    const containerClasses = `
        flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-white
        ${cardStyle === 'rounded' ? 'rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl' : ''}
        ${cardStyle === 'sharp' ? 'rounded-none border border-gray-200 hover:border-black' : ''}
        ${cardStyle === 'shadow' ? 'rounded-2xl shadow-lg border-none hover:-translate-y-1' : ''}
        ${cardStyle === 'border' ? 'rounded-xl border-2 border-gray-100 hover:border-blue-500' : ''}
    `;

    // Apply Button Style
    const applyClasses = `
        flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all rounded-xl
        ${applyButtonStyle === 'filled' ? 'text-white shadow-lg hover:shadow-xl active:scale-95' : ''}
        ${applyButtonStyle === 'outline' ? 'bg-transparent border-2 hover:bg-gray-50' : ''}
        ${applyButtonStyle === 'soft' ? 'bg-opacity-10 hover:bg-opacity-20' : ''}
    `;

    const applyStyle = {
        backgroundColor: applyButtonStyle === 'filled' ? applyButtonColor : applyButtonStyle === 'soft' ? `${applyButtonColor}20` : 'transparent',
        borderColor: applyButtonStyle === 'outline' ? applyButtonColor : 'transparent',
        color: applyButtonStyle === 'filled' ? '#ffffff' : applyButtonColor,
    };

    const bannerUrl = job.bannerImage
        ? (job.bannerImage.startsWith('http') ? job.bannerImage : `${API_ROOT}${job.bannerImage}`)
        : null;

    return (
        <div style={{ backgroundColor: cardBackground }} className={containerClasses}>
            {bannerUrl && (
                <div className="w-full h-32 overflow-hidden relative">
                    <img
                        src={bannerUrl}
                        alt={job.jobTitle}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
            )}
            <div className="p-7 flex-1 flex flex-col items-start text-left">

                {/* Header: Title + Opening Badge */}
                <div className="w-full flex justify-between items-start mb-2">
                    <h3 className="text-xl font-black text-gray-900 leading-tight w-3/4">
                        {job.jobTitle}
                    </h3>
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap">
                        {job.positions || 1} Openings
                    </span>
                </div>

                {/* Posted Date */}
                {showPostedDate && (
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-4">
                        <Calendar size={14} />
                        <span>Posted: {formatDateDDMMYYYY(job.createdAt)}</span>
                    </div>
                )}

                {/* Tags Row */}
                <div className="flex flex-wrap gap-2 mb-6 w-full">
                    {showDept && (
                        <span className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
                            {job.department}
                        </span>
                    )}
                    {showExperience && (
                        <span className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
                            {job.minExperienceMonths ? `${Math.floor(job.minExperienceMonths / 12)}+ Yrs` : 'Fresher'}
                        </span>
                    )}
                    {showLocation && (
                        <span className="bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                            <MapPin size={12} /> {job.workMode || 'On-site'}
                        </span>
                    )}
                </div>

                {/* Description */}
                {showDescription && (
                    <p className="text-gray-500 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">
                        {job.description || `We are looking for a talented ${job.jobTitle} to join our growing team.`}
                    </p>
                )}
            </div>

            {/* Footer Buttons */}
            <div className="p-7 pt-0 mt-auto w-full flex gap-3">
                <button
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                    onClick={() => onApply && onApply(job)} // For now view details essentially triggers apply or detail view
                >
                    View Details
                </button>

                {showApplyButton && (
                    <button
                        onClick={() => onApply && onApply(job)}
                        style={applyStyle}
                        className={applyClasses}
                    >
                        {isApplied ? 'Applied' : config.applyButtonText || 'Apply Now'}
                        {!isApplied && <ArrowRight size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
}
