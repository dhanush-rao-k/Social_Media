# Social Media Platform - Python/Flask + MySQL

A social media platform built with Python Flask frontend and MySQL-heavy backend where most business logic resides in database stored procedures, triggers, and functions.

## Technology Stack

### Frontend
- **Python Flask 3.1.2** - Web framework
- **Jinja2** - Template engine
- **Vanilla JavaScript** - Client-side interactivity

### Backend
- **MySQL 8.0** - Database with heavy business logic
- **mysql-connector-python 8.2.0** - Database connector
- **bcrypt 5.0.0** - Password hashing
- **python-dotenv 1.2.1** - Environment variables

## Architecture

This project emphasizes **database-centric architecture** where:
- ✅ Business logic is implemented in MySQL stored procedures
- ✅ Data integrity is maintained through triggers
- ✅ Complex queries are handled by database functions
- ✅ Transactions ensure data consistency
- ✅ Flask acts as a thin routing layer

## Database Features

### Stored Procedures (19 procedures)
- `UserLogin` - Authentication with password verification
- `RegisterUser` - User registration with automatic profile creation
- `CreatePost`, `DeletePost` - Post management with cascading deletes
- `ToggleLike`, `AddComment`, `GetPostComments` - Social interactions
- `ToggleFollow`, `GetSuggestedUsers` - Follow system
- `SendMessage`, `GetUserConversations`, `GetConversationMessages` - Messaging
- `CreateStory`, `GetFollowedUsersStories`, `MarkStoryViewed` - Stories feature
- `SearchUsers`, `SearchPosts` - Search functionality
- `GetUserProfile`, `GetUserPosts`, `UpdateProfile` - Profile management
- `GetUserFeed` - Personalized feed generation

### Database Functions (3 functions)
- `GetCommentCount(post_id)` - Returns comment count
- `GetLikeCount(post_id)` - Returns like count
- `IsFollowing(follower_id, following_id)` - Checks follow status

### Triggers (5 triggers)
- `BeforeStoryInsert` - Auto-set story expiration time
- `AfterMessageSeenUpdate` - Handle message seen status
- `AfterCommentInsert` - Post-comment notifications
- `BeforePostDelete` - Cascade delete likes & comments
- `BeforeUserDelete` - Cascade delete all user data

### Scheduled Events
- `DeleteExpiredStories` - Automatically remove stories after 24 hours

## Database Schema

### Tables (10 tables)
1. **Users** - User accounts with authentication
2. **Profile** - User profiles with bio and picture
3. **Posts** - User posts with media support
4. **Comments** - Post comments
5. **Likes** - Post likes
6. **Followers** - Follow relationships
7. **Friends** - Friend relationships
8. **Messages** - Direct messaging
9. **MessageSeen** - Message read receipts
10. **Stories** - 24-hour stories with auto-expiration
11. **ViewedStories** - Story view tracking

## Installation

### Prerequisites
- Python 3.8+
- MySQL 8.0+
- pip (Python package manager)

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/dhanush-rao-k/Social_Media.git
cd Social_Media
```

2. **Create virtual environment** (recommended)
```bash
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Setup MySQL database**
```bash
# Create database
mysql -u root -p < database/schema.sql

# Apply enhanced stored procedures
mysql -u root -p SOCIAL_MEDIA < database/enhanced_procedures.sql
```

5. **Configure environment**
```bash
# Create .env file
cp .env.example .env

# Edit .env with your database credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=SOCIAL_MEDIA
SECRET_KEY=your-secret-key-here
```

6. **Run the application**
```bash
python app.py
```

7. **Access the application**
```
Open browser: http://localhost:5000
```

## Features

### User Management
- ✅ User registration with automatic profile creation (via stored procedure)
- ✅ Secure login with bcrypt password hashing
- ✅ User profiles with bio and profile pictures
- ✅ Profile editing

### Social Features
- ✅ Create, view, and delete posts
- ✅ Like/unlike posts (toggle via stored procedure)
- ✅ Comment on posts (with real-time count updates)
- ✅ Follow/unfollow users (toggle via stored procedure)
- ✅ Personalized feed showing posts from followed users
- ✅ User suggestions (people you don't follow yet)

### Messaging
- ✅ Direct messaging between users
- ✅ Conversation list with last message preview
- ✅ Unread message count (via stored procedure)
- ✅ Message read receipts (via trigger)

### Stories
- ✅ Upload 24-hour stories (images/videos)
- ✅ View stories from followed users only
- ✅ Auto-deletion after 24 hours (via scheduled event)
- ✅ Story view tracking

### Search
- ✅ Search users by username, email, or bio
- ✅ Search posts by content

## Sample Users

The database includes 6 sample users (all password: `password123`):
- johndoe
- janesmith
- bobwilson
- alicejones
- charliedavis
- evamartinez

## API Endpoints

All endpoints call MySQL stored procedures for business logic:

### Authentication
- `POST /login` → Calls `UserLogin` procedure
- `POST /register` → Calls `RegisterUser` procedure
- `GET /logout` → Session management

### Posts
- `GET /api/posts/feed/:user_id` → Calls `GetUserFeed` procedure
- `POST /api/posts/create` → Calls `CreatePost` procedure
- `POST /api/posts/:post_id/like` → Calls `ToggleLike` procedure
- `GET /api/posts/:post_id/comments` → Calls `GetPostComments` procedure
- `POST /api/posts/:post_id/comments` → Calls `AddComment` procedure

### Users
- `POST /api/users/:user_id/follow` → Calls `ToggleFollow` procedure
- `GET /api/search/users?q=query` → Calls `SearchUsers` procedure

### Messages
- `POST /api/messages/send` → Calls `SendMessage` procedure
- `GET /api/messages/conversations/:user_id` → Calls `GetUserConversations` procedure

### Stories
- `POST /api/stories/upload` → Calls `CreateStory` procedure

## Project Structure

```
Social_Media/
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── .env                            # Environment variables (not in git)
├── .gitignore                      # Git ignore rules
│
├── database/
│   ├── schema.sql                  # Database schema with sample data
│   └── enhanced_procedures.sql     # All stored procedures, functions, triggers
│
├── templates/                      # Jinja2 templates
│   ├── login.html
│   ├── register.html
│   ├── feed.html
│   ├── profile.html
│   └── messages.html
│
├── static/                         # Static assets
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── (client-side JavaScript)
│
└── uploads/                        # User-uploaded media
```

## Key Differences from Node.js Version

### Previous (Node.js) Architecture
- Business logic in Express route handlers
- Application-level validation
- ~950 lines of JavaScript logic in server.js
- MySQL used primarily for data storage

### Current (Python/Flask) Architecture
- Business logic in MySQL stored procedures
- Database-level validation and constraints
- ~300 lines of Python (thin routing layer)
- MySQL handles all business rules, calculations, and data integrity

### Benefits of MySQL-Heavy Approach
1. ✅ **Better for DBMS Projects** - Demonstrates deep database knowledge
2. ✅ **Centralized Business Logic** - All rules in one place (database)
3. ✅ **Improved Data Integrity** - Triggers ensure consistency
4. ✅ **Better Performance** - Less network round-trips
5. ✅ **Easier Testing** - Test procedures directly in MySQL
6. ✅ **Language Agnostic** - Can switch frontend framework easily

## Development Notes

### Adding New Features
1. Create stored procedure in `database/enhanced_procedures.sql`
2. Apply to database: `mysql -u root -p SOCIAL_MEDIA < database/enhanced_procedures.sql`
3. Add Flask route in `app.py` that calls the procedure
4. Create/update template in `templates/`

### Database-First Development
- Always implement logic as stored procedures first
- Use triggers for automatic actions
- Use functions for reusable calculations
- Keep Flask routes minimal (just call procedures)

## Troubleshooting

### Database Connection Issues
```bash
# Check MySQL is running
mysql --version

# Test connection
mysql -u root -p
```

### Stored Procedure Errors
```sql
-- Check if procedures exist
SHOW PROCEDURE STATUS WHERE Db = 'SOCIAL_MEDIA';

-- View procedure definition
SHOW CREATE PROCEDURE ProcedureName;
```

### Python Environment Issues
```bash
# Verify Python version
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Add/modify stored procedures for new features
4. Test thoroughly
5. Submit pull request

## License

MIT License - Feel free to use for educational purposes

## Author

Dhanush Rao K
- GitHub: [@dhanush-rao-k](https://github.com/dhanush-rao-k)
- Repository: [Social_Media](https://github.com/dhanush-rao-k/Social_Media)

## Acknowledgments

- Built as a DBMS project emphasizing database concepts
- Demonstrates MySQL stored procedures, triggers, functions, and events
- Shows transition from application-layer to database-layer architecture
