const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Assignment = require('../models/Assignment');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/leaderboard — Global leaderboard with points
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [tasks, assignments, assessments, students] = await Promise.all([
      Task.find({}).select('title submissions'),
      Assignment.find({}).select('title submissions'),
      Assessment.find({}).select('title submissions questions'),
      User.find({ role: 'student' }).select('username college'),
    ]);

    // Build student map
    const studentMap = {};
    students.forEach(s => {
      studentMap[s._id.toString()] = {
        _id: s._id,
        username: s.username,
        college: s.college || '',
        activities: [],  // individual activity entries
        totalPoints: 0,
      };
    });

    // 1. Tasks — best score per task per user → points (0-100 per task)
    tasks.forEach(task => {
      const userBest = {};
      task.submissions.forEach(sub => {
        const uid = sub.user?.toString();
        if (!uid || !studentMap[uid]) return;
        if (!userBest[uid] || sub.score > userBest[uid]) {
          userBest[uid] = sub.score;
        }
      });
      Object.entries(userBest).forEach(([uid, score]) => {
        studentMap[uid].activities.push({
          type: 'task',
          name: task.title,
          points: Math.round(score),
        });
        studentMap[uid].totalPoints += Math.round(score);
      });
    });

    // 2. Assignments — best finalScore per question per user → points per question
    assignments.forEach(assignment => {
      const userQuestionBest = {};
      assignment.submissions.forEach(sub => {
        const uid = sub.user?.toString();
        if (!uid || !studentMap[uid]) return;
        const key = `${uid}_${sub.questionId}`;
        if (!userQuestionBest[key] || sub.finalScore > userQuestionBest[key]) {
          userQuestionBest[key] = sub.finalScore;
        }
      });
      // Group by user → sum points for this assignment
      const userTotals = {};
      Object.entries(userQuestionBest).forEach(([key, score]) => {
        const uid = key.split('_')[0];
        if (!userTotals[uid]) userTotals[uid] = 0;
        userTotals[uid] += Math.round(score);
      });
      Object.entries(userTotals).forEach(([uid, pts]) => {
        if (studentMap[uid]) {
          studentMap[uid].activities.push({
            type: 'assignment',
            name: assignment.title,
            points: pts,
          });
          studentMap[uid].totalPoints += pts;
        }
      });
    });

    // 3. Assessments — score (raw points earned)
    assessments.forEach(assessment => {
      const maxPoints = assessment.questions.reduce((sum, q) => sum + (q.points || 1), 0);
      const userBest = {};
      assessment.submissions.forEach(sub => {
        const uid = sub.user?.toString();
        if (!uid || !studentMap[uid]) return;
        if (!userBest[uid] || sub.score > userBest[uid].score) {
          userBest[uid] = { score: sub.score, totalPoints: sub.totalPoints || maxPoints };
        }
      });
      Object.entries(userBest).forEach(([uid, data]) => {
        studentMap[uid].activities.push({
          type: 'assessment',
          name: assessment.title,
          points: Math.round(data.score),
          maxPoints: data.totalPoints,
        });
        studentMap[uid].totalPoints += Math.round(data.score);
      });
    });

    // Build leaderboard sorted by total points
    const leaderboard = Object.values(studentMap)
      .filter(s => s.activities.length > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints || b.activities.length - a.activities.length)
      .map((s, i) => ({
        rank: i + 1,
        _id: s._id,
        username: s.username,
        college: s.college,
        totalPoints: s.totalPoints,
        taskPoints: s.activities.filter(a => a.type === 'task').reduce((sum, a) => sum + a.points, 0),
        assignmentPoints: s.activities.filter(a => a.type === 'assignment').reduce((sum, a) => sum + a.points, 0),
        assessmentPoints: s.activities.filter(a => a.type === 'assessment').reduce((sum, a) => sum + a.points, 0),
        taskCount: s.activities.filter(a => a.type === 'task').length,
        assignmentCount: s.activities.filter(a => a.type === 'assignment').length,
        assessmentCount: s.activities.filter(a => a.type === 'assessment').length,
      }));

    res.json({ leaderboard, totalStudents: leaderboard.length });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
