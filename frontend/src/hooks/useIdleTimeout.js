import { useEffect, useRef, useCallback } from 'react';
import { notification } from 'antd';

/**
 * useIdleTimeout - Custom hook to monitor user inactivity
 * @param {Function} onIdle - Callback function to execute when idle
 * @param {number} timeoutMins - Inactivity duration in minutes
 * @param {number} warningMins - Show warning X minutes before logout
 */
export const useIdleTimeout = (onIdle, timeoutMins = 3, warningMins = 0.5) => {
    const timeoutMs = timeoutMins * 60 * 1000;
    const warningMs = warningMins * 60 * 1000;

    const idleTimer = useRef(null);
    const warningTimer = useRef(null);
    const isWarningShown = useRef(false);

    const clearTimers = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (warningTimer.current) clearTimeout(warningTimer.current);
    }, []);

    const resetTimers = useCallback(() => {
        clearTimers();

        // Reset warning state
        if (isWarningShown.current) {
            notification.destroy('idle-warning-key');
            isWarningShown.current = false;
        }

        // 1. Set Warning Timer
        if (warningMs > 0 && timeoutMs > warningMs) {
            warningTimer.current = setTimeout(() => {
                isWarningShown.current = true;
                notification.warning({
                    key: 'idle-warning-key',
                    message: 'Inactivity Warning',
                    description: `You will be automatically logged out in ${warningMins * 60} seconds due to inactivity.`,
                    duration: warningMins * 60,
                    onClose: () => { isWarningShown.current = false; }
                });
            }, timeoutMs - warningMs);
        }

        // 2. Set Final Idle Timer
        idleTimer.current = setTimeout(() => {
            console.warn("User idle threshold reached. Triggering logout.");
            notification.destroy('idle-warning-key');

            notification.error({
                message: 'Session Expired',
                description: 'You have been logged out due to inactivity.',
                duration: 8,
            });

            if (onIdle) onIdle();
        }, timeoutMs);
    }, [onIdle, timeoutMs, warningMs, warningMins, clearTimers]);

    useEffect(() => {
        const activityEvents = [
            'mousedown', 'mousemove', 'keydown',
            'scroll', 'touchstart', 'click'
        ];

        const handleActivity = () => {
            resetTimers();
        };

        // Attach listeners
        activityEvents.forEach(event =>
            window.addEventListener(event, handleActivity, { passive: true })
        );

        // Initial timer start
        resetTimers();

        // Clean up
        return () => {
            clearTimers();
            activityEvents.forEach(event =>
                window.removeEventListener(event, handleActivity)
            );
            notification.destroy('idle-warning-key');
        };
    }, [resetTimers, clearTimers]);

    return { resetTimers };
};

export default useIdleTimeout;
