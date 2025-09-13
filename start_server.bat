@echo off
echo =====================================
echo  Price Scanner System - Server Start
echo =====================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

echo Python version:
python --version
echo.

REM Check if virtual environment exists
if not exist "ps-env" (
    echo Creating virtual environment...
    python -m venv ps-env
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call ps-env\Scripts\activate.bat

REM Install/update requirements
echo Installing requirements...
pip install -r requirements.txt
echo.

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create .env file with your database configuration
    echo Example:
    echo DB_SERVER=localhost\SQLEXPRESS
    echo DB_NAME=YourDMSDatabase
    echo DB_USE_WINDOWS_AUTH=true
    echo.
    pause
)

REM Get local IP address for network access
echo Network Information:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo Local IP: %%b
        echo Staff can access scanner at: http://%%b:8000
    )
)
echo.

REM Check Windows Firewall reminder
echo IMPORTANT: Make sure Windows Firewall allows port 8000
echo To allow port 8000 through firewall, run as Administrator:
echo netsh advfirewall firewall add rule name="Price Scanner" dir=in action=allow protocol=TCP localport=8000
echo.

REM Start the server
echo Starting FastAPI server...
echo.
echo Server URLs:
echo - Local: http://localhost:8000
echo - Network: http://YOUR_IP:8000
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py

echo.
echo Server stopped.
pause