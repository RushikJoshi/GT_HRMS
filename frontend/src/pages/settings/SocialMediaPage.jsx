import React, { useEffect } from 'react';
import { notification } from 'antd';
import SocialMediaDashboard from '../../modules/social-media/SocialMediaDashboard';

const SocialMediaPage = () => {
    useEffect(() => {
        // Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const oauthStatus = urlParams.get('oauth');
        const platform = urlParams.get('platform');
        const errorMessage = urlParams.get('message');

        if (oauthStatus === 'success' && platform) {
            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            notification.success({
                message: 'OAuth Success',
                description: `${platformName} connected successfully! ✓`,
                duration: 4
            });

            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (oauthStatus === 'error') {
            notification.error({
                message: 'OAuth Failed',
                description: errorMessage || 'OAuth connection failed',
                duration: 5
            });

            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    return (
        <div className="social-media-page">
            <SocialMediaDashboard />
        </div>
    );
};

export default SocialMediaPage;
