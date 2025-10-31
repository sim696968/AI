@echo off
title GF-AI Launcher
echo ===========================================
echo     Starting GF-AI (Backend + Frontend)
echo ===========================================

:: Start backend
echo Starting backend server...
cd backend
start cmd /k "python server.py"
cd ..

:: Wait a bit to make sure backend starts
timeout /t 3 >nul

:: Start frontend
echo Starting frontend (React + Vite)...
cd frontend
start cmd /k "npm run dev"
cd ..

:: Wait a few seconds before opening browser
timeout /t 5 >nul

:: Open chat in default browser
start http://localhost:5173

echo ===========================================
echo GF-AI is running! Close windows to stop.
echo ===========================================
pause
