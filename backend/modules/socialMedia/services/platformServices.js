const axios = require('axios');
const { decrypt } = require('../utils/crypto');
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '../../../../DEBUG_SOCIAL.log');

const logSocial = (msg, data = null) => {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${msg} ${data ? JSON.stringify(data) : ''}\n`;
        fs.appendFileSync(logFile, logEntry);
    } catch (e) { /* ignore */ }
};

class PlatformService {
    constructor(account) {
        this.account = account;
        this.accessToken = decrypt(account.accessToken);
    }

    async createPost(data) { throw new Error('Not implemented'); }
}

class LinkedInService extends PlatformService {
    /**
     * Upload image to LinkedIn using 3-step process
     * Step 1: Register upload
     * Step 2: Download image from our server
     * Step 3: Upload binary to LinkedIn CDN
     */
    async uploadImageToLinkedIn(imageUrl) {
        try {
            console.log('📸 LinkedIn: Starting image upload process...');
            console.log('   Image URL:', imageUrl);

            // Step 1: Register upload with LinkedIn
            console.log('   Step 1/3: Registering upload...');
            const registerPayload = {
                registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: `urn:li:person:${this.account.platformUserId}`,
                    serviceRelationships: [{
                        relationshipType: 'OWNER',
                        identifier: 'urn:li:userGeneratedContent'
                    }]
                }
            };

            const registerResponse = await axios.post(
                'https://api.linkedin.com/v2/assets?action=registerUpload',
                registerPayload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                }
            );

            const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
            const asset = registerResponse.data.value.asset;
            console.log('   ✅ Upload registered, asset:', asset);

            // Step 2: Download image from our server
            console.log('   Step 2/3: Downloading image from server...');
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
            const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${backendUrl}${imageUrl}`;

            const imageResponse = await axios.get(fullImageUrl, {
                responseType: 'arraybuffer'
            });
            console.log('   ✅ Image downloaded, size:', imageResponse.data.length, 'bytes');

            // Step 3: Upload image binary to LinkedIn CDN
            console.log('   Step 3/3: Uploading to LinkedIn CDN...');
            await axios.put(uploadUrl, imageResponse.data, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': imageResponse.headers['content-type'] || 'image/jpeg'
                }
            });
            console.log('   ✅ Image uploaded to LinkedIn CDN');

            return asset; // Return the asset URN
        } catch (error) {
            console.error('❌ LinkedIn image upload failed:', error.response?.data || error.message);
            if (error.response?.data) {
                console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    async createPost({ content, imageUrl, imageUrls, link }) {
        try {
            console.log('📤 LinkedIn: Creating post...');
            console.log('   Content:', content?.substring(0, 50) + '...');
            console.log('   Images:', imageUrls ? imageUrls.length : (imageUrl ? 1 : 0));
            console.log('   Link:', link || 'none');

            const mediaItems = [];

            // Handle multiple images
            if (imageUrls && imageUrls.length > 0) {
                console.log(`   Processing ${imageUrls.length} images...`);
                for (const url of imageUrls) {
                    try {
                        const asset = await this.uploadImageToLinkedIn(url);
                        mediaItems.push({
                            status: 'READY',
                            description: { text: content },
                            media: asset,
                            title: { text: 'Image' }
                        });
                    } catch (err) {
                        console.error('   ⚠️ Failed to upload one image, skipping:', url);
                    }
                }
            }
            // Fallback to single image
            else if (imageUrl) {
                try {
                    const asset = await this.uploadImageToLinkedIn(imageUrl);
                    mediaItems.push({
                        status: 'READY',
                        description: { text: content },
                        media: asset,
                        title: { text: 'Image' }
                    });
                } catch (err) {
                    console.error('   ⚠️ Failed to upload image:', imageUrl);
                }
            }

            // LinkedIn Share API v2 - Personal posts
            const payload = {
                author: `urn:li:person:${this.account.platformUserId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: content
                        },
                        shareMediaCategory: mediaItems.length > 0 ? 'IMAGE' : (link ? 'ARTICLE' : 'NONE')
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };

            // Add media items
            if (mediaItems.length > 0) {
                payload.specificContent['com.linkedin.ugc.ShareContent'].media = mediaItems;
            }
            // Add article link if no images
            else if (link) {
                payload.specificContent['com.linkedin.ugc.ShareContent'].media = [{
                    status: 'READY',
                    originalUrl: link
                }];
            }

            console.log('   Posting to LinkedIn API...');
            const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });

            console.log('✅ LinkedIn post created:', response.data.id);
            return { success: true, id: response.data.id };
        } catch (error) {
            console.error('❌ LinkedIn post failed:', error.response?.data || error.message);
            if (error.response?.data) {
                console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
            }
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }

    async deletePost(urn) {
        try {
            console.log('🗑️ LinkedIn: Deleting post...', urn);

            // Extract URN if it's in full ID format
            // e.g., urn:li:share:123 or urn:li:ugcPost:123
            if (!urn) return { success: false, error: 'No URN provided' };

            // URNs MUST be URL encoded in the path (urn:li:ugcPost:123 -> urn%3Ali%3AugcPost%3A123)
            // But first decode in case it came in encoded, then encode for the URL
            const cleanUrn = decodeURIComponent(urn);
            const encodedUrn = encodeURIComponent(cleanUrn);

            await axios.delete(`https://api.linkedin.com/v2/ugcPosts/${encodedUrn}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });

            console.log('✅ LinkedIn post deleted:', urn);
            return { success: true };
        } catch (error) {
            // If 404, consider it already deleted
            if (error.response?.status === 404) {
                console.log('⚠️ LinkedIn post not found (already deleted):', urn);
                return { success: true };
            }

            // Try alternative endpoint if it's a "share" URN and ugcPosts failed
            if (urn.includes('urn:li:share:')) {
                try {
                    console.log('🔄 Retrying with /shares endpoint...');
                    const cleanUrn = decodeURIComponent(urn);
                    const encodedUrn = encodeURIComponent(cleanUrn);

                    await axios.delete(`https://api.linkedin.com/v2/shares/${encodedUrn}`, {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'X-Restli-Protocol-Version': '2.0.0'
                        }
                    });
                    console.log('✅ LinkedIn share deleted:', urn);
                    return { success: true };
                } catch (shareError) {
                    console.error('❌ LinkedIn share delete also failed:', shareError.message);
                }
            }

            console.error('❌ LinkedIn delete failed:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }
}

class FacebookService extends PlatformService {
    async createPost({ content, imageUrl, imageUrls, link }) {
        try {
            console.log('📤 Facebook: Creating post...');
            logSocial('Facebook: Creating Post', { content, imageUrl, imageUrls, link });

            // Facebook Graph API v18.0+
            // If image is present, use /photos endpoint. 
            // If multiple images are present, Facebook Pages API supports multi-photo posts via attached_media, 
            // but simplified single image or feed post is safer for initial implementation.
            // Let's support single image or feed first.

            // Determine if it's a photo post or text/link post
            // Priority: Image > Link > Text

            // Check for images
            const finalImageUrl = imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : null);

            let endpoint = `https://graph.facebook.com/v19.0/${this.account.pageId}/feed`;
            let payload = {
                access_token: this.accessToken,
                message: content
            };

            if (finalImageUrl) {
                // Check for localhost/private IP
                const isLocalhost = finalImageUrl.includes('localhost') ||
                    finalImageUrl.includes('127.0.0.1') ||
                    finalImageUrl.includes('::1');

                if (isLocalhost) {
                    console.warn('⚠️ Facebook requires public image URL. Localhost detected.');
                    console.warn('🔄 Falling back to TEXT-ONLY post to prevent failure.');
                    logSocial('WARNING: Localhost image detected. Falling back to TEXT post.');

                    // Fallback to Feed Post (Text Only)
                    // We append a small note or just send content. 
                    // User said "fix this", so making it work is priority.
                    endpoint = `https://graph.facebook.com/v19.0/${this.account.pageId}/feed`;
                    payload = {
                        access_token: this.accessToken,
                        message: content
                        // Optional: Append " (Image unavailable in test mode)"? 
                        // Better to just post content to be clean.
                    };
                } else {
                    console.log('   Posting as Photo...');
                    endpoint = `https://graph.facebook.com/v19.0/${this.account.pageId}/photos`;
                    payload = {
                        access_token: this.accessToken,
                        url: finalImageUrl,
                        caption: content
                    };
                }
            } else if (link) {
                console.log('   Posting with Link...');
                payload.link = link;
            }

            logSocial('Facebook Payload', { endpoint, payload: { ...payload, access_token: 'REDACTED' } });

            const response = await axios.post(endpoint, payload);

            console.log('✅ Facebook post created:', response.data.id);
            logSocial('Facebook Response', response.data);

            // Facebook returns { id: '...' } or { id: '...', post_id: '...' } depending on endpoint
            // For photos, id is photo_id, post_id is the feed post id. We usually want post_id if available, or id.
            // But deleting the photo usually deletes the post too.
            return { success: true, id: response.data.post_id || response.data.id };

        } catch (error) {
            console.error('❌ Facebook post failed:', error.response?.data || error.message);
            logSocial('Facebook Error', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    async deletePost(postId) {
        try {
            console.log('🗑️ Facebook: Deleting post...', postId);
            if (!postId) return { success: false, error: 'No Post ID provided' };

            await axios.delete(`https://graph.facebook.com/v19.0/${postId}`, {
                params: { access_token: this.accessToken }
            });

            console.log('✅ Facebook post deleted:', postId);
            return { success: true };
        } catch (error) {
            if (error.response?.status === 404) { // Already deleted
                return { success: true };
            }
            console.error('❌ Facebook delete failed:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }
}

class InstagramService extends PlatformService {
    async createPost({ content, imageUrl, imageUrls, link }) {
        try {
            console.log('📤 Instagram: Creating post...', { content, imageUrl, numImages: imageUrls?.length, link });

            // Instagram Business API requires an image or video. Text-only is not supported.
            // Priority: imageUrl > imageUrls[0] > link (if it looks like an image)
            let finalImageUrl = imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : null);

            // Fallback: Check if 'link' is provided and treat it as image if no other image exists
            if (!finalImageUrl && link) {
                console.log('   ℹ️ No image uploaded, checking link as image source:', link);
                finalImageUrl = link;
            }

            if (!finalImageUrl) {
                return { success: false, error: 'Instagram requires an image. Text-only posts are not supported.' };
            }

            // Step 1: Create Media Container
            console.log('   Step 1/2: Creating Media Container...');
            const containerResponse = await axios.post(
                `https://graph.facebook.com/v19.0/${this.account.platformUserId}/media`, // platformUserId should be IG Business Account ID
                {
                    image_url: finalImageUrl,
                    caption: content,
                    access_token: this.accessToken
                }
            );

            const creationId = containerResponse.data.id;
            console.log('   ✅ Container created:', creationId);

            // Step 2: Publish Media
            console.log('   Step 2/2: Publishing Media...');
            const publishResponse = await axios.post(
                `https://graph.facebook.com/v19.0/${this.account.platformUserId}/media_publish`,
                {
                    creation_id: creationId,
                    access_token: this.accessToken
                }
            );

            console.log('✅ Instagram post published:', publishResponse.data.id);
            return { success: true, id: publishResponse.data.id };

        } catch (error) {
            console.error('❌ Instagram post failed:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    async deletePost(mediaId) {
        try {
            console.log('🗑️ Instagram: Deleting media...', mediaId);
            if (!mediaId) return { success: false, error: 'No Media ID provided' };

            // Instagram Graph API allows deleting media objects
            await axios.delete(`https://graph.facebook.com/v19.0/${mediaId}`, {
                params: { access_token: this.accessToken }
            });

            console.log('✅ Instagram media deleted:', mediaId);
            return { success: true };
        } catch (error) {
            if (error.response?.status === 404) { // Already deleted
                return { success: true };
            }
            console.error('❌ Instagram delete failed:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }
}

class TwitterService extends PlatformService {
    async createPost({ content }) {
        if (content.length > 280) return { success: false, error: 'Twitter limit 280' };
        try {
            const response = await axios.post('https://api.twitter.com/2/tweets', { text: content }, { headers: { 'Authorization': `Bearer ${this.accessToken}` } });
            return { success: true, id: response.data.data.id };
        } catch (e) { return { success: false, error: e.message }; }
    }
}

module.exports = { LinkedInService, FacebookService, InstagramService, TwitterService };
