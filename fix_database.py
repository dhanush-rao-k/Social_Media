"""
Quick fix script to create missing Profile table
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

def create_profile_table():
    """Create the missing Profile table"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Creating Profile table...")
        
        # Create Profile table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS Profile (
            ProfileID INT PRIMARY KEY AUTO_INCREMENT,
            UserID INT UNIQUE NOT NULL,
            Bio TEXT,
            ProfilePicture VARCHAR(255),
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
        );
        """
        
        cursor.execute(create_table_sql)
        connection.commit()
        print("✓ Profile table created successfully!")
        
        # Create profiles for existing users
        print("\nCreating profiles for existing users...")
        create_profiles_sql = """
        INSERT IGNORE INTO Profile (UserID, Bio, CreatedAt)
        SELECT UserID, Bio, CreatedAt FROM Users;
        """
        
        cursor.execute(create_profiles_sql)
        connection.commit()
        print(f"✓ Created {cursor.rowcount} profile records!")
        
        cursor.close()
        connection.close()
        
        print("\n✓ Database fix completed successfully!")
        print("You can now run: python app.py")
        
    except Error as e:
        print(f"✗ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Database Fix Script - Creating Profile Table")
    print("=" * 60)
    create_profile_table()
