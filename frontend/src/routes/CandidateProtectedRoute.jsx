import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobPortalAuth } from '../context/JobPortalAuthContext';

const CandidateProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    const { isInitialized, candidate } = useJobPortalAuth();

    useEffect(() => {
        if (isInitialized && !candidate) {
            navigate("/candidate/login?redirect=/candidate/dashboard", { replace: true });
        }
    }, [isInitialized, candidate, navigate]);

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!candidate) {
        return null;
    }

    return children;
};

export default CandidateProtectedRoute;
