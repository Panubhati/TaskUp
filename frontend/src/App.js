import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CustomNavbar from './components/Navbar';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Compete from './pages/Compete';
import CreateTask from './pages/CreateTask';
import TaskDetail from './components/TaskDetail';
import ResumeEvaluation from './pages/ResumeEvaluation';
import UserProfile from './components/UserProfile';
import Solve from './pages/Solve';
import QuestionBank from './pages/QuestionBank';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import CompanyDashboard from './pages/CompanyDashboard';
import Assessments from './pages/Assessments';
import CreateAssessment from './pages/CreateAssessment';
import TakeAssessment from './pages/TakeAssessment';
import AssessmentLeaderboard from './pages/AssessmentLeaderboard';
import Leaderboard from './pages/Leaderboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CompanyDetails from './pages/CompanyDetails';
import CandidateProfile from './pages/CandidateProfile';
import Messages from './pages/Messages';
import CreateQuiz from './pages/CreateQuiz';
import Quizzes from './pages/Quizzes';
import TakeQuiz from './pages/TakeQuiz';
import QuizLeaderboard from './pages/QuizLeaderboard';

// Routes that should display the sidebar layout instead of the top navbar
const SIDEBAR_ROUTES = [
  '/compete',
  '/assignments',
  '/assessments',
  '/create',
  '/profile',
  '/question-bank',
  '/company-dashboard',
  '/leaderboard',
  '/resume-evaluation',
  '/messages',
  '/candidate',
  '/company-details',
  '/quizzes',
  '/create-quiz',
];

function shouldUseSidebar(pathname) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token || !role || role === 'admin') return false;
  return SIDEBAR_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function AppContent() {
  const location = useLocation();
  const useSidebar = shouldUseSidebar(location.pathname);

  if (useSidebar) {
    return (
      <DashboardLayout>
        <Routes>
          <Route path="/compete" element={<Compete />} />
          <Route path="/create" element={<CreateTask />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/task/:id" element={<TaskDetail />} />
          <Route path="/resume-evaluation" element={<ResumeEvaluation />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/assignments/:id" element={<AssignmentDetail />} />
          <Route path="/company-dashboard" element={<CompanyDashboard />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/create" element={<CreateAssessment />} />
          <Route path="/assessments/:id" element={<TakeAssessment />} />
          <Route path="/assessments/:id/leaderboard" element={<AssessmentLeaderboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/company-details" element={<CompanyDetails />} />
          <Route path="/candidate/:id" element={<CandidateProfile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/quizzes/:id" element={<TakeQuiz />} />
          <Route path="/quizzes/:id/leaderboard" element={<QuizLeaderboard />} />
        </Routes>
      </DashboardLayout>
    );
  }

  return (
    <>
      <CustomNavbar />
      <div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/compete" element={<Compete />} />
          <Route path="/create" element={<CreateTask />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/solve" element={<Solve />} />
          <Route path="/task/:id" element={<TaskDetail />} />
          <Route path="/resume-evaluation" element={<ResumeEvaluation />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/assignments/:id" element={<AssignmentDetail />} />
          <Route path="/company-dashboard" element={<CompanyDashboard />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/create" element={<CreateAssessment />} />
          <Route path="/assessments/:id" element={<TakeAssessment />} />
          <Route path="/assessments/:id/leaderboard" element={<AssessmentLeaderboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/company-details" element={<CompanyDetails />} />
          <Route path="/candidate/:id" element={<CandidateProfile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/quizzes/:id" element={<TakeQuiz />} />
          <Route path="/quizzes/:id/leaderboard" element={<QuizLeaderboard />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;