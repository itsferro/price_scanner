"""
Price Scanner System - GUI Launcher
Wraps the existing FastAPI application with a desktop GUI and system tray
"""
import os
import sys
import threading
import time
import socket
import webbrowser
import argparse
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import winreg
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as TrayMenuItem
import uvicorn

# Add current directory to Python path so we can import main
sys.path.insert(0, str(Path(__file__).parent))

try:
    # Import the FastAPI app from existing main.py
    from main import app, get_local_ip, test_connection
    from database import get_db_connection
except ImportError as e:
    print(f"Error importing main components: {e}")
    print("Make sure main.py and database.py are in the same directory")
    sys.exit(1)

class ActivityLogger:
    """Captures and stores application activities"""
    def __init__(self, max_entries=100):
        self.activities = []
        self.max_entries = max_entries
        self.callbacks = []
    
    def add_activity(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        activity = f"[{timestamp}] {level}: {message}"
        self.activities.append(activity)
        
        # Keep only last max_entries
        if len(self.activities) > self.max_entries:
            self.activities = self.activities[-self.max_entries:]
        
        # Notify callbacks
        for callback in self.callbacks:
            try:
                callback(activity)
            except:
                pass
    
    def add_callback(self, callback):
        self.callbacks.append(callback)
    
    def get_recent(self, count=20):
        return self.activities[-count:] if self.activities else []

class DatabaseMonitor:
    """Monitors database connection status"""
    def __init__(self, activity_logger):
        self.logger = activity_logger
        self.is_connected = False
        self.last_check = None
        self.monitoring = False
        self.monitor_thread = None
    
    def start_monitoring(self):
        if not self.monitoring:
            self.monitoring = True
            self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.monitor_thread.start()
            self.logger.add_activity("Database monitoring started")
    
    def stop_monitoring(self):
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1)
    
    def _monitor_loop(self):
        while self.monitoring:
            try:
                self.check_connection()
                time.sleep(30)  # Check every 30 seconds
            except Exception as e:
                self.logger.add_activity(f"Database monitor error: {e}", "ERROR")
                time.sleep(30)
    
    def check_connection(self):
        try:
            is_connected, message = test_connection()
            
            if is_connected != self.is_connected:
                # Status changed
                if is_connected:
                    self.logger.add_activity("Database connection restored", "SUCCESS")
                else:
                    self.logger.add_activity(f"Database connection lost: {message}", "ERROR")
                
                self.is_connected = is_connected
            
            self.last_check = datetime.now()
            return is_connected, message
            
        except Exception as e:
            if self.is_connected:
                self.logger.add_activity(f"Database connection failed: {e}", "ERROR")
                self.is_connected = False
            return False, str(e)

class ServerManager:
    """Manages the FastAPI server"""
    def __init__(self, activity_logger):
        self.logger = activity_logger
        self.server_thread = None
        self.is_running = False
        self.host = "0.0.0.0"
        self.port = 8000
        self.local_ip = None
        self.ssl_enabled = False
    
    def start_server(self):
        if self.is_running:
            return True
        
        try:
            # Check if SSL certificates exist
            ssl_keyfile = "key.pem" if os.path.exists("key.pem") else None
            ssl_certfile = "cert.pem" if os.path.exists("cert.pem") else None
            self.ssl_enabled = bool(ssl_keyfile and ssl_certfile)
            
            # Get local IP
            self.local_ip = get_local_ip()
            
            # Start server in thread
            self.server_thread = threading.Thread(
                target=self._run_server,
                args=(ssl_keyfile, ssl_certfile),
                daemon=True
            )
            self.server_thread.start()
            
            # Wait a moment for server to start
            time.sleep(2)
            
            protocol = "https" if self.ssl_enabled else "http"
            self.logger.add_activity(f"Server started on {protocol}://{self.local_ip}:{self.port}", "SUCCESS")
            
            self.is_running = True
            return True
            
        except Exception as e:
            self.logger.add_activity(f"Failed to start server: {e}", "ERROR")
            return False
    
    def _run_server(self, ssl_keyfile, ssl_certfile):
        try:
            uvicorn.run(
                app,
                host=self.host,
                port=self.port,
                ssl_keyfile=ssl_keyfile,
                ssl_certfile=ssl_certfile,
                log_level="warning"  # Reduce console output
            )
        except Exception as e:
            self.logger.add_activity(f"Server error: {e}", "ERROR")
    
    def get_urls(self):
        if not self.is_running:
            return None, None
        
        protocol = "https" if self.ssl_enabled else "http"
        local_url = f"{protocol}://localhost:{self.port}"
        network_url = f"{protocol}://{self.local_ip}:{self.port}" if self.local_ip else None
        
        return local_url, network_url

class PriceScannerGUI:
    """Main GUI window"""
    def __init__(self, start_hidden=False):
        self.start_hidden = start_hidden
        self.activity_logger = ActivityLogger()
        self.db_monitor = DatabaseMonitor(self.activity_logger)
        self.server_manager = ServerManager(self.activity_logger)
        
        self.root = None
        self.tray_icon = None
        self.setup_window()
        self.setup_activity_callback()
        
        # Start components
        self.start_services()
        
        if start_hidden:
            self.hide_window()
        
    def setup_window(self):
        self.root = tk.Tk()
        self.root.title("Price Scanner System")
        self.root.geometry("600x500")
        self.root.minsize(500, 400)
        
        # Configure window close behavior
        self.root.protocol("WM_DELETE_WINDOW", self.hide_window)
        
        # Create main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(4, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="Price Scanner System", font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Status section
        status_frame = ttk.LabelFrame(main_frame, text="System Status", padding="10")
        status_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        status_frame.columnconfigure(1, weight=1)
        
        # Server status
        ttk.Label(status_frame, text="Server:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        self.server_status = ttk.Label(status_frame, text="Starting...", foreground="orange")
        self.server_status.grid(row=0, column=1, sticky=tk.W)
        
        # Database status
        ttk.Label(status_frame, text="Database:").grid(row=1, column=0, sticky=tk.W, padx=(0, 10))
        self.db_status = ttk.Label(status_frame, text="Checking...", foreground="orange")
        self.db_status.grid(row=1, column=1, sticky=tk.W)
        
        # Retry button
        self.retry_btn = ttk.Button(status_frame, text="Retry Connection", command=self.retry_database)
        self.retry_btn.grid(row=1, column=2, padx=(10, 0))
        
        # URLs section
        urls_frame = ttk.LabelFrame(main_frame, text="Access URLs", padding="10")
        urls_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        urls_frame.columnconfigure(1, weight=1)
        
        ttk.Label(urls_frame, text="Local:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        self.local_url_label = ttk.Label(urls_frame, text="Not available", foreground="blue", cursor="hand2")
        self.local_url_label.grid(row=0, column=1, sticky=tk.W)
        
        ttk.Label(urls_frame, text="Network:").grid(row=1, column=0, sticky=tk.W, padx=(0, 10))
        self.network_url_label = ttk.Label(urls_frame, text="Not available", foreground="blue", cursor="hand2")
        self.network_url_label.grid(row=1, column=1, sticky=tk.W)
        
        # Buttons section
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.grid(row=3, column=0, columnspan=3, pady=(0, 10))
        
        ttk.Button(buttons_frame, text="Open in Browser", command=self.open_browser).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(buttons_frame, text="Hide to Tray", command=self.hide_window).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(buttons_frame, text="Exit Application", command=self.quit_application).pack(side=tk.LEFT)
        
        # Startup checkbox
        self.startup_var = tk.BooleanVar()
        startup_check = ttk.Checkbutton(buttons_frame, text="Start with Windows", 
                                       variable=self.startup_var, command=self.toggle_startup)
        startup_check.pack(side=tk.RIGHT)
        
        # Activity log
        log_frame = ttk.LabelFrame(main_frame, text="Activity Log", padding="10")
        log_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        self.activity_text = scrolledtext.ScrolledText(log_frame, height=10, state=tk.DISABLED)
        self.activity_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Check startup status
        self.check_startup_status()
    
    def setup_activity_callback(self):
        def on_activity(activity):
            # Schedule GUI update in main thread
            self.root.after(0, lambda: self.add_activity_to_gui(activity))
        
        self.activity_logger.add_callback(on_activity)
    
    def add_activity_to_gui(self, activity):
        if self.activity_text:
            self.activity_text.config(state=tk.NORMAL)
            self.activity_text.insert(tk.END, activity + "\n")
            self.activity_text.see(tk.END)
            self.activity_text.config(state=tk.DISABLED)
    
    def start_services(self):
        # Start server
        threading.Thread(target=self._start_server_async, daemon=True).start()
        
        # Start database monitoring
        threading.Thread(target=self._start_db_monitoring, daemon=True).start()
    
    def _start_server_async(self):
        if self.server_manager.start_server():
            self.root.after(0, self.update_server_status)
    
    def _start_db_monitoring(self):
        time.sleep(1)  # Wait for server to start
        self.db_monitor.start_monitoring()
        self.root.after(0, self.update_db_status)
    
    def update_server_status(self):
        if self.server_manager.is_running:
            self.server_status.config(text="Running", foreground="green")
            
            # Update URLs
            local_url, network_url = self.server_manager.get_urls()
            if local_url:
                self.local_url_label.config(text=local_url)
                self.local_url_label.bind("<Button-1>", lambda e: webbrowser.open(local_url))
            
            if network_url:
                self.network_url_label.config(text=network_url)
                self.network_url_label.bind("<Button-1>", lambda e: webbrowser.open(network_url))
        else:
            self.server_status.config(text="Failed", foreground="red")
        
        # Update tray icon
        self.update_tray_icon()
    
    def update_db_status(self):
        if self.db_monitor.is_connected:
            self.db_status.config(text="Connected", foreground="green")
        else:
            self.db_status.config(text="Disconnected", foreground="red")
        
        # Schedule next update
        self.root.after(5000, self.update_db_status)  # Update every 5 seconds
        
        # Update tray icon
        self.update_tray_icon()
    
    def retry_database(self):
        self.activity_logger.add_activity("Manual database retry requested")
        threading.Thread(target=self._retry_db_async, daemon=True).start()
    
    def _retry_db_async(self):
        self.db_monitor.check_connection()
        self.root.after(0, self.update_db_status)
    
    def open_browser(self):
        local_url, network_url = self.server_manager.get_urls()
        if local_url:
            webbrowser.open(local_url)
            self.activity_logger.add_activity("Opened application in browser")
    
    def hide_window(self):
        self.root.withdraw()
        if not self.tray_icon:
            self.create_tray_icon()
    
    def show_window(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
    
    def create_tray_icon(self):
        # Create icon image
        image = self.create_status_icon()
        
        # Create menu
        menu = pystray.Menu(
            TrayMenuItem("Price Scanner System", lambda: None, enabled=False),
            pystray.Menu.SEPARATOR,
            TrayMenuItem("Server: " + ("Running" if self.server_manager.is_running else "Stopped"), 
                        lambda: None, enabled=False),
            TrayMenuItem("Database: " + ("Connected" if self.db_monitor.is_connected else "Disconnected"), 
                        lambda: None, enabled=False),
            pystray.Menu.SEPARATOR,
            TrayMenuItem("Open in Browser", self.tray_open_browser),
            TrayMenuItem("Show Window", self.tray_show_window),
            pystray.Menu.SEPARATOR,
            TrayMenuItem("Exit", self.tray_quit)
        )
        
        # Create and start tray icon
        self.tray_icon = pystray.Icon("Price Scanner", image, "Price Scanner System", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()
    
    def create_status_icon(self):
        # Create icon based on system status
        size = 64
        image = Image.new('RGB', (size, size), color='white')
        draw = ImageDraw.Draw(image)
        
        # Determine color based on status
        if self.server_manager.is_running and self.db_monitor.is_connected:
            color = 'green'
        elif self.server_manager.is_running:
            color = 'orange'
        else:
            color = 'red'
        
        # Draw simple circle
        margin = 8
        draw.ellipse([margin, margin, size-margin, size-margin], fill=color)
        
        return image
    
    def update_tray_icon(self):
        if self.tray_icon:
            self.tray_icon.icon = self.create_status_icon()
    
    def tray_open_browser(self):
        self.open_browser()
    
    def tray_show_window(self):
        self.root.after(0, self.show_window)
    
    def tray_quit(self):
        self.root.after(0, self.quit_application)
    
    def check_startup_status(self):
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                               r"Software\Microsoft\Windows\CurrentVersion\Run")
            value, _ = winreg.QueryValueEx(key, "PriceScannerSystem")
            winreg.CloseKey(key)
            self.startup_var.set(True)
        except FileNotFoundError:
            self.startup_var.set(False)
        except Exception:
            pass
    
    def toggle_startup(self):
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                               r"Software\Microsoft\Windows\CurrentVersion\Run", 
                               0, winreg.KEY_SET_VALUE)
            
            if self.startup_var.get():
                # Add to startup
                exe_path = sys.executable if getattr(sys, 'frozen', False) else f'"{sys.executable}" "{__file__}"'
                startup_command = f'{exe_path} --start-hidden'
                winreg.SetValueEx(key, "PriceScannerSystem", 0, winreg.REG_SZ, startup_command)
                self.activity_logger.add_activity("Added to Windows startup")
            else:
                # Remove from startup
                try:
                    winreg.DeleteValue(key, "PriceScannerSystem")
                    self.activity_logger.add_activity("Removed from Windows startup")
                except FileNotFoundError:
                    pass
            
            winreg.CloseKey(key)
        except Exception as e:
            self.activity_logger.add_activity(f"Failed to modify startup: {e}", "ERROR")
            messagebox.showerror("Error", f"Failed to modify startup settings: {e}")
    
    def quit_application(self):
        if messagebox.askyesno("Exit", "Are you sure you want to exit Price Scanner System?"):
            self.activity_logger.add_activity("Application shutting down")
            
            # Stop monitoring
            self.db_monitor.stop_monitoring()
            
            # Stop tray icon
            if self.tray_icon:
                self.tray_icon.stop()
            
            # Exit
            self.root.quit()
            self.root.destroy()
            os._exit(0)
    
    def run(self):
        try:
            self.activity_logger.add_activity("Price Scanner System GUI started")
            self.root.mainloop()
        except KeyboardInterrupt:
            self.quit_application()

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Price Scanner System GUI Launcher")
    parser.add_argument("--start-hidden", action="store_true", 
                       help="Start with window hidden to system tray")
    args = parser.parse_args()
    
    # Create and run GUI
    try:
        gui = PriceScannerGUI(start_hidden=args.start_hidden)
        gui.run()
    except Exception as e:
        print(f"Fatal error: {e}")
        messagebox.showerror("Fatal Error", f"Failed to start Price Scanner System:\n{e}")
        sys.exit(1)

if __name__ == "__main__":
    main()