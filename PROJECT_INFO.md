# Social Media Platform - Python/Flask Version

##  Project Location
**Path:** d:\DBMS Proj\Social_Media_python

##  Architecture
This is the **Python/Flask + MySQL-heavy** version of the social media platform.

### Key Differences from Node.js Version
- **Frontend:** Python Flask with Jinja2 templates (instead of Node.js/Express)
- **Backend:** MySQL-centric with stored procedures, triggers, and functions
- **Business Logic:** Lives in the database (19 procedures, 3 functions, 5 triggers)
- **Application Layer:** Thin routing layer (~300 lines vs ~950 lines in Node.js)

##  Quick Start

### 1. Install Dependencies
```bash
cd "d:\DBMS Proj\Social_Media_python"
pip install -r requirements.txt
```

### 2. Setup Database
```bash
# Apply enhanced stored procedures
python setup_procedures.py
```

### 3. Run Application
```bash
python app.py
```

### 4. Access
Open browser: **http://localhost:5000**

##  Project Structure

```
Social_Media_python/
 app.py                      # Flask application (main entry point)
 setup_procedures.py         # Database setup script
 requirements.txt            # Python dependencies
 .env                        # Environment variables
 .env.example                # Environment template
 .gitignore                  # Git ignore rules (Python-specific)
 README.md                   # Full documentation
 QUICKSTART.md               # Quick start guide

 database/
    schema.sql              # Database schema + sample data
    enhanced_procedures.sql # 19 procedures, 3 functions, 5 triggers

 templates/                  # Jinja2 HTML templates
    login.html
    register.html
    feed.html
    profile.html
    messages.html

 static/                     # Static assets
    css/
        style.css

 uploads/                    # User-uploaded media
```

##  Features

All features powered by MySQL stored procedures:

### User Management
-  Register (auto-creates profile via RegisterUser procedure)
-  Login (via UserLogin procedure)
-  Profile management

### Social Features
-  Create/view/delete posts
-  Like/unlike (via ToggleLike procedure)
-  Comment on posts (via AddComment procedure)
-  Follow/unfollow (via ToggleFollow procedure)
-  Personalized feed (via GetUserFeed procedure)

### Messaging
-  Direct messages (via SendMessage procedure)
-  Conversations (via GetUserConversations procedure)
-  Read receipts (via trigger)

### Stories
-  24-hour stories (auto-expire via scheduled event)
-  View stories from followed users only

##  MySQL Backend

### Stored Procedures (19)
- UserLogin, RegisterUser
- CreatePost, DeletePost
- ToggleLike, AddComment, GetPostComments
- ToggleFollow, GetSuggestedUsers
- SendMessage, GetUserConversations, GetConversationMessages
- CreateStory, GetFollowedUsersStories, MarkStoryViewed
- SearchUsers, SearchPosts
- GetUserProfile, GetUserPosts, UpdateProfile
- GetUserFeed

### Database Functions (3)
- GetCommentCount(post_id)
- GetLikeCount(post_id)
- IsFollowing(follower_id, following_id)

### Triggers (5)
- BeforeStoryInsert - Auto-set expiration
- AfterMessageSeenUpdate - Handle read receipts
- AfterCommentInsert - Notifications
- BeforePostDelete - Cascade deletes
- BeforeUserDelete - Complete cleanup

### Scheduled Events (1)
- DeleteExpiredStories - Runs every hour

##  Sample Users

Login with (password: password123):
- johndoe
- janesmith
- bobwilson
- alicejones
- charliedavis
- evamartinez

##  Configuration

Environment variables in .env:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=SOCIAL_MEDIA
SECRET_KEY=your-secret-key-here
```

##  Documentation

- **README.md** - Complete documentation with architecture details
- **QUICKSTART.md** - Quick start guide with testing instructions
- **database/enhanced_procedures.sql** - All stored procedures source code

##  Learning Value

This project demonstrates:
1.  MySQL-centric architecture
2.  Stored procedures for business logic
3.  Triggers for automatic actions
4.  Database functions for calculations
5.  Scheduled events for maintenance
6.  Transaction management
7.  Python Flask web development
8.  Jinja2 templating
9.  Session management
10.  RESTful API design

##  Related Project

The original **Node.js/Express** version is in:
**Path:** d:\DBMS Proj\Social_Media

##  Notes

- This is the **database-heavy** version emphasizing MySQL capabilities
- Perfect for DBMS course projects
- Business logic in database = better for demonstrating SQL skills
- Flask is intentionally minimal (just routing)
- All validation and rules handled by MySQL

---

**Created:** November 14, 2025  
**Technology:** Python Flask + MySQL  
**Purpose:** DBMS Course Project
