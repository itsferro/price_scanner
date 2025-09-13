import threading
import uvicorn
from fastapi import FastAPI
from pystray import Icon, Menu, MenuItem
from PIL import Image

app = FastAPI()

@app.get("/")
def home():
    return {"msg": "Hello from FastAPI"}

def run_server():
    # uvicorn.run(app, host="127.0.0.1", port=8000)
    print("Server would run here")

def on_quit(icon, item):
    icon.stop()
    # TODO: gracefully shutdown FastAPI/uvicorn if needed

if __name__ == "__main__":
    # Start FastAPI server in background
    threading.Thread(target=run_server, daemon=True).start()

    # Load an icon image
    image = Image.new("RGB", (64, 64), "blue")

    # Create tray icon
    menu = Menu(MenuItem("Quit", on_quit))
    icon = Icon("FastAPI Service", image, "My API", menu)
    icon.run()
