# HabitFlow 🎯

A beautiful, offline-first habit tracking desktop application built with Python and modern web technologies.

![HabitFlow Dashboard](https://img.shields.io/badge/Platform-Windows%20%7C%20Mac%20%7C%20Linux-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 📊 **Dashboard** - Track your progress with weekly charts and stats
- ✅ **Habits** - Create, track, and manage daily habits with streaks
- 📋 **Daily Tasks** - Organize tasks with priorities and time slots
- 📈 **Reports** - Detailed analytics with circular progress graphs and trends
- 🎵 **Music Integration** - Quick access to YouTube Music or Spotify
- 🌙 **Dark Mode** - Beautiful light and dark themes
- 🔊 **Sound Effects** - Satisfying audio feedback for interactions
- 💾 **Offline First** - All data stored locally, no internet required

## 🚀 Quick Start

### Windows
```bash
# Option 1: Run from source
pip install -r requirements.txt
python main.py

# Option 2: Build executable
build.bat
# Run: dist/HabitFlow.exe
```

### Mac / Linux
```bash
# Option 1: Run directly
chmod +x run_mac.sh
./run_mac.sh

# Option 2: Build app
chmod +x build_mac.sh
./build_mac.sh
# App will be in dist/ folder
```

## 📦 Requirements

- Python 3.8+
- Dependencies: FastAPI, Uvicorn, PyWebView

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python, FastAPI, SQLite |
| Frontend | HTML5, CSS3, JavaScript |
| Desktop | PyWebView |
| Charts | Chart.js |
| Icons | Lucide Icons |

## 📁 Project Structure

```
HabitFlow/
├── main.py           # Application entry point
├── database.py       # SQLite database functions
├── templates/
│   └── index.html    # Main UI template
├── static/
│   ├── css/styles.css
│   ├── js/app.js
│   └── icon.ico
├── build.bat         # Windows build script
├── build_mac.sh      # Mac build script
└── requirements.txt
```

## 📸 Screenshots

*Coming soon*

## 📄 License

MIT License - feel free to use this for personal or commercial projects.

---

Made with ❤️ by Kshitiz
