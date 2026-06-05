const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const companyOnly = require('../middleware/companyOnly');
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  submitSolution,
  getLeaderboard,
  getMyAssignmentSubmissions,
  assignmentHeartbeat,
  assignmentLeave,
} = require('../controllers/assignmentController');

// Company-only routes
router.post('/', authMiddleware, companyOnly, createAssignment);

// Authenticated routes
router.get('/', authMiddleware, getAssignments);
router.get('/:id', authMiddleware, getAssignmentById);
router.post('/:id/submit', authMiddleware, submitSolution);
router.get('/:id/leaderboard', authMiddleware, getLeaderboard);
router.get('/:id/my-submissions', authMiddleware, getMyAssignmentSubmissions);
router.post('/:id/heartbeat', authMiddleware, assignmentHeartbeat);
router.post('/:id/leave', authMiddleware, assignmentLeave);

module.exports = router;
