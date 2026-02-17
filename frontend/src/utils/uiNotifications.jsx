import React from 'react';
import { notification, Button } from 'antd';

/*
 * Standardized Toast Notification Wrapper
 * Use this for success, error, info messages
 */
export const showToast = (type, message, description) => {
    notification[type]({
        message,
        description,
        placement: 'topRight',
        duration: 3,
    });
};

// Expose to window for global access (e.g. from api.js)
if (typeof window !== 'undefined') {
    window.showToast = showToast;
}

/*
 * Toast-based Confirmation Dialog
 * Replaces Modal.confirm with a non-blocking toast at top-right
 * containing confirm/cancel buttons.
 */
export const showConfirmToast = ({
    title,
    description,
    onConfirm,
    okText = 'Confirm',
    cancelText = 'Cancel',
    okType = 'primary', // 'primary', 'default', 'dashed', 'link', 'text'
    danger = false
}) => {
    const key = `confirm-${Date.now()}`;

    const handleConfirm = () => {
        notification.destroy(key);
        if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
        notification.destroy(key);
    };

    const btn = (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button size="small" onClick={handleCancel}>
                {cancelText}
            </Button>
            <Button
                type={okType}
                size="small"
                danger={danger}
                onClick={handleConfirm}
            >
                {okText}
            </Button>
        </div>
    );

    notification.warning({
        message: title,
        description,
        actions: btn,
        key,
        duration: 0, // Persist until interaction
        placement: 'topRight',
    });
};
