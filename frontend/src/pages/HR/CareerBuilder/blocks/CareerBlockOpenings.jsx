import React, { useState } from 'react';
import JobCard from './JobCard';

export default function CareerBlockOpenings({ content, jobs = [], loading = false, myApplications = new Set(), onApply }) {

    // Removed local searchTerm logic

    const {
        title = "Open Positions",
        layout = "grid", // grid, list
        gridColumns = 3, // 2, 3, 4
        gap = 8, // tailwind spacing unit (8 = 2rem)
        enabled = true,
        // Card Config passed down
    } = content || {};

    if (enabled === false) return null;

    // Direct use of passed 'jobs' prop (assumed filtered by parent)
    const safeJobs = jobs || [];

    // Grid Columns Logic
    const getGridClass = () => {
        if (layout === 'list') return 'grid-cols-1';
        if (Number(gridColumns) === 2) return 'grid-cols-1 md:grid-cols-2';
        if (Number(gridColumns) === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'; // Default 3
    };

    return (
        <section className="py-20 px-4 sm:px-8 lg:px-12 bg-white w-full max-w-[1600px] mx-auto">

            {/* Section Header */}
            <div className="flex items-center justify-between mb-12 px-2">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">{title}</h2>
                <div className="bg-blue-50 px-4 py-2 rounded-full">
                    <span className="text-sm font-black text-blue-600 uppercase tracking-widest">{safeJobs.length} Jobs Found</span>
                </div>
            </div>

            {loading ? (
                <div className={`grid ${getGridClass()} gap-${gap}`}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-96 bg-gray-50 rounded-3xl animate-pulse border border-gray-100"></div>
                    ))}
                </div>
            ) : safeJobs.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold text-lg">No open positions found matching your search.</p>
                </div>
            ) : (
                <div className={`grid ${getGridClass()} gap-${gap}`}>
                    {safeJobs.map(job => (
                        <div key={job._id || job.id} className="h-full">
                            <JobCard
                                job={job}
                                config={content} // Pass the entire content object as config
                                isApplied={myApplications.has(job._id)}
                                onApply={onApply}
                            />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
