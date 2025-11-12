const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentChatUser = null;
let messageInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Load conversations
    await loadConversations();
    
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
function setupEventListeners() {
    // Send message
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Load all conversations
async function loadConversations() {
    try {
        console.log('Loading conversations for user:', currentUser.UserID);
        
        const response = await fetch(`${API_URL}/messages/conversations/${currentUser.UserID}`);
        const data = await response.json();
        
        console.log('Response:', data);
        
        const container = document.getElementById('conversationsList');
        
        if (data.success && data.conversations && data.conversations.length > 0) {
            container.innerHTML = data.conversations.map(conv => `
                <div class="conversation-item ${conv.UnreadCount > 0 ? 'has-unread' : ''}" 
                     onclick="startConversation(${conv.OtherUserID}, '${conv.Username}', '${conv.Avatar || ''}')">
                    <img src="${conv.Avatar || 'https://via.placeholder.com/40'}" alt="${conv.Username}" class="avatar-sm">
                    <div class="conversation-info">
                        <div class="conversation-name">
                            ${conv.Username}
                            ${conv.UnreadCount > 0 ? `<span class="badge">${conv.UnreadCount}</span>` : ''}
                        </div>
                        <div class="conversation-preview">${conv.LastMessage || 'No messages yet'}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No conversations yet</p>
                    <p class="text-muted">Click + to start a new conversation</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
        const container = document.getElementById('conversationsList');
        container.innerHTML = `
            <div class="empty-state">
                <p>Error loading conversations</p>
                <p class="text-muted">Please try again</p>
            </div>
        `;
    }
}

// Show new message modal
function showNewMessageModal() {
    document.getElementById('newMessageModal').classList.add('active');
    
    // Setup user search
    const searchInput = document.getElementById('userSearchInput');
    const resultsContainer = document.getElementById('userSearchResults');
    
    searchInput.oninput = async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/search/users?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success && data.users.length > 0) {
                resultsContainer.innerHTML = data.users
                    .filter(u => u.UserID !== currentUser.UserID)
                    .map(user => `
                        <div class="search-result-item" onclick="startConversation(${user.UserID}, '${user.Username}', '${user.Avatar || ''}')">
                            <img src="${user.Avatar || 'https://via.placeholder.com/40'}" alt="${user.Username}" class="avatar-sm">
                            <div>
                                <div style="font-weight: 600;">${user.Username}</div>
                                <div class="text-muted" style="font-size: 0.85rem;">${user.Email}</div>
                            </div>
                        </div>
                    `).join('');
            } else {
                resultsContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">No users found</div>';
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };
}

// Close new message modal
function closeNewMessageModal() {
    document.getElementById('newMessageModal').classList.remove('active');
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userSearchResults').innerHTML = '';
}

// Start conversation
async function startConversation(userId, username, avatar) {
    currentChatUser = { UserID: userId, Username: username, Avatar: avatar };
    
    closeNewMessageModal();
    
    // Show conversation view
    document.getElementById('noConversation').style.display = 'none';
    document.getElementById('conversationView').style.display = 'flex';
    
    // Update header
    document.getElementById('chatUsername').textContent = username;
    document.getElementById('chatAvatar').src = avatar || 'https://via.placeholder.com/40';
    
    // Load messages
    await loadMessages();
    
    // Start polling for new messages
    if (messageInterval) clearInterval(messageInterval);
    messageInterval = setInterval(loadMessages, 3000);
}

// Load messages
async function loadMessages() {
    if (!currentChatUser) return;
    
    try {
        const response = await fetch(`${API_URL}/messages/${currentUser.UserID}/${currentChatUser.UserID}`);
        const data = await response.json();
        
        const container = document.getElementById('messagesContainer');
        
        if (data.success) {
            if (data.messages.length > 0) {
                container.innerHTML = data.messages.map(msg => {
                    const isSent = msg.SenderID == currentUser.UserID;
                    return `
                        <div class="message ${isSent ? 'sent' : 'received'}">
                            <img src="${isSent ? (currentUser.Avatar || 'https://via.placeholder.com/40') : (currentChatUser.Avatar || 'https://via.placeholder.com/40')}" 
                                 alt="Avatar" class="avatar-sm">
                            <div>
                                <div class="message-bubble">${escapeHTML(msg.Content)}</div>
                                <div class="message-time">${formatDate(msg.Timestamp)}</div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Scroll to bottom
                container.scrollTop = container.scrollHeight;
                
                // Mark messages as seen
                const unreadMessages = data.messages.filter(m => 
                    m.ReceiverID == currentUser.UserID && !m.SeenStatus
                );
                
                for (const msg of unreadMessages) {
                    await fetch(`${API_URL}/messages/${msg.MessageID}/seen`, { method: 'PUT' });
                }
            } else {
                container.innerHTML = '<div class="empty-state"><p>No messages yet. Say hi! 👋</p></div>';
            }
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Send message
async function sendMessage() {
    if (!currentChatUser) return;
    
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderId: currentUser.UserID,
                receiverId: currentChatUser.UserID,
                content: content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            await loadMessages();
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (messageInterval) {
        clearInterval(messageInterval);
    }
});
