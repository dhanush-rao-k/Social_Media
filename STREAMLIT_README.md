# Streamlit Frontend for Social Media Platform

## Quick Start

1. **Install Streamlit** (if not already installed):
```bash
pip install streamlit
```

2. **Run the Streamlit app**:
```bash
streamlit run streamlit_app.py
```

3. **Access the app**:
- Opens automatically in your browser at `http://localhost:8501`

## Features

### ✅ Implemented
- **Authentication**: Login and Register using existing stored procedures
- **Feed**: View posts from followed users and yourself
- **Create Posts**: Write posts with optional media URLs
- **Interactions**: Like posts and add comments
- **Profile**: View your profile with stats (posts, followers, following)
- **Search**: Find and follow other users

### 🚧 Coming Soon
- Direct messaging interface
- Stories viewing
- Profile editing
- Real-time updates

## Architecture

The Streamlit app connects directly to your MySQL database and uses the same stored procedures as the Flask app:
- `RegisterUser` - User registration
- `GetUserFeed` - Fetch personalized feed
- `CreatePost` - Create new posts
- `ToggleLike` - Like/unlike posts
- `AddComment` - Add comments
- `GetPostComments` - Fetch comments
- `ToggleFollow` - Follow/unfollow users
- `SearchUsers` - Search for users

## Running Both Apps

You can run both Flask and Streamlit simultaneously:

**Terminal 1 - Flask (Port 5000)**:
```bash
python app.py
```

**Terminal 2 - Streamlit (Port 8501)**:
```bash
streamlit run streamlit_app.py
```

Both apps share the same database, so changes in one are reflected in the other!

## Demo Accounts

Use these accounts from `schema.sql`:
- Username: `john_doe` | Password: `password123`
- Username: `jane_smith` | Password: `password123`
- Username: `tech_guru` | Password: `password123`

## Customization

Edit `streamlit_app.py` to:
- Change the theme and styling
- Add more features
- Customize the layout
- Add charts and analytics
