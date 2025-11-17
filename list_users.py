"""
List all users in the database
"""
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'SOCIAL_MEDIA')
}

def list_users():
    """List all users"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                u.UserID,
                u.Username,
                u.Email,
                SUBSTRING(u.PasswordHash, 1, 50) as PasswordHashPreview
            FROM Users u
            ORDER BY u.UserID
        """)
        
        users = cursor.fetchall()
        
        print(f"Total users: {len(users)}\n")
        
        for user in users:
            print(f"UserID: {user['UserID']}")
            print(f"  Username: {user['Username']}")
            print(f"  Email: {user['Email']}")
            print(f"  Password: {user['PasswordHashPreview']}...")
            print()
        
        cursor.close()
        connection.close()
        
    except Error as e:
        print(f"✗ Database Error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("List All Users")
    print("=" * 60)
    list_users()
