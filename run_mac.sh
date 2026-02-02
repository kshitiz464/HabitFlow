#!/bin/bash
# HabitFlow Mac Run Script
# Runs HabitFlow directly without building an app bundle

echo "🚀 Starting HabitFlow..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "   Install it from: https://www.python.org/downloads/"
    exit 1
fi

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip3 install --user -r requirements.txt
fi

# Run the app
python3 main.py
