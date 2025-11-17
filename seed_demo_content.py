"""
Seed demo content: posts, messages, and stories for all users
"""
import os
import random
from datetime import datetime

import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'SOCIAL_MEDIA')
}

POST_SAMPLES = [
    "Loving this new platform!",
    "What a great day to code Python 🐍",
    "Anyone up for coffee? ☕",
    "Database-first design is awesome!",
    "Hello world from the demo seed script."
]

STORY_IMAGES = [
    "https://placekitten.com/300/300",
    "https://picsum.photos/300/300",
    "https://placehold.co/300x300",
]


def get_users(cursor):
    cursor.execute("SELECT UserID, Username FROM Users ORDER BY UserID")
    return cursor.fetchall()


def seed_posts(cursor, user_id):
    for _ in range(3):
        content = random.choice(POST_SAMPLES)
        media = None
        try:
            cursor.callproc('CreatePost', [user_id, content, media])
        except Error as e:
            # fallback direct insert (depending on procedure signature)
            cursor.execute(
                "INSERT INTO Posts (UserID, Content, Media, Timestamp) VALUES (%s,%s,%s,NOW())",
                (user_id, content, media)
            )


def seed_messages(cursor, users):
    # pairwise send messages
    if len(users) < 2:
        return
    for i in range(len(users)-1):
        u1 = users[i]['UserID']
        u2 = users[i+1]['UserID']
        for msg in ("Hey there!", "How's it going?", "This is a demo message."):
            try:
                cursor.callproc('SendMessage', [u1, u2, msg])
            except Error:
                cursor.execute(
                    "INSERT INTO Messages (SenderID, ReceiverID, Content, Timestamp) VALUES (%s,%s,%s,NOW())",
                    (u1, u2, msg)
                )


def seed_stories(cursor, users):
    for u in users[:5]:
        media_url = random.choice(STORY_IMAGES)
        media_type = 'image'
        try:
            cursor.callproc('CreateStory', [u['UserID'], media_url, media_type])
        except Error:
            cursor.execute(
                "INSERT INTO Stories (UserID, MediaURL, MediaType, CreatedAt, ExpiresAt) VALUES (%s,%s,%s,NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))",
                (u['UserID'], media_url, media_type)
            )


def main():
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cur = cnx.cursor(dictionary=True)
        users = get_users(cur)
        print(f"Users found: {len(users)}")
        for u in users:
            seed_posts(cur, u['UserID'])
        seed_messages(cur, users)
        seed_stories(cur, users)
        cnx.commit()
        print("✓ Seeded posts, messages, and stories!")
    except Error as e:
        print(f"✗ Error: {e}")
    finally:
        try:
            cur.close(); cnx.close()
        except Exception:
            pass

if __name__ == '__main__':
    main()
