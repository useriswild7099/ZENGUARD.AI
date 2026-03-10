@echo off
setlocal enabledelayedexpansion

:: ANSI Colors (Simulated for Batch)
set "GREEN=[92m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%========================================================%RESET%
echo %GREEN%         Starting ZenGuard AI (Windows)%RESET%
echo %CYAN%========================================================%RESET%
echo.

:: Check if Ollama is running
echo %YELLOW%Checking AI Engine (Ollama)...%RESET%
tasklist /FI "IMAGENAME eq ollama app.exe" 2>NUL | find /I /N "ollama app.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo %GREEN%Ollama is already running.%RESET%
) else (
    echo %YELLOW%Starting Ollama...%RESET%
    start "" "ollama app.exe"
    :: Wait a bit for Ollama to initialize
    timeout /t 5 /nobreak >nul
)

:: Verify Ollama API is responsive
curl -s http://localhost:11434/api/tags >nul 2>&1
if "%ERRORLEVEL%" neq "0" (
    echo %YELLOW%Ollama API not ready yet, waiting...%RESET%
    timeout /t 5 /nobreak >nul
)

:: Start Backend in a new window
echo %GREEN%Starting Data Privacy Engine (Backend)...%RESET%
cd backend
start "ZenGuard Backend" cmd /k "venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000"
cd ..

:: Start Frontend in a new window
echo %GREEN%Starting Visual Interface (Frontend)...%RESET%
cd frontend
start "ZenGuard Frontend" cmd /k "npm run dev"
cd ..

echo.
echo %GREEN%All systems launching!%RESET%
echo %YELLOW%Backend: http://127.0.0.1:8000%RESET%
echo %YELLOW%Frontend: http://localhost:3000%RESET%
echo.
echo %CYAN%The application will be accessible in a few seconds...%RESET%

:: Give it a moment to boot up, then open browser
timeout /t 5 /nobreak >nul
explorer "http://localhost:3000"

pause
