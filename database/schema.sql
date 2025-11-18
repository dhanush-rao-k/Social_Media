-- Social Media Database Schema
CREATE DATABASE IF NOT EXISTS SOCIAL_MEDIA;
USE SOCIAL_MEDIA;

-- Users Table
CREATE TABLE Users (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL, -- store hashed password with bcrypt
    Bio TEXT,
    Avatar VARCHAR(255),
    PrivacySettings VARCHAR(50) DEFAULT 'public',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts Table
CREATE TABLE Posts (
    PostID INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT,
    Content TEXT,
    Media VARCHAR(255),
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Comments Table
CREATE TABLE Comments (
    CommentID INT PRIMARY KEY AUTO_INCREMENT,
    PostID INT,
    UserID INT,
    Content TEXT,
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Likes Table
CREATE TABLE Likes (
    LikeID INT PRIMARY KEY AUTO_INCREMENT,
    PostID INT,
    UserID INT,
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE KEY unique_like (PostID, UserID)
);

-- Friends Table
CREATE TABLE Friends (
    FriendshipID INT PRIMARY KEY AUTO_INCREMENT,
    UserID1 INT,
    UserID2 INT,
    Status ENUM('pending', 'accepted') DEFAULT 'pending',
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID1) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (UserID2) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Stories Table
CREATE TABLE Stories (
    StoryID INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT,
    MediaURL VARCHAR(255),
    MediaType ENUM('image','video'),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- ViewedStories Table
CREATE TABLE ViewedStories (
    ViewedID INT PRIMARY KEY AUTO_INCREMENT,
    StoryID INT,
    ViewerUserID INT,
    ViewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StoryID) REFERENCES Stories(StoryID) ON DELETE CASCADE,
    FOREIGN KEY (ViewerUserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Messages Table with SeenStatus
CREATE TABLE Messages (
    MessageID INT PRIMARY KEY AUTO_INCREMENT,
    SenderID INT,
    ReceiverID INT,
    Content TEXT,
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    SeenStatus BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (SenderID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ReceiverID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- MessageSeen Table for detailed seen tracking
CREATE TABLE MessageSeen (
    MessageSeenID INT PRIMARY KEY AUTO_INCREMENT,
    MessageID INT,
    UserID INT,
    SeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MessageID) REFERENCES Messages(MessageID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Followers Table
CREATE TABLE Followers (
    FollowerID INT PRIMARY KEY AUTO_INCREMENT,
    FollowerUserID INT,
    FollowingUserID INT,
    FollowedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FollowerUserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (FollowingUserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (FollowerUserID, FollowingUserID)
);

-- Follow Requests Table (for private accounts)
CREATE TABLE FollowRequests (
    RequestID INT PRIMARY KEY AUTO_INCREMENT,
    RequesterUserID INT,
    TargetUserID INT,
    Status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    RequestedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    RespondedAt TIMESTAMP NULL,
    FOREIGN KEY (RequesterUserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (TargetUserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE KEY unique_request (RequesterUserID, TargetUserID)
);

-- Stored Procedures
DELIMITER //

-- Procedure to mark message as seen
CREATE PROCEDURE MarkMessageSeen(IN msgID INT)
BEGIN
    UPDATE Messages SET SeenStatus = TRUE WHERE MessageID = msgID;
END //

-- Procedure to get user feed
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
END //

-- Procedure to get unread message count
CREATE PROCEDURE GetUnreadMessageCount(IN userId INT)
BEGIN
    SELECT COUNT(*) as UnreadCount 
    FROM Messages 
    WHERE ReceiverID = userId AND SeenStatus = FALSE;
END //

DELIMITER ;

-- Triggers
DELIMITER //

-- Trigger to insert to MessageSeen table on message seen update
CREATE TRIGGER AfterMessageSeenUpdate
AFTER UPDATE ON Messages
FOR EACH ROW
BEGIN
    IF NEW.SeenStatus = TRUE AND OLD.SeenStatus = FALSE THEN
        INSERT INTO MessageSeen (MessageID, UserID, SeenAt) 
        VALUES (NEW.MessageID, NEW.ReceiverID, NOW());
    END IF;
END //

-- Trigger to set story expiration time (24 hours)
CREATE TRIGGER BeforeStoryInsert
BEFORE INSERT ON Stories
FOR EACH ROW
BEGIN
    IF NEW.ExpiresAt IS NULL THEN
        SET NEW.ExpiresAt = DATE_ADD(NOW(), INTERVAL 24 HOUR);
    END IF;
END //

DELIMITER ;

-- Event to delete expired stories (run every hour)
-- Note: You need to enable event scheduler: SET GLOBAL event_scheduler = ON;
DELIMITER //

CREATE EVENT IF NOT EXISTS DeleteExpiredStories
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    DELETE FROM Stories WHERE ExpiresAt <= NOW();
END //

DELIMITER ;

-- Enable event scheduler for auto-deletion of expired stories
SET GLOBAL event_scheduler = ON;

-- Procedure to permanently delete user account with cascading deletes
DELIMITER //

CREATE PROCEDURE DeleteUserAccount(IN p_user_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error deleting account';
    END;
    
    START TRANSACTION;
    
    -- Delete from FollowRequests where user is requester or target
    DELETE FROM FollowRequests WHERE RequesterUserID = p_user_id OR TargetUserID = p_user_id;
    
    -- Delete from ViewedStories
    DELETE FROM ViewedStories WHERE StoryID IN (SELECT StoryID FROM Stories WHERE UserID = p_user_id) 
                                 OR ViewerUserID = p_user_id;
    
    -- Delete user's stories
    DELETE FROM Stories WHERE UserID = p_user_id;
    
    -- Delete from MessageSeen
    DELETE FROM MessageSeen WHERE MessageID IN (
        SELECT MessageID FROM Messages WHERE SenderID = p_user_id OR ReceiverID = p_user_id
    );
    
    -- Delete user's messages
    DELETE FROM Messages WHERE SenderID = p_user_id OR ReceiverID = p_user_id;
    
    -- Delete user's comments
    DELETE FROM Comments WHERE UserID = p_user_id;
    
    -- Delete user's likes
    DELETE FROM Likes WHERE UserID = p_user_id;
    
    -- Delete user's posts
    DELETE FROM Posts WHERE UserID = p_user_id;
    
    -- Delete followers relationships (user as follower and as following)
    DELETE FROM Followers WHERE FollowerUserID = p_user_id OR FollowingUserID = p_user_id;
    
    -- Delete friend relationships
    DELETE FROM Friends WHERE UserID1 = p_user_id OR UserID2 = p_user_id;
    
    -- Delete user finally (this will cascade delete via foreign keys)
    DELETE FROM Users WHERE UserID = p_user_id;
    
    COMMIT;
END //

DELIMITER ;

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================
-- Note: All sample users have password "password123"
-- Hashed with bcrypt (10 rounds)

-- Insert Sample Users
INSERT INTO Users (Username, Email, PasswordHash, Bio, Avatar, PrivacySettings) VALUES
('john_doe', 'john@example.com', '$2b$10$qWh86.NgYIuV51/IcykytO/HLY3cg/OgIS1N6PCRrd323yN6LE6GO', 'Software developer | Coffee enthusiast ☕ | Love to code and travel 🌍', 'https://i.pravatar.cc/150?img=12', 'public'),
('jane_smith', 'jane@example.com', '$2b$10$qWh86.NgYIuV51/IcykytO/HLY3cg/OgIS1N6PCRrd323yN6LE6GO', 'Creative designer 🎨 | UI/UX Expert | Making the web beautiful', 'https://i.pravatar.cc/150?img=5', 'public'),
('bob_wilson', 'bob@example.com', '$2b$10$qWh86.NgYIuV51/IcykytO/HLY3cg/OgIS1N6PCRrd323yN6LE6GO', 'Tech enthusiast 💻 | Gadget reviewer | Gaming addict 🎮', 'https://i.pravatar.cc/150?img=15', 'public'),
('alice_wonder', 'alice@example.com', '$2b$10$qWh86.NgYIuV51/IcykytO/HLY3cg/OgIS1N6PCRrd323yN6LE6GO', 'Foodie 🍕 | Travel blogger | Living my best life ✨', 'https://i.pravatar.cc/150?img=9', 'public'),
('mike_ross', 'mike@example.com', '$2b$10$qWh86.NgYIuV51/IcykytO/HLY3cg/OgIS1N6PCRrd323yN6LE6GO', 'Fitness trainer 💪 | Nutrition expert | Helping you achieve your goals', 'https://i.pravatar.cc/150?img=33', 'public'),
('sarah_connor', 'sarah@example.com', '$2b$10$qWh86.NgYIuV51/IcykytO/HLY3cg/OgIS1N6PCRrd323yN6LE6GO', 'Photographer 📸 | Nature lover 🌿 | Capturing moments', 'https://i.pravatar.cc/150?img=20', 'public');

-- Insert Sample Posts
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
(4, 'Trying out new recipes tonight! Any suggestions? 🍳', NULL);

-- Insert Sample Comments
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
(6, 1, 'Stunning photo! 📸');

-- Insert Sample Likes
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
(10, 3), (10, 6);

-- Insert Sample Followers (Follow relationships)
INSERT INTO Followers (FollowerUserID, FollowingUserID) VALUES
-- John follows everyone
(1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
-- Jane follows John, Bob, Alice
(2, 1), (2, 3), (2, 4),
-- Bob follows John, Jane, Mike
(3, 1), (3, 2), (3, 5),
-- Alice follows everyone
(4, 1), (4, 2), (4, 3), (4, 5), (4, 6),
-- Mike follows John, Bob, Sarah
(5, 1), (5, 3), (5, 6),
-- Sarah follows Jane, Alice, Mike
(6, 2), (6, 4), (6, 5);

-- Insert Sample Messages
INSERT INTO Messages (SenderID, ReceiverID, Content, SeenStatus) VALUES
(1, 2, 'Hey Jane! Love your latest design work!', TRUE),
(2, 1, 'Thanks John! Means a lot coming from you 😊', TRUE),
(1, 2, 'Would love to collaborate on a project sometime!', FALSE),
(3, 1, 'Dude, that social media platform is sick!', TRUE),
(1, 3, 'Thanks Bob! Let me know if you have any feedback', TRUE),
(4, 1, 'Can you share the recipe app you mentioned?', TRUE),
(1, 4, 'Sure! I''ll send you the link', FALSE),
(5, 6, 'Hey Sarah, great photos from the mountain hike!', TRUE),
(6, 5, 'Thank you Mike! We should go together next time!', FALSE);

-- Insert Sample Stories (Some active, some will expire based on creation time)
INSERT INTO Stories (UserID, MediaURL, MediaType, CreatedAt, ExpiresAt) VALUES
(1, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(2, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(3, 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(4, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(5, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(6, 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(1, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(2, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400', 'image', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR));

-- Insert Sample Story Views
INSERT INTO ViewedStories (StoryID, ViewerUserID) VALUES
(1, 2), (1, 3), (1, 4),
(2, 1), (2, 3), (2, 5),
(6, 1), (6, 2), (6, 3),
(7, 2), (7, 3),
(8, 1), (8, 4),
(3, 1), (3, 2), (3, 4),
(4, 1), (4, 2), (4, 3),
(5, 1), (5, 2), (5, 6);

-- Insert Sample Friend Requests
INSERT INTO Friends (UserID1, UserID2, Status) VALUES
(1, 2, 'accepted'),
(1, 3, 'accepted'),
(2, 3, 'accepted'),
(4, 5, 'accepted'),
(5, 6, 'pending'),
(1, 6, 'pending');

-- Display success message
SELECT 'Database setup complete with sample data!' AS Message;
SELECT CONCAT('Total Users: ', COUNT(*)) AS Summary FROM Users;
SELECT CONCAT('Total Posts: ', COUNT(*)) AS Summary FROM Posts;
SELECT CONCAT('Total Comments: ', COUNT(*)) AS Summary FROM Comments;
SELECT CONCAT('Total Likes: ', COUNT(*)) AS Summary FROM Likes;
SELECT CONCAT('Total Followers: ', COUNT(*)) AS Summary FROM Followers;
SELECT CONCAT('Total Messages: ', COUNT(*)) AS Summary FROM Messages;
