const express = require('express');
const router = express.Router();
const { createTask, getTasks, evaluateSubmission, getTaskById, getTaskSubmissions, getMySubmissions, solverHeartbeat, solverLeave } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const companyOnly = require('../middleware/companyOnly');
const Task = require('../models/Task');

router.post('/', authMiddleware, createTask);
router.get('/', authMiddleware, getTasks);
router.post('/evaluate', authMiddleware, evaluateSubmission);
router.get('/:id', getTaskById);
router.get('/:id/submissions', authMiddleware, companyOnly, getTaskSubmissions);
router.get('/:id/my-submissions', authMiddleware, getMySubmissions);
router.post('/:id/heartbeat', authMiddleware, solverHeartbeat);
router.post('/:id/leave', authMiddleware, solverLeave);

router.get('/:id/leaderboard', authMiddleware, companyOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const task = await Task.findById(id)
      .populate('submissions.user', 'username')
      .populate('author', 'username');
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Only the company that created the task can view its leaderboard
    if (task.author._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only view leaderboard for your own tasks.' });
    }

    // Group by user — keep the best submission per user (highest score, then fastest time)
    const userBest = {};
    (task.submissions || []).forEach(sub => {
      const uid = sub.user?._id?.toString() || sub.user?.toString();
      if (!uid) return;
      const existing = userBest[uid];
      if (!existing ||
        sub.score > existing.score ||
        (sub.score === existing.score && (sub.timeTakenSeconds || 0) < (existing.timeTakenSeconds || 0))) {
        userBest[uid] = {
          user: sub.user,
          score: sub.score,
          testCasesPassed: sub.testCasesPassed || 0,
          totalTestCases: sub.totalTestCases || 0,
          timeTakenSeconds: sub.timeTakenSeconds || 0,
          language: sub.language || 'javascript',
          submittedAt: sub.submittedAt,
          totalAttempts: 0,
          aiAnalysis: sub.aiAnalysis || {},
        };
      }
    });

    // Count total attempts per user
    (task.submissions || []).forEach(sub => {
      const uid = sub.user?._id?.toString() || sub.user?.toString();
      if (uid && userBest[uid]) userBest[uid].totalAttempts++;
    });

    // Sort: score desc, then time asc (faster is better)
    const leaderboard = Object.values(userBest)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.timeTakenSeconds || Infinity) - (b.timeTakenSeconds || Infinity);
      })
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    res.json({
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
        author: task.author,
        testCasesCount: task.testCases?.length || 0,
      },
      leaderboard,
      totalParticipants: leaderboard.length,
      totalSubmissions: task.submissions?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
});

module.exports = router;