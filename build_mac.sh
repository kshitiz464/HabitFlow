#!/bin/bash
# HabitFlow Mac Build Script
# This script installs dependencies and builds a Mac application bundle

echo "🚀 HabitFlow Mac Build Script"
echo "=============================="
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "   Install it from: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Create virtual environment (optional but recommended)
echo "📦 Installing dependencies..."
pip3 install --user -r requirements.txt
pip3 install --user pyinstaller

echo ""
echo "🔨 Building HabitFlow.app..."
echo ""

# Build the Mac app
python3 -m PyInstaller \
    --name "HabitFlow" \
    --windowed \
    --onefile \
    --add-data "templates:templates" \
    --add-data "static:static" \
    --icon "static/icon.png" \
    --clean \
    main.py

echo ""
echo "=============================="
if [ -f "dist/HabitFlow" ] || [ -d "dist/HabitFlow.app" ]; then
    echo "✅ Build complete!"
    echo ""
    echo "📍 Your app is located at:"
    echo "   $(pwd)/dist/"
    echo ""
    echo "🎉 To run HabitFlow:"
    echo "   1. Open Finder"
    echo "   2. Navigate to the 'dist' folder"
    echo "   3. Double-click HabitFlow"
    echo ""
    echo "💡 Tip: Drag HabitFlow to Applications folder for easy access"
else
    echo "❌ Build may have failed. Check the output above for errors."
fi
