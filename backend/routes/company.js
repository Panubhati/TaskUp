const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const companyOnly = require('../middleware/companyOnly');
const Assignment = require('../models/Assignment');
const Task = require('../models/Task');
const Assessment = require('../models/Assessment');
const User = require('../models/User');

// GET /api/company/dashboard — Company analytics dashboard
router.get('/dashboard', authMiddleware, companyOnly, async (req, res) => {
  try {
    const companyId = req.user.id;

    // Fetch company's assignments
    const assignments = await Assignment.find({ company: companyId })
      .populate('questions', 'title difficulty category')
      .populate('submissions.user', 'username');

    // Fetch company's tasks
    const tasks = await Task.find({ author: companyId })
      .populate('submissions.user', 'username');

    // Fetch company's quizzes
    const assessments = await Assessment.find({ company: companyId })
      .populate('submissions.user', 'username');

    // --- Unified participant tracking ---
    const allParticipants = new Set();

    // --- Assignment Stats ---
    const totalAssignments = assignments.length;
    let totalAssignmentSubmissions = 0;
    let totalCorrectness = 0;
    let totalOptimization = 0;
    let totalPlagiarism = 0;
    let totalFinalScore = 0;
    const assignmentBreakdown = [];

    // All submissions for score distribution and top performers
    const allScoredSubmissions = []; // { uid, username, score, type }

    assignments.forEach(a => {
      const subs = a.submissions || [];
      totalAssignmentSubmissions += subs.length;

      subs.forEach(s => {
        const uid = s.user?._id?.toString() || s.user?.toString();
        if (uid) allParticipants.add(uid);
        totalCorrectness += s.correctnessScore || 0;
        totalOptimization += s.optimizationScore || 0;
        totalPlagiarism += s.plagiarismScore || 0;
        totalFinalScore += s.finalScore || 0;

        allScoredSubmissions.push({
          uid,
          username: s.user?.username || 'Unknown',
          score: s.finalScore || 0,
          type: 'assignment',
        });
      });

      // Per-assignment breakdown
      const uniqueUsers = new Set(subs.map(s => s.user?._id?.toString() || s.user?.toString()).filter(Boolean));
      assignmentBreakdown.push({
        _id: a._id,
        title: a.title,
        questionCount: a.questions?.length || 0,
        participantCount: uniqueUsers.size,
        submissionCount: subs.length,
        avgScore: subs.length > 0 ? Math.round(subs.reduce((sum, sub) => sum + (sub.finalScore || 0), 0) / subs.length) : 0,
        isActive: a.isActive,
        deadline: a.deadline,
        createdAt: a.createdAt,
      });
    });

    // --- Task Stats ---
    const totalTasks = tasks.length;
    let totalTaskSubmissions = 0;
    let totalTaskScore = 0;

    tasks.forEach(t => {
      const subs = t.submissions || [];
      totalTaskSubmissions += subs.length;
      subs.forEach(s => {
        const uid = s.user?._id?.toString() || s.user?.toString();
        if (uid) allParticipants.add(uid);
        totalTaskScore += s.score || 0;

        allScoredSubmissions.push({
          uid,
          username: s.user?.username || 'Unknown',
          score: s.score || 0,
          type: 'task',
        });
      });
    });

    // --- Assessment Stats ---
    const totalAssessments = assessments.length;
    let totalAssessmentSubmissions = 0;

    assessments.forEach(a => {
      const subs = a.submissions || [];
      totalAssessmentSubmissions += subs.length;
      subs.forEach(s => {
        const uid = s.user?._id?.toString() || s.user?.toString();
        if (uid) allParticipants.add(uid);

        allScoredSubmissions.push({
          uid,
          username: s.user?.username || 'Unknown',
          score: s.percentage || 0,
          type: 'assessment',
        });
      });
    });

    const totalSubmissions = totalAssignmentSubmissions + totalTaskSubmissions + totalAssessmentSubmissions;

    // --- Recent submissions (last 15) ---
    let recentSubmissions = [];
    assignments.forEach(a => {
      (a.submissions || []).forEach(s => {
        recentSubmissions.push({
          type: 'assignment',
          assignmentTitle: a.title,
          user: s.user,
          score: s.finalScore || 0,
          correctness: s.correctnessScore || 0,
          optimization: s.optimizationScore || 0,
          plagiarism: s.plagiarismScore || 0,
          language: s.language || 'N/A',
          submittedAt: s.submittedAt,
        });
      });
    });
    tasks.forEach(t => {
      (t.submissions || []).forEach(s => {
        recentSubmissions.push({
          type: 'task',
          taskTitle: t.title,
          user: s.user,
          score: s.score || 0,
          language: s.language || 'N/A',
          submittedAt: s.submittedAt,
        });
      });
    });
    assessments.forEach(a => {
      (a.submissions || []).forEach(s => {
        recentSubmissions.push({
          type: 'assessment',
          taskTitle: a.title + ' (Assessment)',
          user: s.user,
          score: s.percentage || 0,
          language: 'MCQ',
          submittedAt: s.submittedAt,
        });
      });
    });
    recentSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    recentSubmissions = recentSubmissions.slice(0, 15);

    // --- Top performers (across all submission types) ---
    const userScores = {};
    allScoredSubmissions.forEach(s => {
      if (!s.uid) return;
      if (!userScores[s.uid]) userScores[s.uid] = { userId: s.uid, username: s.username, totalScore: 0, count: 0 };
      userScores[s.uid].totalScore += s.score;
      userScores[s.uid].count += 1;
    });
    const topPerformers = Object.values(userScores)
      .map(u => ({ ...u, avgScore: Math.round(u.totalScore / u.count) }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    // --- Score distribution (across all submission types) ---
    const scoreRanges = { excellent: 0, good: 0, average: 0, poor: 0 };
    allScoredSubmissions.forEach(s => {
      const score = s.score || 0;
      if (score >= 80) scoreRanges.excellent++;
      else if (score >= 60) scoreRanges.good++;
      else if (score >= 40) scoreRanges.average++;
      else scoreRanges.poor++;
    });

    // --- Averages ---
    // Correctness: assignments have correctnessScore, tasks have score (= % test cases passed), quizzes have percentage
    const combinedCorrectness = totalCorrectness + totalTaskScore;
    let assessmentTotalPercentage = 0;
    assessments.forEach(a => {
      (a.submissions || []).forEach(s => { assessmentTotalPercentage += s.percentage || 0; });
    });
    const totalCorrectnessAll = combinedCorrectness + assessmentTotalPercentage;
    const nAll = totalSubmissions || 1;

    // Optimization/Plagiarism only exist for assignment submissions
    const nAssign = totalAssignmentSubmissions || 1;

    // Combined average score
    const combinedTotalScore = totalFinalScore + totalTaskScore;

    res.json({
      overview: {
        totalAssignments,
        totalTasks,
        totalAssessments,
        totalSubmissions,
        totalParticipants: allParticipants.size,
        avgCorrectness: Math.round(totalCorrectnessAll / nAll),
        avgOptimization: totalAssignmentSubmissions > 0 ? Math.round(totalOptimization / nAssign) : null,
        avgPlagiarism: totalAssignmentSubmissions > 0 ? Math.round(totalPlagiarism / nAssign) : null,
        avgFinalScore: Math.round(combinedTotalScore / nAll),
      },
      scoreDistribution: scoreRanges,
      assignmentBreakdown,
      topPerformers,
      recentSubmissions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/company/details — Approved company fills in their details
router.put('/details', authMiddleware, companyOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Your account must be approved before adding details.' });
    }

    const { companyName, industry, companySize, website, companyDescription } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required.' });
    }

    user.companyName = companyName;
    user.industry = industry || '';
    user.companySize = companySize || '';
    user.website = website || '';
    user.companyDescription = companyDescription || '';
    user.companyDetailsCompleted = true;
    await user.save();

    res.json({ message: 'Company details saved successfully', user: { companyName: user.companyName, industry: user.industry, companySize: user.companySize, website: user.website, companyDescription: user.companyDescription } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
