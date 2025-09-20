"""
Database connection using pyodbc with User Authentication - Simple Stock Implementation
"""
import os
import pyodbc
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")
DB_USE_WINDOWS_AUTH = os.getenv("DB_USE_WINDOWS_AUTH", "true").lower() == "true"
DB_USERNAME = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Product table and column names - SIMPLE APPROACH
PRODUCT_TABLE = os.getenv("PRODUCT_TABLE", "Products")
BARCODE_COLUMN = os.getenv("BARCODE_COLUMN", "Barcode")
NAME_COLUMN = os.getenv("NAME_COLUMN", "ProductName")
PRICE_COLUMN = os.getenv("PRICE_COLUMN", "Price")
STOCK_COLUMN = os.getenv("STOCK_COLUMN", "qty")  # Just set a default like we do for other columns

# User table and column names
USER_TABLE = os.getenv("USER_TABLE", "users")
USER_USERNAME_COLUMN = os.getenv("USER_USERNAME_COLUMN", "username")
USER_PASSWORD_COLUMN = os.getenv("USER_PASSWORD_COLUMN", "password")
USER_FULLNAME_COLUMN = os.getenv("USER_FULLNAME_COLUMN", "full_name")

def get_connection_string():
    """Build ODBC connection string"""
    if DB_USE_WINDOWS_AUTH:
        return f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE={DB_NAME};Trusted_Connection=yes;"
    else:
        return f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USERNAME};PWD={DB_PASSWORD};"

def get_db_connection():
    """Get database connection"""
    try:
        connection_string = get_connection_string()
        print(f"Attempting connection with: {connection_string.replace(DB_PASSWORD or '', '***')}")
        conn = pyodbc.connect(connection_string, timeout=10)
        return conn
    except Exception as e:
        raise Exception(f"Database connection failed: {str(e)}")

def test_connection():
    """Test database connection"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 AS test")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result and result[0] == 1:
            return True, "Connection successful"
        else:
            return False, "Connection test failed"
    except Exception as e:
        return False, str(e)

def hash_password(password: str) -> str:
    """Simple password hashing using SHA-256"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_user_credentials(username: str, password: str):
    """Verify user credentials against database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query using configured column names
        query = f"""
        SELECT 
            {USER_USERNAME_COLUMN} as username,
            {USER_PASSWORD_COLUMN} as password,
            {USER_FULLNAME_COLUMN} as full_name
        FROM {USER_TABLE}
        WHERE {USER_USERNAME_COLUMN} = ?
        """
        
        cursor.execute(query, (username,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            stored_password = result[1]
            full_name = result[2] if result[2] else username
            
            # Check if password matches (support both plain text and hashed)
            password_matches = False
            
            # Try hashed password first
            hashed_input = hash_password(password)
            if stored_password == hashed_input:
                password_matches = True
            # Fallback to plain text comparison (less secure, for development)
            elif stored_password == password:
                password_matches = True
            
            if password_matches:
                return {
                    "success": True,
                    "username": result[0],
                    "full_name": full_name
                }
        
        return {"success": False, "error": "Invalid username or password"}
        
    except Exception as e:
        print(f"Database authentication failed: {str(e)}")
        return {"success": False, "error": "Authentication system unavailable"}

def get_user_by_username(username: str):
    """Get user information by username"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = f"""
        SELECT 
            {USER_USERNAME_COLUMN} as username,
            {USER_FULLNAME_COLUMN} as full_name
        FROM {USER_TABLE}
        WHERE {USER_USERNAME_COLUMN} = ?
        """
        
        cursor.execute(query, (username,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            return {
                "username": result[0],
                "full_name": result[1] if result[1] else result[0]
            }
        
        return None
        
    except Exception as e:
        print(f"Error fetching user: {str(e)}")
        return None

def get_product_by_barcode(barcode: str):
    """Get product by barcode - SIMPLE APPROACH like other columns"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Simple query just like we do for name, price, barcode
        query = f"""
        SELECT 
            {NAME_COLUMN} as product_name,
            {PRICE_COLUMN} as price,
            {STOCK_COLUMN} as stock_qty,
            {BARCODE_COLUMN} as barcode
        FROM {PRODUCT_TABLE}
        WHERE {BARCODE_COLUMN} = ?
        """
        
        cursor.execute(query, (barcode,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            return {
                "product_name": result[0] if result[0] else "Unknown Product",
                "price": float(result[1]) if result[1] else 0.0,
                "stock_qty": int(result[2]) if result[2] is not None else 0,
                "barcode": result[3] if result[3] else barcode,
                "currency": "USD"
            }
        else:
            return None
            
    except Exception as e:
        # If database connection fails, return mock data for testing
        print(f"Database query failed, using mock data: {str(e)}")
        
        mock_products = {
            "123456789012": {
                "product_name": "Coca Cola 330ml",
                "price": 2.50,
                "stock_qty": 150,
                "barcode": "123456789012",
                "currency": "USD"
            },
            "234567890123": {
                "product_name": "Samsung Galaxy Charger",
                "price": 25.99,
                "stock_qty": 45,
                "barcode": "234567890123",
                "currency": "USD"
            }
        }
        
        if barcode in mock_products:
            return mock_products[barcode]
        else:
            return None

# Compatibility function for main.py
def get_db():
    """Compatibility function (not used with direct connection)"""
    pass