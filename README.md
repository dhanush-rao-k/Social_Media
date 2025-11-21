# 🚀 Social Media Platform - Streamlit + MySQL

A feature-rich social media platform built with **Streamlit** frontend and **MySQL** database backend. The application emphasizes database-centric architecture with most business logic residing in stored procedures, triggers, and events.

## 📋 Technology Stack

### Frontend
- **Streamlit 1.28+** - Interactive web UI framework
- **Session State Management** - Client-side state handling
- **File Upload Handlers** - Local file storage with MD5 hashing

### Backend
- **MySQL 8.0+** - Relational database with stored procedures
- **mysql-connector-python 8.2.0** - Database connector
- **bcrypt 5.0.0** - Secure password hashing
- **python-dotenv 1.2.1** - Environment configuration



## 🏗️ Architecture

```
┌─────────────────────────┐
│   Streamlit App         │
│ (streamlit_app.py)      │  ← Interactive UI
└────────────┬────────────┘
             │ MySQL Connector
             ▼
┌─────────────────────────┐
│   MySQL Database        │
│ - Stored Procedures     │
│ - Triggers              │
│ - Events                │
│ - Functions             │
└─────────────────────────┘
```

### Key Architecture Principles
- ✅ **Database-Centric** - Business logic in MySQL stored procedures
- ✅ **Data Integrity** - Triggers ensure consistency across operations
- ✅ **Scalable Queries** - Complex operations handled by database functions
- ✅ **Transaction Safety** - Multi-step operations wrapped in transactions
- ✅ **Thin Frontend** - Streamlit acts as data presentation layer
- ✅ **Auto-Cleanup** - Events handle background tasks (story expiration)

## 🗄️ Database Features

### Stored Procedures (25+ procedures)
| Procedure | Purpose |
|-----------|---------|
| `UserLogin` | Authenticate user with password verification |
| `RegisterUser` | Register new user with privacy settings |
| `CreatePost` | Create new post with media |
| `DeletePost` | Delete post with cascading deletes |
| `ToggleLike` | Like/unlike a post (toggle action) |
| `AddComment` | Add comment to post |
| `GetPostComments` | Retrieve comments with user details |
| `ToggleFollow` | Follow/unfollow users (toggle action) |
| `GetSuggestedUsers` | Get follow suggestions |
| `SendMessage` | Send direct message |
| `GetUserConversations` | List all conversations |
| `GetConversationMessages` | Get messages between two users |
| `CreateStory` | Create story with 24-hour expiration |
| `GetFollowedUsersStories` | Get active stories from followed users |
| `MarkStoryViewed` | Mark story as viewed |
| `SearchUsers` | Search users by query |
| `SearchPosts` | Search posts by content |
| `GetUserProfile` | Get user profile with stats |
| `GetUserPosts` | Get user's posts with engagement metrics |
| `UpdateProfile` | Update user bio and avatar |
| `GetUserFeed` | Get personalized feed from followed users |
| `MarkMessageSeen` | Mark message as read |
| `DeleteUserAccount` | Permanent account deletion with cascading deletes |

### Database Functions (4 functions)
| Function | Returns |
|----------|---------|
| `GetCommentCount(post_id)` | Integer count of comments |
| `GetLikeCount(post_id)` | Integer count of likes |
| `IsFollowing(follower_id, following_id)` | Boolean follow status |
| `GetUnreadMessageCount(user_id)` | Integer unread message count |

### Triggers (9 triggers)
| Trigger | Event | Action |
|---------|-------|--------|
| `BeforeStoryInsert` | BEFORE INSERT on Stories | Auto-set ExpiresAt = NOW() + 24 HOURS |
| `AfterMessageSeenUpdate` | AFTER UPDATE on Messages | Insert record in MessageSeen on seen status change |
| `AfterLikeInsert` | AFTER INSERT on Likes | Increment post's LikeCount |
| `AfterLikeDelete` | AFTER DELETE on Likes | Decrement post's LikeCount |
| `AfterCommentInsertCount` | AFTER INSERT on Comments | Increment post's CommentCount |
| `AfterCommentDeleteCount` | AFTER DELETE on Comments | Decrement post's CommentCount |
| `AfterCommentInsert` | AFTER INSERT on Comments | Placeholder for future notifications |
| `BeforePostDelete` | BEFORE DELETE on Posts | Delete associated likes and comments |
| `BeforeUserDelete` | BEFORE DELETE on Users | Cascade delete all user-related data |

### Scheduled Events
| Event | Schedule | Action |
|-------|----------|--------|
| `DeleteExpiredStories` | Every 1 HOUR | Delete stories where ExpiresAt ≤ NOW() |

## 📊 Database Schema

### Core Tables (11 tables)
| Table | Purpose |
|-------|---------|
| **Users** | User accounts with authentication & privacy settings |
| **Posts** | User posts with media support & engagement counters |
| **Comments** | Post comments with timestamps |
| **Likes** | Post likes with unique constraint (user + post) |
| **Stories** | 24-hour ephemeral content with auto-expiration |
| **ViewedStories** | Track who viewed each story |
| **Messages** | Direct messages with read status |
| **MessageSeen** | Detailed message read receipts |
| **Followers** | Follow relationships (directed graph) |
| **FollowRequests** | Follow requests for private accounts |
| **Friends** | Friend relationships with pending/accepted status |

### Key Schema Features
- ✅ **Foreign Key Constraints** - `ON DELETE CASCADE` for data integrity
- ✅ **Unique Constraints** - `(PostID, UserID)` for Likes, `(RequesterUserID, TargetUserID)` for FollowRequests
- ✅ **Timestamps** - All tables include timestamp tracking
- ✅ **Enum Types** - Status fields use ENUM for validation
- ✅ **Counters** - Posts table has cached LikeCount and CommentCount

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8+
- MySQL 8.0+
- pip (Python package manager)
- Git

### Step-by-Step Setup

#### 1. Clone Repository
```bash
git clone https://github.com/dhanush-rao-k/Social_Media.git
cd Social_Media
```

#### 2. Create Python Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

#### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Setup MySQL Database

**Option A: Using SQL Files (Recommended)**
```bash
# Create database and schema
mysql -u root -p < database/schema.sql

# Apply enhanced procedures and triggers
mysql -u root -p SOCIAL_MEDIA < database/enhanced_procedures.sql

# Apply interactive features (like/comment counters)
mysql -u root -p SOCIAL_MEDIA < database/interactive_features.sql
```

**Option B: Manual MySQL Setup**
```sql
-- Login to MySQL
mysql -u root -p

-- Run schema.sql contents
-- Then run enhanced_procedures.sql contents
-- Then run interactive_features.sql contents
```

#### 5. Configure Environment Variables
```bash
# Create .env file in project root
cat > .env << EOF
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=SOCIAL_MEDIA
EOF
```

#### 6. Run Streamlit Application
```bash
streamlit run streamlit_app.py
```

The application will open in your browser at `http://localhost:8501`

## ✨ Features

### 👤 User Management
- ✅ **Registration** - Create account with username, email, password, bio
- ✅ **Login** - Secure bcrypt password verification
- ✅ **Privacy Settings** - Toggle between public/private account
- ✅ **Profile Management** - Update bio, avatar, privacy settings
- ✅ **Account Deletion** - Permanent deletion with cascading deletes (all data removed)

### 📱 Social Features
- ✅ **Posts** - Create posts with media (JPEG, PNG, GIF)
- ✅ **Likes** - Like/unlike posts with real-time counter updates
- ✅ **Comments** - Comment on posts, view all comments
- ✅ **Follow System** - Follow/unfollow users
- ✅ **Follow Requests** - Private accounts require approval for followers
- ✅ **Accept/Reject Requests** - Manage follow requests in profile
- ✅ **Feed** - Personalized feed from followed users
- ✅ **User Search** - Search and discover users

### 📖 Stories
- ✅ **Create Stories** - Upload 24-hour temporary content
- ✅ **View Stories** - Watch stories from followed users
- ✅ **Auto-Expiration** - Stories auto-delete after 24 hours
- ✅ **View Tracking** - See who viewed your stories
- ✅ **Engagement** - Like counts and viewer list

### 💬 Messaging
- ✅ **Direct Messages** - Send messages to other users
- ✅ **Conversations** - View all active conversations
- ✅ **Read Receipts** - Know when messages are read
- ✅ **Message History** - View conversation history

### 🔍 Discovery
- ✅ **Search Users** - Find users by username, email, or bio
- ✅ **Suggested Users** - Get follow suggestions
- ✅ **Trending** - View posts with most likes

## 📁 Project Structure

```
Social_Media_python/
│
├── 📄 streamlit_app.py              ← Main Streamlit application
├── 📄 requirements.txt              ← Python dependencies
├── 📄 .env.example                  ← Environment template
├── 📄 README.md                     ← This file
│
├── 📁 database/
│   ├── schema.sql                   ← Database schema + sample data
│   ├── enhanced_procedures.sql      ← All stored procedures & triggers
│   ├── interactive_features.sql     ← Like/comment counter triggers
│   └── (auto-generated files)
│
├── 📁 uploads/                      ← Local file storage
│   ├── posts/
│   └── stories/
│
├── 📁 documentation/
│   ├── ACCOUNT_DELETION.md          ← Account deletion & story auto-delete docs
│   ├── PRIVACY_SETTINGS.md          ← Privacy & follow request system
│   ├── JOIN_USAGE_ANALYSIS.md       ← Analysis of 30+ JOINs in project
│   └── (feature documentation)
│
└── 📄 view_users.py                 ← Utility to view users in database
    📄 view_password_hashes.py       ← Utility to view password hashes
```

## 🎯 Core Functionality Walkthrough

### User Registration
```python
# User enters: username, email, password, bio
→ Streamlit validates input
→ Password hashed with bcrypt
→ RegisterUser procedure creates account
→ Privacy setting defaults to public
```

### Creating a Post
```python
# User uploads post with optional media (JPEG/PNG)
→ Media saved to uploads/ with MD5 hash filename
→ CreatePost procedure stores post
→ LikeCount and CommentCount initialized to 0
```

### Liking a Post
```python
# User clicks like button
→ ToggleLike procedure checks if already liked
→ If liked: DELETE from Likes (unlike)
→ If not liked: INSERT into Likes (like)
→ AfterLikeInsert trigger updates LikeCount
```

### Following a User
```python
# User clicks follow button
→ Check target's privacy setting:
   - If public: Direct follow (INSERT into Followers)
   - If private: Send request (INSERT into FollowRequests)
→ Request needs approval before becoming follower
```

### Deleting Account
```python
# User confirms deletion with password + username
→ Password verified with bcrypt
→ DeleteUserAccount procedure cascades deletes:
   1. FollowRequests (requester & target)
   2. ViewedStories (all views)
   3. Stories (all user's stories)
   4. MessageSeen (all message receipts)
   5. Messages (all messages)
   6. Comments (all comments)
   7. Likes (all likes)
   8. Posts (all posts)
   9. Followers (all relationships)
   10. Friends (all friendships)
   11. Users (finally delete user)
```

## 👥 Sample Test Data

Database includes 16 test users for demonstration:

| Username | Email | Bio | Privacy |
|----------|-------|-----|---------|
| john_doe | john@example.com | Software developer ☕ | PUBLIC |
| jane_smith | jane@example.com | Creative designer 🎨 | PUBLIC |
| bob_wilson | bob@example.com | Tech enthusiast 💻 | PUBLIC |
| alice_wonder | alice@example.com | Foodie 🍕 | PUBLIC |
| mike_ross | mike@example.com | Fitness trainer 💪 | PUBLIC |
| sarah_connor | sarah@example.com | Photographer 📸 | PUBLIC |
| Daru_Boi | dhanushraokona@gmail.com | Demo account | PUBLIC |
| ayush_05 | ayush@email.com | Demo account | PUBLIC |
| qwerty_1 | qwerty@gmail.com | Demo account | PUBLIC |
| ... | ... | ... | ... |

**Password for all test users:** `password123`

## 🗝️ Key Database Patterns

### 1. Cascading Deletes with Transactions
```sql
CREATE PROCEDURE DeleteUserAccount(IN p_user_id INT)
BEGIN
    START TRANSACTION;
    -- Delete dependent records first
    DELETE FROM FollowRequests ...
    DELETE FROM ViewedStories ...
    DELETE FROM Stories ...
    -- ... more deletes ...
    -- Delete user last
    DELETE FROM Users ...
    COMMIT;
END
```

### 2. Toggle Actions (Like/Follow)
```sql
CREATE PROCEDURE ToggleLike(IN p_user_id INT, IN p_post_id INT)
BEGIN
    IF EXISTS (SELECT 1 FROM Likes WHERE UserID = p_user_id AND PostID = p_post_id)
    THEN
        DELETE FROM Likes ...
    ELSE
        INSERT INTO Likes ...
    END IF;
END
```

### 3. Auto-Expiration with Events
```sql
-- Trigger sets expiration on insert
CREATE TRIGGER BeforeStoryInsert
BEFORE INSERT ON Stories
BEGIN
    SET NEW.ExpiresAt = DATE_ADD(NOW(), INTERVAL 24 HOUR);
END

-- Event runs hourly to clean up
CREATE EVENT DeleteExpiredStories
ON SCHEDULE EVERY 1 HOUR
DO
    DELETE FROM Stories WHERE ExpiresAt <= NOW();
```

### 4. Counter Caching with Triggers
```sql
-- After like is added
CREATE TRIGGER AfterLikeInsert
AFTER INSERT ON Likes
BEGIN
    UPDATE Posts SET LikeCount = LikeCount + 1
    WHERE PostID = NEW.PostID;
END
```

## 🔧 Utilities & Tools

### View Users in Database
```bash
python view_users.py
```
Shows all users with engagement metrics (posts, followers, following).

### View Password Hashes
```bash
python view_password_hashes.py
```
Displays all bcrypt password hashes (for debugging/verification only).

### View Posts with Likes
```sql
SELECT 
    p.PostID,
    u.Username,
    p.Content,
    p.LikeCount,
    p.CommentCount,
    p.Timestamp
FROM Posts p
JOIN Users u ON p.UserID = u.UserID
ORDER BY p.LikeCount DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### MySQL Connection Error
```
Error: "Can't connect to MySQL server"
```
**Solution:**
```bash
# Check MySQL is running
mysql --version

# Test connection
mysql -u root -p

# Check credentials in .env file
```

### Database not found
```
Error: "Unknown database 'SOCIAL_MEDIA'"
```
**Solution:**
```bash
# Re-run schema.sql
mysql -u root -p < database/schema.sql
```

### Stored Procedure not found
```
Error: "PROCEDURE SOCIAL_MEDIA.ToggleLike does not exist"
```
**Solution:**
```bash
# Re-apply enhanced procedures
mysql -u root -p SOCIAL_MEDIA < database/enhanced_procedures.sql
```

### File Upload Issues
```
Error: "uploads directory not found"
```
**Solution:**
```bash
# Directory auto-creates, but ensure write permissions
mkdir -p uploads/posts uploads/stories
chmod 755 uploads
```

### Streamlit Port Already in Use
```
Error: "Port 8501 already in use"
```
**Solution:**
```bash
# Use different port
streamlit run streamlit_app.py --server.port 8502

# Or kill existing process
# Windows: taskkill /F /IM streamlit.exe
# Linux: pkill -f streamlit
```

### Event Scheduler Not Working
```
Stories not expiring after 24 hours
```
**Solution:**
```sql
-- Check if event scheduler is enabled
SHOW VARIABLES LIKE 'event_scheduler';

-- Enable if disabled
SET GLOBAL event_scheduler = ON;

-- Make it persistent (in my.cnf or my.ini)
[mysqld]
event_scheduler = ON
```

## 📚 Documentation Files

- **[ACCOUNT_DELETION.md](ACCOUNT_DELETION.md)** - Account deletion & story auto-deletion system
- **[PRIVACY_SETTINGS.md](PRIVACY_SETTINGS.md)** - Privacy settings & follow request system  
- **[JOIN_USAGE_ANALYSIS.md](JOIN_USAGE_ANALYSIS.md)** - Comprehensive analysis of 30+ JOINs

## 🔐 Security Features

### Password Security
- ✅ **bcrypt Hashing** - Industry-standard password hashing with salt
- ✅ **Password Verification** - Passwords never stored in plaintext
- ✅ **Account Deletion Verification** - Requires password to delete account

### Data Integrity
- ✅ **Foreign Key Constraints** - Referential integrity enforced
- ✅ **Unique Constraints** - Prevents duplicate likes and follow requests
- ✅ **Transactions** - Multi-step operations atomic

### Privacy
- ✅ **Public/Private Accounts** - Control who can follow
- ✅ **Follow Requests** - Private accounts require approval
- ✅ **Read Receipts** - Know when messages are read

## 🎓 Educational Value

This project demonstrates:
- ✅ **Database Design** - Normalized schema with proper relationships
- ✅ **Stored Procedures** - Encapsulating business logic in database
- ✅ **Triggers** - Automatic actions on data changes
- ✅ **Events** - Scheduled tasks (story expiration)
- ✅ **Transactions** - ACID compliance for complex operations
- ✅ **Query Optimization** - Using JOINs, indexes, aggregations
- ✅ **Password Security** - bcrypt hashing implementation
- ✅ **File Handling** - Upload storage and retrieval

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/NewFeature`)
3. Make changes and test thoroughly
4. Add/update stored procedures for new features
5. Update documentation
6. Submit pull request

## 📄 License

MIT License - Feel free to use for educational purposes

## 👨‍💻 Author

**Dhanush Rao K**
- GitHub: [@dhanush-rao-k](https://github.com/dhanush-rao-k)
- Repository: [Social_Media](https://github.com/dhanush-rao-k/Social_Media)

## 🙏 Acknowledgments

- Built as a DBMS (Database Management Systems) project
- Emphasizes database-centric architecture
- Demonstrates MySQL advanced features: stored procedures, triggers, events, functions
- Shows practical implementation of social media features
- Educational resource for database design patterns

---

**Last Updated:** November 2025  
**Version:** 2.0 (Streamlit + MySQL)  
**Status:** Production Ready ✅
