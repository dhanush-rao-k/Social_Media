-- ============================================
-- ENHANCED STORED PROCEDURES FOR MYSQL-HEAVY BACKEND
-- All business logic is handled at database layer
-- ============================================

USE SOCIAL_MEDIA;

DELIMITER //

-- ============================================
-- USER AUTHENTICATION & REGISTRATION
-- ============================================

-- User Login Procedure
DROP PROCEDURE IF EXISTS UserLogin//
CREATE PROCEDURE UserLogin(
    IN p_username VARCHAR(50),
    IN p_password VARCHAR(255)
)
BEGIN
    SELECT 
        u.UserID,
        u.Username,
        u.Email,
        u.PasswordHash,
        u.Bio,
        u.Avatar
    FROM Users u
    WHERE u.Username = p_username AND u.PasswordHash = p_password
    LIMIT 1;
END//

-- Register User Procedure with automatic profile creation
DROP PROCEDURE IF EXISTS RegisterUser//
CREATE PROCEDURE RegisterUser(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255),
    IN p_bio TEXT
)
BEGIN
    DECLARE new_user_id INT;
    
    -- Insert user with bio
    INSERT INTO Users (Username, Email, PasswordHash, Bio, CreatedAt)
    VALUES (p_username, p_email, p_password, p_bio, NOW());
    
    SET new_user_id = LAST_INSERT_ID();
    
    SELECT new_user_id AS UserID, p_username AS Username;
END//

-- ============================================
-- POST MANAGEMENT
-- ============================================

-- Create Post Procedure
DROP PROCEDURE IF EXISTS CreatePost//
CREATE PROCEDURE CreatePost(
    IN p_user_id INT,
    IN p_content TEXT,
    IN p_media VARCHAR(255)
)
BEGIN
    INSERT INTO Posts (UserID, Content, Media, Timestamp)
    VALUES (p_user_id, p_content, p_media, NOW());
    
    SELECT LAST_INSERT_ID() AS PostID;
END//

-- Delete Post Procedure (with cascading deletes)
DROP PROCEDURE IF EXISTS DeletePost//
CREATE PROCEDURE DeletePost(
    IN p_post_id INT,
    IN p_user_id INT
)
BEGIN
    -- Start transaction
    START TRANSACTION;
    
    -- Delete likes
    DELETE FROM Likes WHERE PostID = p_post_id;
    
    -- Delete comments
    DELETE FROM Comments WHERE PostID = p_post_id;
    
    -- Delete post (only if user owns it)
    DELETE FROM Posts 
    WHERE PostID = p_post_id AND UserID = p_user_id;
    
    COMMIT;
END//

-- ============================================
-- LIKES & COMMENTS
-- ============================================

-- Toggle Like Procedure
DROP PROCEDURE IF EXISTS ToggleLike//
CREATE PROCEDURE ToggleLike(
    IN p_user_id INT,
    IN p_post_id INT
)
BEGIN
    DECLARE like_exists INT;
    
    -- Check if like exists
    SELECT COUNT(*) INTO like_exists
    FROM Likes
    WHERE UserID = p_user_id AND PostID = p_post_id;
    
    IF like_exists > 0 THEN
        -- Unlike
        DELETE FROM Likes
        WHERE UserID = p_user_id AND PostID = p_post_id;
        
        SELECT 'unliked' AS action;
    ELSE
        -- Like
        INSERT INTO Likes (UserID, PostID, Timestamp)
        VALUES (p_user_id, p_post_id, NOW());
        
        SELECT 'liked' AS action;
    END IF;
END//

-- Add Comment Procedure
DROP PROCEDURE IF EXISTS AddComment//
CREATE PROCEDURE AddComment(
    IN p_post_id INT,
    IN p_user_id INT,
    IN p_content TEXT
)
BEGIN
    INSERT INTO Comments (PostID, UserID, Content, Timestamp)
    VALUES (p_post_id, p_user_id, p_content, NOW());
    
    SELECT LAST_INSERT_ID() AS CommentID;
END//

-- Get Post Comments with user details
DROP PROCEDURE IF EXISTS GetPostComments//
CREATE PROCEDURE GetPostComments(
    IN p_post_id INT
)
BEGIN
    SELECT 
        c.CommentID,
        c.PostID,
        c.UserID,
        c.Content,
        c.Timestamp,
        u.Username,
        u.Avatar
    FROM Comments c
    JOIN Users u ON c.UserID = u.UserID
    WHERE c.PostID = p_post_id
    ORDER BY c.Timestamp DESC;
END//

-- Get Comment Count for a post
DROP FUNCTION IF EXISTS GetCommentCount//
CREATE FUNCTION GetCommentCount(p_post_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE comment_count INT;
    
    SELECT COUNT(*) INTO comment_count
    FROM Comments
    WHERE PostID = p_post_id;
    
    RETURN comment_count;
END//

-- Get Like Count for a post
DROP FUNCTION IF EXISTS GetLikeCount//
CREATE FUNCTION GetLikeCount(p_post_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE like_count INT;
    
    SELECT COUNT(*) INTO like_count
    FROM Likes
    WHERE PostID = p_post_id;
    
    RETURN like_count;
END//

-- ============================================
-- FOLLOW SYSTEM
-- ============================================

-- Toggle Follow Procedure
DROP PROCEDURE IF EXISTS ToggleFollow//
CREATE PROCEDURE ToggleFollow(
    IN p_follower_id INT,
    IN p_following_id INT
)
BEGIN
    DECLARE follow_exists INT;
    
    -- Check if already following
    SELECT COUNT(*) INTO follow_exists
    FROM Followers
    WHERE FollowerUserID = p_follower_id AND FollowingUserID = p_following_id;
    
    IF follow_exists > 0 THEN
        -- Unfollow
        DELETE FROM Followers
        WHERE FollowerUserID = p_follower_id AND FollowingUserID = p_following_id;
        
        SELECT 'unfollowed' AS action;
    ELSE
        -- Follow
        INSERT INTO Followers (FollowerUserID, FollowingUserID, FollowedAt)
        VALUES (p_follower_id, p_following_id, NOW());
        
        SELECT 'followed' AS action;
    END IF;
END//

-- Get Suggested Users (not followed yet)
DROP PROCEDURE IF EXISTS GetSuggestedUsers//
CREATE PROCEDURE GetSuggestedUsers(
    IN p_user_id INT
)
BEGIN
    SELECT 
        u.UserID,
        u.Username,
        u.Avatar,
        u.Bio,
        COUNT(DISTINCT f.FollowerUserID) AS FollowerCount
    FROM Users u
    LEFT JOIN Followers f ON u.UserID = f.FollowingUserID
    WHERE u.UserID != p_user_id
        AND u.UserID NOT IN (
            SELECT FollowingUserID 
            FROM Followers 
            WHERE FollowerUserID = p_user_id
        )
    GROUP BY u.UserID
    ORDER BY FollowerCount DESC
    LIMIT 10;
END//

-- Check if user is following another user
DROP FUNCTION IF EXISTS IsFollowing//
CREATE FUNCTION IsFollowing(p_follower_id INT, p_following_id INT)
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE is_following BOOLEAN;
    
    SELECT COUNT(*) > 0 INTO is_following
    FROM Followers
    WHERE FollowerUserID = p_follower_id AND FollowingUserID = p_following_id;
    
    RETURN is_following;
END//

-- ============================================
-- MESSAGING SYSTEM
-- ============================================

-- Send Message Procedure
DROP PROCEDURE IF EXISTS SendMessage//
CREATE PROCEDURE SendMessage(
    IN p_sender_id INT,
    IN p_receiver_id INT,
    IN p_content TEXT
)
BEGIN
    INSERT INTO Messages (SenderID, ReceiverID, Content, Timestamp)
    VALUES (p_sender_id, p_receiver_id, p_content, NOW());
    
    SELECT LAST_INSERT_ID() AS MessageID;
END//

-- Get User Conversations
DROP PROCEDURE IF EXISTS GetUserConversations//
CREATE PROCEDURE GetUserConversations(
    IN p_user_id INT
)
BEGIN
    SELECT DISTINCT
        CASE 
            WHEN m.SenderID = p_user_id THEN m.ReceiverID
            ELSE m.SenderID
        END AS OtherUserID,
        u.Username AS OtherUsername,
        u.Avatar AS OtherAvatar,
        (
            SELECT Content
            FROM Messages
            WHERE (SenderID = p_user_id AND ReceiverID = OtherUserID)
               OR (SenderID = OtherUserID AND ReceiverID = p_user_id)
            ORDER BY Timestamp DESC
            LIMIT 1
        ) AS LastMessage,
        (
            SELECT Timestamp
            FROM Messages
            WHERE (SenderID = p_user_id AND ReceiverID = OtherUserID)
               OR (SenderID = OtherUserID AND ReceiverID = p_user_id)
            ORDER BY Timestamp DESC
            LIMIT 1
        ) AS LastMessageTime,
        GetUnreadMessageCount(OtherUserID, p_user_id) AS UnreadCount
    FROM Messages m
    JOIN Users u ON (
        CASE 
            WHEN m.SenderID = p_user_id THEN m.ReceiverID
            ELSE m.SenderID
        END = u.UserID
    )
    WHERE m.SenderID = p_user_id OR m.ReceiverID = p_user_id
    ORDER BY LastMessageTime DESC;
END//

-- Get Messages Between Two Users
DROP PROCEDURE IF EXISTS GetConversationMessages//
CREATE PROCEDURE GetConversationMessages(
    IN p_user1_id INT,
    IN p_user2_id INT
)
BEGIN
    SELECT 
        m.MessageID,
        m.SenderID,
        m.ReceiverID,
        m.Content,
        m.Timestamp,
        ms.SeenAt,
        u.Username AS SenderUsername,
        u.Avatar AS SenderAvatar
    FROM Messages m
    LEFT JOIN MessageSeen ms ON m.MessageID = ms.MessageID
    JOIN Users u ON m.SenderID = u.UserID
    WHERE (m.SenderID = p_user1_id AND m.ReceiverID = p_user2_id)
       OR (m.SenderID = p_user2_id AND m.ReceiverID = p_user1_id)
    ORDER BY m.Timestamp ASC;
    
    -- Mark messages as seen
    CALL MarkMessageSeen(p_user2_id, p_user1_id);
END//

-- ============================================
-- STORY SYSTEM
-- ============================================

-- Create Story Procedure
DROP PROCEDURE IF EXISTS CreateStory//
CREATE PROCEDURE CreateStory(
    IN p_user_id INT,
    IN p_media_url VARCHAR(255),
    IN p_media_type ENUM('image', 'video')
)
BEGIN
    INSERT INTO Stories (UserID, MediaURL, MediaType, CreatedAt, ExpiresAt)
    VALUES (
        p_user_id, 
        p_media_url, 
        p_media_type, 
        NOW(), 
        DATE_ADD(NOW(), INTERVAL 24 HOUR)
    );
    
    SELECT LAST_INSERT_ID() AS StoryID;
END//

-- Get Stories from Followed Users
DROP PROCEDURE IF EXISTS GetFollowedUsersStories//
CREATE PROCEDURE GetFollowedUsersStories(
    IN p_user_id INT
)
BEGIN
    SELECT 
        s.StoryID,
        s.UserID,
        s.MediaURL,
        s.MediaType,
        s.CreatedAt,
        s.ExpiresAt,
        u.Username,
        u.Avatar,
        CASE 
            WHEN vs.ViewedStoryID IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS IsViewed
    FROM Stories s
    JOIN Users u ON s.UserID = u.UserID
    LEFT JOIN ViewedStories vs ON s.StoryID = vs.StoryID AND vs.UserID = p_user_id
    WHERE s.UserID IN (
        SELECT FollowingUserID 
        FROM Followers 
        WHERE FollowerUserID = p_user_id
    )
    AND s.ExpiresAt > NOW()
    ORDER BY s.CreatedAt DESC;
END//

-- Mark Story as Viewed
DROP PROCEDURE IF EXISTS MarkStoryViewed//
CREATE PROCEDURE MarkStoryViewed(
    IN p_story_id INT,
    IN p_user_id INT
)
BEGIN
    INSERT IGNORE INTO ViewedStories (StoryID, UserID, ViewedAt)
    VALUES (p_story_id, p_user_id, NOW());
END//

-- ============================================
-- SEARCH FUNCTIONALITY
-- ============================================

-- Search Users
DROP PROCEDURE IF EXISTS SearchUsers//
CREATE PROCEDURE SearchUsers(
    IN p_query VARCHAR(100)
)
BEGIN
    SELECT 
        u.UserID,
        u.Username,
        u.Email,
        u.Avatar,
        u.Bio,
        COUNT(DISTINCT f.FollowerUserID) AS FollowerCount
    FROM Users u
    LEFT JOIN Followers f ON u.UserID = f.FollowingUserID
    WHERE u.Username LIKE CONCAT('%', p_query, '%')
       OR u.Email LIKE CONCAT('%', p_query, '%')
       OR u.Bio LIKE CONCAT('%', p_query, '%')
    GROUP BY u.UserID
    LIMIT 20;
END//

-- Search Posts
DROP PROCEDURE IF EXISTS SearchPosts//
CREATE PROCEDURE SearchPosts(
    IN p_query VARCHAR(255)
)
BEGIN
    SELECT 
        po.PostID,
        po.UserID,
        po.Content,
        po.Media,
        po.Timestamp,
        u.Username,
        u.Avatar,
        GetLikeCount(po.PostID) AS LikeCount,
        GetCommentCount(po.PostID) AS CommentCount
    FROM Posts po
    JOIN Users u ON po.UserID = u.UserID
    WHERE po.Content LIKE CONCAT('%', p_query, '%')
    ORDER BY po.Timestamp DESC
    LIMIT 20;
END//

-- ============================================
-- PROFILE MANAGEMENT
-- ============================================

-- Get User Profile
DROP PROCEDURE IF EXISTS GetUserProfile//
CREATE PROCEDURE GetUserProfile(
    IN p_user_id INT,
    IN p_viewing_user_id INT
)
BEGIN
    SELECT 
        u.UserID,
        u.Username,
        u.Email,
        u.CreatedAt,
        u.Bio,
        u.Avatar,
        COUNT(DISTINCT f1.FollowerUserID) AS FollowerCount,
        COUNT(DISTINCT f2.FollowingUserID) AS FollowingCount,
        COUNT(DISTINCT po.PostID) AS PostCount,
        IsFollowing(p_viewing_user_id, p_user_id) AS IsFollowedByViewer
    FROM Users u
    LEFT JOIN Followers f1 ON u.UserID = f1.FollowingUserID
    LEFT JOIN Followers f2 ON u.UserID = f2.FollowerUserID
    LEFT JOIN Posts po ON u.UserID = po.UserID
    WHERE u.UserID = p_user_id
    GROUP BY u.UserID;
END//

-- Get User Posts
DROP PROCEDURE IF EXISTS GetUserPosts//
CREATE PROCEDURE GetUserPosts(
    IN p_user_id INT,
    IN p_viewing_user_id INT
)
BEGIN
    SELECT 
        po.PostID,
        po.UserID,
        po.Content,
        po.Media,
        po.Timestamp,
        u.Username,
        u.Avatar,
        GetLikeCount(po.PostID) AS LikeCount,
        GetCommentCount(po.PostID) AS CommentCount,
        EXISTS(
            SELECT 1 FROM Likes 
            WHERE PostID = po.PostID AND UserID = p_viewing_user_id
        ) AS IsLikedByViewer
    FROM Posts po
    JOIN Users u ON po.UserID = u.UserID
    WHERE po.UserID = p_user_id
    ORDER BY po.Timestamp DESC;
END//

-- Update Profile
DROP PROCEDURE IF EXISTS UpdateProfile//
CREATE PROCEDURE UpdateProfile(
    IN p_user_id INT,
    IN p_bio TEXT,
    IN p_profile_picture VARCHAR(255)
)
BEGIN
    UPDATE Users
    SET Bio = p_bio,
        Avatar = p_profile_picture
    WHERE UserID = p_user_id;
END//

DELIMITER ;

-- ============================================
-- ADDITIONAL TRIGGERS
-- ============================================

DELIMITER //

-- Trigger to update comment count (for caching)
DROP TRIGGER IF EXISTS AfterCommentInsert//
CREATE TRIGGER AfterCommentInsert
AFTER INSERT ON Comments
FOR EACH ROW
BEGIN
    -- Could update a cache table or send notification
    -- For now, just a placeholder for future enhancements
    SET @comment_added = NEW.CommentID;
END//

-- Trigger to clean up when post is deleted
DROP TRIGGER IF EXISTS BeforePostDelete//
CREATE TRIGGER BeforePostDelete
BEFORE DELETE ON Posts
FOR EACH ROW
BEGIN
    -- Delete associated likes
    DELETE FROM Likes WHERE PostID = OLD.PostID;
    
    -- Delete associated comments
    DELETE FROM Comments WHERE PostID = OLD.PostID;
END//

-- Trigger to clean up when user is deleted
DROP TRIGGER IF EXISTS BeforeUserDelete//
CREATE TRIGGER BeforeUserDelete
BEFORE DELETE ON Users
FOR EACH ROW
BEGIN
    -- Delete user's posts (triggers will handle cascades)
    DELETE FROM Posts WHERE UserID = OLD.UserID;
    
    -- Delete user's followers/following
    DELETE FROM Followers WHERE FollowerUserID = OLD.UserID OR FollowingUserID = OLD.UserID;
    
    -- Delete user's messages
    DELETE FROM Messages WHERE SenderID = OLD.UserID OR ReceiverID = OLD.UserID;
    
    -- Delete user's stories
    DELETE FROM Stories WHERE UserID = OLD.UserID;
END//

DELIMITER ;

-- ============================================
-- END OF ENHANCED PROCEDURES
-- ============================================
