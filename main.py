"""
Price Scanner System - FastAPI Application
"""
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from database import get_product_by_barcode, test_connection

# Load environment variables
load_dotenv()

# Get configuration from environment
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# Initialize FastAPI
app = FastAPI(
    title="Price Scanner System",
    version="1.0.0",
    description="Simple barcode scanner for price checking"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize templates
templates = Jinja2Templates(directory="templates")

@app.on_event("startup")
async def startup_event():
    """Test database connection on startup"""
    print("Starting Price Scanner System...")
    is_connected, message = test_connection()
    if is_connected:
        print("✅ Database connection successful")
    else:
        print(f"❌ Database connection failed: {message}")

@app.get("/", response_class=HTMLResponse)
async def scanner_page(request: Request):
    """Main scanner interface"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/price/{barcode}")
async def get_price(barcode: str):
    """Get product price by barcode"""
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

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
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