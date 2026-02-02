"""
HabitFlow Database Module
SQLite database setup and helper functions
"""

import sqlite3
import os
import sys
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any


def get_app_data_dir():
    """Get the application data directory for storing the database."""
    # When running as a bundled EXE, use AppData for writable storage
    if getattr(sys, 'frozen', False):
        # Bundled EXE mode - use AppData
        app_data = os.environ.get('APPDATA', os.path.expanduser('~'))
        data_dir = os.path.join(app_data, 'HabitFlow')
    else:
        # Development mode - use script directory
        data_dir = os.path.dirname(__file__)
    
    # Ensure directory exists
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


DATABASE_PATH = os.path.join(get_app_data_dir(), "habitflow.db")


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize the database with required tables."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Habits table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '✓',
            color TEXT DEFAULT '#6366F1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Habit completions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS habit_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            completed INTEGER DEFAULT 1,
            FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
            UNIQUE(habit_id, date)
        )
    """)
    
    # Tasks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            priority TEXT DEFAULT 'medium',
            start_time TEXT,
            end_time TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Try to add time columns if they don't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE tasks ADD COLUMN start_time TEXT")
    except:
        pass
    try:
        cursor.execute("ALTER TABLE tasks ADD COLUMN end_time TEXT")
    except:
        pass
    
    # Try to add sort_order column if it doesn't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE habits ADD COLUMN sort_order INTEGER DEFAULT 0")
    except:
        pass
    
    # Initialize sort_order for existing habits that don't have one
    cursor.execute("""
        UPDATE habits SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL
    """)
    
    # Settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    conn.commit()
    conn.close()


# ============ HABITS ============

def get_all_habits() -> List[Dict[str, Any]]:
    """Get all habits ordered by sort_order."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM habits ORDER BY sort_order, id")
    habits = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return habits


def create_habit(name: str, icon: str = "✓", color: str = "#6366F1") -> Dict[str, Any]:
    """Create a new habit."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO habits (name, icon, color) VALUES (?, ?, ?)",
        (name, icon, color)
    )
    habit_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": habit_id, "name": name, "icon": icon, "color": color}


def delete_habit(habit_id: int) -> bool:
    """Delete a habit and its completions."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM habit_completions WHERE habit_id = ?", (habit_id,))
    cursor.execute("DELETE FROM habits WHERE id = ?", (habit_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def update_habits_order(habit_ids: List[int]) -> bool:
    """Update sort_order for habits based on the order of IDs provided."""
    conn = get_connection()
    cursor = conn.cursor()
    for index, habit_id in enumerate(habit_ids):
        cursor.execute(
            "UPDATE habits SET sort_order = ? WHERE id = ?",
            (index, habit_id)
        )
    conn.commit()
    conn.close()
    return True


def toggle_habit_completion(habit_id: int, date_str: str) -> bool:
    """Toggle habit completion for a specific date. Returns new state."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if completion exists
    cursor.execute(
        "SELECT id FROM habit_completions WHERE habit_id = ? AND date = ?",
        (habit_id, date_str)
    )
    existing = cursor.fetchone()
    
    if existing:
        # Remove completion (uncomplete)
        cursor.execute(
            "DELETE FROM habit_completions WHERE habit_id = ? AND date = ?",
            (habit_id, date_str)
        )
        new_state = False
    else:
        # Add completion
        cursor.execute(
            "INSERT INTO habit_completions (habit_id, date) VALUES (?, ?)",
            (habit_id, date_str)
        )
        new_state = True
    
    conn.commit()
    conn.close()
    return new_state


def get_habit_completions(year: int, month: int) -> Dict[int, List[int]]:
    """Get all completions for a month. Returns {habit_id: [day1, day2, ...]}."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Format: YYYY-MM-DD
    date_prefix = f"{year:04d}-{month:02d}"
    
    cursor.execute(
        "SELECT habit_id, date FROM habit_completions WHERE date LIKE ?",
        (f"{date_prefix}%",)
    )
    
    completions: Dict[int, List[int]] = {}
    for row in cursor.fetchall():
        habit_id = row["habit_id"]
        day = int(row["date"].split("-")[2])
        if habit_id not in completions:
            completions[habit_id] = []
        completions[habit_id].append(day)
    
    conn.close()
    return completions


# ============ TASKS ============

def get_tasks_for_date(date_str: str) -> List[Dict[str, Any]]:
    """Get all tasks for a specific date."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM tasks WHERE date = ? ORDER BY priority DESC, created_at",
        (date_str,)
    )
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks


def create_task(title: str, date_str: str, priority: str = "medium", start_time: str = None, end_time: str = None) -> Dict[str, Any]:
    """Create a new task."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO tasks (title, date, priority, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
        (title, date_str, priority, start_time, end_time)
    )
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": task_id, "title": title, "date": date_str, "priority": priority, "completed": 0, "start_time": start_time, "end_time": end_time}


def toggle_task(task_id: int) -> bool:
    """Toggle task completion. Returns new state."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE tasks SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END WHERE id = ?",
        (task_id,)
    )
    cursor.execute("SELECT completed FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return bool(row["completed"]) if row else False


def delete_task(task_id: int) -> bool:
    """Delete a task."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


# ============ STATS ============

def get_statistics() -> Dict[str, Any]:
    """Get dashboard statistics."""
    conn = get_connection()
    cursor = conn.cursor()
    
    today = date.today().isoformat()
    
    # Total habits
    cursor.execute("SELECT COUNT(*) as count FROM habits")
    total_habits = cursor.fetchone()["count"]
    
    # Today's completions
    cursor.execute(
        "SELECT COUNT(*) as count FROM habit_completions WHERE date = ?",
        (today,)
    )
    today_completions = cursor.fetchone()["count"]
    
    # Today's tasks
    cursor.execute(
        "SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as done FROM tasks WHERE date = ?",
        (today,)
    )
    task_row = cursor.fetchone()
    today_tasks_total = task_row["total"] or 0
    today_tasks_done = task_row["done"] or 0
    
    # Current streak (consecutive days with at least one completion)
    cursor.execute("""
        SELECT DISTINCT date FROM habit_completions 
        ORDER BY date DESC LIMIT 30
    """)
    dates = [row["date"] for row in cursor.fetchall()]
    
    streak = 0
    current_date = date.today()
    for i in range(30):
        check_date = (current_date.toordinal() - i)
        check_date_str = date.fromordinal(check_date).isoformat()
        if check_date_str in dates:
            streak += 1
        elif i > 0:  # Allow today to be incomplete
            break
    
    # Weekly data (last 7 days completion percentage)
    weekly_data = []
    for i in range(6, -1, -1):
        day_date = date.fromordinal(current_date.toordinal() - i)
        day_str = day_date.isoformat()
        
        cursor.execute(
            "SELECT COUNT(*) as count FROM habit_completions WHERE date = ?",
            (day_str,)
        )
        completed = cursor.fetchone()["count"]
        
        percentage = (completed / total_habits * 100) if total_habits > 0 else 0
        weekly_data.append({
            "date": day_str,
            "day": day_date.strftime("%a"),
            "percentage": round(percentage, 1),
            "completed": completed
        })
    
    conn.close()
    
    return {
        "total_habits": total_habits,
        "today_completions": today_completions,
        "today_tasks_total": today_tasks_total,
        "today_tasks_done": today_tasks_done,
        "streak": streak,
        "weekly_data": weekly_data,
        "completion_rate": round((today_completions / total_habits * 100) if total_habits > 0 else 0, 1)
    }


# ============ SETTINGS ============

def get_setting(key: str, default: str = "") -> str:
    """Get a setting value."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key: str, value: str):
    """Set a setting value."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value)
    )
    conn.commit()
    conn.close()


def get_weekly_data(start_date_str: str) -> List[Dict[str, Any]]:
    """Get weekly completion data starting from a specific date."""
    from datetime import datetime
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get total habits
    cursor.execute("SELECT COUNT(*) as count FROM habits")
    total_habits = cursor.fetchone()["count"]
    
    # Parse start date
    start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    
    weekly_data = []
    for i in range(7):
        day_date = start + timedelta(days=i)
        day_str = day_date.isoformat()
        
        cursor.execute(
            "SELECT COUNT(*) as count FROM habit_completions WHERE date = ?",
            (day_str,)
        )
        completed = cursor.fetchone()["count"]
        
        percentage = (completed / total_habits * 100) if total_habits > 0 else 0
        weekly_data.append({
            "date": day_str,
            "day": day_date.strftime("%a"),
            "day_num": day_date.day,
            "percentage": round(percentage, 1),
            "completed": completed
        })
    
    conn.close()
    return weekly_data


# ============ ANALYTICS & REPORTS ============

def get_daily_report(target_date: str) -> Dict[str, Any]:
    """Get detailed report for a specific date."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get habits completed that day
    cursor.execute("""
        SELECT h.id, h.name, h.icon, h.color, 
               CASE WHEN hc.id IS NOT NULL THEN 1 ELSE 0 END as completed
        FROM habits h
        LEFT JOIN habit_completions hc ON h.id = hc.habit_id AND hc.date = ?
        ORDER BY h.sort_order, h.id
    """, (target_date,))
    habits = [dict(row) for row in cursor.fetchall()]
    
    # Get tasks for that day
    cursor.execute("""
        SELECT id, title, completed, priority, start_time, end_time
        FROM tasks WHERE date = ?
        ORDER BY start_time, id
    """, (target_date,))
    tasks = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    # Calculate percentages
    habits_completed = sum(1 for h in habits if h['completed'])
    tasks_completed = sum(1 for t in tasks if t['completed'])
    
    habit_rate = (habits_completed / len(habits) * 100) if habits else 0
    task_rate = (tasks_completed / len(tasks) * 100) if tasks else 0
    overall_score = (habit_rate + task_rate) / 2 if (habits or tasks) else 0
    
    return {
        "date": target_date,
        "habits": habits,
        "tasks": tasks,
        "habits_completed": habits_completed,
        "habits_total": len(habits),
        "tasks_completed": tasks_completed,
        "tasks_total": len(tasks),
        "habit_rate": round(habit_rate, 1),
        "task_rate": round(task_rate, 1),
        "overall_score": round(overall_score, 1)
    }


def get_monthly_trends(year: int, month: int) -> Dict[str, Any]:
    """Get daily completion rates for the entire month."""
    from datetime import timedelta
    import calendar
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get all habits
    cursor.execute("SELECT id FROM habits")
    habit_ids = [row['id'] for row in cursor.fetchall()]
    total_habits = len(habit_ids)
    
    # Get number of days in month
    days_in_month = calendar.monthrange(year, month)[1]
    
    daily_data = []
    
    for day in range(1, days_in_month + 1):
        date_str = f"{year}-{month:02d}-{day:02d}"
        
        # Count habit completions for this day
        cursor.execute("""
            SELECT COUNT(*) as completed FROM habit_completions 
            WHERE date = ?
        """, (date_str,))
        habits_done = cursor.fetchone()['completed']
        
        # Count task completions for this day
        cursor.execute("""
            SELECT COUNT(*) as total, SUM(completed) as done FROM tasks WHERE date = ?
        """, (date_str,))
        task_row = cursor.fetchone()
        tasks_total = task_row['total'] or 0
        tasks_done = task_row['done'] or 0
        
        habit_rate = (habits_done / total_habits * 100) if total_habits > 0 else 0
        task_rate = (tasks_done / tasks_total * 100) if tasks_total > 0 else 0
        
        daily_data.append({
            "date": date_str,
            "day": day,
            "habits_done": habits_done,
            "habits_total": total_habits,
            "habit_rate": round(habit_rate, 1),
            "tasks_done": tasks_done,
            "tasks_total": tasks_total,
            "task_rate": round(task_rate, 1)
        })
    
    conn.close()
    
    # Calculate monthly averages
    avg_habit_rate = sum(d['habit_rate'] for d in daily_data) / len(daily_data) if daily_data else 0
    avg_task_rate = sum(d['task_rate'] for d in daily_data if d['tasks_total'] > 0)
    task_days = len([d for d in daily_data if d['tasks_total'] > 0])
    avg_task_rate = avg_task_rate / task_days if task_days > 0 else 0
    
    return {
        "year": year,
        "month": month,
        "daily_data": daily_data,
        "avg_habit_rate": round(avg_habit_rate, 1),
        "avg_task_rate": round(avg_task_rate, 1)
    }


def get_habit_streaks() -> List[Dict[str, Any]]:
    """Calculate current and best streaks for each habit."""
    from datetime import timedelta
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get all habits
    cursor.execute("SELECT id, name, icon, color FROM habits ORDER BY sort_order, id")
    habits = [dict(row) for row in cursor.fetchall()]
    
    today = date.today()
    
    for habit in habits:
        # Get all completions for this habit, ordered by date descending
        cursor.execute("""
            SELECT date FROM habit_completions 
            WHERE habit_id = ? 
            ORDER BY date DESC
        """, (habit['id'],))
        completions = [row['date'] for row in cursor.fetchall()]
        
        # Calculate current streak
        current_streak = 0
        check_date = today
        
        while True:
            date_str = check_date.strftime("%Y-%m-%d")
            if date_str in completions:
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        # Calculate best streak
        best_streak = 0
        if completions:
            # Sort completions by date
            sorted_dates = sorted([datetime.strptime(d, "%Y-%m-%d").date() for d in completions])
            
            streak = 1
            for i in range(1, len(sorted_dates)):
                if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
                    streak += 1
                else:
                    best_streak = max(best_streak, streak)
                    streak = 1
            best_streak = max(best_streak, streak)
        
        habit['current_streak'] = current_streak
        habit['best_streak'] = best_streak
        habit['total_completions'] = len(completions)
    
    conn.close()
    return habits


def get_analytics_summary() -> Dict[str, Any]:
    """Get overall analytics summary."""
    conn = get_connection()
    cursor = conn.cursor()
    
    today = date.today()
    today_str = today.strftime("%Y-%m-%d")
    
    # Get habit streaks
    habit_streaks = get_habit_streaks()
    
    # Best overall streak
    best_streak = max((h['best_streak'] for h in habit_streaks), default=0)
    best_habit = next((h for h in habit_streaks if h['best_streak'] == best_streak), None)
    
    # Most consistent habit (highest total completions)
    most_consistent = max(habit_streaks, key=lambda h: h['total_completions'], default=None)
    
    # Total habits and tasks completed all time
    cursor.execute("SELECT COUNT(*) as count FROM habit_completions")
    total_habit_completions = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE completed = 1")
    total_tasks_completed = cursor.fetchone()['count']
    
    # This week's stats
    week_start = today - timedelta(days=today.weekday())
    week_start_str = week_start.strftime("%Y-%m-%d")
    
    cursor.execute("""
        SELECT COUNT(*) as count FROM habit_completions WHERE date >= ?
    """, (week_start_str,))
    week_habit_completions = cursor.fetchone()['count']
    
    cursor.execute("""
        SELECT COUNT(*) as count FROM tasks WHERE date >= ? AND completed = 1
    """, (week_start_str,))
    week_tasks_completed = cursor.fetchone()['count']
    
    # Today's completion rate
    cursor.execute("SELECT COUNT(*) as count FROM habits")
    total_habits = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM habit_completions WHERE date = ?", (today_str,))
    today_completions = cursor.fetchone()['count']
    
    today_rate = (today_completions / total_habits * 100) if total_habits > 0 else 0
    
    conn.close()
    
    return {
        "best_streak": best_streak,
        "best_streak_habit": best_habit['name'] if best_habit else None,
        "most_consistent_habit": most_consistent['name'] if most_consistent else None,
        "most_consistent_completions": most_consistent['total_completions'] if most_consistent else 0,
        "total_habit_completions": total_habit_completions,
        "total_tasks_completed": total_tasks_completed,
        "week_habit_completions": week_habit_completions,
        "week_tasks_completed": week_tasks_completed,
        "today_completion_rate": round(today_rate, 1),
        "habit_streaks": habit_streaks
    }


# Initialize database on import
init_database()
