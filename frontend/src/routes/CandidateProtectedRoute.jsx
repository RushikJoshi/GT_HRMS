import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isCandidateLoggedIn } from '../utils/auth';
import { useAuth } from '../context/AuthContext';

const CandidateProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    const { isInitialized } = useAuth();
    const candidate = JSON.parse(localStorage.getItem("candidate"));

    useEffect(() => {
        if (isInitialized && (!candidate || !isCandidateLoggedIn())) {
            navigate("/candidate/login?redirect=/candidate/dashboard", { replace: true });
        }
    }, [isInitialized, candidate, navigate]);

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!candidate || !isCandidateLoggedIn()) {
        return null;
    }

    return children;
};

export default CandidateProtectedRoute;
