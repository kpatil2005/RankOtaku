@echo off
echo Starting RankOtaku Development Environment...
echo.

start cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak > nul
start cmd /k "cd frontend && npm run dev"

echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul
