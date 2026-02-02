"""
HabitFlow - Desktop Habit Tracking App
Main entry point with FastAPI backend and PyWebView desktop wrapper
"""

import threading
import sys
import time
import urllib.request
import urllib.error
import webview
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os

import database as db

# Get the directory where resources are located
# When bundled with PyInstaller, use _MEIPASS for bundled resources
if getattr(sys, 'frozen', False):
    # Running as bundled EXE
    BASE_DIR = sys._MEIPASS
else:
    # Running in development
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# FastAPI app
app = FastAPI(title="HabitFlow")

# Mount static files and templates
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


# ============ PYDANTIC MODELS ============

class HabitCreate(BaseModel):
    name: str
    icon: str = "✓"
    color: str = "#6366F1"


class TaskCreate(BaseModel):
    title: str
    date: str
    priority: str = "medium"
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class ToggleHabit(BaseModel):
    date: str


# ============ ROUTES ============

@app.get("/")
async def index(request: Request):
    """Serve the main application page."""
    return templates.TemplateResponse("index.html", {"request": request})


# ============ HABITS API ============

@app.get("/api/habits")
async def get_habits():
    """Get all habits."""
    return db.get_all_habits()


@app.post("/api/habits")
async def create_habit(habit: HabitCreate):
    """Create a new habit."""
    return db.create_habit(habit.name, habit.icon, habit.color)


class HabitReorder(BaseModel):
    habit_ids: list


@app.post("/api/habits/reorder")
async def reorder_habits(data: HabitReorder):
    """Reorder habits based on list of IDs."""
    success = db.update_habits_order(data.habit_ids)
    return {"success": success}


@app.get("/api/habits/calendar/{year}/{month}")
async def get_calendar(year: int, month: int):
    """Get habit completions for a month."""
    completions = db.get_habit_completions(year, month)
    return completions


@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int):
    """Delete a habit."""
    success = db.delete_habit(habit_id)
    return {"success": success}


@app.post("/api/habits/{habit_id}/toggle")
async def toggle_habit(habit_id: int, data: ToggleHabit):
    """Toggle habit completion for a date."""
    new_state = db.toggle_habit_completion(habit_id, data.date)
    return {"completed": new_state}


# ============ TASKS API ============

@app.get("/api/tasks/{date}")
async def get_tasks(date: str):
    """Get tasks for a specific date."""
    return db.get_tasks_for_date(date)


@app.post("/api/tasks")
async def create_task(task: TaskCreate):
    """Create a new task."""
    return db.create_task(task.title, task.date, task.priority, task.start_time, task.end_time)


@app.post("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: int):
    """Toggle task completion."""
    new_state = db.toggle_task(task_id)
    return {"completed": new_state}


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int):
    """Delete a task."""
    success = db.delete_task(task_id)
    return {"success": success}


# ============ STATS API ============

@app.get("/api/stats")
async def get_stats():
    """Get dashboard statistics."""
    return db.get_statistics()


# ============ SETTINGS API ============

@app.get("/api/settings/{key}")
async def get_setting(key: str):
    """Get a setting value."""
    value = db.get_setting(key)
    return {"key": key, "value": value}


@app.post("/api/settings/{key}")
async def set_setting(key: str, request: Request):
    """Set a setting value."""
    data = await request.json()
    db.set_setting(key, data.get("value", ""))
    return {"success": True}


@app.get("/api/stats/weekly")
async def get_weekly_stats(start_date: str):
    """Get weekly completion data for a specific week."""
    return db.get_weekly_data(start_date)


# ============ REPORTS API ============

@app.get("/api/reports/daily/{date}")
async def get_daily_report(date: str):
    """Get detailed report for a specific date."""
    return db.get_daily_report(date)


@app.get("/api/reports/monthly/{year}/{month}")
async def get_monthly_trends(year: int, month: int):
    """Get daily completion rates for the entire month."""
    return db.get_monthly_trends(year, month)


@app.get("/api/reports/analytics")
async def get_analytics():
    """Get overall analytics summary."""
    return db.get_analytics_summary()


# ============ PYWEBVIEW INTEGRATION ============

@app.get("/favicon.ico")
async def favicon():
    return FileResponse(os.path.join(BASE_DIR, "static", "icon.ico"))


@app.get("/health")
async def health_check():
    """Health check endpoint for server readiness."""
    return {"status": "ok"}


def start_server():
    """Start the FastAPI server."""
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="warning")


def wait_for_server(url="http://127.0.0.1:8765/health", timeout=10):
    """Wait for the server to be ready by polling the health endpoint."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = urllib.request.urlopen(url, timeout=1)
            if response.status == 200:
                return True
        except (urllib.error.URLError, urllib.error.HTTPError, OSError):
            pass
        time.sleep(0.1)
    return False



def set_window_icon():
    """Helper to force-set the window icon on Windows."""
    import sys
    if sys.platform != 'win32':
        return  # Only works on Windows
    
    import ctypes
    import time
    
    # Wait a bit for window to actually exist
    time.sleep(1.0)
    
    try:
        # Find window by title
        hwnd = ctypes.windll.user32.FindWindowW(None, "HabitFlow")
        
        if hwnd:
            icon_path = os.path.join(BASE_DIR, "static", "icon.ico")
            
            # Load the icon from file
            # LR_LOADFROMFILE = 0x0010, IMAGE_ICON = 1
            hicon = ctypes.windll.user32.LoadImageW(None, icon_path, 1, 0, 0, 0x0010)
            
            if hicon:
                # Send WM_SETICON messages
                # ICON_SMALL = 0, ICON_BIG = 1
                # WM_SETICON = 0x0080
                ctypes.windll.user32.SendMessageW(hwnd, 0x0080, 0, hicon)
                ctypes.windll.user32.SendMessageW(hwnd, 0x0080, 1, hicon)
    except Exception as e:
        print(f"Failed to set icon: {e}")

def main():
    """Main entry point - starts server and opens PyWebView window."""
    # Set App ID for Windows Taskbar Icon (Must be before window creation)
    import sys
    if sys.platform == 'win32':
        try:
            import ctypes
            myappid = u'habitflow.desktop.app.1.0'
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
        except:
            pass

    # Initialize database (runs migrations)
    db.init_database()
    
    # Start FastAPI server in a background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Wait for server to be ready (polls health endpoint)
    if not wait_for_server():
        print("Warning: Server may not be ready yet")
    
    # Create PyWebView window
    window = webview.create_window(
        title="HabitFlow",
        url="http://127.0.0.1:8765",
        width=1200,
        height=800,
        resizable=True,
        min_size=(900, 600)
    )
    
    # Start the GUI
    webview.start(debug=False, icon=os.path.join(BASE_DIR, "static", "icon.ico"), func=set_window_icon)


if __name__ == "__main__":
    main()
