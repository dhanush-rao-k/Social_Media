const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let profileUserId = null;
let isOwnProfile = false;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Get user ID from URL or use current user
    const urlParams = new URLSearchParams(window.location.search);
    profileUserId = urlParams.get('id') || currentUser.UserID;
    isOwnProfile = profileUserId == currentUser.UserID;
    
    // Load profile data
    await loadProfile();
    await loadUserPosts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});

// Setup event listeners
async function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Edit profile button
    if (isOwnProfile) {
        document.getElementById('editProfileBtn').addEventListener('click', openEditModal);
    } else {
        document.getElementById('editProfileBtn').style.display = 'none';
        document.getElementById('followBtn').style.display = 'block';
        await updateFollowButton();
        document.getElementById('followBtn').addEventListener('click', toggleFollow);
    }
}

// Update follow button based on current status
async function updateFollowButton() {
    try {
        const response = await fetch(`${API_URL}/followers/status/${currentUser.UserID}/${profileUserId}`);
        const data = await response.json();
        
        const btn = document.getElementById('followBtn');
        if (data.success) {
            if (data.status === 'following') {
                btn.textContent = 'Unfollow';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            } else if (data.status === 'requested') {
                btn.textContent = 'Requested';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
                btn.disabled = true;
            } else {
                btn.textContent = 'Follow';
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
            }
        }
    } catch (error) {
        console.error('Error checking follow status:', error);
    }
}

// Load profile
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/users/${profileUserId}`);
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            const stats = data.stats;
            
            // Update profile UI
            document.getElementById('profileUsername').textContent = user.Username;
            document.getElementById('profileBio').textContent = user.Bio || 'No bio yet';
            
            if (user.Avatar) {
                document.getElementById('profileAvatar').src = user.Avatar;
            }
            
            document.getElementById('postCount').textContent = stats.posts;
            document.getElementById('followerCount').textContent = stats.followers;
            document.getElementById('followingCount').textContent = stats.following;
            
            // Update page title
            document.title = `${user.Username} - Social Media`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load user posts
async function loadUserPosts() {
    try {
        const response = await fetch(`${API_URL}/posts/feed/${profileUserId}?limit=50`);
        const data = await response.json();
        
        const container = document.getElementById('userPosts');
        
        if (data.success && data.posts.length > 0) {
            // Filter posts by this user only
            const userPosts = data.posts.filter(p => p.UserID == profileUserId);
            
            if (userPosts.length > 0) {
                container.innerHTML = userPosts.map(post => createPostHTML(post)).join('');
            } else {
                container.innerHTML = '<div class="empty-state"><p>No posts yet</p></div>';
            }
        } else {
            container.innerHTML = '<div class="empty-state"><p>No posts yet</p></div>';
        }
    } catch (error) {
        console.error('Error loading posts:', error);
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
                <button class="action-btn">❤️ ${post.LikeCount || 0}</button>
                <button class="action-btn">💬 ${post.CommentCount || 0}</button>
            </div>
        </div>
    `;
}

// Switch tabs
async function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    if (tab === 'posts') {
        document.getElementById('postsTab').classList.add('active');
    } else if (tab === 'followers') {
        document.getElementById('followersTab').classList.add('active');
        await loadFollowers();
    } else if (tab === 'following') {
        document.getElementById('followingTab').classList.add('active');
        await loadFollowing();
    }
}

// Load followers
async function loadFollowers() {
    try {
        const response = await fetch(`${API_URL}/followers/${profileUserId}`);
        const data = await response.json();
        
        const container = document.getElementById('followersList');
        
        if (data.success && data.followers.length > 0) {
            container.innerHTML = data.followers.map(user => `
                <div class="user-suggestion">
                    <div class="user-suggestion-info">
                        <img src="${user.Avatar || 'https://via.placeholder.com/40'}" alt="${user.Username}" class="avatar-sm">
                        <div>
                            <div style="font-weight: 600;">${user.Username}</div>
                            <div class="text-muted" style="font-size: 0.85rem;">Following since ${formatDate(user.FollowedAt)}</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="viewProfile(${user.UserID})">View</button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><p>No followers yet</p></div>';
        }
    } catch (error) {
        console.error('Error loading followers:', error);
    }
}

// Load following
async function loadFollowing() {
    try {
        const response = await fetch(`${API_URL}/following/${profileUserId}`);
        const data = await response.json();
        
        const container = document.getElementById('followingList');
        
        if (data.success && data.following.length > 0) {
            container.innerHTML = data.following.map(user => `
                <div class="user-suggestion">
                    <div class="user-suggestion-info">
                        <img src="${user.Avatar || 'https://via.placeholder.com/40'}" alt="${user.Username}" class="avatar-sm">
                        <div>
                            <div style="font-weight: 600;">${user.Username}</div>
                            <div class="text-muted" style="font-size: 0.85rem;">Following since ${formatDate(user.FollowedAt)}</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="viewProfile(${user.UserID})">View</button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><p>Not following anyone yet</p></div>';
        }
    } catch (error) {
        console.error('Error loading following:', error);
    }
}

// View profile
function viewProfile(userId) {
    window.location.href = `profile.html?id=${userId}`;
}

// Toggle follow
async function toggleFollow() {
    try {
        const btn = document.getElementById('followBtn');
        const originalText = btn.textContent;
        
        const response = await fetch(`${API_URL}/followers/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                followerId: currentUser.UserID,
                followingId: profileUserId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            if (data.action === 'requested') {
                // Update button to show "Requested"
                btn.textContent = 'Requested';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
                btn.disabled = true;
                alert('Follow request sent! This user has a private account and needs to approve your request.');
            } else if (data.action === 'followed') {
                // Update button to show "Following"
                btn.textContent = 'Following';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            } else if (data.action === 'unfollowed') {
                // Update button to show "Follow"
                btn.textContent = 'Follow';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            }
            await loadProfile();
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
    }
}

// Open edit modal
function openEditModal() {
    // Pre-fill form with current data
    fetch(`${API_URL}/users/${currentUser.UserID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('editBio').value = data.user.Bio || '';
                document.getElementById('editAvatar').value = data.user.Avatar || '';
                document.getElementById('editPrivacy').value = data.user.PrivacySettings || 'public';
                
                document.getElementById('editModal').classList.add('active');
            }
        });
    
    // Setup form submission
    document.getElementById('editProfileForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveProfile();
    };
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Save profile
async function saveProfile() {
    const bio = document.getElementById('editBio').value;
    const avatar = document.getElementById('editAvatar').value;
    const privacySettings = document.getElementById('editPrivacy').value;
    
    try {
        const response = await fetch(`${API_URL}/users/${currentUser.UserID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bio: bio,
                avatar: avatar,
                privacySettings: privacySettings
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Update local storage
            currentUser.Bio = bio;
            currentUser.Avatar = avatar;
            currentUser.PrivacySettings = privacySettings;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            closeEditModal();
            await loadProfile();
            alert('Profile updated successfully!');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to update profile');
    }
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
