@echo off
echo Starting StoryTellerz Gifting Platform...

:: Check if .env exists
if not exist "backend\.env" (
    echo [WARNING] backend\.env not found. Please create it and add your GOOGLE_API_KEY.
    echo Copying example to .env...
    copy backend\.env.example backend\.env
    echo Please edit backend\.env to add your API Key before continuing.
    pause
    exit /b
)

:: Start Backend
echo Starting Backend (FastAPI)...
start "Backend" cmd /k "cd backend && pip install -r requirements.txt && uvicorn main:app --reload"

:: Start Frontend
echo Starting Frontend (React)...
cd frontend
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Starting Vite Server...
npm run dev
