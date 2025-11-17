import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'SOCIAL_MEDIA')
}

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    print("Checking Users table structure:")
    cursor.execute("DESCRIBE Users")
    for row in cursor.fetchall():
        print(row)
    
    print("\n\nChecking RegisterUser procedure:")
    cursor.execute("SHOW CREATE PROCEDURE RegisterUser")
    for row in cursor.fetchall():
        print(row[2])
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
