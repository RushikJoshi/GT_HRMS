import React from 'react';
import { AlertCircle } from 'lucide-react';
import './CenterToast.css';

const CenterToast = ({ title, message, onAction }) => {
    return (
        <div className="center-toast-overlay">
            <div className="center-toast-card">
                <div className="center-toast-icon">
                    <AlertCircle size={48} strokeWidth={2.5} />
                </div>
                <h3 className="center-toast-title">{title}</h3>
                <p className="center-toast-message">{message}</p>
                <button
                    className="center-toast-btn"
                    onClick={onAction}
                >
                    Return to Login
                </button>
            </div>
        </div>
    );
};

export default CenterToast;
