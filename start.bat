@echo off
echo Starting SplitSmart...

start "Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"
timeout /t 2 >nul
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
