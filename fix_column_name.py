"""
Fix script to rename Password column to PasswordHash in Users table
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

def fix_column_name():
    """Rename Password to PasswordHash to match stored procedures"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Fixing Users table column name...")
        
        # Check if Password column exists
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'SOCIAL_MEDIA' 
            AND TABLE_NAME = 'Users' 
            AND COLUMN_NAME = 'Password'
        """)
        
        if cursor.fetchone():
            print("✓ Found 'Password' column, renaming to 'PasswordHash'...")
            
            # Rename column
            cursor.execute("""
                ALTER TABLE Users 
                CHANGE COLUMN Password PasswordHash VARCHAR(255) NOT NULL
            """)
            connection.commit()
            print("✓ Column renamed successfully!")
        else:
            print("✓ Column already named 'PasswordHash'")
        
        cursor.close()
        connection.close()
        
        print("\n✓ Database fix completed!")
        print("You can now run: python app.py")
        
    except Error as e:
        print(f"✗ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Database Fix - Rename Password to PasswordHash")
    print("=" * 60)
    fix_column_name()
