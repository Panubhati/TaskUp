const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const companyOnly = require('../middleware/companyOnly');
const User = require('../models/User');
const Task = require('../models/Task');
const Assignment = require('../models/Assignment');
const Assessment = require('../models/Assessment');

// GET /api/candidates/:id/profile — Company views a candidate's full profile + submissions
router.get('/:id/profile', authMiddleware, companyOnly, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await User.findById(candidateId).select(
      'username email college qualifyingYear city role createdAt'
    );

    if (!candidate || candidate.role !== 'student') {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    // Fetch all tasks that have submissions from this candidate
    const tasks = await Task.find({ 'submissions.user': candidateId }).select(
      'title submissions'
    );
    const taskSubmissions = [];
    tasks.forEach((task) => {
      task.submissions
        .filter((s) => s.user?.toString() === candidateId)
        .forEach((s) => {
          taskSubmissions.push({
            type: 'task',
            taskTitle: task.title,
            taskId: task._id,
            code: s.code,
            language: s.language,
            score: s.score,
            testCasesPassed: s.testCasesPassed,
            totalTestCases: s.totalTestCases,
            aiAnalysis: s.aiAnalysis,
            submittedAt: s.submittedAt,
          });
        });
    });

    // Fetch assignment submissions
    const assignments = await Assignment.find({
      'submissions.user': candidateId,
    })
      .select('title submissions')
      .populate('submissions.questionId', 'title');
    const assignmentSubmissions = [];
    assignments.forEach((assignment) => {
      assignment.submissions
        .filter((s) => s.user?.toString() === candidateId)
        .forEach((s) => {
          assignmentSubmissions.push({
            type: 'assignment',
            assignmentTitle: assignment.title,
            assignmentId: assignment._id,
            questionTitle: s.questionId?.title || 'Unknown',
            code: s.code,
            language: s.language,
            correctnessScore: s.correctnessScore,
            optimizationScore: s.optimizationScore,
            plagiarismScore: s.plagiarismScore,
            finalScore: s.finalScore,
            testCasesPassed: s.testCasesPassed,
            totalTestCases: s.totalTestCases,
            aiAnalysis: s.aiAnalysis,
            submittedAt: s.submittedAt,
          });
        });
    });

    // Fetch assessment submissions
    const assessments = await Assessment.find({ 'submissions.user': candidateId }).select(
      'title submissions questions'
    );
    const assessmentSubmissions = [];
    assessments.forEach((assessment) => {
      const maxPoints = assessment.questions.reduce(
        (sum, q) => sum + (q.points || 1),
        0
      );
      assessment.submissions
        .filter((s) => s.user?.toString() === candidateId)
        .forEach((s) => {
          assessmentSubmissions.push({
            type: 'assessment',
            assessmentTitle: assessment.title,
            assessmentId: assessment._id,
            score: s.score,
            totalPoints: s.totalPoints || maxPoints,
            percentage: s.percentage,
            submittedAt: s.submittedAt,
          });
        });
    });

    // Combine and sort by date
    const allSubmissions = [
      ...taskSubmissions,
      ...assignmentSubmissions,
      ...assessmentSubmissions,
    ].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Stats
    const totalPoints =
      taskSubmissions.reduce((s, t) => s + (t.score || 0), 0) +
      assignmentSubmissions.reduce((s, a) => s + (a.finalScore || 0), 0) +
      assessmentSubmissions.reduce((s, q) => s + (q.score || 0), 0);

    res.json({
      candidate: {
        _id: candidate._id,
        username: candidate.username,
        email: candidate.email,
        college: candidate.college,
        qualifyingYear: candidate.qualifyingYear,
        city: candidate.city,
        joinedAt: candidate.createdAt,
      },
      stats: {
        totalPoints,
        totalSubmissions: allSubmissions.length,
        taskCount: taskSubmissions.length,
        assignmentCount: assignmentSubmissions.length,
        assessmentCount: assessmentSubmissions.length,
      },
      submissions: allSubmissions,
    });
  } catch (error) {
    console.error('Candidate profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
