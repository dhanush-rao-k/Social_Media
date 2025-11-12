const API_URL = 'http://localhost:3000/api';
let currentUser = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Set user avatar
    if (currentUser.Avatar) {
        document.getElementById('userAvatarSmall').src = currentUser.Avatar;
    }
    
    // Load feed and other data
    await loadFeed();
    await loadStories();
    await loadFollowRequests();
    await loadSuggestions();
    await loadUnreadCount();
    
    // Setup event listeners
    setupEventListeners();
    setupSearch();
});

// Setup event listeners
function setupEventListeners() {
    // Create post
    document.getElementById('createPostBtn').addEventListener('click', createPost);
    
    // Media input
    document.getElementById('mediaInput').addEventListener('change', handleMediaSelect);
    
    // Story input
    document.getElementById('storyInput').addEventListener('change', handleStorySelect);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
    
    // Profile link
    document.getElementById('profileLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `profile.html?id=${currentUser.UserID}`;
    });
    
    // Requests link - scroll to requests widget
    document.getElementById('requestsLink').addEventListener('click', (e) => {
        e.preventDefault();
        const requestsWidget = document.querySelector('.follow-requests-widget');
        if (requestsWidget) {
            requestsWidget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

// Handle media selection
function handleMediaSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImage').src = e.target.result;
            document.getElementById('mediaPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Create post
async function createPost() {
    const content = document.getElementById('postInput').value;
    const mediaFile = document.getElementById('mediaInput').files[0];
    
    if (!content && !mediaFile) {
        alert('Please enter some content or select a media file');
        return;
    }
    
    let mediaUrl = null;
    if (mediaFile) {
        // In a real app, you would upload to a server or cloud storage
        // For now, we'll use a data URL (not recommended for production)
        const reader = new FileReader();
        mediaUrl = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(mediaFile);
        });
    }
    
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.UserID,
                content: content,
                media: mediaUrl
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('postInput').value = '';
            document.getElementById('mediaInput').value = '';
            document.getElementById('mediaPreview').style.display = 'none';
            await loadFeed();
        } else {
            alert('Failed to create post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post');
    }
}

// Load feed
async function loadFeed() {
    try {
        const response = await fetch(`${API_URL}/posts/feed/${currentUser.UserID}?limit=20`);
        const data = await response.json();
        
        const container = document.getElementById('postsContainer');
        
        if (data.success && data.posts.length > 0) {
            container.innerHTML = data.posts.map(post => createPostHTML(post)).join('');
            
            // Attach event listeners to post actions
            attachPostListeners();
        } else {
            container.innerHTML = '<div class="empty-state"><p>No posts yet. Follow users to see their posts!</p></div>';
        }
    } catch (error) {
        console.error('Error loading feed:', error);
    }
}

// Create post HTML
function createPostHTML(post) {
    return `
        <div class="post-card" data-post-id="${post.PostID}">
            <div class="post-header">
                <img src="${post.Avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="avatar-sm">
                <div class="post-user-info">
                    <h4>${post.Username}</h4>
                    <div class="post-time">${formatDate(post.Timestamp)}</div>
                </div>
            </div>
            <div class="post-content">${escapeHTML(post.Content || '')}</div>
            ${post.Media ? `<img src="${post.Media}" alt="Post media" class="post-media">` : ''}
            <div class="post-actions">
                <button class="action-btn like-btn" data-post-id="${post.PostID}">
                    ❤️ ${post.LikeCount || 0}
                </button>
                <button class="action-btn comment-btn" data-post-id="${post.PostID}">
                    💬 ${post.CommentCount || 0}
                </button>
            </div>
            <div class="comments-section" id="comments-${post.PostID}" style="display: none;"></div>
        </div>
    `;
}

// Attach post action listeners
function attachPostListeners() {
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const postId = e.target.dataset.postId;
            await toggleLike(postId);
        });
    });
    
    // Comment buttons
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const postId = e.target.dataset.postId;
            await loadComments(postId);
        });
    });
}

// Toggle like
async function toggleLike(postId) {
    try {
        const response = await fetch(`${API_URL}/likes/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: postId,
                userId: currentUser.UserID
            })
        });
        
        const data = await response.json();
        if (data.success) {
            await loadFeed();
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Load comments
async function loadComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    
    if (commentsSection.style.display === 'none') {
        try {
            const response = await fetch(`${API_URL}/comments/${postId}`);
            const data = await response.json();
            
            let html = '';
            
            if (data.success && data.comments.length > 0) {
                html = data.comments.map(comment => `
                    <div class="comment">
                        <img src="${comment.Avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="avatar-sm">
                        <div class="comment-content">
                            <div class="comment-author">${comment.Username}</div>
                            <div>${escapeHTML(comment.Content)}</div>
                            <div class="post-time">${formatDate(comment.Timestamp)}</div>
                        </div>
                    </div>
                `).join('');
            }
            
            html += `
                <div class="comment-input">
                    <input type="text" placeholder="Write a comment..." id="comment-input-${postId}">
                    <button class="btn btn-sm btn-primary" onclick="addComment(${postId})">Post</button>
                </div>
            `;
            
            commentsSection.innerHTML = html;
            commentsSection.style.display = 'block';
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    } else {
        commentsSection.style.display = 'none';
    }
}

// Add comment
async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: postId,
                userId: currentUser.UserID,
                content: content
            })
        });
        
        const data = await response.json();
        if (data.success) {
            input.value = '';
            
            // Immediately increment comment count in UI
            const commentBtn = document.querySelector(`.comment-btn[data-post-id="${postId}"]`);
            if (commentBtn) {
                const currentText = commentBtn.textContent.trim();
                const currentCount = parseInt(currentText.match(/\d+/)[0]) || 0;
                commentBtn.textContent = `💬 ${currentCount + 1}`;
            }
            
            await loadComments(postId);
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Load stories
async function loadStories() {
    try {
        const response = await fetch(`${API_URL}/stories/${currentUser.UserID}`);
        const data = await response.json();
        
        if (data.success && data.stories.length > 0) {
            const html = data.stories.map(story => `
                <div class="story-item" onclick="viewStory(${story.StoryID})">
                    <div class="story-avatar">
                        <img src="${story.Avatar || 'https://via.placeholder.com/60'}" alt="${story.Username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                    </div>
                    <span>${story.Username}</span>
                </div>
            `).join('');
            
            document.getElementById('storiesSection').innerHTML += html;
        }
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

// Handle story file selection
function handleStorySelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Create FormData to send file
    const formData = new FormData();
    formData.append('storyImage', file);
    formData.append('userId', currentUser.UserID);
    
    fetch(`${API_URL}/stories`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Story uploaded successfully!');
            // Clear stories and reload (keeping the add story button)
            const storiesSection = document.getElementById('storiesSection');
            // Remove all story items except the add-story button
            const storyItems = storiesSection.querySelectorAll('.story-item:not(.add-story)');
            storyItems.forEach(item => item.remove());
            // Reload stories
            loadStories();
        } else {
            alert('Failed to upload story: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error uploading story:', error);
        alert('Failed to upload story');
    });
    
    // Reset file input
    event.target.value = '';
}

// View story
async function viewStory(storyId) {
    // Record view
    await fetch(`${API_URL}/stories/${storyId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerUserId: currentUser.UserID })
    });
    
    alert('Story viewing feature - would show full screen story viewer');
}

// Load user suggestions (newest users not followed)
async function loadSuggestions() {
    try {
        const response = await fetch(`${API_URL}/users/suggestions/${currentUser.UserID}`);
        const data = await response.json();
        
        if (data.success && data.users.length > 0) {
            const html = data.users
                .map(user => `
                    <div class="user-suggestion">
                        <div class="user-suggestion-info">
                            <img src="${user.Avatar || 'https://via.placeholder.com/40'}" alt="${user.Username}" class="avatar-sm">
                            <div>
                                <div style="font-weight: 600;">${user.Username}</div>
                                <div class="text-muted" style="font-size: 0.85rem;">${user.Bio || 'New user'}</div>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="followUser(${user.UserID})" id="follow-btn-${user.UserID}">Follow</button>
                    </div>
                `).join('');
            
            document.getElementById('suggestedUsers').innerHTML = html;
        } else {
            document.getElementById('suggestedUsers').innerHTML = '<div class="text-muted" style="padding: 10px;">No suggestions</div>';
        }
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

// Load follow requests
async function loadFollowRequests() {
    try {
        const response = await fetch(`${API_URL}/followers/requests/${currentUser.UserID}`);
        const data = await response.json();
        
        // Update badge
        const badge = document.getElementById('requestsBadge');
        if (data.success && data.requests.length > 0) {
            badge.textContent = data.requests.length;
            badge.style.display = 'inline-block';
            
            const html = `
                <div class="widget follow-requests-widget">
                    <h3>Follow Requests (${data.requests.length})</h3>
                    ${data.requests.map(req => `
                        <div class="user-suggestion">
                            <div class="user-suggestion-info">
                                <img src="${req.Avatar || 'https://via.placeholder.com/40'}" alt="${req.Username}" class="avatar-sm">
                                <div>
                                    <div style="font-weight: 600;">${req.Username}</div>
                                    <div class="text-muted" style="font-size: 0.85rem;">${req.Bio || 'No bio'}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-sm btn-primary" onclick="acceptFollowRequest(${req.FriendshipID})">Accept</button>
                                <button class="btn btn-sm btn-secondary" onclick="rejectFollowRequest(${req.FriendshipID})">Reject</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Insert before suggestions widget
            const sidebar = document.querySelector('.feed-sidebar');
            const existingRequests = document.querySelector('.follow-requests-widget');
            if (existingRequests) {
                existingRequests.outerHTML = html;
            } else {
                sidebar.insertAdjacentHTML('afterbegin', html);
            }
        } else {
            badge.style.display = 'none';
            // Remove widget if no requests
            const existingRequests = document.querySelector('.follow-requests-widget');
            if (existingRequests) {
                existingRequests.remove();
            }
        }
    } catch (error) {
        console.error('Error loading follow requests:', error);
    }
}

// Follow user
async function followUser(userId) {
    try {
        const btn = document.getElementById(`follow-btn-${userId}`);
        if (btn) btn.disabled = true;
        
        const response = await fetch(`${API_URL}/followers/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                followerId: currentUser.UserID,
                followingId: userId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            if (data.action === 'requested') {
                if (btn) {
                    btn.textContent = 'Requested';
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                }
                alert('Follow request sent! This user has a private account.');
            } else if (data.action === 'followed') {
                // Immediately change button to "Following"
                if (btn) {
                    btn.textContent = 'Following';
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                    btn.disabled = false;
                }
                await loadFeed();
            } else if (data.action === 'unfollowed') {
                // Change back to "Follow"
                if (btn) {
                    btn.textContent = 'Follow';
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-primary');
                    btn.disabled = false;
                }
                await loadFeed();
            }
        }
    } catch (error) {
        console.error('Error following user:', error);
    }
}

// Accept follow request
async function acceptFollowRequest(requestId) {
    try {
        const response = await fetch(`${API_URL}/followers/accept/${requestId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        if (data.success) {
            await loadFollowRequests();
            await loadFeed();
        }
    } catch (error) {
        console.error('Error accepting request:', error);
    }
}

// Reject follow request
async function rejectFollowRequest(requestId) {
    try {
        const response = await fetch(`${API_URL}/followers/reject/${requestId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        if (data.success) {
            await loadFollowRequests();
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
    }
}

// Load unread message count
async function loadUnreadCount() {
    try {
        const response = await fetch(`${API_URL}/messages/unread/${currentUser.UserID}`);
        const data = await response.json();
        
        if (data.success && data.unreadCount > 0) {
            document.getElementById('unreadBadge').textContent = data.unreadCount;
        }
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

// Setup search
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/search/users?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success && data.users.length > 0) {
                const html = data.users.map(user => `
                    <div class="search-result-item" onclick="window.location.href='profile.html?id=${user.UserID}'">
                        <img src="${user.Avatar || 'https://via.placeholder.com/40'}" alt="${user.Username}" class="avatar-sm">
                        <div>
                            <div style="font-weight: 600;">${user.Username}</div>
                            <div class="text-muted" style="font-size: 0.85rem;">${user.Email}</div>
                        </div>
                    </div>
                `).join('');
                
                searchResults.innerHTML = html;
                searchResults.classList.add('active');
            } else {
                searchResults.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">No users found</div>';
                searchResults.classList.add('active');
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal functions
function closeModal() {
    document.getElementById('postModal').classList.remove('active');
}
