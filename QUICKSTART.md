# Quick Start Guide - Python Flask Social Media

## 🚀 Getting Started

### 1. Verify Installation
```bash
# Check Python
python --version  # Should be 3.8+

# Check MySQL
mysql --version   # Should be 8.0+
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Database
```bash
# The database and procedures are already set up!
# If you need to reset, run:
python setup_procedures.py
```

### 4. Start the Application
```bash
python app.py
```

### 5. Access the Application
Open your browser: **http://localhost:5000**

## 📝 Sample Users

Login with these credentials (password for all: `password123`):
- Username: `johndoe`
- Username: `janesmith`
- Username: `bobwilson`
- Username: `alicejones`
- Username: `charliedavis`
- Username: `evamartinez`

## ✨ Key Features

### User Management
- ✅ Register new account (automatically creates profile via stored procedure)
- ✅ Secure login with bcrypt
- ✅ View and edit profile

### Posts & Feed
- ✅ Create posts
- ✅ View personalized feed (posts from followed users)
- ✅ Like/unlike posts (toggle via stored procedure)
- ✅ Comment on posts (count updates automatically)

### Social Features
- ✅ Follow/unfollow users (toggle via stored procedure)
- ✅ View suggested users
- ✅ Search users
- ✅ View user profiles

### Messaging
- ✅ Send direct messages
- ✅ View conversations
- ✅ Unread message count (via stored procedure)
- ✅ Message read receipts (via trigger)

### Stories (24-hour)
- ✅ Upload stories
- ✅ View stories from followed users
- ✅ Auto-deletion after 24 hours (via scheduled event)

## 🗄️ MySQL Backend Features

### Stored Procedures (19 total)
All business logic is in MySQL:
- `UserLogin` - Authenticate users
- `RegisterUser` - Create user + profile (transaction)
- `CreatePost` / `DeletePost` - Post management
- `ToggleLike` / `AddComment` - Interactions
- `ToggleFollow` - Follow management
- `SendMessage` / `GetUserConversations` - Messaging
- `CreateStory` / `GetFollowedUsersStories` - Stories
- And more...

### Database Functions (3 total)
- `GetCommentCount(post_id)` - Returns comment count
- `GetLikeCount(post_id)` - Returns like count
- `IsFollowing(follower_id, following_id)` - Check follow status

### Triggers (5 total)
Automatic data management:
- `BeforeStoryInsert` - Set expiration time (24 hours)
- `AfterMessageSeenUpdate` - Update message status
- `BeforePostDelete` - Cascade delete related data
- `BeforeUserDelete` - Cascade delete all user data
- `AfterCommentInsert` - Notification handling

### Scheduled Events
- `DeleteExpiredStories` - Runs every hour to remove old stories

## 🔍 Testing the Application

### Test User Registration
1. Go to http://localhost:5000/register
2. Fill in the form
3. Check that:
   - User is created in `Users` table
   - Profile is automatically created in `Profile` table
   - Password is hashed with bcrypt

### Test Follow System
1. Login as `johndoe`
2. Go to another user's profile
3. Click "Follow"
4. Check that:
   - Follow relationship is created
   - Button changes to "Unfollow"
   - Follower count updates

### Test Posts & Likes
1. Create a new post
2. Like the post
3. Check that:
   - Like count increments
   - Clicking again unlike (toggle)
   - Comment count updates when you comment

### Test Messaging
1. Login as `johndoe`
2. Go to Messages
3. Send message to another user
4. Check that:
   - Message appears in conversation
   - Unread count shows for receiver
   - Read receipt updates when viewed

### Test Stories
1. Upload a story
2. Check that:
   - Story has `ExpiresAt` set to 24 hours from now
   - Other users who follow you can see it
   - Expired stories are auto-deleted by event

## 🛠️ Development Tips

### View Stored Procedures
```sql
USE SOCIAL_MEDIA;
SHOW PROCEDURE STATUS WHERE Db = 'SOCIAL_MEDIA';
SHOW CREATE PROCEDURE ProcedureName;
```

### Test Procedures Directly
```sql
-- Test login
CALL UserLogin('johndoe', 'hashed_password');

-- Test creating post
CALL CreatePost(1, 'Hello World!', NULL);

-- Test toggle like
CALL ToggleLike(1, 1);
```

### Check Functions
```sql
-- Get comment count for post 1
SELECT GetCommentCount(1);

-- Get like count for post 1
SELECT GetLikeCount(1);

-- Check if user 1 follows user 2
SELECT IsFollowing(1, 2);
```

### Monitor Triggers
```sql
-- View triggers
SHOW TRIGGERS FROM SOCIAL_MEDIA;

-- Test cascade delete
DELETE FROM Posts WHERE PostID = 1;
-- Check that Likes and Comments are also deleted
```

### Check Scheduled Events
```sql
-- View events
SHOW EVENTS FROM SOCIAL_MEDIA;

-- Check event scheduler status
SHOW VARIABLES LIKE 'event_scheduler';

-- Enable if needed
SET GLOBAL event_scheduler = ON;
```

## 🐛 Troubleshooting

### Flask Not Starting
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed (Windows)
taskkill /PID <process_id> /F
```

### Database Connection Error
```bash
# Check .env file exists
cat .env

# Test MySQL connection
mysql -u root -p

# Verify database exists
SHOW DATABASES LIKE 'SOCIAL_MEDIA';
```

### Stored Procedures Not Found
```bash
# Re-apply procedures
python setup_procedures.py

# Or manually
mysql -u root -p SOCIAL_MEDIA
source database/enhanced_procedures.sql
```

## 📊 Database Schema Overview

```
Users (UserID, Username, Email, PasswordHash)
  └─ Profile (UserID, Bio, ProfilePicture)
  └─ Posts (PostID, UserID, Content, Media)
      └─ Comments (CommentID, PostID, UserID, Content)
      └─ Likes (LikeID, PostID, UserID)
  └─ Followers (FollowerUserID, FollowingUserID)
  └─ Messages (MessageID, SenderID, ReceiverID, Content)
      └─ MessageSeen (MessageSeenID, MessageID, SeenAt)
  └─ Stories (StoryID, UserID, MediaURL, ExpiresAt)
      └─ ViewedStories (ViewedStoryID, StoryID, UserID)
```

## 🎯 Project Structure

```
Social_Media/
├── app.py                      # Flask application (thin routing layer)
├── setup_procedures.py         # Database setup script
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables
│
├── database/
│   ├── schema.sql              # Database schema + sample data
│   └── enhanced_procedures.sql # All stored procedures/triggers/functions
│
├── templates/                  # Jinja2 HTML templates
│   ├── login.html
│   ├── register.html
│   ├── feed.html
│   ├── profile.html
│   └── messages.html
│
└── static/
    └── css/
        └── style.css           # Responsive CSS
```

## 🔐 Security Notes

- ✅ Passwords hashed with bcrypt (cost factor 12)
- ✅ Session-based authentication
- ✅ SQL injection prevented by stored procedures
- ✅ XSS protection via template escaping
- ⚠️ This is a development setup - NOT production ready
- ⚠️ Change SECRET_KEY in .env for production
- ⚠️ Use HTTPS in production
- ⚠️ Add rate limiting for APIs

## 📈 Performance Optimization

Database-heavy architecture benefits:
- ✅ Reduced network round-trips
- ✅ Database query optimization
- ✅ Stored procedure caching
- ✅ Index usage for faster queries
- ✅ Transaction management at DB level

## 🎓 Learning Objectives

This project demonstrates:
1. ✅ MySQL stored procedures for business logic
2. ✅ Database triggers for automatic actions
3. ✅ Database functions for reusable calculations
4. ✅ Transactions for data consistency
5. ✅ Scheduled events for maintenance tasks
6. ✅ Complex JOIN queries
7. ✅ Database-centric architecture
8. ✅ Python Flask web framework
9. ✅ RESTful API design
10. ✅ Session management

## 📚 Next Steps

1. Add file upload for stories (media files)
2. Implement real-time notifications
3. Add story viewing interface
4. Create admin dashboard
5. Add post editing/deletion
6. Implement search functionality
7. Add privacy settings
8. Create mobile responsive improvements
9. Add profile picture upload
10. Implement friend requests

## 🤝 Contributing

This is a DBMS course project. Feel free to:
- Add more stored procedures
- Create additional triggers
- Optimize queries
- Enhance UI/UX
- Add test cases

## 📞 Support

For issues or questions:
- Check the main README_PYTHON.md
- Review stored procedures in database/enhanced_procedures.sql
- Verify database connections
- Check Flask logs

---

**Happy Coding! 🚀**
