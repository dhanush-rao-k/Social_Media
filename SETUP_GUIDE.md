# Quick Start Guide - Social Media Platform

## 📝 Sample Users & Login Credentials

All sample users have been created with the following login credentials:

**Password for ALL users:** `password123`

### Available Test Accounts:

1. **John Doe**
   - Email: `john@example.com`
   - Password: `password123`
   - Bio: Software developer | Coffee enthusiast ☕

2. **Jane Smith**
   - Email: `jane@example.com`
   - Password: `password123`
   - Bio: Creative designer 🎨 | UI/UX Expert

3. **Bob Wilson**
   - Email: `bob@example.com`
   - Password: `password123`
   - Bio: Tech enthusiast 💻 | Gadget reviewer

4. **Alice Wonder**
   - Email: `alice@example.com`
   - Password: `password123`
   - Bio: Foodie 🍕 | Travel blogger

5. **Mike Ross**
   - Email: `mike@example.com`
   - Password: `password123`
   - Bio: Fitness trainer 💪 | Nutrition expert

6. **Sarah Connor**
   - Email: `sarah@example.com`
   - Password: `password123`
   - Bio: Photographer 📸 | Nature lover 🌿

## 🚀 Setup Steps

### 1. Install Node.js Dependencies
```powershell
npm install
```

### 2. Configure Database
Edit your `.env` file with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=SOCIAL_MEDIA
PORT=3000
```

### 3. Create Database with Sample Data
Run this command in PowerShell (you'll be prompted for MySQL password):
```powershell
Get-Content database\schema.sql | mysql -u root -p
```

Or manually in MySQL Workbench:
- Open `database/schema.sql`
- Execute the entire script

### 4. Enable MySQL Event Scheduler (Important!)
Open MySQL and run:
```sql
SET GLOBAL event_scheduler = ON;
```
This enables automatic deletion of expired stories.

### 5. Start the Server
```powershell
npm start
```

### 6. Open Your Browser
Navigate to:
```
http://localhost:3000
```

## 🧪 Testing the Application

### Test Login:
1. Go to `http://localhost:3000`
2. Use any of the sample accounts above
3. Example: Email: `john@example.com`, Password: `password123`
4. You'll be redirected to the feed with existing posts

### Test Registration:
1. Click "Sign up" on login page
2. Create a new account with:
   - Username: `your_username`
   - Email: `your_email@example.com`
   - Password: `your_password`
   - Bio: (optional)
3. You'll be redirected to login
4. Login with your new credentials

### What You'll See After Login:
- ✅ 10 sample posts from different users
- ✅ Comments on various posts
- ✅ Like counts
- ✅ Active stories (24-hour expiration)
- ✅ User suggestions to follow
- ✅ Message conversations

## 🔍 Sample Data Included

The database is pre-populated with:
- **6 Users** with complete profiles
- **10 Posts** with images
- **10 Comments** on various posts
- **32 Likes** distributed across posts
- **26 Follow Relationships** between users
- **9 Messages** between users
- **5 Active Stories** (24-hour duration)
- **15 Story Views**
- **6 Friend Connections**

## 🎯 Features to Test

### ✅ User Authentication
- [x] Register new users (passwords are hashed with bcrypt)
- [x] Login with email and password
- [x] Password validation
- [x] Session management with localStorage

### ✅ Posts
- [x] View feed with posts from followed users
- [x] Create new posts with text
- [x] Create posts with images
- [x] Like/unlike posts
- [x] View like counts

### ✅ Comments
- [x] View comments on posts
- [x] Add new comments
- [x] View comment counts

### ✅ User Profiles
- [x] View user profiles
- [x] See user stats (posts, followers, following)
- [x] Edit your own profile
- [x] Update bio, avatar, privacy settings

### ✅ Follow System
- [x] Follow other users
- [x] Unfollow users
- [x] View followers list
- [x] View following list
- [x] Follow/unfollow from suggestions

### ✅ Messages
- [x] Start new conversations
- [x] Send messages
- [x] View message history
- [x] Message read status
- [x] Unread message count badge

### ✅ Stories
- [x] View active stories
- [x] Create new stories
- [x] 24-hour auto-expiration
- [x] Story view tracking

### ✅ Search
- [x] Search for users by username
- [x] Search results with instant feedback

## 🔐 Security Features Implemented

1. **Password Hashing**: All passwords are hashed using bcrypt with 10 salt rounds
2. **SQL Injection Prevention**: All queries use parameterized statements
3. **Input Validation**: Client and server-side validation
4. **Secure Sessions**: User data stored in localStorage (in production, use JWT tokens)
5. **CORS Protection**: CORS middleware configured
6. **Unique Constraints**: Prevent duplicate usernames/emails

## 📊 Database Features Demonstrated

### Stored Procedures:
- `MarkMessageSeen(msgID)` - Marks message as read
- `GetUserFeed(userId, limitCount)` - Gets personalized feed
- `GetUnreadMessageCount(userId)` - Gets unread message count

### Triggers:
- `AfterMessageSeenUpdate` - Logs message read events
- `BeforeStoryInsert` - Sets story expiration time

### Events:
- `DeleteExpiredStories` - Runs every hour to delete old stories

### Relationships:
- Foreign Keys with CASCADE DELETE
- Many-to-Many relationships (Followers, Likes)
- One-to-Many relationships (Posts, Comments)

## 🐛 Troubleshooting

### Can't login with sample accounts?
- Make sure you ran the complete `schema.sql` file
- Verify the database has sample data: `SELECT * FROM Users;`
- Check that bcrypt is installed: `npm install bcrypt`

### "Database connection failed"?
- Verify MySQL is running
- Check your `.env` file has correct credentials
- Make sure `SOCIAL_MEDIA` database exists

### New registrations not working?
- Check server console for errors
- Verify bcrypt is working: `node generate-hash.js`
- Ensure unique username/email

### Posts not showing in feed?
- Follow other users first
- Or create your own posts
- Check `GetUserFeed` stored procedure exists

## 📈 Next Steps

After testing the sample data, try:

1. **Create Your Own Account**
   - Register with your own credentials
   - Build your profile

2. **Follow Users**
   - Follow the sample users to see their posts
   - Unfollow and see how the feed changes

3. **Create Content**
   - Make posts
   - Upload images (use image URLs)
   - Comment on others' posts

4. **Interact Socially**
   - Send messages
   - Create stories
   - Like and comment

5. **Test Database Features**
   - Check triggers by reading messages
   - Wait to see story expiration
   - View stored procedure results

## 💡 Tips for Your Project Presentation

1. **Show the Database Schema**
   - Explain table relationships
   - Demonstrate foreign keys
   - Show stored procedures and triggers

2. **Demonstrate Functionality**
   - Live demo of login/signup
   - Show CRUD operations
   - Demonstrate triggers in action

3. **Explain Security**
   - Password hashing demonstration
   - SQL injection prevention
   - Data validation

4. **Highlight Complex Queries**
   - Feed generation with joins
   - Aggregation functions (COUNT)
   - Subqueries in stored procedures

---

**Ready to go!** 🎉 You now have a fully functional social media platform with sample data!
