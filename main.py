"""
Price Scanner System - FastAPI Application with Database Authentication
"""
import os
import socket
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
from database import get_product_by_barcode, test_connection, verify_user_credentials
import secrets

# Load environment variables
load_dotenv()

# Get configuration from environment
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))

# Initialize FastAPI
app = FastAPI(
    title="Price Scanner System",
    version="1.0.0",
    description="Simple barcode scanner for price checking with database authentication"
)

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize templates
templates = Jinja2Templates(directory="templates")

# Initialize HTTP Basic Auth
security = HTTPBasic()

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Create a socket and connect to a remote address to determine local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # Connect to Google's public DNS (doesn't actually send data)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception:
        # Fallback to localhost if detection fails
        return "localhost"

def verify_credentials(username: str, password: str) -> dict:
    """Verify username and password against database"""
    return verify_user_credentials(username, password)

def get_current_user(request: Request):
    """Check if user is authenticated via session"""
    if not request.session.get("authenticated"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return request.session.get("username")

@app.on_event("startup")
async def startup_event():
    """Test database connection on startup"""
    print("Starting Price Scanner System with Database Authentication...")
    is_connected, message = test_connection()
    if is_connected:
        print("✅ Database connection successful")
        print("🔐 Authentication: Database-based user management")
    else:
        print(f"❌ Database connection failed: {message}")
    
    # Display access information
    local_ip = get_local_ip()
    protocol = "https" if (os.path.exists("cert.pem") and os.path.exists("key.pem")) else "http"
    print(f"🌐 Server accessible at:")
    print(f"   - Local: {protocol}://localhost:{PORT}")
    print(f"   - Network: {protocol}://{local_ip}:{PORT}")

@app.get("/", response_class=HTMLResponse)
async def scanner_page(request: Request):
    """Main scanner interface - requires authentication"""
    # Check if user is authenticated
    if not request.session.get("authenticated"):
        # Show login page
        return templates.TemplateResponse("index.html", {
            "request": request, 
            "show_login": True
        })
    
    # Show scanner interface
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "show_login": False,
        "username": request.session.get("username")
    })

@app.post("/api/login")
async def login(request: Request):
    """Handle login"""
    try:
        # Get form data
        form_data = await request.json()
        username = form_data.get("username", "").strip()
        password = form_data.get("password", "")
        
        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="يرجى إدخال اسم المستخدم وكلمة المرور"
            )
        
        # Verify credentials against database
        auth_result = verify_credentials(username, password)
        
        if auth_result["success"]:
            # Set session
            request.session["authenticated"] = True
            request.session["username"] = auth_result["username"]
            request.session["full_name"] = auth_result["full_name"]
            
            return {
                "success": True,
                "message": "تم تسجيل الدخول بنجاح",
                "username": auth_result["username"],
                "full_name": auth_result["full_name"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=auth_result.get("error", "اسم المستخدم أو كلمة المرور غير صحيحة")
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"خطأ في تسجيل الدخول: {str(e)}"
        )

@app.post("/api/logout")
async def logout(request: Request):
    """Handle logout"""
    try:
        # Clear session
        request.session.clear()
        return {"success": True, "message": "تم تسجيل الخروج بنجاح"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"خطأ في تسجيل الخروج: {str(e)}"
        )

@app.get("/api/auth-status")
async def auth_status(request: Request):
    """Check authentication status"""
    return {
        "authenticated": request.session.get("authenticated", False),
        "username": request.session.get("username"),
        "full_name": request.session.get("full_name")
    }

@app.get("/api/price/{barcode}")
async def get_price(barcode: str, current_user: str = Depends(get_current_user)):
    """Get product price by barcode - requires authentication"""
    try:
        # Validate barcode
        if not barcode or len(barcode.strip()) == 0:
            raise HTTPException(status_code=400, detail="Barcode cannot be empty")
        
        # Clean barcode
        clean_barcode = barcode.strip()
        
        # Get product from database
        product = get_product_by_barcode(clean_barcode)
        
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/app-url")
async def get_app_url(current_user: str = Depends(get_current_user)):
    """Get the application access URL - requires authentication"""
    try:
        # Get local IP address
        local_ip = get_local_ip()
        
        # Determine protocol (HTTPS if certificates exist, HTTP otherwise)
        protocol = "https" if (os.path.exists("cert.pem") and os.path.exists("key.pem")) else "http"
        
        # Construct the URL
        app_url = f"{protocol}://{local_ip}:{PORT}"
        
        return {
            "url": app_url,
            "local_ip": local_ip,
            "port": PORT,
            "protocol": protocol,
            "ssl_enabled": protocol == "https"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get app URL: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint - no authentication required"""
    is_connected, message = test_connection()
    
    return {
        "status": "healthy" if is_connected else "unhealthy",
        "database": "connected" if is_connected else "disconnected",
        "message": message
    }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Check if SSL certificate files exist
    ssl_keyfile = "key.pem" if os.path.exists("key.pem") else None
    ssl_certfile = "cert.pem" if os.path.exists("cert.pem") else None
    
    if ssl_keyfile and ssl_certfile:
        print(f"Starting HTTPS server on {HOST}:{PORT}")
        print("SSL certificate files found - enabling HTTPS")
        uvicorn.run(
            "main:app", 
            host=HOST, 
            port=PORT, 
            reload=DEBUG,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile
        )
    else:
        print(f"Starting HTTP server on {HOST}:{PORT}")
        print("No SSL certificate files found - using HTTP")
        uvicorn.run("main:app", host=HOST, port=PORT, reload=DEBUG)