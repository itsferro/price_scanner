"""
Database connection using pyodbc with User Authentication - Separate Stock Table Implementation
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

# Product table and column names
PRODUCT_TABLE = os.getenv("PRODUCT_TABLE", "dbo.items")
BARCODE_COLUMN = os.getenv("BARCODE_COLUMN", "PARCODE1")
NAME_COLUMN = os.getenv("NAME_COLUMN", "item_name")
PRICE_COLUMN = os.getenv("PRICE_COLUMN", "price")
PRODUCT_ID_COLUMN = os.getenv("PRODUCT_ID_COLUMN", "id")

# Stock table and column names (NEW)
STOCK_TABLE = os.getenv("STOCK_TABLE", "dbo.quntity")
STOCK_PRODUCT_ID_COLUMN = os.getenv("STOCK_PRODUCT_ID_COLUMN", "item_id")
STOCK_QUANTITY_COLUMN = os.getenv("STOCK_QUANTITY_COLUMN", "qunt")

# User table and column names
USER_TABLE = os.getenv("USER_TABLE", "dbo.employee")
USER_USERNAME_COLUMN = os.getenv("USER_USERNAME_COLUMN", "user_name")
USER_PASSWORD_COLUMN = os.getenv("USER_PASSWORD_COLUMN", "password")
USER_FULLNAME_COLUMN = os.getenv("USER_FULLNAME_COLUMN", "name")

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
    """Get product by barcode with stock from separate table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query with LEFT JOIN to get latest stock record
        # Fixed: Handle N/A logic in Python, not SQL to avoid data type conversion errors
        query = f"""
        SELECT 
            p.{NAME_COLUMN} as product_name,
            p.{PRICE_COLUMN} as price,
            p.{BARCODE_COLUMN} as barcode,
            p.{PRODUCT_ID_COLUMN} as product_id,
            latest_stock.{STOCK_QUANTITY_COLUMN} as stock_qty
        FROM {PRODUCT_TABLE} p
        LEFT JOIN (
            SELECT 
                s1.{STOCK_PRODUCT_ID_COLUMN},
                s1.{STOCK_QUANTITY_COLUMN}
            FROM {STOCK_TABLE} s1
            WHERE s1.id = (
                SELECT MAX(s2.id) 
                FROM {STOCK_TABLE} s2 
                WHERE s2.{STOCK_PRODUCT_ID_COLUMN} = s1.{STOCK_PRODUCT_ID_COLUMN}
            )
        ) latest_stock ON p.{PRODUCT_ID_COLUMN} = latest_stock.{STOCK_PRODUCT_ID_COLUMN}
        WHERE p.{BARCODE_COLUMN} = ?
        """
        
        print(f"Executing query: {query}")  # Debug logging
        cursor.execute(query, (barcode,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            # Handle stock quantity - convert to appropriate format
            raw_stock_qty = result[4]
            
            # If no stock record exists (None/NULL from LEFT JOIN), show N/A
            if raw_stock_qty is None:
                stock_qty = 'N/A'
            else:
                try:
                    # Convert to float, then to int if it's a whole number
                    stock_float = float(raw_stock_qty)
                    if stock_float == int(stock_float):
                        stock_qty = int(stock_float)
                    else:
                        stock_qty = round(stock_float, 3)  # Round to 3 decimal places
                except (ValueError, TypeError):
                    stock_qty = 'N/A'
            
            return {
                "product_name": result[0] if result[0] else "Unknown Product",
                "price": float(result[1]) if result[1] else 0.0,
                "stock_qty": stock_qty,
                "barcode": result[2] if result[2] else barcode,
                "currency": "USD"
            }
        else:
            return None
            
    except Exception as e:
        # Log the error for debugging - NO MORE MOCK DATA
        print(f"Database query failed: {str(e)}")
        print(f"Failed to get product for barcode: {barcode}")
        
        # Return None to indicate failure - no mock data
        return None

def test_stock_query():
    """Test function to verify stock query is working correctly"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Test query to see stock table structure
        test_query = f"""
        SELECT TOP 5
            p.{NAME_COLUMN} as product_name,
            p.{BARCODE_COLUMN} as barcode,
            s.{STOCK_QUANTITY_COLUMN} as stock_qty,
            s.id as stock_id
        FROM {PRODUCT_TABLE} p
        LEFT JOIN {STOCK_TABLE} s ON p.{PRODUCT_ID_COLUMN} = s.{STOCK_PRODUCT_ID_COLUMN}
        ORDER BY p.{PRODUCT_ID_COLUMN}
        """
        
        cursor.execute(test_query)
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        print("Stock query test results:")
        for row in results:
            print(f"Product: {row[0]}, Barcode: {row[1]}, Stock: {row[2]}, Stock ID: {row[3]}")
            
        return True, f"Found {len(results)} records"
        
    except Exception as e:
        return False, str(e)

# Compatibility function for main.py
def get_db():
    """Compatibility function (not used with direct connection)"""
    pass