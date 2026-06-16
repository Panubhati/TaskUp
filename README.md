# ⚡ TaskUp

**AI-Powered Competitive Coding & Talent Assessment Platform**
*Full-Stack Web Application*

TaskUp is a full-stack, AI-powered competitive coding and talent assessment platform that connects **students** (developers) with **companies** (recruiters). Students solve real-world coding challenges, take quizzes, complete assignments, and get ranked on live leaderboards. Companies create challenges, evaluate submissions with AI-driven analysis, and identify top talent.

## 🌟 Key Features

### 🎓 For Students
- Solve challenges in 4 languages (JavaScript, Python, C++, Java).
- Get AI feedback, optimization notes, and code evaluation.
- Compete on global leaderboards and track progress.
- Upload resume for AI evaluation and detailed scoring.

### 🏢 For Companies
- Create tasks, assignments, and timed quizzes.
- AI-evaluated submissions with plagiarism and AI-generated pattern detection.
- Access a comprehensive analytics dashboard, highlighting top performers.
- Administer quizzes with an anti-cheat system (tab-switching detection, 3-strike ban, server-side timer).

## 🛠️ Technology Stack

### Backend
- **Server**: Node.js + Express 5
- **Database**: MongoDB + Mongoose 8
- **Auth**: JWT & bcrypt
- **AI Engine**: Groq SDK (LLaMA 3.3 70B) & Google Generative AI (Gemini)
- **File Handling**: multer + pdf-parse (for Resumes)

### Frontend
- **Framework**: React 19
- **Routing**: React Router DOM 7
- **IDE/Editor**: Monaco Editor
- **Styling**: Chakra UI + Emotion, Bootstrap 5
- **Animations**: Framer Motion
- **API Client**: Axios

## 🏗️ Architecture
Frontend and Backend separation communicating via REST APIs.

- **Frontend**: Handles UI for students, companies, and admins. Integrates Monaco editor for writing code and features an anti-cheat quiz logic layer.
- **Backend**: Provides secure routes enforced by middleware (`authMiddleware`, `companyOnly`, `adminOnly`). Connects to Groq LLaMA 3.3 70B for programmatic code evaluation and analysis. 

## 🔐 Security & Roles
- **Roles**: Student, Company (requires Admin approval), Admin.
- **Security**: Password Hashing (bcrypt), Role-Based JWT tokens, Anti-Cheat system, File upload security (PDF up to 5MB).

## 🚀 Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB running locally/remotely
- Groq API Key

### Backend Setup
```bash
cd backend
npm install

# Create a .env file with:
# PORT=5000
# MONGO_URI=<your-mongodb-uri>
# JWT_SECRET=<your-jwt-secret>
# GROQ_API_KEY=<your-groq-api-key>
# GEMINI_API_KEY=<your-gemini-key>

node scripts/seedAdmin.js       # Create default admin account
node scripts/seedQuestions.js    # Populate question bank
npm start                        # Start server
```
*Default Admin Credentials: `admin` / `admin123`*

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend will be accessible at `http://localhost:3000`.

## 📁 Directory Structure
- `backend/` - Node.js Express server, MongoDB models, controllers, and seeded data.
- `frontend/` - React application combining Chakra UI, Monaco Editor, routing, and all interface components.
