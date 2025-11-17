"""
Streamlit Frontend for Social Media Platform
Connects to existing MySQL database with stored procedures
"""
import streamlit as st
import mysql.connector
from mysql.connector import Error
import bcrypt
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'SOCIAL_MEDIA')
}

# Page configuration
st.set_page_config(
    page_title="Social Media Platform",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .post-card {
        background: white;
        padding: 20px;
        border-radius: 10px;
        margin: 10px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .user-avatar {
        border-radius: 50%;
        width: 40px;
        height: 40px;
    }
</style>
""", unsafe_allow_html=True)

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        st.error(f"Database connection error: {e}")
        return None

# Session state initialization
if 'user_id' not in st.session_state:
    st.session_state.user_id = None
if 'username' not in st.session_state:
    st.session_state.username = None

def login_user(username, password):
    """Authenticate user"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT UserID, Username, Email, PasswordHash
            FROM Users WHERE Username = %s LIMIT 1
        """, (username,))
        user = cursor.fetchone()
        
        if user and bcrypt.checkpw(password.encode('utf-8'), user['PasswordHash'].encode('utf-8')):
            st.session_state.user_id = user['UserID']
            st.session_state.username = user['Username']
            cursor.close()
            conn.close()
            return True
        cursor.close()
        conn.close()
    return False

def register_user(username, email, password, bio=''):
    """Register new user"""
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.callproc('RegisterUser', [username, email, hashed.decode('utf-8'), bio])
            conn.commit()
            cursor.close()
            conn.close()
            return True
        except Error as e:
            st.error(f"Registration failed: {e}")
            cursor.close()
            conn.close()
    return False

def get_user_feed(user_id, limit=50):
    """Get user feed"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.callproc('GetUserFeed', [user_id, limit])
            posts = []
            for result in cursor.stored_results():
                posts = result.fetchall()
            return posts
        except Error:
            # Fallback query
            cursor.execute('''
                SELECT p.PostID, p.UserID, p.Content, p.Media, p.Timestamp,
                       u.Username, u.Avatar,
                       (SELECT COUNT(*) FROM Likes l WHERE l.PostID = p.PostID) AS LikeCount,
                       (SELECT COUNT(*) FROM Comments c WHERE c.PostID = p.PostID) AS CommentCount
                FROM Posts p
                JOIN Users u ON p.UserID = u.UserID
                WHERE p.UserID = %s OR p.UserID IN (
                    SELECT FollowingUserID FROM Followers WHERE FollowerUserID = %s
                )
                ORDER BY p.Timestamp DESC LIMIT %s
            ''', (user_id, user_id, limit))
            posts = cursor.fetchall()
        finally:
            cursor.close()
            conn.close()
        return posts
    return []

def create_post(user_id, content, media=None):
    """Create new post"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.callproc('CreatePost', [user_id, content, media])
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

def toggle_like(user_id, post_id):
    """Toggle like on post"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.callproc('ToggleLike', [user_id, post_id])
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

def get_post_comments(post_id):
    """Get comments for a post"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('GetPostComments', [post_id])
        comments = []
        for result in cursor.stored_results():
            comments = result.fetchall()
        cursor.close()
        conn.close()
        return comments
    return []

def add_comment(post_id, user_id, content):
    """Add comment to post"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.callproc('AddComment', [post_id, user_id, content])
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

def get_user_profile(user_id, viewer_id):
    """Get user profile"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT u.UserID, u.Username, u.Email, u.CreatedAt,
                   u.Bio, u.Avatar,
                   (SELECT COUNT(*) FROM Followers f1 WHERE f1.FollowingUserID = u.UserID) AS FollowerCount,
                   (SELECT COUNT(*) FROM Followers f2 WHERE f2.FollowerUserID = u.UserID) AS FollowingCount,
                   (SELECT COUNT(*) FROM Posts po WHERE po.UserID = u.UserID) AS PostCount,
                   EXISTS(SELECT 1 FROM Followers f WHERE f.FollowerUserID = %s AND f.FollowingUserID = u.UserID) AS IsFollowedByViewer
            FROM Users u
            WHERE u.UserID = %s
        ''', (viewer_id, user_id))
        profile = cursor.fetchone()
        cursor.close()
        conn.close()
        return profile
    return None

def toggle_follow(follower_id, following_id):
    """Toggle follow"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.callproc('ToggleFollow', [follower_id, following_id])
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

def search_users(query):
    """Search users"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('SearchUsers', [query])
        users = []
        for result in cursor.stored_results():
            users = result.fetchall()
        cursor.close()
        conn.close()
        return users
    return []

def get_user_conversations(user_id):
    """Get all conversations for a user"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT DISTINCT
                CASE 
                    WHEN m.SenderID = %s THEN m.ReceiverID
                    ELSE m.SenderID
                END AS OtherUserID,
                u.Username AS OtherUsername,
                u.Avatar AS OtherAvatar,
                (
                    SELECT Content
                    FROM Messages
                    WHERE (SenderID = %s AND ReceiverID = OtherUserID)
                       OR (SenderID = OtherUserID AND ReceiverID = %s)
                    ORDER BY Timestamp DESC
                    LIMIT 1
                ) AS LastMessage,
                (
                    SELECT Timestamp
                    FROM Messages
                    WHERE (SenderID = %s AND ReceiverID = OtherUserID)
                       OR (SenderID = OtherUserID AND ReceiverID = %s)
                    ORDER BY Timestamp DESC
                    LIMIT 1
                ) AS LastMessageTime,
                (
                    SELECT COUNT(*)
                    FROM Messages
                    WHERE SenderID = OtherUserID AND ReceiverID = %s AND SeenStatus = FALSE
                ) AS UnreadCount
            FROM Messages m
            JOIN Users u ON (
                CASE 
                    WHEN m.SenderID = %s THEN m.ReceiverID
                    ELSE m.SenderID
                END = u.UserID
            )
            WHERE m.SenderID = %s OR m.ReceiverID = %s
            ORDER BY LastMessageTime DESC
        ''', (user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id))
        conversations = cursor.fetchall()
        cursor.close()
        conn.close()
        return conversations
    return []

def get_conversation_messages(user1_id, user2_id):
    """Get messages between two users"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT 
                m.MessageID,
                m.SenderID,
                m.ReceiverID,
                m.Content,
                m.Timestamp,
                m.SeenStatus,
                u.Username AS SenderUsername,
                u.Avatar AS SenderAvatar
            FROM Messages m
            JOIN Users u ON m.SenderID = u.UserID
            WHERE (m.SenderID = %s AND m.ReceiverID = %s)
               OR (m.SenderID = %s AND m.ReceiverID = %s)
            ORDER BY m.Timestamp ASC
        ''', (user1_id, user2_id, user2_id, user1_id))
        messages = cursor.fetchall()
        
        # Mark received messages as seen
        cursor.execute('''
            UPDATE Messages 
            SET SeenStatus = TRUE 
            WHERE SenderID = %s AND ReceiverID = %s AND SeenStatus = FALSE
        ''', (user2_id, user1_id))
        conn.commit()
        
        cursor.close()
        conn.close()
        return messages
    return []

def send_message(sender_id, receiver_id, content):
    """Send a message"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO Messages (SenderID, ReceiverID, Content, Timestamp, SeenStatus)
            VALUES (%s, %s, %s, NOW(), FALSE)
        ''', (sender_id, receiver_id, content))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

def get_followers(user_id):
    """Get users who follow the current user"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT u.UserID, u.Username, u.Avatar, u.Bio
            FROM Users u
            JOIN Followers f ON u.UserID = f.FollowerUserID
            WHERE f.FollowingUserID = %s
            ORDER BY u.Username
        ''', (user_id,))
        followers = cursor.fetchall()
        cursor.close()
        conn.close()
        return followers
    return []

def get_following(user_id):
    """Get users that the current user follows"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT u.UserID, u.Username, u.Avatar, u.Bio
            FROM Users u
            JOIN Followers f ON u.UserID = f.FollowingUserID
            WHERE f.FollowerUserID = %s
            ORDER BY u.Username
        ''', (user_id,))
        following = cursor.fetchall()
        cursor.close()
        conn.close()
        return following
    return []

def get_user_posts(user_id):
    """Get posts by a specific user"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT p.PostID, p.UserID, p.Content, p.Media, p.Timestamp,
                   u.Username, u.Avatar,
                   (SELECT COUNT(*) FROM Likes l WHERE l.PostID = p.PostID) AS LikeCount,
                   (SELECT COUNT(*) FROM Comments c WHERE c.PostID = p.PostID) AS CommentCount
            FROM Posts p
            JOIN Users u ON p.UserID = u.UserID
            WHERE p.UserID = %s
            ORDER BY p.Timestamp DESC
        ''', (user_id,))
        posts = cursor.fetchall()
        cursor.close()
        conn.close()
        return posts
    return []

def create_story(user_id, media_url, media_type='image'):
    """Create a new story"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO Stories (UserID, MediaURL, MediaType, CreatedAt, ExpiresAt)
            VALUES (%s, %s, %s, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))
        ''', (user_id, media_url, media_type))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

def get_active_stories(user_id):
    """Get active stories from followed users"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT 
                s.StoryID,
                s.UserID,
                s.MediaURL,
                s.MediaType,
                s.CreatedAt,
                s.ExpiresAt,
                u.Username,
                u.Avatar,
                EXISTS(
                    SELECT 1 FROM ViewedStories vs 
                    WHERE vs.StoryID = s.StoryID AND vs.ViewerUserID = %s
                ) AS IsViewed
            FROM Stories s
            JOIN Users u ON s.UserID = u.UserID
            WHERE s.UserID IN (
                SELECT FollowingUserID FROM Followers WHERE FollowerUserID = %s
                UNION
                SELECT %s
            )
            AND s.ExpiresAt > NOW()
            ORDER BY s.CreatedAt DESC
        ''', (user_id, user_id, user_id))
        stories = cursor.fetchall()
        cursor.close()
        conn.close()
        return stories
    return []

def mark_story_viewed(story_id, viewer_id):
    """Mark a story as viewed"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT IGNORE INTO ViewedStories (StoryID, ViewerUserID, ViewedAt)
            VALUES (%s, %s, NOW())
        ''', (story_id, viewer_id))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

# Main App
def main():
    # Sidebar
    with st.sidebar:
        st.title("🚀 Social Media")
        
        if st.session_state.user_id:
            st.success(f"Welcome, {st.session_state.username}!")
            
            menu = st.radio("Navigation", ["Feed", "Stories", "Profile", "Search", "Messages"])
            
            if st.button("Logout"):
                st.session_state.user_id = None
                st.session_state.username = None
                st.rerun()
        else:
            menu = "Login"
    
    # Main content
    if not st.session_state.user_id:
        show_login_page()
    else:
        if menu == "Feed":
            show_feed_page()
        elif menu == "Stories":
            show_stories_page()
        elif menu == "Profile":
            show_profile_page()
        elif menu == "Search":
            show_search_page()
        elif menu == "Messages":
            show_messages_page()

def show_login_page():
    """Login/Register page"""
    tab1, tab2 = st.tabs(["Login", "Register"])
    
    with tab1:
        st.header("Login")
        username = st.text_input("Username", key="login_username")
        password = st.text_input("Password", type="password", key="login_password")
        
        if st.button("Login", type="primary"):
            if login_user(username, password):
                st.success("Login successful!")
                st.rerun()
            else:
                st.error("Invalid credentials")
    
    with tab2:
        st.header("Register")
        reg_username = st.text_input("Username", key="reg_username")
        reg_email = st.text_input("Email", key="reg_email")
        reg_password = st.text_input("Password", type="password", key="reg_password")
        reg_bio = st.text_area("Bio (optional)", key="reg_bio")
        
        if st.button("Register", type="primary"):
            if register_user(reg_username, reg_email, reg_password, reg_bio):
                st.success("Registration successful! Please login.")
            else:
                st.error("Registration failed")

def show_feed_page():
    """Feed page"""
    st.header("📰 Your Feed")
    
    # Create post section
    with st.expander("✍️ Create Post", expanded=False):
        post_content = st.text_area("What's on your mind?", key="new_post")
        
        # Media upload options
        media_option = st.radio("Add media", ["None", "URL", "Upload Image"], horizontal=True)
        
        post_media = None
        if media_option == "URL":
            post_media = st.text_input("Image URL", key="new_post_media")
        elif media_option == "Upload Image":
            uploaded_file = st.file_uploader("Choose an image", type=['png', 'jpg', 'jpeg', 'gif'])
            if uploaded_file:
                # For demo purposes, using a placeholder URL
                # In production, you'd upload to a server and get the URL
                st.image(uploaded_file, caption="Preview", use_container_width=True)
                post_media = f"https://via.placeholder.com/800x600.png?text={uploaded_file.name}"
                st.info("Note: Image upload simulation. In production, this would upload to cloud storage.")
        
        if st.button("Post", type="primary"):
            if post_content:
                if create_post(st.session_state.user_id, post_content, post_media or None):
                    st.success("Post created!")
                    st.rerun()
            else:
                st.warning("Please enter some content")
    
    # Display feed
    posts = get_user_feed(st.session_state.user_id)
    
    if not posts:
        st.info("No posts yet. Follow some users or create your first post!")
    
    for post in posts:
        with st.container():
            col1, col2 = st.columns([1, 15])
            
            with col1:
                if post.get('Avatar'):
                    st.image(post['Avatar'], width=50)
                else:
                    st.write("👤")
            
            with col2:
                st.markdown(f"**{post['Username']}**")
                st.caption(str(post.get('Timestamp', '')))
                st.write(post['Content'])
                
                if post.get('Media'):
                    st.image(post['Media'], use_container_width=True)
                
                # Actions
                col_like, col_comment, col_share = st.columns([1, 1, 8])
                
                with col_like:
                    if st.button(f"❤️ {post.get('LikeCount', 0)}", key=f"like_{post['PostID']}"):
                        toggle_like(st.session_state.user_id, post['PostID'])
                        st.rerun()
                
                with col_comment:
                    if st.button(f"💬 {post.get('CommentCount', 0)}", key=f"comment_btn_{post['PostID']}"):
                        st.session_state[f"show_comments_{post['PostID']}"] = True
                
                # Show comments
                if st.session_state.get(f"show_comments_{post['PostID']}", False):
                    comments = get_post_comments(post['PostID'])
                    
                    with st.expander("Comments", expanded=True):
                        for comment in comments:
                            st.markdown(f"**{comment['Username']}**: {comment['Content']}")
                            st.caption(str(comment.get('Timestamp', '')))
                        
                        # Add comment
                        new_comment = st.text_input("Add a comment", key=f"new_comment_{post['PostID']}")
                        if st.button("Comment", key=f"submit_comment_{post['PostID']}"):
                            if new_comment:
                                add_comment(post['PostID'], st.session_state.user_id, new_comment)
                                st.rerun()
            
            st.divider()

def show_stories_page():
    """Stories page"""
    st.header("📸 Stories")
    
    # Create story section
    with st.expander("➕ Create Story", expanded=False):
        story_option = st.radio("Choose media type", ["URL", "Upload Image"], horizontal=True)
        
        story_media = None
        if story_option == "URL":
            story_media = st.text_input("Image/Video URL", key="new_story_url")
        else:
            uploaded_file = st.file_uploader("Choose an image", type=['png', 'jpg', 'jpeg', 'gif'], key="story_upload")
            if uploaded_file:
                st.image(uploaded_file, caption="Preview", width=300)
                # Simulated URL for demo
                story_media = f"https://via.placeholder.com/600x800.png?text={uploaded_file.name}"
                st.info("Note: Image upload simulation. In production, this would upload to cloud storage.")
        
        if st.button("Post Story", type="primary"):
            if story_media:
                if create_story(st.session_state.user_id, story_media):
                    st.success("Story posted! It will expire in 24 hours.")
                    st.rerun()
            else:
                st.warning("Please add an image or video")
    
    st.divider()
    
    # Display stories
    stories = get_active_stories(st.session_state.user_id)
    
    if stories:
        # Group stories by user
        stories_by_user = {}
        for story in stories:
            user_id = story['UserID']
            if user_id not in stories_by_user:
                stories_by_user[user_id] = {
                    'Username': story['Username'],
                    'Avatar': story['Avatar'],
                    'stories': []
                }
            stories_by_user[user_id]['stories'].append(story)
        
        st.subheader("Active Stories")
        
        # Display stories in a grid
        cols = st.columns(4)
        col_idx = 0
        
        for user_id, user_data in stories_by_user.items():
            with cols[col_idx % 4]:
                # Check if user has unviewed stories
                has_unviewed = any(not s['IsViewed'] for s in user_data['stories'])
                border_color = "#0084ff" if has_unviewed else "#gray"
                
                # Story thumbnail
                if user_data['Avatar']:
                    st.image(user_data['Avatar'], width=80)
                else:
                    st.write("👤")
                
                username_display = f"**{user_data['Username']}**" if has_unviewed else user_data['Username']
                st.markdown(username_display)
                
                # View stories button
                if st.button(f"View ({len(user_data['stories'])})", key=f"view_story_{user_id}"):
                    st.session_state['viewing_stories'] = user_data['stories']
                    st.session_state['current_story_idx'] = 0
                    st.rerun()
            
            col_idx += 1
        
        # Story viewer
        if 'viewing_stories' in st.session_state and st.session_state['viewing_stories']:
            st.divider()
            stories_list = st.session_state['viewing_stories']
            current_idx = st.session_state.get('current_story_idx', 0)
            
            if 0 <= current_idx < len(stories_list):
                current_story = stories_list[current_idx]
                
                # Mark as viewed
                mark_story_viewed(current_story['StoryID'], st.session_state.user_id)
                
                st.subheader(f"Story by {current_story['Username']}")
                st.caption(f"Posted: {current_story['CreatedAt']}")
                
                # Display story media
                if current_story['MediaType'] == 'image':
                    st.image(current_story['MediaURL'], use_container_width=True)
                else:
                    st.video(current_story['MediaURL'])
                
                # Navigation
                col_prev, col_info, col_next, col_close = st.columns([1, 2, 1, 1])
                
                with col_prev:
                    if current_idx > 0:
                        if st.button("⬅️ Previous"):
                            st.session_state['current_story_idx'] -= 1
                            st.rerun()
                
                with col_info:
                    st.write(f"Story {current_idx + 1} of {len(stories_list)}")
                
                with col_next:
                    if current_idx < len(stories_list) - 1:
                        if st.button("Next ➡️"):
                            st.session_state['current_story_idx'] += 1
                            st.rerun()
                
                with col_close:
                    if st.button("✖️ Close"):
                        del st.session_state['viewing_stories']
                        del st.session_state['current_story_idx']
                        st.rerun()
    else:
        st.info("No active stories. Create one or follow users to see their stories!")

def show_profile_page():
    """Profile page with user posts"""
    st.header("👤 Profile")
    
    profile = get_user_profile(st.session_state.user_id, st.session_state.user_id)
    
    if profile:
        col1, col2 = st.columns([1, 3])
        
        with col1:
            if profile.get('Avatar'):
                st.image(profile['Avatar'], width=150)
            else:
                st.write("👤")
        
        with col2:
            st.title(profile['Username'])
            st.write(profile.get('Bio', 'No bio yet'))
            
            col_stats1, col_stats2, col_stats3 = st.columns(3)
            col_stats1.metric("Posts", profile.get('PostCount', 0))
            col_stats2.metric("Followers", profile.get('FollowerCount', 0))
            col_stats3.metric("Following", profile.get('FollowingCount', 0))
        
        st.divider()
        st.subheader("📝 My Posts")
        
        # Get and display user posts
        user_posts = get_user_posts(st.session_state.user_id)
        
        if user_posts:
            for post in user_posts:
                with st.container():
                    st.markdown(f"**Posted on:** {post.get('Timestamp', '')}")
                    st.write(post['Content'])
                    
                    if post.get('Media'):
                        st.image(post['Media'], use_container_width=True)
                    
                    # Post stats
                    col_like, col_comment, col_actions = st.columns([1, 1, 8])
                    with col_like:
                        st.write(f"❤️ {post.get('LikeCount', 0)}")
                    with col_comment:
                        st.write(f"💬 {post.get('CommentCount', 0)}")
                    
                    st.divider()
        else:
            st.info("No posts yet. Go to Feed to create your first post!")

def show_search_page():
    """Search page"""
    st.header("🔍 Search Users")
    
    query = st.text_input("Search for users")
    
    if query:
        users = search_users(query)
        
        if users:
            for user in users:
                col1, col2, col3 = st.columns([1, 6, 2])
                
                with col1:
                    if user.get('Avatar'):
                        st.image(user['Avatar'], width=50)
                    else:
                        st.write("👤")
                
                with col2:
                    st.markdown(f"**{user['Username']}**")
                    st.caption(user.get('Bio', ''))
                
                with col3:
                    if user['UserID'] != st.session_state.user_id:
                        if st.button("Follow", key=f"follow_{user['UserID']}"):
                            toggle_follow(st.session_state.user_id, user['UserID'])
                            st.success("Followed!")
                
                st.divider()
        else:
            st.info("No users found")

def show_messages_page():
    """Messages page with inbox and messaging"""
    st.header("💬 Messages")
    
    # Initialize session state for selected conversation
    if 'selected_conversation' not in st.session_state:
        st.session_state.selected_conversation = None
    if 'show_new_message' not in st.session_state:
        st.session_state.show_new_message = False
    
    # Get conversations
    conversations = get_user_conversations(st.session_state.user_id)
    
    # Layout: Sidebar for inbox, main area for conversation
    col_inbox, col_chat = st.columns([1, 2])
    
    with col_inbox:
        st.subheader("📥 Inbox")
        
        # New Message button
        if st.button("✉️ New Message", use_container_width=True, type="primary"):
            st.session_state.show_new_message = True
            st.session_state.selected_conversation = None
            st.rerun()
        
        st.divider()
        
        if conversations:
            for conv in conversations:
                # Create a container for each conversation
                unread_count = conv.get('UnreadCount', 0)
                is_unread = unread_count > 0
                
                # Style for unread messages
                if is_unread:
                    button_style = "🔴 "
                else:
                    button_style = ""
                
                button_label = f"{button_style}**{conv['OtherUsername']}**"
                if unread_count > 0:
                    button_label += f" ({unread_count})"
                
                # Display conversation button
                if st.button(
                    button_label,
                    key=f"conv_{conv['OtherUserID']}",
                    use_container_width=True,
                    type="secondary" if is_unread else "tertiary"
                ):
                    st.session_state.selected_conversation = conv['OtherUserID']
                    st.session_state.show_new_message = False
                    st.rerun()
                
                # Show preview of last message
                last_msg = conv.get('LastMessage', '')
                if last_msg:
                    preview = last_msg[:50] + "..." if len(last_msg) > 50 else last_msg
                    st.caption(preview)
                
                st.divider()
        else:
            st.info("No conversations yet. Start a new message!")
    
    with col_chat:
        # Show new message form
        if st.session_state.show_new_message:
            st.subheader("✉️ New Message")
            
            # Get followers to message
            followers = get_followers(st.session_state.user_id)
            following = get_following(st.session_state.user_id)
            
            # Combine and deduplicate
            all_users = {u['UserID']: u for u in followers + following}
            user_list = list(all_users.values())
            
            if user_list:
                user_options = {f"{u['Username']}": u['UserID'] for u in user_list}
                selected_user = st.selectbox(
                    "Select recipient",
                    options=list(user_options.keys())
                )
                
                message_content = st.text_area("Message", placeholder="Type your message here...")
                
                if st.button("Send Message", type="primary"):
                    if message_content and selected_user:
                        receiver_id = user_options[selected_user]
                        if send_message(st.session_state.user_id, receiver_id, message_content):
                            st.success("Message sent!")
                            st.session_state.selected_conversation = receiver_id
                            st.session_state.show_new_message = False
                            st.rerun()
                    else:
                        st.warning("Please enter a message")
            else:
                st.info("You need to follow someone or have followers to send messages.")
        
        # Show selected conversation
        elif st.session_state.selected_conversation:
            other_user_id = st.session_state.selected_conversation
            
            # Get other user's info
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("SELECT Username, Avatar FROM Users WHERE UserID = %s", (other_user_id,))
                other_user = cursor.fetchone()
                cursor.close()
                conn.close()
                
                if other_user:
                    st.subheader(f"💬 {other_user['Username']}")
                    
                    # Get messages
                    messages = get_conversation_messages(st.session_state.user_id, other_user_id)
                    
                    # Display messages
                    if messages:
                        # Create a scrollable container for messages
                        message_container = st.container()
                        with message_container:
                            for msg in messages:
                                is_sent = msg['SenderID'] == st.session_state.user_id
                                
                                if is_sent:
                                    # Sent message (right aligned)
                                    col1, col2 = st.columns([1, 3])
                                    with col2:
                                        st.markdown(f"""
                                        <div style='background-color: #0084ff; padding: 10px; border-radius: 15px; margin: 5px 0; text-align: right;'>
                                            <p style='margin: 0; color: white;'>{msg['Content']}</p>
                                            <small style='color: #e0e0e0;'>{str(msg['Timestamp'])}</small>
                                        </div>
                                        """, unsafe_allow_html=True)
                                else:
                                    # Received message (left aligned)
                                    col1, col2 = st.columns([3, 1])
                                    with col1:
                                        seen_indicator = "✓✓" if msg['SeenStatus'] else "✓"
                                        st.markdown(f"""
                                        <div style='background-color: #e4e6eb; padding: 10px; border-radius: 15px; margin: 5px 0;'>
                                            <p style='margin: 0; color: black;'>{msg['Content']}</p>
                                            <small style='color: #65676b;'>{str(msg['Timestamp'])} {seen_indicator}</small>
                                        </div>
                                        """, unsafe_allow_html=True)
                    else:
                        st.info("No messages yet. Start the conversation!")
                    
                    st.divider()
                    
                    # Message input
                    with st.form(key="message_form", clear_on_submit=True):
                        new_message = st.text_input("Type a message...", key="new_msg_input")
                        submit = st.form_submit_button("Send", type="primary", use_container_width=True)
                        
                        if submit and new_message:
                            if send_message(st.session_state.user_id, other_user_id, new_message):
                                st.rerun()
        else:
            st.info("👈 Select a conversation from the inbox or start a new message")

if __name__ == "__main__":
    main()
