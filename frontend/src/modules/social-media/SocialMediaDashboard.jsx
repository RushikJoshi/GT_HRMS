import React, { useState, useEffect } from 'react';
import { Modal, notification } from 'antd';
import api from '../../utils/api';
import { FaLinkedin, FaFacebook, FaInstagram, FaTwitter, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const SocialMediaDashboard = () => {
    const [accounts, setAccounts] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('accounts');
    const [connectingPlatform, setConnectingPlatform] = useState(null);
    const [editingPost, setEditingPost] = useState(null);
    const [newPost, setNewPost] = useState({
        content: '',
        link: '',
        platforms: [],
        scheduledAt: ''
    });

    // Publish loading state
    const [isPublishing, setIsPublishing] = useState(false);

    // Multiple image upload state
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [imageError, setImageError] = useState('');

    const platformConfig = {
        linkedin: {
            name: 'LinkedIn',
            icon: FaLinkedin,
            color: 'bg-[#0A66C2]',
            hoverColor: 'hover:bg-[#004182]',
            textColor: 'text-[#0A66C2]',
            borderColor: 'border-[#0A66C2]',
            lightBg: 'bg-[#0A66C2]/10'
        },
        facebook: {
            name: 'Facebook',
            icon: FaFacebook,
            color: 'bg-[#1877F2]',
            hoverColor: 'hover:bg-[#0C63D4]',
            textColor: 'text-[#1877F2]',
            borderColor: 'border-[#1877F2]',
            lightBg: 'bg-[#1877F2]/10'
        },
        instagram: {
            name: 'Instagram',
            icon: FaInstagram,
            color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
            hoverColor: 'hover:opacity-90',
            textColor: 'text-[#E4405F]',
            borderColor: 'border-[#E4405F]',
            lightBg: 'bg-[#E4405F]/10'
        },
        // twitter: {
        //     name: 'Twitter',
        //     icon: FaTwitter,
        //     color: 'bg-[#1DA1F2]',
        //     hoverColor: 'hover:bg-[#0C85D0]',
        //     textColor: 'text-[#1DA1F2]',
        //     borderColor: 'border-[#1DA1F2]',
        //     lightBg: 'bg-[#1DA1F2]/10'
        // }
    };

    useEffect(() => {
        loadData();

        // Check for OAuth callback success/error
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');
        const platform = urlParams.get('platform');

        if (success && platform) {
            // Show success notification
            console.log(`Successfully connected to ${platform}`);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (error) {
            console.error('OAuth error:', error);
            alert(`Connection failed: ${error}`);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // POLLING: Check for status updates if any post is 'publishing'
    useEffect(() => {
        const hasPublishingPosts = posts.some(p => p.status === 'publishing');

        let intervalId;
        if (hasPublishingPosts) {
            console.log('🔄 Polling for status updates...');
            intervalId = setInterval(() => {
                loadData(true); // pass true to indicate silent reload (optional, to avoid full spinner)
            }, 5000); // Check every 5 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [posts]);

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            // Call APIs with error handling
            const [accountsRes, postsRes] = await Promise.allSettled([
                api.get('/social-media/accounts'),
                api.get('/social-media/posts')
            ]);

            // Handle accounts response
            if (accountsRes.status === 'fulfilled' && accountsRes.value?.data) {
                setAccounts(Array.isArray(accountsRes.value.data) ? accountsRes.value.data : []);
            } else {
                setAccounts([]);
                if (accountsRes.status === 'rejected') {
                    console.warn('Social media accounts unavailable:', accountsRes.reason?.response?.status);
                }
            }

            // Handle posts response
            if (postsRes.status === 'fulfilled' && postsRes.value?.data) {
                setPosts(Array.isArray(postsRes.value.data) ? postsRes.value.data : []);
            } else {
                setPosts([]);
                if (postsRes.status === 'rejected') {
                    console.warn('Social media posts unavailable:', postsRes.reason?.response?.status);
                }
            }
        } catch (error) {
            // Fallback - should not reach here with Promise.allSettled
            console.warn('Social media data load failed:', error.message);
            setAccounts([]);
            setPosts([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleConnect = (platform) => {
        setConnectingPlatform(platform);

        // Get backend URL from environment or use default
        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5003';

        // Extract tenantId and userId from session token
        let token = sessionStorage.getItem('token');
        if (!token) token = localStorage.getItem('token');

        let tenantId = '';
        let userId = '';

        // Strategy 1: Decode Token
        if (token) {
            try {
                // Manual safe decode
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                tenantId = payload.tenantId || '';
                userId = payload.id || payload.userId || '';
            } catch (e) {
                console.warn('Could not decode token for OAuth context', e);
            }
        }

        // Strategy 2: Check stored 'user' object (Fallback)
        if (!tenantId) {
            try {
                const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    if (userObj.tenantId) tenantId = userObj.tenantId;
                    if (userObj.id && !userId) userId = userObj.id;
                }
            } catch (e) {
                console.warn('Could not parse user object', e);
            }
        }

        console.log('🔵 OAuth Context:', { tenantId, userId, platform });

        if (!tenantId) {
            alert('Error: Could not identify your Tenant ID. Please try logging out and logging back in.');
            return;
        }

        // Build OAuth URL with tenant context
        const params = new URLSearchParams();
        params.append('tenantId', tenantId);
        if (userId) params.append('userId', userId);

        const queryString = params.toString();
        const oauthUrl = `${backendUrl}/api/social-media/${platform}/connect${queryString ? '?' + queryString : ''}`;

        console.log('🔵 Redirecting to OAuth:', oauthUrl);

        // Redirect to backend OAuth flow (absolute URL with context)
        window.location.href = oauthUrl;
    };

    const handleDisconnect = async (platform) => {
        Modal.confirm({
            title: 'Disconnect Account',
            content: `Are you sure you want to disconnect ${platform.charAt(0).toUpperCase() + platform.slice(1)}?`,
            okText: 'Yes, Disconnect',
            cancelText: 'Cancel',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.delete(`/social-media/disconnect/${platform}`);

                    // Show success notification
                    notification.success({
                        message: 'Account Disconnected',
                        description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected successfully`,
                        duration: 3
                    });

                    loadData();
                } catch (error) {
                    console.error('Disconnect failed:', error);

                    // Show error notification
                    notification.error({
                        message: 'Disconnect Failed',
                        description: error.response?.data?.message || 'Failed to disconnect account',
                        duration: 4
                    });
                }
            }
        });
    };

    // Handle multiple image file selection
    const handleMultipleImagesSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Validate files
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        for (const file of files) {
            if (!allowedTypes.includes(file.type)) {
                setImageError('Invalid file type. Only JPG, PNG, and WEBP images are allowed.');
                return;
            }
            if (file.size > maxSize) {
                setImageError(`File ${file.name} is too large. Max size is 5MB.`);
                return;
            }
        }

        setImageError('');
        setImageFiles(prev => [...prev, ...files]);

        // Generate previews
        const newPreviews = await Promise.all(
            files.map(file => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            }))
        );

        setImagePreviews(prev => [...prev, ...newPreviews]);

        // Upload images
        await uploadMultipleImages(files);
    };

    // Upload multiple images to server
    const uploadMultipleImages = async (files) => {
        try {
            setUploadingImages(true);
            setImageError('');

            const formData = new FormData();
            files.forEach(file => {
                formData.append('images', file);
            });

            console.log(`📤 Uploading ${files.length} images...`);

            const response = await api.post('/social-media/upload-images', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                console.log('✅ Images uploaded:', response.data.imageUrls);

                // Add uploaded URLs to newPost
                setNewPost(prev => ({
                    ...prev,
                    imageUrls: [...(prev.imageUrls || []), ...response.data.imageUrls]
                }));

                notification.success({
                    message: 'Images Uploaded',
                    description: `${response.data.count} image(s) uploaded successfully!`,
                    duration: 2
                });
            }
        } catch (error) {
            console.error('❌ Image upload failed:', error);
            setImageError(error.response?.data?.message || 'Failed to upload images');

            notification.error({
                message: 'Upload Failed',
                description: error.response?.data?.message || 'Failed to upload images',
                duration: 4
            });
        } finally {
            setUploadingImages(false);
        }
    };

    // Remove image at index
    const handleRemoveImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setNewPost(prev => ({
            ...prev,
            imageUrls: (prev.imageUrls || []).filter((_, i) => i !== index)
        }));
    };

    // Edit post handler
    const handleEditPost = (post) => {
        console.log('✏️ Editing post:', post._id);

        setEditingPost(post);
        setNewPost({
            content: post.content || '',
            link: post.link || '',
            platforms: post.platforms || [],
            scheduledAt: post.scheduledAt || '',
            imageUrls: post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
        });

        // Set image previews
        const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
        setImagePreviews(images);

        setActiveView('create');
    };

    // Delete post handler
    const handleDeletePost = async (postId) => {
        console.log('🗑️ Delete post requested:', postId);

        Modal.confirm({
            title: 'Delete Post',
            content: 'Are you sure you want to delete this post? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    console.log('🗑️ Deleting post:', postId);
                    const response = await api.delete(`/social-media/post/${postId}`);

                    console.log('✅ Delete response:', response.data);

                    if (response.data.success && response.data.results) {
                        const { results, isFullyDeleted } = response.data;

                        // Show notifications for each platform
                        Object.entries(results).forEach(([platform, result]) => {
                            const platformName = platformConfig[platform]?.name || platform;

                            if (result.success) {
                                notification.success({
                                    message: `${platformName} Post Deleted`,
                                    description: result.message || `Successfully deleted post from ${platformName}`,
                                    duration: 3
                                });
                            } else {
                                notification.error({
                                    message: `${platformName} Deletion Failed`,
                                    description: result.message || `Failed to delete from ${platformName}`,
                                    duration: 5
                                });
                            }
                        });

                        // Optimistic update
                        if (isFullyDeleted) {
                            setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
                        } else {
                            // Partial delete: update the post in state with new data if returned, 
                            // or just wait for loadData()
                            // For now, let's just trigger loadData to be safe
                        }

                        // Refresh data to get updated platform lists or remove deleted post
                        loadData(true);
                    } else {
                        // Unexpected response format or server error
                        notification.error({
                            message: 'Delete Failed',
                            description: response.data?.message || 'Failed to delete post',
                            duration: 4
                        });
                    }
                } catch (error) {
                    console.error('❌ Failed to delete post:', error);
                    notification.error({
                        message: 'Delete Failed',
                        description: error.response?.data?.message || 'An unexpected error occurred during deletion'
                    });
                }
            }
        });
    };

    // Cancel edit handler
    const handleCancelEdit = () => {
        console.log('❌ Canceling edit');

        setEditingPost(null);
        setNewPost({
            content: '',
            link: '',
            platforms: [],
            scheduledAt: '',
            imageUrls: []
        });
        setImagePreviews([]);
        setImageFiles([]);
        setImageError('');
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();

        if (isPublishing) return; // Prevent double click

        if (!newPost.content || newPost.platforms.length === 0) {
            notification.warning({
                message: 'Validation Error',
                description: 'Please enter content and select at least one platform',
                duration: 3
            });
            return;
        }

        try {
            setIsPublishing(true); // Start loading
            let savedPost;
            if (editingPost) {
                // Update existing post
                const response = await api.put(`/social-media/post/${editingPost._id}`, newPost);
                savedPost = response.data;

                // Optimistic update: Update in state immediately
                setPosts(prev => prev.map(p => p._id === savedPost._id ? savedPost : p));

                notification.success({
                    message: 'Post Update Scheduled',
                    description: 'Your changes are being applied in the background.',
                    duration: 3
                });
            } else {
                // Create new post
                const response = await api.post('/social-media/post', newPost);
                savedPost = response.data;

                // Optimistic update: Add to top of state immediately
                setPosts(prev => [savedPost, ...prev]);

                notification.success({
                    message: 'Post Scheduled for Publishing',
                    description: 'Your post is being published in the background. It will be live shortly.',
                    duration: 3
                });
            }

            // Clear form and image state
            setNewPost({
                content: '',
                imageUrl: '',
                imageUrls: [],
                link: '',
                platforms: [],
                scheduledAt: ''
            });
            setImageFiles([]);
            setImagePreviews([]);
            setImageError('');
            setEditingPost(null);

            // Still verify with server, but UI is already updated
            loadData();
            setActiveView('posts');
        } catch (error) {
            console.error('Post operation failed:', error);

            notification.error({
                message: editingPost ? 'Update Failed' : 'Post Failed',
                description: error.response?.data?.message || 'Failed to create post',
                duration: 4
            });
        } finally {
            setIsPublishing(false); // Stop loading
        }
    };

    const getAccountForPlatform = (platform) => {
        return accounts.find(acc => acc.platform === platform);
    };

    const isConnected = (platform) => {
        const account = getAccountForPlatform(platform);
        return account && account.isConnected;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading social media data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Media Management</h1>
                    <p className="text-gray-600">Connect your social accounts and manage posts from one place</p>
                </div>

                {/* View Tabs */}
                <div className="flex gap-4 mb-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveView('accounts')}
                        className={`px-6 py-3 font-medium transition-all ${activeView === 'accounts'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Connected Accounts
                    </button>
                    <button
                        onClick={() => setActiveView('create')}
                        className={`px-6 py-3 font-medium transition-all ${activeView === 'create'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Create Post
                    </button>
                    <button
                        onClick={() => setActiveView('posts')}
                        className={`px-6 py-3 font-medium transition-all ${activeView === 'posts'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Post History
                    </button>
                </div>

                {/* Connected Accounts View */}
                {activeView === 'accounts' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(platformConfig).map(([platform, config]) => {
                            const account = getAccountForPlatform(platform);
                            const connected = isConnected(platform);
                            const Icon = config.icon;

                            return (
                                <div
                                    key={platform}
                                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group hover:-translate-y-1 h-full flex flex-col"
                                >
                                    <div className="p-6 flex flex-col flex-grow justify-between">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-lg ${config.lightBg} transition-transform group-hover:scale-110 duration-300`}>
                                                    <Icon className={`text-3xl ${config.textColor}`} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold text-gray-900">{config.name}</h3>
                                                    {connected && account && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <FaCheckCircle className="text-green-500 text-sm" />
                                                            <span className="text-sm text-gray-600">{account.platformUserName || 'Connected'}</span>
                                                        </div>
                                                    )}
                                                    {!connected && (
                                                        <span className="text-sm text-gray-500">Not connected</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connection Status & Actions */}
                                        <div className="mt-4">
                                            {connected ? (
                                                <div className="space-y-2">
                                                    {account?.expiresAt && (
                                                        <p className="text-xs text-gray-500">
                                                            Token expires: {new Date(account.expiresAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                    <button
                                                        onClick={() => handleDisconnect(platform)}
                                                        className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                                                    >
                                                        Disconnect
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnect(platform)}
                                                    disabled={connectingPlatform === platform}
                                                    className={`w-full px-4 py-3 ${config.color} ${config.hoverColor} text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed`}
                                                >
                                                    {connectingPlatform === platform ? (
                                                        <>
                                                            <FaSpinner className="animate-spin" />
                                                            Connecting...
                                                        </>
                                                    ) : (
                                                        `Connect ${config.name}`
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create Post View */}
                {activeView === 'create' && (
                    <div className="bg-white rounded-xl shadow-md p-8 max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingPost ? '✏️ Edit Post' : 'Create New Post'}
                            </h2>
                            {editingPost && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleCreatePost} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                                <textarea
                                    value={newPost.content}
                                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows="6"
                                    placeholder="What's on your mind?"
                                />
                                {/* Image Upload Section */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Images {newPost.platforms.includes('instagram') && '(Required for Instagram)'}
                                    </label>

                                    {/* Instagram Warning */}
                                    {newPost.platforms.includes('instagram') && (
                                        <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <span className="text-lg">📸</span>
                                                <div className="text-sm text-purple-900">
                                                    <p className="font-semibold mb-1">Instagram Requirements:</p>
                                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                                        <li>Images must be publicly accessible via HTTPS</li>
                                                        <li>Localhost URLs will not work</li>
                                                        <li>Supports 1-10 images (carousel)</li>
                                                        <li>For local dev, use ngrok or deploy to public server</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload Button */}
                                    <div className="flex gap-3">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors text-center">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                                    onChange={handleMultipleImagesSelect}
                                                    className="hidden"
                                                    disabled={uploadingImages}
                                                />
                                                {uploadingImages ? (
                                                    <div className="flex items-center justify-center gap-2 text-blue-600">
                                                        <FaSpinner className="animate-spin" />
                                                        <span>Uploading...</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-600">
                                                        <span className="font-medium">📁 Upload Images</span>
                                                        <p className="text-xs mt-1">
                                                            JPG, PNG, WEBP (Max 5MB each)
                                                            {imagePreviews.length > 0 && ` • ${imagePreviews.length} selected`}
                                                            {newPost.platforms.includes('instagram') && imagePreviews.length > 10 && ' • Max 10 for Instagram'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    {/* Multiple Image Previews Gallery */}
                                    {imagePreviews.length > 0 && (
                                        <div className="grid grid-cols-3 gap-3 mt-3">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(index)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                    {index >= 10 && newPost.platforms.includes('instagram') && (
                                                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                                            <span className="text-white text-xs font-semibold">Exceeds IG limit</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {imageError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mt-3">
                                            {imageError}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Link (optional)</label>
                                <input
                                    type="url"
                                    value={newPost.link}
                                    onChange={(e) => setNewPost({ ...newPost, link: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Select Platforms</label>
                                <div className="flex gap-4 items-center flex-nowrap overflow-x-auto max-[480px]:flex-wrap">
                                    {Object.entries(platformConfig).map(([platform, config]) => {
                                        const connected = isConnected(platform);
                                        const Icon = config.icon;
                                        return (
                                            <label
                                                key={platform}
                                                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all whitespace-nowrap min-w-fit ${newPost.platforms.includes(platform)
                                                    ? `${config.borderColor} bg-opacity-5 bg-blue-50`
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    } ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={newPost.platforms.includes(platform)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewPost({ ...newPost, platforms: [...newPost.platforms, platform] });
                                                        } else {
                                                            setNewPost({ ...newPost, platforms: newPost.platforms.filter(p => p !== platform) });
                                                        }
                                                    }}
                                                    disabled={!connected}
                                                    className="w-4 h-4"
                                                />
                                                <Icon className={`text-lg ${config.textColor}`} />
                                                <span className="font-medium text-gray-700">{config.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Schedule (optional)
                                    {newPost.platforms.includes('instagram') && (
                                        <span className="ml-2 text-xs text-purple-600">✓ Supported for Instagram</span>
                                    )}
                                </label>
                                <input
                                    type="datetime-local"
                                    value={newPost.scheduledAt}
                                    onChange={(e) => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPublishing}
                                className={`w-full px-6 py-3 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 
                                    ${isPublishing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isPublishing && <FaSpinner className="animate-spin" />}
                                {editingPost ? '💾 Update Post' : (newPost.scheduledAt ? 'Schedule Post' : 'Publish Now')}
                            </button>
                        </form>
                    </div>
                )}

                {/* Post History View */}
                {activeView === 'posts' && (
                    <div className="space-y-4">
                        {posts.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md p-12 text-center">
                                <p className="text-gray-500 text-lg">No posts yet. Create your first post!</p>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <div key={post._id} className="bg-white rounded-xl shadow-md p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex gap-2">
                                            {post.platforms.map(platform => {
                                                const Icon = platformConfig[platform]?.icon;
                                                return Icon ? <Icon key={platform} className={`text-xl ${platformConfig[platform].textColor}`} /> : null;
                                            })}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${post.status === 'published' ? 'bg-green-100 text-green-700' :
                                                post.status === 'publishing' ? 'bg-blue-100 text-blue-700' :
                                                    post.status === 'edited' ? 'bg-orange-100 text-orange-700' :
                                                        post.status === 'deleted' ? 'bg-gray-100 text-gray-700' :
                                                            post.status === 'scheduled' ? 'bg-purple-100 text-purple-700' :
                                                                post.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {post.status === 'published' && '✅'}
                                                {post.status === 'publishing' && <FaSpinner className="animate-spin" />}
                                                {post.status === 'edited' && '✏️'}
                                                {post.status === 'deleted' && '🗑️'}
                                                {post.status === 'scheduled' && '📅'}
                                                {post.status === 'failed' && '❌'}
                                                {post.status ? (post.status.charAt(0).toUpperCase() + post.status.slice(1)) : 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-gray-800 mb-4">{post.content}</p>

                                    {/* Display Images (Carousel or Single) */}
                                    {(post.imageUrls && post.imageUrls.length > 0) ? (
                                        <div className="mb-4">
                                            {post.imageUrls.length > 1 ? (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                                            📸 Carousel ({post.imageUrls.length} images)
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {post.imageUrls.slice(0, 6).map((imgUrl, idx) => (
                                                            <img key={idx} src={imgUrl} alt={`Image ${idx + 1}`} className="rounded-lg h-24 w-full object-cover" />
                                                        ))}
                                                        {post.imageUrls.length > 6 && (
                                                            <div className="rounded-lg h-24 w-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                                                                +{post.imageUrls.length - 6} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <img src={post.imageUrls[0]} alt="Post" className="rounded-lg max-h-64 object-cover" />
                                            )}
                                        </div>
                                    ) : post.imageUrl ? (
                                        <img src={post.imageUrl} alt="Post" className="rounded-lg mb-4 max-h-64 object-cover" />
                                    ) : null}

                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            {post.status === 'edited' && post.editedAt ? (
                                                <>
                                                    <span>Edited: {new Date(post.editedAt).toLocaleString()}</span>
                                                    <span className="text-xs text-gray-400 ml-2">(Originally posted: {new Date(post.createdAt).toLocaleString()})</span>
                                                </>
                                            ) : post.scheduledAt ? (
                                                `Scheduled for: ${new Date(post.scheduledAt).toLocaleString()}`
                                            ) : (
                                                `Posted: ${new Date(post.createdAt).toLocaleString()}`
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Platform-specific Edit Button Logic */}
                                            {post.platforms.includes('instagram') && post.status === 'published' ? (
                                                <div className="relative group">
                                                    <button
                                                        disabled
                                                        className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm font-medium"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                                                        Instagram posts cannot be edited (API limitation)
                                                        <br />Use Delete + Repost instead
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditPost(post)}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                                >
                                                    ✏️ Edit
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeletePost(post._id)}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialMediaDashboard;
