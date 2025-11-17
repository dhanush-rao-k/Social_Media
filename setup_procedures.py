"""
Setup script to apply enhanced stored procedures to MySQL database
"""

import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'SOCIAL_MEDIA')
}

def execute_sql_file(filepath):
    """Execute SQL file with multiple statements"""
    try:
        # Read SQL file
        with open(filepath, 'r', encoding='utf-8') as file:
            sql_content = file.read()
        
        # Connect to database
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Split by delimiter and execute each statement
        statements = sql_content.split('DELIMITER')[0].split(';')
        
        # For files with DELIMITER //, we need to handle them differently
        if 'DELIMITER //' in sql_content:
            # Split into sections
            parts = sql_content.split('DELIMITER')
            
            for part in parts:
                part = part.strip()
                if not part or part == '//':
                    continue
                    
                if part == ';':
                    continue
                
                # Execute the part
                if part:
                    try:
                        # Handle multi-statement parts
                        if '//' in part:
                            sub_statements = part.split('//')
                            for stmt in sub_statements:
                                stmt = stmt.strip()
                                if stmt and stmt not in [';', '']:
                                    cursor.execute(stmt)
                        else:
                            cursor.execute(part)
                    except Error as e:
                        if 'already exists' not in str(e):
                            print(f"Warning executing statement: {e}")
        else:
            # Simple file with semicolon-separated statements
            for statement in statements:
                statement = statement.strip()
                if statement:
                    try:
                        cursor.execute(statement)
                    except Error as e:
                        if 'already exists' not in str(e):
                            print(f"Warning: {e}")
        
        connection.commit()
        print(f"✓ Successfully executed: {filepath}")
        
        cursor.close()
        connection.close()
        
        return True
        
    except Error as e:
        print(f"✗ Error executing {filepath}: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def main():
    """Main setup function"""
    print("=" * 60)
    print("MySQL Enhanced Procedures Setup")
    print("=" * 60)
    
    # Check if database exists
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = connection.cursor()
        cursor.execute(f"SHOW DATABASES LIKE '{DB_CONFIG['database']}'")
        result = cursor.fetchone()
        
        if not result:
            print(f"✗ Database '{DB_CONFIG['database']}' does not exist!")
            print("Please run the schema.sql first to create the database.")
            cursor.close()
            connection.close()
            return
        
        cursor.close()
        connection.close()
        print(f"✓ Database '{DB_CONFIG['database']}' found")
        
    except Error as e:
        print(f"✗ Database connection error: {e}")
        return
    
    # Apply enhanced procedures
    procedures_file = os.path.join('database', 'enhanced_procedures.sql')
    
    if os.path.exists(procedures_file):
        print(f"\nApplying enhanced procedures...")
        if execute_sql_file(procedures_file):
            print("\n" + "=" * 60)
            print("✓ Setup completed successfully!")
            print("=" * 60)
            print("\nYou can now run the Flask application:")
            print("  python app.py")
        else:
            print("\n✗ Setup failed!")
    else:
        print(f"✗ File not found: {procedures_file}")

if __name__ == "__main__":
    main()
