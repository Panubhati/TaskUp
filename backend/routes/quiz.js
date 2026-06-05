const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const companyOnly = require('../middleware/companyOnly');
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  submitQuiz,
  getQuizLeaderboard,
  reportTabViolation,
} = require('../controllers/quizController');

// Company-only routes
router.post('/', authMiddleware, companyOnly, createQuiz);

// Authenticated routes
router.get('/', authMiddleware, getQuizzes);
router.get('/:id', authMiddleware, getQuizById);
router.post('/:id/submit', authMiddleware, submitQuiz);
router.post('/:id/tab-violation', authMiddleware, reportTabViolation);

// Leaderboard — auth + company checked inside controller (owner only)
router.get('/:id/leaderboard', authMiddleware, companyOnly, getQuizLeaderboard);

module.exports = router;

