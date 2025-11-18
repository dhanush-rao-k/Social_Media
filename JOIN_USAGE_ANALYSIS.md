# 📊 JOIN Usage Across the Project

## 🗂️ Overview
JOINs are used extensively throughout the project for connecting related data from different tables. Below is a detailed breakdown of all JOIN operations.

---

## 📍 **1. streamlit_app.py** (8 JOIN operations)

### 1.1 Get User Feed (Line 196)
```python
SELECT p.PostID, p.UserID, p.Content, p.Media, p.Timestamp,
       u.Username, u.Avatar, ...
FROM Posts p
JOIN Users u ON p.UserID = u.UserID
WHERE p.UserID = %s OR p.UserID IN (SELECT FollowingUserID FROM Followers...)
```
**Purpose:** Get posts with user information  
**Join Type:** INNER JOIN  
**Tables:** Posts ↔ Users

---

### 1.2 Get Follow Requests (Line 453)
```python
SELECT fr.RequestID, fr.RequesterUserID, u.Username, u.Avatar, u.Bio, fr.RequestedAt
FROM FollowRequests fr
JOIN Users u ON fr.RequesterUserID = u.UserID
WHERE fr.TargetUserID = %s AND fr.Status = 'pending'
```
**Purpose:** Get pending follow requests with requester details  
**Join Type:** INNER JOIN  
**Tables:** FollowRequests ↔ Users

---

### 1.3 Get User Conversations (Line 597)
```python
JOIN Users u ON (
    CASE WHEN m.SenderID = %s THEN m.ReceiverID
    ELSE m.SenderID
    END = u.UserID
)
```
**Purpose:** Join to get conversation partner details  
**Join Type:** INNER JOIN  
**Tables:** Messages ↔ Users

---

### 1.4 Get Conversation Messages (Line 628)
```python
SELECT m.MessageID, m.SenderID, m.ReceiverID, m.Content, m.Timestamp, 
       u.Username AS SenderUsername, u.Avatar AS SenderAvatar
FROM Messages m
JOIN Users u ON m.SenderID = u.UserID
```
**Purpose:** Get messages with sender information  
**Join Type:** INNER JOIN  
**Tables:** Messages ↔ Users

---

### 1.5 Get Followers (Line 671)
```python
SELECT u.UserID, u.Username, u.Avatar, u.Bio
FROM Users u
JOIN Followers f ON u.UserID = f.FollowerUserID
WHERE f.FollowingUserID = %s
```
**Purpose:** Get list of followers  
**Join Type:** INNER JOIN  
**Tables:** Users ↔ Followers

---

### 1.6 Get Following (Line 689)
```python
SELECT u.UserID, u.Username, u.Avatar, u.Bio
FROM Users u
JOIN Followers f ON u.UserID = f.FollowingUserID
WHERE f.FollowerUserID = %s
```
**Purpose:** Get list of users that current user follows  
**Join Type:** INNER JOIN  
**Tables:** Users ↔ Followers

---

### 1.7 Get User Posts (Line 710)
```python
SELECT p.PostID, p.UserID, p.Content, p.Media, p.Timestamp,
       u.Username, u.Avatar, ...
FROM Posts p
JOIN Users u ON p.UserID = u.UserID
WHERE p.UserID = %s
```
**Purpose:** Get user's posts with user details  
**Join Type:** INNER JOIN  
**Tables:** Posts ↔ Users

---

### 1.8 Get Active Stories (Line 755)
```python
SELECT s.StoryID, s.UserID, s.MediaURL, s.MediaType, s.CreatedAt, s.ExpiresAt,
       u.Username, u.Avatar, ...
FROM Stories s
JOIN Users u ON s.UserID = u.UserID
WHERE s.UserID IN (...)
```
**Purpose:** Get stories with creator information  
**Join Type:** INNER JOIN  
**Tables:** Stories ↔ Users

---

## 📍 **2. database/schema.sql** (3 JOIN operations)

### 2.1 GetUserFeed Procedure (Lines 144-146)
```sql
SELECT p.PostID, p.UserID, p.Content, p.Media, p.Timestamp,
       u.Username, u.Avatar,
       COUNT(DISTINCT l.LikeID) as LikeCount,
       COUNT(DISTINCT c.CommentID) as CommentCount
FROM Posts p
JOIN Users u ON p.UserID = u.UserID
LEFT JOIN Likes l ON p.PostID = l.PostID
LEFT JOIN Comments c ON p.PostID = c.PostID
WHERE p.UserID IN (SELECT FollowingUserID FROM Followers...)
GROUP BY p.PostID, p.UserID, p.Content, p.Media, p.Timestamp, u.Username, u.Avatar
```
**Purpose:** Get user feed with posts, user info, likes count, and comments count  
**Join Types:** INNER JOIN (Users), LEFT JOIN (Likes, Comments)  
**Tables:** Posts ↔ Users, Posts ↔ Likes, Posts ↔ Comments

---

## 📍 **3. app.py (Flask)** (9 JOIN operations)

### 3.1 Login User (Line 70)
```python
SELECT u.UserID, u.Username, u.Email, u.PasswordHash,
       p.Bio, p.ProfilePicture
FROM Users u
LEFT JOIN Profile p ON u.UserID = p.UserID
WHERE u.Username = %s
```
**Purpose:** Get user with optional profile info  
**Join Type:** LEFT JOIN  
**Tables:** Users ← Profile

---

### 3.2 Get User Profile (Lines 175-176)
```python
JOIN Users u ON p.UserID = u.UserID
LEFT JOIN Profile pr ON pr.UserID = u.UserID
```
**Purpose:** Join posts to users to profiles  
**Join Types:** INNER JOIN, LEFT JOIN  
**Tables:** Posts ↔ Users ← Profile

---

### 3.3 Get User Connections (Lines 403-405)
```python
JOIN Users u ON u.UserID = l.OtherUserID
LEFT JOIN Profile p ON p.UserID = u.UserID
LEFT JOIN Followers f ON f.FollowerUserID = %s AND f.FollowingUserID = u.UserID
```
**Purpose:** Get connected users with follow status  
**Join Types:** INNER JOIN, LEFT JOIN (×2)  
**Tables:** Messages ↔ Users ← Profile, Followers

---

### 3.4 Get User Suggestions (Lines 451-452)
```python
JOIN Users u ON u.UserID = pr.OtherUserID
LEFT JOIN Profile p ON p.UserID = u.UserID
```
**Purpose:** Get suggested users with profiles  
**Join Types:** INNER JOIN, LEFT JOIN  
**Tables:** Users ↔ Profile

---

### 3.5 Get Followed Stories (Lines 505-506)
```python
JOIN Users u ON u.UserID = s.UserID
LEFT JOIN Profile p ON p.UserID = u.UserID
```
**Purpose:** Get stories from followed users  
**Join Types:** INNER JOIN, LEFT JOIN  
**Tables:** Stories ↔ Users ← Profile

---

### 3.6 Get User Profile Info (Line 560)
```python
LEFT JOIN Profile p ON p.UserID = u.UserID
```
**Purpose:** Get user profile optional information  
**Join Type:** LEFT JOIN  
**Tables:** Users ← Profile

---

### 3.7 Get User Posts (Lines 595-596)
```python
JOIN Users u ON u.UserID = po.UserID
LEFT JOIN Profile p ON p.UserID = u.UserID
```
**Purpose:** Get posts with user and profile info  
**Join Types:** INNER JOIN, LEFT JOIN  
**Tables:** Posts ↔ Users ← Profile

---

## 📍 **4. database/enhanced_procedures.sql** (8 JOIN operations)

### 4.1 GetPostComments (Line 156)
```sql
JOIN Users u ON c.UserID = u.UserID
```
**Purpose:** Get comments with commenter info  
**Join Type:** INNER JOIN  
**Tables:** Comments ↔ Users

---

### 4.2 GetFollowSuggestions (Line 239)
```sql
LEFT JOIN Followers f ON u.UserID = f.FollowingUserID
```
**Purpose:** Get potential users to follow  
**Join Type:** LEFT JOIN  
**Tables:** Users ← Followers

---

### 4.3 GetUserMessages (Line 316)
```sql
JOIN Users u ON (...)
```
**Purpose:** Get messages with user info  
**Join Type:** INNER JOIN  
**Tables:** Messages ↔ Users

---

### 4.4 GetMessageDetails (Lines 343-344)
```sql
LEFT JOIN MessageSeen ms ON m.MessageID = ms.MessageID
JOIN Users u ON m.SenderID = u.UserID
```
**Purpose:** Get messages with seen status and sender info  
**Join Types:** LEFT JOIN, INNER JOIN  
**Tables:** Messages ← MessageSeen, Messages ↔ Users

---

### 4.5 GetFollowedUsersStories (Line 397)
```sql
JOIN Users u ON s.UserID = u.UserID
LEFT JOIN ViewedStories vs ON s.StoryID = vs.StoryID AND vs.UserID = p_user_id
```
**Purpose:** Get stories with view status  
**Join Types:** INNER JOIN, LEFT JOIN  
**Tables:** Stories ↔ Users ← ViewedStories

---

### 4.6 GetFollowSuggestions (Line 437)
```sql
LEFT JOIN Followers f ON u.UserID = f.FollowingUserID
```
**Purpose:** Get users to suggest for following  
**Join Type:** LEFT JOIN  
**Tables:** Users ← Followers

---

### 4.7 GetUserPosts (Line 462)
```sql
JOIN Users u ON po.UserID = u.UserID
```
**Purpose:** Get user's posts with user info  
**Join Type:** INNER JOIN  
**Tables:** Posts ↔ Users

---

### 4.8 GetUserProfile (Lines 491-493)
```sql
LEFT JOIN Followers f1 ON u.UserID = f1.FollowingUserID
LEFT JOIN Followers f2 ON u.UserID = f2.FollowerUserID
LEFT JOIN Posts po ON u.UserID = po.UserID
```
**Purpose:** Get complete user profile with followers, following, posts  
**Join Type:** LEFT JOIN (×3)  
**Tables:** Users ← Followers, Followers, Posts

---

### 4.9 SearchUsers (Line 520)
```sql
JOIN Users u ON po.UserID = u.UserID
```
**Purpose:** Search users in posts  
**Join Type:** INNER JOIN  
**Tables:** Posts ↔ Users

---

## 📍 **5. database/interactive_features.sql** (2 JOIN operations)

### 5.1 Update Like Count (Line 10)
```sql
LEFT JOIN (SELECT PostID, COUNT(*) c FROM Likes GROUP BY PostID) l
```
**Purpose:** Calculate like counts for all posts  
**Join Type:** LEFT JOIN  
**Tables:** Posts ← Likes (subquery)

---

### 5.2 Update Comment Count (Line 16)
```sql
LEFT JOIN (SELECT PostID, COUNT(*) c FROM Comments GROUP BY PostID) c
```
**Purpose:** Calculate comment counts for all posts  
**Join Type:** LEFT JOIN  
**Tables:** Posts ← Comments (subquery)

---

## 📊 **Summary Statistics**

| File | INNER JOIN | LEFT JOIN | Total |
|------|-----------|-----------|-------|
| streamlit_app.py | 8 | 0 | 8 |
| schema.sql | 1 | 2 | 3 |
| app.py | 4 | 5 | 9 |
| enhanced_procedures.sql | 4 | 4 | 8 |
| interactive_features.sql | 0 | 2 | 2 |
| **TOTAL** | **17** | **13** | **30** |

---

## 🎯 **Common JOIN Patterns in Project**

### Pattern 1: Get Data with User Info
```sql
FROM [Table] t
JOIN Users u ON t.UserID = u.UserID
```
**Used for:** Posts, Stories, Comments, Messages, Followers
**Example:** Get posts with creator information

---

### Pattern 2: Get Data with Optional Related Data
```sql
FROM [Table] t
LEFT JOIN [RelatedTable] r ON t.ID = r.ID
```
**Used for:** Profiles, Likes, Comments counts
**Example:** Get user with optional profile info

---

### Pattern 3: Multiple JOINs with Aggregates
```sql
FROM Posts p
JOIN Users u ON p.UserID = u.UserID
LEFT JOIN Likes l ON p.PostID = l.PostID
LEFT JOIN Comments c ON p.PostID = c.PostID
GROUP BY p.PostID, p.UserID, ...
```
**Used for:** Feed with statistics (likes, comments count)

---

### Pattern 4: LEFT JOIN with Subqueries
```sql
LEFT JOIN (SELECT PostID, COUNT(*) c FROM [Table] GROUP BY PostID) sub
```
**Used for:** Calculating aggregated counts efficiently
**Example:** Count likes and comments per post

---

## 🔗 **Key Relationships Joined**

| From Table | To Table | Join Type | Purpose |
|-----------|----------|-----------|---------|
| Posts | Users | INNER | Get post creator info |
| Stories | Users | INNER | Get story creator info |
| Comments | Users | INNER | Get commenter info |
| Messages | Users | INNER | Get sender/receiver info |
| Followers | Users | INNER | Get follower/following info |
| FollowRequests | Users | INNER | Get requester info |
| Posts | Likes | LEFT | Count likes per post |
| Posts | Comments | LEFT | Count comments per post |
| Users | Profile | LEFT | Get optional profile data |
| Stories | ViewedStories | LEFT | Track story views |

---

## ✅ **Best Practices Observed**

1. ✅ **INNER JOIN used for mandatory relationships** - Users, Posts, etc.
2. ✅ **LEFT JOIN used for optional data** - Profiles, Likes, Comments
3. ✅ **Clear aliases** - Using single letters (p, u, f, l, c, s)
4. ✅ **Explicit ON conditions** - All joins have clear join conditions
5. ✅ **Subqueries for aggregates** - Using LEFT JOIN with subqueries for counts
6. ✅ **Multiple joins in procedures** - Complex queries in stored procedures
