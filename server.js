const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'SOCIAL_MEDIA',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });

// ============= USER ROUTES =============

// Register new user
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password, bio } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO Users (Username, Email, Password, Bio) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, bio || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.code === 'ER_DUP_ENTRY' ? 'Username or email already exists' : 'Registration failed'
        });
    }
});

// Login user
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if login is with username or email
        const [users] = await pool.execute(
            'SELECT * FROM Users WHERE Username = ? OR Email = ?',
            [username, username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.Password);
        
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        // Don't send password back
        delete user.Password;
        
        res.json({
            success: true,
            message: 'Login successful',
            user: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Get user profile
app.get('/api/users/:userId', async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT UserID, Username, Email, Bio, Avatar, CreatedAt FROM Users WHERE UserID = ?',
            [req.params.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Get follower/following counts
        const [followerCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM Followers WHERE FollowingUserID = ?',
            [req.params.userId]
        );
        
        const [followingCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM Followers WHERE FollowerUserID = ?',
            [req.params.userId]
        );
        
        const [postCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM Posts WHERE UserID = ?',
            [req.params.userId]
        );
        
        res.json({
            success: true,
            user: users[0],
            stats: {
                followers: followerCount[0].count,
                following: followingCount[0].count,
                posts: postCount[0].count
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

// Update user profile
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { bio, avatar, privacySettings } = req.body;
        
        await pool.execute(
            'UPDATE Users SET Bio = ?, Avatar = ?, PrivacySettings = ? WHERE UserID = ?',
            [bio, avatar, privacySettings, req.params.userId]
        );
        
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// ============= POST ROUTES =============

// Create new post
app.post('/api/posts', async (req, res) => {
    try {
        const { userId, content, media } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO Posts (UserID, Content, Media) VALUES (?, ?, ?)',
            [userId, content, media || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            postId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
});

// Get user feed
app.get('/api/posts/feed/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        const [posts] = await pool.execute(
            'CALL GetUserFeed(?, ?)',
            [req.params.userId, limit]
        );
        
        res.json({ success: true, posts: posts[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch feed' });
    }
});

// Get post by ID with details
app.get('/api/posts/:postId', async (req, res) => {
    try {
        const [posts] = await pool.execute(
            `SELECT p.*, u.Username, u.Avatar,
                    COUNT(DISTINCT l.LikeID) as LikeCount,
                    COUNT(DISTINCT c.CommentID) as CommentCount
             FROM Posts p
             JOIN Users u ON p.UserID = u.UserID
             LEFT JOIN Likes l ON p.PostID = l.PostID
             LEFT JOIN Comments c ON p.PostID = c.PostID
             WHERE p.PostID = ?
             GROUP BY p.PostID`,
            [req.params.postId]
        );
        
        if (posts.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        res.json({ success: true, post: posts[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch post' });
    }
});

// Delete post
app.delete('/api/posts/:postId', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Posts WHERE PostID = ?', [req.params.postId]);
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
});

// ============= LIKE ROUTES =============

// Toggle like on post
app.post('/api/likes/toggle', async (req, res) => {
    try {
        const { postId, userId } = req.body;
        
        // Check if already liked
        const [existing] = await pool.execute(
            'SELECT * FROM Likes WHERE PostID = ? AND UserID = ?',
            [postId, userId]
        );
        
        if (existing.length > 0) {
            // Unlike
            await pool.execute(
                'DELETE FROM Likes WHERE PostID = ? AND UserID = ?',
                [postId, userId]
            );
            res.json({ success: true, action: 'unliked' });
        } else {
            // Like
            await pool.execute(
                'INSERT INTO Likes (PostID, UserID) VALUES (?, ?)',
                [postId, userId]
            );
            res.json({ success: true, action: 'liked' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to toggle like' });
    }
});

// Get likes for a post
app.get('/api/likes/:postId', async (req, res) => {
    try {
        const [likes] = await pool.execute(
            `SELECT l.*, u.Username, u.Avatar 
             FROM Likes l
             JOIN Users u ON l.UserID = u.UserID
             WHERE l.PostID = ?
             ORDER BY l.Timestamp DESC`,
            [req.params.postId]
        );
        
        res.json({ success: true, likes: likes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch likes' });
    }
});

// ============= COMMENT ROUTES =============

// Add comment
app.post('/api/comments', async (req, res) => {
    try {
        const { postId, userId, content } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO Comments (PostID, UserID, Content) VALUES (?, ?, ?)',
            [postId, userId, content]
        );
        
        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            commentId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
});

// Get comments for a post
app.get('/api/comments/:postId', async (req, res) => {
    try {
        const [comments] = await pool.execute(
            `SELECT c.*, u.Username, u.Avatar 
             FROM Comments c
             JOIN Users u ON c.UserID = u.UserID
             WHERE c.PostID = ?
             ORDER BY c.Timestamp ASC`,
            [req.params.postId]
        );
        
        res.json({ success: true, comments: comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch comments' });
    }
});

// Delete comment
app.delete('/api/comments/:commentId', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Comments WHERE CommentID = ?', [req.params.commentId]);
        res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete comment' });
    }
});

// ============= FOLLOWER ROUTES =============

// Toggle follow (respects privacy settings)
app.post('/api/followers/toggle', async (req, res) => {
    try {
        const { followerId, followingId } = req.body;
        
        // Get target user's privacy settings
        const [targetUser] = await pool.execute(
            'SELECT PrivacySettings FROM Users WHERE UserID = ?',
            [followingId]
        );
        
        if (targetUser.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const isPrivate = targetUser[0].PrivacySettings === 'private';
        
        // Check if already following
        const [existing] = await pool.execute(
            'SELECT * FROM Followers WHERE FollowerUserID = ? AND FollowingUserID = ?',
            [followerId, followingId]
        );
        
        if (existing.length > 0) {
            // Unfollow
            await pool.execute(
                'DELETE FROM Followers WHERE FollowerUserID = ? AND FollowingUserID = ?',
                [followerId, followingId]
            );
            
            // Also remove any pending friend request
            await pool.execute(
                'DELETE FROM Friends WHERE (UserID1 = ? AND UserID2 = ?) OR (UserID1 = ? AND UserID2 = ?)',
                [followerId, followingId, followingId, followerId]
            );
            
            res.json({ success: true, action: 'unfollowed' });
        } else {
            // For private accounts, create a friend request
            if (isPrivate) {
                // Check if request already exists
                const [existingRequest] = await pool.execute(
                    'SELECT * FROM Friends WHERE UserID1 = ? AND UserID2 = ?',
                    [followerId, followingId]
                );
                
                if (existingRequest.length === 0) {
                    await pool.execute(
                        'INSERT INTO Friends (UserID1, UserID2, Status) VALUES (?, ?, ?)',
                        [followerId, followingId, 'pending']
                    );
                }
                
                res.json({ success: true, action: 'requested', message: 'Follow request sent' });
            } else {
                // For public accounts, follow immediately
                await pool.execute(
                    'INSERT INTO Followers (FollowerUserID, FollowingUserID) VALUES (?, ?)',
                    [followerId, followingId]
                );
                res.json({ success: true, action: 'followed' });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to toggle follow' });
    }
});

// Get followers
app.get('/api/followers/:userId', async (req, res) => {
    try {
        const [followers] = await pool.execute(
            `SELECT u.UserID, u.Username, u.Avatar, f.FollowedAt
             FROM Followers f
             JOIN Users u ON f.FollowerUserID = u.UserID
             WHERE f.FollowingUserID = ?
             ORDER BY f.FollowedAt DESC`,
            [req.params.userId]
        );
        
        res.json({ success: true, followers: followers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch followers' });
    }
});

// Get following
app.get('/api/following/:userId', async (req, res) => {
    try {
        const [following] = await pool.execute(
            `SELECT u.UserID, u.Username, u.Avatar, f.FollowedAt
             FROM Followers f
             JOIN Users u ON f.FollowingUserID = u.UserID
             WHERE f.FollowerUserID = ?
             ORDER BY f.FollowedAt DESC`,
            [req.params.userId]
        );
        
        res.json({ success: true, following: following });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch following' });
    }
});

// Get pending follow requests
app.get('/api/followers/requests/:userId', async (req, res) => {
    try {
        const [requests] = await pool.execute(
            `SELECT f.FriendshipID, u.UserID, u.Username, u.Avatar, u.Bio, f.Timestamp
             FROM Friends f
             JOIN Users u ON f.UserID1 = u.UserID
             WHERE f.UserID2 = ? AND f.Status = 'pending'
             ORDER BY f.Timestamp DESC`,
            [req.params.userId]
        );
        
        res.json({ success: true, requests: requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
});

// Accept follow request
app.post('/api/followers/accept/:requestId', async (req, res) => {
    try {
        // Get request details
        const [request] = await pool.execute(
            'SELECT * FROM Friends WHERE FriendshipID = ?',
            [req.params.requestId]
        );
        
        if (request.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        
        const { UserID1, UserID2 } = request[0];
        
        // Update request status
        await pool.execute(
            'UPDATE Friends SET Status = ? WHERE FriendshipID = ?',
            ['accepted', req.params.requestId]
        );
        
        // Add to followers
        await pool.execute(
            'INSERT INTO Followers (FollowerUserID, FollowingUserID) VALUES (?, ?)',
            [UserID1, UserID2]
        );
        
        res.json({ success: true, message: 'Request accepted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to accept request' });
    }
});

// Reject follow request
app.post('/api/followers/reject/:requestId', async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM Friends WHERE FriendshipID = ?',
            [req.params.requestId]
        );
        
        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to reject request' });
    }
});

// Check follow status
app.get('/api/followers/status/:followerId/:followingId', async (req, res) => {
    try {
        const { followerId, followingId } = req.params;
        
        // Check if following
        const [following] = await pool.execute(
            'SELECT * FROM Followers WHERE FollowerUserID = ? AND FollowingUserID = ?',
            [followerId, followingId]
        );
        
        // Check if request pending
        const [request] = await pool.execute(
            'SELECT * FROM Friends WHERE UserID1 = ? AND UserID2 = ? AND Status = ?',
            [followerId, followingId, 'pending']
        );
        
        let status = 'not_following';
        if (following.length > 0) {
            status = 'following';
        } else if (request.length > 0) {
            status = 'requested';
        }
        
        res.json({ success: true, status: status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to check status' });
    }
});

// ============= MESSAGE ROUTES =============

// Send message
app.post('/api/messages', async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO Messages (SenderID, ReceiverID, Content) VALUES (?, ?, ?)',
            [senderId, receiverId, content]
        );
        
        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            messageId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Get conversation between two users
app.get('/api/messages/:userId1/:userId2', async (req, res) => {
    try {
        const [messages] = await pool.execute(
            `SELECT m.*, 
                    sender.Username as SenderUsername, sender.Avatar as SenderAvatar,
                    receiver.Username as ReceiverUsername, receiver.Avatar as ReceiverAvatar
             FROM Messages m
             JOIN Users sender ON m.SenderID = sender.UserID
             JOIN Users receiver ON m.ReceiverID = receiver.UserID
             WHERE (m.SenderID = ? AND m.ReceiverID = ?)
                OR (m.SenderID = ? AND m.ReceiverID = ?)
             ORDER BY m.Timestamp ASC`,
            [req.params.userId1, req.params.userId2, req.params.userId2, req.params.userId1]
        );
        
        res.json({ success: true, messages: messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

// Mark message as seen
app.put('/api/messages/:messageId/seen', async (req, res) => {
    try {
        await pool.execute('CALL MarkMessageSeen(?)', [req.params.messageId]);
        res.json({ success: true, message: 'Message marked as seen' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to mark message as seen' });
    }
});

// Get unread message count
app.get('/api/messages/unread/:userId', async (req, res) => {
    try {
        const [result] = await pool.execute(
            'CALL GetUnreadMessageCount(?)',
            [req.params.userId]
        );
        
        res.json({ success: true, unreadCount: result[0][0].UnreadCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
});

// ============= STORY ROUTES =============

// Create story
app.post('/api/stories', upload.single('storyImage'), async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }
        
        const mediaUrl = '/uploads/' + req.file.filename;
        const mediaType = 'image';
        
        const [result] = await pool.execute(
            'INSERT INTO Stories (UserID, MediaURL, MediaType) VALUES (?, ?, ?)',
            [userId, mediaUrl, mediaType]
        );
        
        res.status(201).json({
            success: true,
            message: 'Story created successfully',
            storyId: result.insertId,
            mediaUrl: mediaUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create story' });
    }
});

// Get active stories from followed users and own stories
app.get('/api/stories/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const [stories] = await pool.execute(
            `SELECT s.*, u.Username, u.Avatar
             FROM Stories s
             JOIN Users u ON s.UserID = u.UserID
             WHERE s.ExpiresAt > NOW()
             AND (s.UserID = ? OR s.UserID IN (
                 SELECT FollowingUserID FROM Followers WHERE FollowerUserID = ?
             ))
             ORDER BY s.CreatedAt DESC`,
            [userId, userId]
        );
        
        res.json({ success: true, stories: stories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch stories' });
    }
});

// Mark story as viewed
app.post('/api/stories/:storyId/view', async (req, res) => {
    try {
        const { viewerUserId } = req.body;
        
        await pool.execute(
            'INSERT INTO ViewedStories (StoryID, ViewerUserID) VALUES (?, ?)',
            [req.params.storyId, viewerUserId]
        );
        
        res.json({ success: true, message: 'Story view recorded' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to record story view' });
    }
});

// ============= SEARCH ROUTES =============

// Search users
app.get('/api/search/users', async (req, res) => {
    try {
        const query = req.query.q || '';
        
        const [users] = await pool.execute(
            `SELECT UserID, Username, Email, Bio, Avatar
             FROM Users
             WHERE Username LIKE ? OR Email LIKE ?
             LIMIT 20`,
            [`%${query}%`, `%${query}%`]
        );
        
        res.json({ success: true, users: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
});

// Get user suggestions (newest users not followed by current user)
app.get('/api/users/suggestions/:userId', async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT u.UserID, u.Username, u.Bio, u.Avatar, u.CreatedAt
             FROM Users u
             WHERE u.UserID != ?
             AND u.UserID NOT IN (
                 SELECT FollowingUserID FROM Followers WHERE FollowerUserID = ?
             )
             ORDER BY u.CreatedAt DESC
             LIMIT 10`,
            [req.params.userId, req.params.userId]
        );
        
        res.json({ success: true, users: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
    }
});

// Get conversations list with unread counts
// Get all conversations - simple query
app.get('/api/messages/conversations/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Simple approach: Get distinct users you've messaged with
        const [conversations] = await pool.execute(
            `SELECT DISTINCT
                u.UserID as OtherUserID,
                u.Username,
                u.Avatar,
                (SELECT Content 
                 FROM Messages 
                 WHERE (SenderID = u.UserID AND ReceiverID = ?)
                    OR (SenderID = ? AND ReceiverID = u.UserID)
                 ORDER BY Timestamp DESC 
                 LIMIT 1) as LastMessage,
                (SELECT Timestamp 
                 FROM Messages 
                 WHERE (SenderID = u.UserID AND ReceiverID = ?)
                    OR (SenderID = ? AND ReceiverID = u.UserID)
                 ORDER BY Timestamp DESC 
                 LIMIT 1) as LastMessageTime,
                (SELECT COUNT(*) 
                 FROM Messages 
                 WHERE SenderID = u.UserID 
                   AND ReceiverID = ? 
                   AND SeenStatus = FALSE) as UnreadCount
            FROM Users u
            WHERE u.UserID IN (
                SELECT DISTINCT SenderID FROM Messages WHERE ReceiverID = ?
                UNION
                SELECT DISTINCT ReceiverID FROM Messages WHERE SenderID = ?
            )
            ORDER BY LastMessageTime DESC`,
            [userId, userId, userId, userId, userId, userId, userId]
        );
        
        res.json({ success: true, conversations: conversations });
    } catch (error) {
        console.error('Conversations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations', error: error.message });
    }
});

// Accept message request (no actual action needed, just mark messages as seen)
app.post('/api/messages/accept/:otherUserId/:userId', async (req, res) => {
    try {
        // Mark all messages from this user as seen
        await pool.execute(
            'UPDATE Messages SET SeenStatus = TRUE WHERE SenderID = ? AND ReceiverID = ?',
            [req.params.otherUserId, req.params.userId]
        );
        
        res.json({ success: true, message: 'Message request accepted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to accept message request' });
    }
});

// Reject/Delete message request
app.delete('/api/messages/reject/:otherUserId/:userId', async (req, res) => {
    try {
        // Delete all messages between these users
        await pool.execute(
            'DELETE FROM Messages WHERE (SenderID = ? AND ReceiverID = ?) OR (SenderID = ? AND ReceiverID = ?)',
            [req.params.otherUserId, req.params.userId, req.params.userId, req.params.otherUserId]
        );
        
        res.json({ success: true, message: 'Message request deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete message request' });
    }
});

// Keep the original endpoint for backward compatibility
app.get('/api/messages/conversations/:userId', async (req, res) => {
    try {
        const [conversations] = await pool.execute(
            `SELECT DISTINCT
                CASE 
                    WHEN m.SenderID = ? THEN m.ReceiverID 
                    ELSE m.SenderID 
                END as OtherUserID,
                u.Username,
                u.Avatar,
                (SELECT Content FROM Messages m2 
                 WHERE (m2.SenderID = ? AND m2.ReceiverID = OtherUserID) 
                    OR (m2.ReceiverID = ? AND m2.SenderID = OtherUserID)
                 ORDER BY m2.Timestamp DESC LIMIT 1) as LastMessage,
                (SELECT Timestamp FROM Messages m2 
                 WHERE (m2.SenderID = ? AND m2.ReceiverID = OtherUserID) 
                    OR (m2.ReceiverID = ? AND m2.SenderID = OtherUserID)
                 ORDER BY m2.Timestamp DESC LIMIT 1) as LastMessageTime,
                (SELECT COUNT(*) FROM Messages m3 
                 WHERE m3.SenderID = OtherUserID 
                 AND m3.ReceiverID = ? 
                 AND m3.SeenStatus = FALSE) as UnreadCount
             FROM Messages m
             JOIN Users u ON u.UserID = CASE 
                 WHEN m.SenderID = ? THEN m.ReceiverID 
                 ELSE m.SenderID 
             END
             WHERE m.SenderID = ? OR m.ReceiverID = ?
             ORDER BY LastMessageTime DESC`,
            [req.params.userId, req.params.userId, req.params.userId, req.params.userId, 
             req.params.userId, req.params.userId, req.params.userId, req.params.userId, 
             req.params.userId]
        );
        
        res.json({ success: true, conversations: conversations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
