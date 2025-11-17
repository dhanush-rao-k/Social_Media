"""
Debug script to test login credentials
"""
import mysql.connector
from mysql.connector import Error
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'SOCIAL_MEDIA')
}

def test_login():
    """Test login for johndoe"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        
        username = "john_doe"
        password = "password123"
        
        print(f"Testing login for: {username}")
        print(f"Password: {password}")
        print("-" * 60)
        
        # Get user
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
        
        if user:
            print(f"✓ User found: {user['Username']}")
            print(f"  UserID: {user['UserID']}")
            print(f"  Email: {user['Email']}")
            print(f"  PasswordHash: {user['PasswordHash'][:50]}...")
            print()
            
            # Test bcrypt
            try:
                stored_hash = user['PasswordHash']
                if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$') or stored_hash.startswith('$2y$'):
                    print("✓ Password hash format looks correct (bcrypt)")
                    
                    # Try to verify
                    result = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
                    
                    if result:
                        print("✓ Password verification SUCCESSFUL!")
                    else:
                        print("✗ Password verification FAILED!")
                        print("  The stored hash doesn't match the password")
                else:
                    print("✗ Password hash doesn't look like bcrypt format")
                    print(f"  Hash starts with: {stored_hash[:10]}")
                    
            except Exception as e:
                print(f"✗ Error during bcrypt check: {e}")
        else:
            print(f"✗ User '{username}' not found in database")
        
        cursor.close()
        connection.close()
        
    except Error as e:
        print(f"✗ Database Error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("Login Debug Test")
    print("=" * 60)
    test_login()
