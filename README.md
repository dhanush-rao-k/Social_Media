# Social Media Platform - DBMS Project

A full-stack social media platform with a robust MySQL backend and a simple, responsive HTML/JavaScript frontend.

## 🌟 Features

### User Management
- User registration and login with password hashing
- User profiles with bio, avatar, and privacy settings
- Profile editing capabilities

### Social Features
- **Posts**: Create, view, and delete posts with media support
- **Likes**: Like/unlike posts
- **Comments**: Comment on posts
- **Follow System**: Follow/unfollow other users
- **Stories**: 24-hour temporary stories with view tracking
- **Messages**: Direct messaging with read receipts
- **Search**: Search for users by username or email

### Database Features
- Stored procedures for complex queries
- Triggers for automatic actions (message seen tracking, story expiration)
- Events for scheduled tasks (automatic story deletion)
- Proper foreign key relationships with cascading deletes
- Optimized queries with joins and aggregations

## 📁 Project Structure

```
Social_Media/
├── database/
│   └── schema.sql          # Complete database schema
├── public/
│   ├── css/
│   │   └── style.css       # Responsive styling
│   ├── js/
│   │   ├── auth.js         # Authentication logic
│   │   ├── feed.js         # Feed and posts
│   │   ├── profile.js      # Profile management
│   │   └── messages.js     # Messaging system
│   ├── login.html          # Login page
│   ├── register.html       # Registration page
│   ├── feed.html           # Main feed
│   ├── profile.html        # User profile
│   └── messages.html       # Messages page
├── server.js               # Express backend server
├── package.json            # Dependencies
├── .env.example            # Environment variables template
└── README.md              # This file
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn package manager

### Step 1: Clone/Download the Project
```bash
cd "d:\DBMS Proj\Social_Media"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup MySQL Database

1. Start your MySQL server

2. Create the database and tables:
```bash
mysql -u root -p < database/schema.sql
```

Or manually:
- Open MySQL Workbench or command line
- Copy and paste the contents of `database/schema.sql`
- Execute the script

3. Enable the event scheduler (for automatic story deletion):
```sql
SET GLOBAL event_scheduler = ON;
```

### Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and update your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=SOCIAL_MEDIA
PORT=3000
```

### Step 5: Run the Application

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Step 6: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 📊 Database Schema

### Main Tables
- **Users**: User accounts and profiles
- **Posts**: User posts with media
- **Comments**: Comments on posts
- **Likes**: Post likes
- **Followers**: User follow relationships
- **Friends**: Friend requests and connections
- **Messages**: Direct messages with read tracking
- **MessageSeen**: Detailed message read receipts
- **Stories**: 24-hour temporary stories
- **ViewedStories**: Story view tracking

### Stored Procedures
- `MarkMessageSeen(msgID)`: Mark a message as read
- `GetUserFeed(userId, limitCount)`: Get personalized feed
- `GetUnreadMessageCount(userId)`: Get unread message count

### Triggers
- `AfterMessageSeenUpdate`: Automatically log when messages are read
- `BeforeStoryInsert`: Set story expiration time to 24 hours

### Events
- `DeleteExpiredStories`: Runs hourly to remove expired stories

## 🎯 Usage Guide

### Registration
1. Go to the register page
2. Fill in username, email, password, and optional bio
3. Click "Sign Up"
4. You'll be redirected to login

### Login
1. Enter your email and password
2. Click "Login"
3. You'll be redirected to your feed

### Creating Posts
1. On the feed page, type your content in the text box
2. Optionally add a photo
3. Click "Post"

### Interacting with Posts
- **Like**: Click the ❤️ button
- **Comment**: Click the 💬 button, type your comment, and post

### Following Users
1. Search for users in the search bar
2. Click on their profile
3. Click "Follow"

### Messaging
1. Go to Messages
2. Click the ➕ button
3. Search for a user
4. Start chatting!

### Stories
1. On the feed page, click "Add Story"
2. Enter an image URL
3. Your story will be visible for 24 hours

## 🔧 API Endpoints

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update user profile
- `GET /api/search/users?q=query` - Search users

### Posts
- `POST /api/posts` - Create new post
- `GET /api/posts/feed/:userId` - Get user feed
- `GET /api/posts/:postId` - Get specific post
- `DELETE /api/posts/:postId` - Delete post

### Likes
- `POST /api/likes/toggle` - Toggle like on post
- `GET /api/likes/:postId` - Get post likes

### Comments
- `POST /api/comments` - Add comment
- `GET /api/comments/:postId` - Get post comments
- `DELETE /api/comments/:commentId` - Delete comment

### Followers
- `POST /api/followers/toggle` - Follow/unfollow user
- `GET /api/followers/:userId` - Get followers
- `GET /api/following/:userId` - Get following

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:userId1/:userId2` - Get conversation
- `PUT /api/messages/:messageId/seen` - Mark as read
- `GET /api/messages/unread/:userId` - Get unread count

### Stories
- `POST /api/stories` - Create story
- `GET /api/stories` - Get active stories
- `POST /api/stories/:storyId/view` - Mark story as viewed

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Database driver
- **bcrypt** - Password hashing
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (responsive design)
- **JavaScript (ES6+)** - Client-side logic
- **Fetch API** - HTTP requests

### Database
- **MySQL 8.0** - Relational database
- Stored procedures, triggers, and events

## 🔒 Security Features

- Password hashing with bcrypt (10 rounds)
- SQL injection prevention through parameterized queries
- CORS configuration for API security
- Input validation on both client and server side

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🐛 Troubleshooting

### Database Connection Failed
- Check if MySQL server is running
- Verify credentials in `.env` file
- Ensure `SOCIAL_MEDIA` database exists

### Port Already in Use
- Change the PORT in `.env` file
- Or stop the process using port 3000

### Stories Not Deleting Automatically
- Enable MySQL event scheduler:
```sql
SET GLOBAL event_scheduler = ON;
```

### Dependencies Installation Failed
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

## 📝 Future Enhancements

- Real-time messaging with WebSockets
- Image upload to cloud storage (AWS S3, Cloudinary)
- Video support for posts and stories
- Notification system
- Group chats
- Post sharing and reposting
- Hashtags and trending topics
- Advanced privacy settings
- Two-factor authentication
- Email verification
- Password reset functionality

## 👥 Contributors

This is a DBMS course project demonstrating:
- Database design and normalization
- Complex SQL queries and relationships
- Stored procedures and triggers
- Full-stack development
- RESTful API design

## 📄 License

This project is for educational purposes as part of a DBMS course.

## 📞 Support

For issues or questions about this project, please refer to your course instructor or teaching assistant.

---

**Happy Coding! 🚀**
