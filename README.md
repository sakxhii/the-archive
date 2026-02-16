
# StoryTellerz Gifting Platform

A Full-Stack Gifting Platform with AI-powered features.

## Tech Stack
- **Backend:** FastAPI, Google Gemini 2.5 Flash (via google-generativeai SDK), SQLite
- **Frontend:** React (Vite), Tailwind CSS

## Features
- **Owner Dashboard:** Upload business cards | Extract contact & business info via Gemini Vision | Auto-save to database
- **Customer Search:** Natural language search for gifts | Hybrid results: Internal Database + Live Web Search (Google Grounding)

## Setup & Running

### Prerequisites
- Python 3.9+
- Node.js 18+
- Google API Key (with Gemini & Google Search Grounding access)

### 1. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a `.env` file from the example and add your API key:
   ```bash
   cp .env.example .env
   # Edit .env and set GOOGLE_API_KEY
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```
   Server runs at: `http://localhost:8000`

### 2. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   App runs at: `http://localhost:5173`

## Usage
- Open `http://localhost:5173`
- **Owner Flow:** Click "Owner Dashboard" -> Upload a business card image.
- **Customer Flow:** Use the search bar on the home page to find gifts (e.g., "Corporate gifts for tech employees under $50").
