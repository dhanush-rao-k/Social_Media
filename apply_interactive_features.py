"""
Apply interactive features SQL: adds LikeCount/CommentCount and triggers.
"""
import os
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

def column_exists(cur, table, column):
    cur.execute(
        """
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (DB_CONFIG['database'], table, column)
    )
    return cur.fetchone() is not None

def apply_triggers(cur):
    # Drop existing
    for trig in ['AfterLikeInsert','AfterLikeDelete','AfterCommentInsertCount','AfterCommentDeleteCount']:
        try:
            cur.execute(f"DROP TRIGGER IF EXISTS {trig}")
        except Exception:
            pass
    # Create new
    cur.execute(
        """
        CREATE TRIGGER AfterLikeInsert
        AFTER INSERT ON Likes
        FOR EACH ROW
        BEGIN
          UPDATE Posts SET LikeCount = LikeCount + 1 WHERE PostID = NEW.PostID;
        END
        """
    )
    cur.execute(
        """
        CREATE TRIGGER AfterLikeDelete
        AFTER DELETE ON Likes
        FOR EACH ROW
        BEGIN
          UPDATE Posts SET LikeCount = GREATEST(0, LikeCount - 1) WHERE PostID = OLD.PostID;
        END
        """
    )
    cur.execute(
        """
        CREATE TRIGGER AfterCommentInsertCount
        AFTER INSERT ON Comments
        FOR EACH ROW
        BEGIN
          UPDATE Posts SET CommentCount = CommentCount + 1 WHERE PostID = NEW.PostID;
        END
        """
    )
    cur.execute(
        """
        CREATE TRIGGER AfterCommentDeleteCount
        AFTER DELETE ON Comments
        FOR EACH ROW
        BEGIN
          UPDATE Posts SET CommentCount = GREATEST(0, CommentCount - 1) WHERE PostID = OLD.PostID;
        END
        """
    )

def apply_interactive():
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor()
    try:
        # Ensure columns exist
        if not column_exists(cur, 'Posts', 'LikeCount'):
            cur.execute('ALTER TABLE Posts ADD COLUMN LikeCount INT DEFAULT 0')
        if not column_exists(cur, 'Posts', 'CommentCount'):
            cur.execute('ALTER TABLE Posts ADD COLUMN CommentCount INT DEFAULT 0')

        # Backfill
        cur.execute('UPDATE Posts p LEFT JOIN (SELECT PostID, COUNT(*) c FROM Likes GROUP BY PostID) l ON l.PostID=p.PostID SET p.LikeCount = COALESCE(l.c,0)')
        cur.execute('UPDATE Posts p LEFT JOIN (SELECT PostID, COUNT(*) c FROM Comments GROUP BY PostID) c ON c.PostID=p.PostID SET p.CommentCount = COALESCE(c.c,0)')

        # Triggers
        apply_triggers(cur)

        conn.commit()
        print('✓ Applied interactive features (columns + triggers)')
    finally:
        cur.close(); conn.close()

if __name__ == '__main__':
    apply_interactive()
