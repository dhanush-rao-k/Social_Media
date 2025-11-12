const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    console.log('🚀 Starting database setup...\n');
    
    try {
        // Connect to MySQL server
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        
        console.log('✅ Connected to MySQL server');
        
        // Drop and create database
        console.log('🗑️  Dropping existing database if present...');
        await connection.query('DROP DATABASE IF EXISTS SOCIAL_MEDIA');
        await connection.query('CREATE DATABASE SOCIAL_MEDIA');
        await connection.query('USE SOCIAL_MEDIA');
        console.log('✅ Database created');
        
        // Create Users table
        await connection.query(`
            CREATE TABLE Users (
                UserID INT PRIMARY KEY AUTO_INCREMENT,
                Username VARCHAR(50) UNIQUE NOT NULL,
                Email VARCHAR(100) UNIQUE NOT NULL,
                Password VARCHAR(255) NOT NULL,
                Bio TEXT,
                Avatar VARCHAR(255),
                PrivacySettings VARCHAR(50) DEFAULT 'public',
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table created');
        
        // Create Posts table
        await connection.query(`
            CREATE TABLE Posts (
                PostID INT PRIMARY KEY AUTO_INCREMENT,
                UserID INT,
                Content TEXT,
                Media VARCHAR(255),
                Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
            )
        `);
        console.log('✅ Posts table created');
        
        // Create Comments table
        await connection.query(`
            CREATE TABLE Comments (
                CommentID INT PRIMARY KEY AUTO_INCREMENT,
                PostID INT,
                UserID INT,
                Content TEXT,
                Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE,
                FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
            )
        `);
        console.log('✅ Comments table created');
        
        // Create Likes table
        await connection.query(`
            CREATE TABLE Likes (
                LikeID INT PRIMARY KEY AUTO_INCREMENT,
                PostID INT,
                UserID INT,
                Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE,
                FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
                UNIQUE KEY unique_like (PostID, UserID)
            )
        `);
        console.log('✅ Likes table created');
        
        // Create Friends table
        await connection.query(`
            CREATE TABLE Friends (
                FriendshipID INT PRIMARY KEY AUTO_INCREMENT,
                UserID1 INT,
                UserID2 INT,
                Status ENUM('pending', 'accepted') DEFAULT 'pending',
                Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (UserID1) REFERENCES Users(UserID) ON DELETE CASCADE,
                FOREIGN KEY (UserID2) REFERENCES Users(UserID) ON DELETE CASCADE
            )
        `);
        console.log('✅ Friends table created');
        
        // Create Stories table
        await connection.query(`
            CREATE TABLE Stories (
                StoryID INT PRIMARY KEY AUTO_INCREMENT,
                UserID INT,
                MediaURL VARCHAR(255),
                MediaType ENUM('image','video'),
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ExpiresAt TIMESTAMP,
                FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
            )
        `);
        console.log('✅ Stories table created');
        
        // Create ViewedStories table
        await connection.query(`
            CREATE TABLE ViewedStories (
                ViewedID INT PRIMARY KEY AUTO_INCREMENT,
                StoryID INT,
                ViewerUserID INT,
                ViewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (StoryID) REFERENCES Stories(StoryID) ON DELETE CASCADE,
                FOREIGN KEY (ViewerUserID) REFERENCES Users(UserID) ON DELETE CASCADE
            )
        `);
        console.log('✅ ViewedStories table created');
        
        // Create Messages table
        await connection.query(`
            CREATE TABLE Messages (
                MessageID INT PRIMARY KEY AUTO_INCREMENT,
                SenderID INT,
                ReceiverID INT,
                Content TEXT,
                Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                SeenStatus BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (SenderID) REFERENCES Users(UserID) ON DELETE CASCADE,
                FOREIGN KEY (ReceiverID) REFERENCES Users(UserID) ON DELETE CASCADE
            )
        `);
        console.log('✅ Messages table created');
        
        // Create MessageSeen table
        await connection.query(`
            CREATE TABLE MessageSeen (
                MessageSeenID INT PRIMARY KEY AUTO_INCREMENT,
                MessageID INT,
                UserID INT,
                SeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (MessageID) REFERENCES Messages(MessageID) ON DELETE CASCADE,
                FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
            )
        `);
        console.log('✅ MessageSeen table created');
        
        // Create Followers table
        await connection.query(`
            CREATE TABLE Followers (
                FollowerID INT PRIMARY KEY AUTO_INCREMENT,
                FollowerUserID INT,
                FollowingUserID INT,
                FollowedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (FollowerUserID) REFERENCES Users(UserID) ON DELETE CASCADE,
                FOREIGN KEY (FollowingUserID) REFERENCES Users(UserID) ON DELETE CASCADE,
                UNIQUE KEY unique_follow (FollowerUserID, FollowingUserID)
            )
        `);
        console.log('✅ Followers table created');
        
        // Create stored procedures
        await connection.query(`
            CREATE PROCEDURE MarkMessageSeen(IN msgID INT)
            BEGIN
                UPDATE Messages SET SeenStatus = TRUE WHERE MessageID = msgID;
            END
        `);
        
        await connection.query(`
            CREATE PROCEDURE GetUserFeed(IN userId INT, IN limitCount INT)
            BEGIN
                SELECT p.PostID, p.UserID, p.Content, p.Media, p.Timestamp,
                       u.Username, u.Avatar,
                       COUNT(DISTINCT l.LikeID) as LikeCount,
                       COUNT(DISTINCT c.CommentID) as CommentCount
                FROM Posts p
                JOIN Users u ON p.UserID = u.UserID
                LEFT JOIN Likes l ON p.PostID = l.PostID
                LEFT JOIN Comments c ON p.PostID = c.PostID
                WHERE p.UserID IN (
                    SELECT FollowingUserID FROM Followers WHERE FollowerUserID = userId
                    UNION
                    SELECT userId
                )
                GROUP BY p.PostID, p.UserID, p.Content, p.Media, p.Timestamp, u.Username, u.Avatar
                ORDER BY p.Timestamp DESC
                LIMIT limitCount;
            END
        `);
        
        await connection.query(`
            CREATE PROCEDURE GetUnreadMessageCount(IN userId INT)
            BEGIN
                SELECT COUNT(*) as UnreadCount 
                FROM Messages 
                WHERE ReceiverID = userId AND SeenStatus = FALSE;
            END
        `);
        console.log('✅ Stored procedures created');
        
        // Create triggers
        await connection.query(`
            CREATE TRIGGER AfterMessageSeenUpdate
            AFTER UPDATE ON Messages
            FOR EACH ROW
            BEGIN
                IF NEW.SeenStatus = TRUE AND OLD.SeenStatus = FALSE THEN
                    INSERT INTO MessageSeen (MessageID, UserID, SeenAt) 
                    VALUES (NEW.MessageID, NEW.ReceiverID, NOW());
                END IF;
            END
        `);
        
        await connection.query(`
            CREATE TRIGGER BeforeStoryInsert
            BEFORE INSERT ON Stories
            FOR EACH ROW
            BEGIN
                IF NEW.ExpiresAt IS NULL THEN
                    SET NEW.ExpiresAt = DATE_ADD(NOW(), INTERVAL 24 HOUR);
                END IF;
            END
        `);
        console.log('✅ Triggers created');
        
        // Create event
        await connection.query(`
            CREATE EVENT IF NOT EXISTS DeleteExpiredStories
            ON SCHEDULE EVERY 1 HOUR
            DO
            DELETE FROM Stories WHERE ExpiresAt <= NOW()
        `);
        console.log('✅ Events created');
        
        // Insert sample users with hashed password (password123)
        const hash = '$2b$10$qWh86.NgYIuV51/IcykytO/HLY3cg/OgIS1N6PCRrd323yN6LE6GO';
        
        await connection.query(`
            INSERT INTO Users (Username, Email, Password, Bio, Avatar, PrivacySettings) VALUES
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?)
        `, [
            'john_doe', 'john@example.com', hash, 'Software developer | Coffee enthusiast ☕ | Love to code and travel 🌍', 'https://i.pravatar.cc/150?img=12', 'public',
            'jane_smith', 'jane@example.com', hash, 'Creative designer 🎨 | UI/UX Expert | Making the web beautiful', 'https://i.pravatar.cc/150?img=5', 'public',
            'bob_wilson', 'bob@example.com', hash, 'Tech enthusiast 💻 | Gadget reviewer | Gaming addict 🎮', 'https://i.pravatar.cc/150?img=15', 'public',
            'alice_wonder', 'alice@example.com', hash, 'Foodie 🍕 | Travel blogger | Living my best life ✨', 'https://i.pravatar.cc/150?img=9', 'public',
            'mike_ross', 'mike@example.com', hash, 'Fitness trainer 💪 | Nutrition expert | Helping you achieve your goals', 'https://i.pravatar.cc/150?img=33', 'public',
            'sarah_connor', 'sarah@example.com', hash, 'Photographer 📸 | Nature lover 🌿 | Capturing moments', 'https://i.pravatar.cc/150?img=20', 'public'
        ]);
        console.log('✅ Sample users inserted (6 users)');
        
        // Insert sample posts
        await connection.query(`
            INSERT INTO Posts (UserID, Content, Media) VALUES
            (1, 'Just finished building an amazing social media platform! Check it out! 🚀', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'),
            (2, 'New design trends for 2024! What do you think about glassmorphism? 🎨', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800'),
            (3, 'Unboxing the latest gaming console! This is incredible! 🎮', 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=800'),
            (4, 'Had the most amazing pasta today in Rome! Life is good! 🍝', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800'),
            (5, 'Morning workout complete! Remember, consistency is key 💪', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800'),
            (6, 'Caught this beautiful sunset in the mountains 🌄', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'),
            (1, 'Coffee and code - the perfect combination ☕💻', NULL),
            (2, 'Just launched my portfolio website! Link in bio', NULL),
            (3, 'Who else is excited for the new game releases this month?', NULL),
            (4, 'Trying out new recipes tonight! Any suggestions? 🍳', NULL)
        `);
        console.log('✅ Sample posts inserted (10 posts)');
        
        // Insert sample comments
        await connection.query(`
            INSERT INTO Comments (PostID, UserID, Content) VALUES
            (1, 2, 'This looks amazing! Great work! 👏'),
            (1, 3, 'How long did it take to build?'),
            (1, 4, 'I want to try this! 😍'),
            (2, 1, 'Glassmorphism is definitely trending!'),
            (2, 5, 'Love this design approach!'),
            (3, 1, 'How is it so far? Worth the price?'),
            (3, 4, 'I want one too! 🎮'),
            (4, 2, 'That looks delicious! 😋'),
            (5, 6, 'Great job! Keep it up! 💪'),
            (6, 1, 'Stunning photo! 📸')
        `);
        console.log('✅ Sample comments inserted (10 comments)');
        
        // Insert sample likes
        await connection.query(`
            INSERT INTO Likes (PostID, UserID) VALUES
            (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
            (2, 1), (2, 3), (2, 4),
            (3, 1), (3, 2), (3, 4), (3, 5),
            (4, 1), (4, 2), (4, 3), (4, 6),
            (5, 1), (5, 2), (5, 3), (5, 4),
            (6, 1), (6, 2), (6, 3), (6, 4), (6, 5),
            (7, 2), (7, 3),
            (8, 1), (8, 4),
            (9, 2), (9, 5),
            (10, 3), (10, 6)
        `);
        console.log('✅ Sample likes inserted (32 likes)');
        
        // Insert sample followers
        await connection.query(`
            INSERT INTO Followers (FollowerUserID, FollowingUserID) VALUES
            (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
            (2, 1), (2, 3), (2, 4),
            (3, 1), (3, 2), (3, 5),
            (4, 1), (4, 2), (4, 3), (4, 5), (4, 6),
            (5, 1), (5, 3), (5, 6),
            (6, 2), (6, 4), (6, 5)
        `);
        console.log('✅ Sample followers inserted (22 relationships)');
        
        // Insert sample messages
        await connection.query(`
            INSERT INTO Messages (SenderID, ReceiverID, Content, SeenStatus) VALUES
            (1, 2, 'Hey Jane! Love your latest design work!', TRUE),
            (2, 1, 'Thanks John! Means a lot coming from you 😊', TRUE),
            (1, 2, 'Would love to collaborate on a project sometime!', FALSE),
            (3, 1, 'Dude, that social media platform is sick!', TRUE),
            (1, 3, 'Thanks Bob! Let me know if you have any feedback', TRUE)
        `);
        console.log('✅ Sample messages inserted (5 messages)');
        
        // Insert sample stories
        await connection.query(`
            INSERT INTO Stories (UserID, MediaURL, MediaType, CreatedAt, ExpiresAt) VALUES
            (1, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
            (2, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
            (3, 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
            (4, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
            (5, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
            (6, 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
            (1, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
            (2, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))
        `);
        console.log('✅ Sample stories inserted (8 active stories)');
        
        // Close connection
        await connection.end();
        
        console.log('\n🎉 Database setup complete!\n');
        console.log('📊 Database Summary:');
        console.log('   • 6 Users');
        console.log('   • 10 Posts');
        console.log('   • 10 Comments');
        console.log('   • 32 Likes');
        console.log('   • 22 Follow relationships');
        console.log('   • 5 Messages');
        console.log('   • 8 Active stories');
        console.log('📝 Sample Login Credentials:');
        console.log('   Email: john@example.com');
        console.log('   Password: password123\n');
        console.log('   (All sample users have the same password)\n');
        console.log('💡 Start the server: npm start\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

setupDatabase();
