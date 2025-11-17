"""
Script to hash sample user passwords with bcrypt and update the database
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

def hash_sample_passwords():
    """Hash all sample user passwords with bcrypt"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Hashing sample user passwords with bcrypt...")
        
        # Plain text password that all sample users should have
        plain_password = "password123"
        
        # Hash with bcrypt (same as registration)
        hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
        hashed_str = hashed.decode('utf-8')
        
        print(f"✓ Generated bcrypt hash for 'password123'")
        
        # Update all users with the hashed password
        cursor.execute("""
            UPDATE Users 
            SET PasswordHash = %s
        """, (hashed_str,))
        
        connection.commit()
        
        print(f"✓ Updated {cursor.rowcount} user password(s)")
        
        cursor.close()
        connection.close()
        
        print("\n✓ All sample user passwords are now bcrypt hashed!")
        print("You can login with:")
        print("  Username: johndoe (or any other sample user)")
        print("  Password: password123")
        
    except Error as e:
        print(f"✗ Database Error: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Hash Sample User Passwords with Bcrypt")
    print("=" * 60)
    hash_sample_passwords()
