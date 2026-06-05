const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const companyOnly = require('../middleware/companyOnly');
const {
  createAssessment,
  getAssessments,
  getAssessmentById,
  submitAssessment,
  getAssessmentLeaderboard,
  reportTabViolation,
} = require('../controllers/assessmentController');

// Company-only routes
router.post('/', authMiddleware, companyOnly, createAssessment);

// Authenticated routes
router.get('/', authMiddleware, getAssessments);
router.get('/:id', authMiddleware, getAssessmentById);
router.post('/:id/submit', authMiddleware, submitAssessment);
router.post('/:id/tab-violation', authMiddleware, reportTabViolation);

// Leaderboard — auth + company checked inside controller (owner only)
router.get('/:id/leaderboard', authMiddleware, companyOnly, getAssessmentLeaderboard);

module.exports = router;
