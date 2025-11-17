"""
Flask Application for Social Media Platform
Backend logic is primarily handled by MySQL stored procedures, triggers, and functions
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import mysql.connector
from mysql.connector import Error
import bcrypt
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'SOCIAL_MEDIA')
}

# Get database connection
def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# ==================== ROUTES ====================

@app.route('/')
def index():
    """Home page - redirect to login if not authenticated"""
    if 'user_id' in session:
        return redirect(url_for('feed'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication"""
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            
            # Get user by username
            cursor.execute("""
                SELECT 
                    u.UserID,
                    u.Username,
                    u.Email,
                    u.PasswordHash,
                    p.Bio,
                    p.ProfilePicture
                FROM Users u
                LEFT JOIN Profile p ON u.UserID = p.UserID
                WHERE u.Username = %s
                LIMIT 1
            """, (username,))
            
            user = cursor.fetchone()
            
            if user and bcrypt.checkpw(password.encode('utf-8'), user['PasswordHash'].encode('utf-8')):
                # Password is correct
                session['user_id'] = user['UserID']
                session['username'] = user['Username']
                cursor.close()
                conn.close()
                # Don't send password hash to client
                user.pop('PasswordHash', None)
                return jsonify({'success': True, 'user': user})
            
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registration page"""
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        bio = data.get('bio', '')
        
        # Hash password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            
            # Call stored procedure for registration
            cursor.callproc('RegisterUser', [username, email, hashed.decode('utf-8'), bio])
            conn.commit()
            
            cursor.close()
            conn.close()
            return jsonify({'success': True, 'message': 'Registration successful'})
        
        return jsonify({'success': False, 'message': 'Registration failed'}), 500
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    return redirect(url_for('login'))

@app.route('/feed')
def feed():
    """Main feed page"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('feed.html')

@app.route('/profile/<int:user_id>')
def profile(user_id):
    """User profile page"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('profile.html', profile_user_id=user_id)

@app.route('/messages')
def messages():
    """Messages page"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('messages.html')

# ==================== API ENDPOINTS ====================

@app.route('/api/posts/feed/<int:user_id>', methods=['GET'])
def get_feed(user_id):
    """Get user feed using stored procedure"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        try:
            # Try enhanced procedure signature (user_id, limit)
            try:
                cursor.callproc('GetUserFeed', [user_id, 50])
                posts = []
                for result in cursor.stored_results():
                    posts = result.fetchall()
            except Error:
                # Fallback direct SQL compatible with current schema
                cursor.execute('''
                    SELECT p.PostID, p.UserID, p.Content, p.Media, p.Timestamp AS CreatedAt,
                           u.Username,
                           pr.ProfilePicture,
                           (SELECT COUNT(*) FROM Likes l WHERE l.PostID = p.PostID) AS LikeCount,
                           (SELECT COUNT(*) FROM Comments c WHERE c.PostID = p.PostID) AS CommentCount
                    FROM Posts p
                    JOIN Users u ON p.UserID = u.UserID
                    LEFT JOIN Profile pr ON pr.UserID = u.UserID
                    WHERE p.UserID = %s OR p.UserID IN (
                        SELECT FollowingUserID FROM Followers WHERE FollowerUserID = %s
                    )
                    ORDER BY p.Timestamp DESC
                    LIMIT 50
                ''', (user_id, user_id))
                posts = cursor.fetchall()
            return jsonify({'success': True, 'posts': posts})
        finally:
            cursor.close(); conn.close()
    
    return jsonify({'success': False, 'message': 'Failed to fetch feed'}), 500

# ---------- Suggested Users ----------
@app.route('/api/users/suggested/<int:user_id>', methods=['GET'])
def get_suggested_users(user_id):
    """Get suggested users to follow using stored procedure"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.callproc('GetSuggestedUsers', [user_id])
            users = []
            for result in cursor.stored_results():
                users = result.fetchall()
            return jsonify({'success': True, 'users': users})
        except Error as e:
            print(f"Suggested users error: {e}")
            return jsonify({'success': False}), 500
        finally:
            cursor.close()
            conn.close()

@app.route('/api/posts/create', methods=['POST'])
def create_post():
    """Create new post - trigger will handle timestamps and notifications"""
    data = request.get_json()
    user_id = data.get('user_id')
    content = data.get('content')
    media = data.get('media', None)
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        
        # Call stored procedure
        cursor.callproc('CreatePost', [user_id, content, media])
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': 'Post created'})
    
    return jsonify({'success': False, 'message': 'Failed to create post'}), 500

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def toggle_like(post_id):
    """Toggle like on post - stored procedure handles logic"""
    data = request.get_json()
    user_id = data.get('user_id')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        
        # Call stored procedure
        cursor.callproc('ToggleLike', [user_id, post_id])
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({'success': True})
    
    return jsonify({'success': False}), 500

@app.route('/api/posts/<int:post_id>/comments', methods=['GET', 'POST'])
def handle_comments(post_id):
    """Get or add comments - uses stored procedures"""
    if request.method == 'GET':
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            
            # Call stored procedure
            cursor.callproc('GetPostComments', [post_id])
            
            comments = []
            for result in cursor.stored_results():
                comments = result.fetchall()
            
            cursor.close()
            conn.close()
            return jsonify({'success': True, 'comments': comments})
    
    else:  # POST
        data = request.get_json()
        user_id = data.get('user_id')
        content = data.get('content')
        
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            
            # Call stored procedure
            cursor.callproc('AddComment', [post_id, user_id, content])
            conn.commit()
            
            cursor.close()
            conn.close()
            return jsonify({'success': True})
    
    return jsonify({'success': False}), 500

@app.route('/api/users/<int:user_id>/follow', methods=['POST'])
def toggle_follow(user_id):
    """Follow/unfollow user - stored procedure handles logic"""
    data = request.get_json()
    follower_id = data.get('follower_id')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        
        # Call stored procedure
        cursor.callproc('ToggleFollow', [follower_id, user_id])
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({'success': True})
    
    return jsonify({'success': False}), 500

@app.route('/api/messages/send', methods=['POST'])
def send_message():
    """Send message - trigger will handle seen status"""
    data = request.get_json()
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    content = data.get('content')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        
        # Call stored procedure
        cursor.callproc('SendMessage', [sender_id, receiver_id, content])
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({'success': True})
    
    return jsonify({'success': False}), 500

@app.route('/api/messages/conversation/<int:user_id>/<int:other_user_id>', methods=['GET'])
def get_conversation(user_id, other_user_id):
    """Get messages between two users. Also mark received messages as seen."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch conversation ordered by time
        cursor.execute(
            '''
            SELECT m.MessageID, m.SenderID, m.ReceiverID, m.Content, m.Timestamp AS SentAt
            FROM Messages m
            WHERE (m.SenderID = %s AND m.ReceiverID = %s)
               OR (m.SenderID = %s AND m.ReceiverID = %s)
            ORDER BY m.Timestamp ASC
            ''', (user_id, other_user_id, other_user_id, user_id)
        )
        messages = cursor.fetchall()

        # Mark as seen for messages where current user is receiver
        cursor.execute(
            '''
            SELECT m.MessageID FROM Messages m
            WHERE m.SenderID = %s AND m.ReceiverID = %s AND m.SeenStatus = FALSE
            ''', (other_user_id, user_id)
        )
        to_mark = [row['MessageID'] for row in cursor.fetchall()]
        if to_mark:
            # Update flag
            cursor.execute(
                'UPDATE Messages SET SeenStatus = TRUE WHERE MessageID IN (' + ','.join(['%s']*len(to_mark)) + ')',
                to_mark
            )
            # Insert seen rows
            for mid in to_mark:
                cursor.execute('INSERT INTO MessageSeen (MessageID, UserID, SeenAt) VALUES (%s, %s, NOW())', (mid, user_id))
            conn.commit()

        return jsonify({'success': True, 'messages': messages})
    except Error as e:
        print(f"Get conversation error: {e}")
        conn.rollback()
        return jsonify({'success': False}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/messages/requests/<int:user_id>', methods=['GET'])
def get_message_requests(user_id):
    """Conversations from users the viewer doesn't follow (simple 'requests')."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            WITH latest AS (
                SELECT 
                    CASE WHEN SenderID = %s THEN ReceiverID ELSE SenderID END AS OtherUserID,
                    MAX(Timestamp) AS LastMessageTime
                FROM Messages
                WHERE SenderID = %s OR ReceiverID = %s
                GROUP BY CASE WHEN SenderID = %s THEN ReceiverID ELSE SenderID END
            )
            SELECT 
                u.UserID AS OtherUserID,
                u.Username AS OtherUsername,
                p.ProfilePicture AS OtherProfilePicture,
                l.LastMessageTime
            FROM latest l
            JOIN Users u ON u.UserID = l.OtherUserID
            LEFT JOIN Profile p ON p.UserID = u.UserID
            LEFT JOIN Followers f ON f.FollowerUserID = %s AND f.FollowingUserID = u.UserID
            WHERE f.FollowerUserID IS NULL
            ORDER BY l.LastMessageTime DESC
        ''', (user_id, user_id, user_id, user_id, user_id))
        rows = cursor.fetchall()
        return jsonify({'success': True, 'requests': rows})
    except Error as e:
        print(f"Requests error: {e}")
        return jsonify({'success': False}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/messages/conversations/<int:user_id>', methods=['GET'])
def get_conversations(user_id):
    """Get user conversations (fallback query due to schema differences)"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        # Latest message per peer
        cursor.execute('''
            WITH pairs AS (
                SELECT 
                    CASE WHEN SenderID = %s THEN ReceiverID ELSE SenderID END AS OtherUserID,
                    MAX(Timestamp) AS LastMessageTime
                FROM Messages
                WHERE SenderID = %s OR ReceiverID = %s
                GROUP BY CASE WHEN SenderID = %s THEN ReceiverID ELSE SenderID END
            )
            SELECT 
                u.UserID AS OtherUserID,
                u.Username AS OtherUsername,
                p.ProfilePicture AS OtherProfilePicture,
                (
                    SELECT Content FROM Messages m2
                    WHERE (m2.SenderID = %s AND m2.ReceiverID = u.UserID)
                       OR (m2.SenderID = u.UserID AND m2.ReceiverID = %s)
                    ORDER BY m2.Timestamp DESC LIMIT 1
                ) AS LastMessage,
                (
                    SELECT COUNT(*) FROM Messages um
                    WHERE um.SenderID = u.UserID AND um.ReceiverID = %s AND um.SeenStatus = FALSE
                ) AS UnreadCount
            FROM pairs pr
            JOIN Users u ON u.UserID = pr.OtherUserID
            LEFT JOIN Profile p ON p.UserID = u.UserID
            ORDER BY pr.LastMessageTime DESC
        ''', (user_id, user_id, user_id, user_id, user_id, user_id, user_id))
        conversations = cursor.fetchall()
        return jsonify({'success': True, 'conversations': conversations})
    except Error as e:
        print(f"Conversations error: {e}")
        return jsonify({'success': False}), 500
    finally:
        cursor.close(); conn.close()

@app.route('/api/stories/upload', methods=['POST'])
def upload_story():
    """Upload story - trigger will handle expiration"""
    data = request.get_json()
    user_id = data.get('user_id')
    media_url = data.get('media_url')
    media_type = data.get('media_type', 'image')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        
        # Call stored procedure
        cursor.callproc('CreateStory', [user_id, media_url, media_type])
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({'success': True})
    
    return jsonify({'success': False}), 500

@app.route('/api/stories/followed/<int:user_id>', methods=['GET'])
def get_followed_stories(user_id):
    """Get stories from followed users"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        try:
            try:
                cursor.callproc('GetFollowedUsersStories', [user_id])
                stories = []
                for result in cursor.stored_results():
                    stories = result.fetchall()
            except Error:
                cursor.execute('''
                    SELECT s.StoryID, s.UserID, s.MediaURL, s.MediaType, s.CreatedAt, s.ExpiresAt,
                           u.Username, p.ProfilePicture,
                           EXISTS(
                             SELECT 1 FROM ViewedStories vs WHERE vs.StoryID = s.StoryID AND vs.UserID = %s
                           ) AS IsViewed
                    FROM Stories s
                    JOIN Users u ON u.UserID = s.UserID
                    LEFT JOIN Profile p ON p.UserID = u.UserID
                    WHERE s.UserID IN (SELECT FollowingUserID FROM Followers WHERE FollowerUserID = %s)
                      AND s.ExpiresAt > NOW()
                    ORDER BY s.CreatedAt DESC
                ''', (user_id, user_id))
                stories = cursor.fetchall()
            return jsonify({'success': True, 'stories': stories})
        except Error as e:
            print(f"Stories error: {e}")
            return jsonify({'success': False}), 500
        finally:
            cursor.close(); conn.close()

    return jsonify({'success': False}), 500

@app.route('/api/stories/view/<int:story_id>', methods=['POST'])
def mark_story_viewed(story_id):
    data = request.get_json() or {}
    user_id = data.get('user_id')
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        try:
            # Try stored procedure; if it fails (signature mismatch), fall back to direct insert
            try:
                cursor.callproc('MarkStoryViewed', [story_id, user_id])
            except Error as e:
                print(f"MarkStoryViewed proc error, using direct insert: {e}")
                cursor.execute('INSERT IGNORE INTO ViewedStories (StoryID, UserID, ViewedAt) VALUES (%s,%s,NOW())', (story_id, user_id))
            conn.commit()
            return jsonify({'success': True})
        finally:
            cursor.close(); conn.close()
    return jsonify({'success': False}), 500

# ---------- Profile APIs ----------
@app.route('/api/users/profile/<int:user_id>', methods=['GET'])
def api_get_user_profile(user_id):
    viewer = request.args.get('viewer', type=int, default=user_id)
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT u.UserID, u.Username, u.Email, u.CreatedAt,
                   p.Bio, p.ProfilePicture,
                   (SELECT COUNT(*) FROM Followers f1 WHERE f1.FollowingUserID = u.UserID) AS FollowerCount,
                   (SELECT COUNT(*) FROM Followers f2 WHERE f2.FollowerUserID = u.UserID) AS FollowingCount,
                   (SELECT COUNT(*) FROM Posts po WHERE po.UserID = u.UserID) AS PostCount,
                   EXISTS(
                       SELECT 1 FROM Followers f WHERE f.FollowerUserID = %s AND f.FollowingUserID = u.UserID
                   ) AS IsFollowedByViewer
            FROM Users u
            LEFT JOIN Profile p ON p.UserID = u.UserID
            WHERE u.UserID = %s
        ''', (viewer, user_id))
        profile = cursor.fetchone()
        return jsonify({'success': True, 'profile': profile})
    finally:
        cursor.close(); conn.close()

@app.route('/api/users/<int:user_id>/posts', methods=['GET'])
def api_get_user_posts(user_id):
    viewer = request.args.get('viewer', type=int, default=user_id)
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        # Enforce privacy: if private and viewer not following and not the user, hide posts
        cursor.execute('SELECT PrivacySettings FROM Users WHERE UserID = %s', (user_id,))
        row = cursor.fetchone()
        privacy = (row or {}).get('PrivacySettings', 'public') if row else 'public'
        if privacy == 'private' and viewer != user_id:
            cursor.execute('SELECT 1 FROM Followers WHERE FollowerUserID = %s AND FollowingUserID = %s', (viewer, user_id))
            rel = cursor.fetchone()
            if not rel:
                return jsonify({'success': True, 'posts': [], 'private': True})

        cursor.execute('''
            SELECT po.PostID, po.UserID, po.Content, po.Media, po.Timestamp AS CreatedAt,
                   u.Username, p.ProfilePicture,
                   (SELECT COUNT(*) FROM Likes l WHERE l.PostID = po.PostID) AS LikeCount,
                   (SELECT COUNT(*) FROM Comments c WHERE c.PostID = po.PostID) AS CommentCount,
                   EXISTS(
                       SELECT 1 FROM Likes li WHERE li.PostID = po.PostID AND li.UserID = %s
                   ) AS IsLikedByViewer
            FROM Posts po
            JOIN Users u ON u.UserID = po.UserID
            LEFT JOIN Profile p ON p.UserID = u.UserID
            WHERE po.UserID = %s
            ORDER BY po.Timestamp DESC
        ''', (viewer, user_id))
        posts = cursor.fetchall()
        return jsonify({'success': True, 'posts': posts})
    finally:
        cursor.close(); conn.close()

@app.route('/api/users/<int:user_id>/privacy', methods=['POST'])
def update_privacy(user_id):
    data = request.get_json() or {}
    privacy = data.get('privacy', 'public')
    if privacy not in ('public', 'private'):
        return jsonify({'success': False, 'message': 'invalid privacy'}), 400
    if 'user_id' not in session or session['user_id'] != user_id:
        return jsonify({'success': False, 'message': 'unauthorized'}), 403
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    cur = conn.cursor()
    try:
        cur.execute('UPDATE Users SET PrivacySettings = %s WHERE UserID = %s', (privacy, user_id))
        conn.commit()
        return jsonify({'success': True})
    finally:
        cur.close(); conn.close()

@app.route('/api/search/users', methods=['GET'])
def search_users():
    """Search users using stored function"""
    query = request.args.get('q', '')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        
        # Call stored procedure
        cursor.callproc('SearchUsers', [query])
        
        users = []
        for result in cursor.stored_results():
            users = result.fetchall()
        
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'users': users})
    
    return jsonify({'success': False}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

# ==================== DEV UTILITIES (LOCAL ONLY) ====================

@app.route('/admin/seed-demo', methods=['POST', 'GET'])
def seed_demo():
    """Seed demo posts, messages, and stories. Debug-only helper."""
    if not app.debug:
        return jsonify({'success': False, 'message': 'Not allowed'}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False}), 500
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute('SELECT UserID, Username FROM Users ORDER BY UserID')
        users = cur.fetchall()
        post_samples = [
            'Hello from the seed route!',
            'Enjoying this app!',
            'Database-first FTW!',
            'Flask + MySQL combo works well.',
        ]
        # posts
        for u in users:
            for _ in range(2):
                content = random.choice(post_samples)
                try:
                    cur.callproc('CreatePost', [u['UserID'], content, None])
                except Exception:
                    cur.execute('INSERT INTO Posts (UserID, Content, Media, Timestamp) VALUES (%s,%s,%s,NOW())', (u['UserID'], content, None))
        # messages pairwise
        for i in range(len(users)-1):
            u1 = users[i]['UserID']; u2 = users[i+1]['UserID']
            msgs = ["Hey!", "How are you?", "Seeded message."]
            for m in msgs:
                try:
                    cur.callproc('SendMessage', [u1, u2, m])
                except Exception:
                    cur.execute('INSERT INTO Messages (SenderID, ReceiverID, Content, Timestamp) VALUES (%s,%s,%s,NOW())', (u1, u2, m))
        # stories for first few
        story_imgs = ['https://placekitten.com/300/300', 'https://picsum.photos/300/300']
        for u in users[:5]:
            try:
                cur.callproc('CreateStory', [u['UserID'], random.choice(story_imgs), 'image'])
            except Exception:
                cur.execute("INSERT INTO Stories (UserID, MediaURL, MediaType, CreatedAt, ExpiresAt) VALUES (%s,%s,%s,NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))", (u['UserID'], random.choice(story_imgs), 'image'))
        conn.commit()
        return jsonify({'success': True, 'usersSeeded': len(users)})
    except Exception as e:
        print('Seed error:', e)
        conn.rollback()
        return jsonify({'success': False}), 500
    finally:
        cur.close(); conn.close()
