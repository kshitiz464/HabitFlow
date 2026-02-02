@echo off
echo ========================================
echo   HabitFlow EXE Builder
echo ========================================
echo.

echo [1/2] Cleaning previous builds...
if exist "dist" rmdir /s /q dist
if exist "build" rmdir /s /q build

echo [2/2] Building EXE with PyInstaller...
python -m PyInstaller HabitFlow.spec --noconfirm

echo.
echo ========================================
if exist "dist\HabitFlow.exe" (
    echo   BUILD SUCCESSFUL!
    echo   Output: dist\HabitFlow.exe
) else (
    echo   BUILD FAILED - Check errors above
)
echo ========================================
pause
