const Assessment = require('../models/Assessment');

/* ═══════════ Controllers ═══════════ */

// POST /api/assessments — Company creates an assessment
const createAssessment = async (req, res) => {
  const { title, description, questions, timeLimitMinutes } = req.body;
  try {
    if (!title || !questions?.length || !timeLimitMinutes) {
      return res.status(400).json({ error: 'Title, questions, and time limit are required' });
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.options || q.options.length !== 4) {
        return res.status(400).json({ error: `Question ${i + 1}: Must have text and exactly 4 options` });
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
        return res.status(400).json({ error: `Question ${i + 1}: Correct answer must be 0-3` });
      }
    }

    const assessment = new Assessment({
      title,
      description: description || '',
      company: req.user.id,
      questions: questions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
      })),
      timeLimitMinutes,
    });

    await assessment.save();
    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/assessments — List assessments
const getAssessments = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'company') {
      filter.company = req.user.id;
    } else {
      filter.isActive = true;
    }

    const assessments = await Assessment.find(filter)
      .populate('company', 'username')
      .select('-questions.correctAnswer')
      .sort({ createdAt: -1 });

    if (req.user?.role === 'student') {
      const result = assessments.map(a => {
        const obj = a.toObject();
        obj.hasAttempted = a.submissions.some(
          s => s.user.toString() === req.user.id
        );
        obj.isBanned = (a.bannedUsers || []).some(uid => uid.toString() === req.user.id);
        const mySub = a.submissions.find(s => s.user.toString() === req.user.id);
        if (mySub) {
          obj.myScore = mySub.score;
          obj.myPercentage = mySub.percentage;
        }
        obj.totalQuestions = a.questions.length;
        delete obj.submissions;
        delete obj.bannedUsers;
        delete obj.tabViolations;
        return obj;
      });
      return res.json(result);
    }

    const result = assessments.map(a => {
      const obj = a.toObject();
      obj.totalQuestions = a.questions.length;
      obj.totalSubmissions = a.submissions.length;
      obj.uniqueParticipants = new Set(a.submissions.map(s => s.user.toString())).size;
      delete obj.submissions;
      return obj;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/assessments/:id — Get assessment detail
const getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate('company', 'username');
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const obj = assessment.toObject();

    if (req.user?.role === 'student') {
      if (assessment.bannedUsers.some(uid => uid.toString() === req.user.id)) {
        return res.status(403).json({
          error: 'You have been banned from this assessment due to tab-switching violations.',
          banned: true,
        });
      }
      const mySub = assessment.submissions.find(s => s.user.toString() === req.user.id);
      obj.hasAttempted = !!mySub;
      if (mySub) {
        obj.mySubmission = {
          score: mySub.score,
          totalPoints: mySub.totalPoints,
          percentage: mySub.percentage,
          timeTakenSeconds: mySub.timeTakenSeconds,
          answers: mySub.answers,
          submittedAt: mySub.submittedAt,
        };
      }

      if (!mySub) {
        obj.questions = obj.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          points: q.points,
        }));
      }
      delete obj.submissions;
    }

    return res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/assessments/:id/submit — Student submits assessment
const submitAssessment = async (req, res) => {
  const { answers, timeTakenSeconds, proctoringViolations, proctoringSnapshots, proctoringEnabled } = req.body;
  const userId = req.user.id;

  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (!assessment.isActive) {
      return res.status(400).json({ error: 'This assessment is no longer active' });
    }

    if (assessment.bannedUsers.some(uid => uid.toString() === userId)) {
      return res.status(403).json({
        error: 'You have been banned from this assessment due to tab-switching violations.',
        banned: true,
      });
    }

    const alreadyAttempted = assessment.submissions.some(s => s.user.toString() === userId);
    if (alreadyAttempted) {
      return res.status(400).json({ error: 'You have already attempted this assessment. Only one attempt is allowed.' });
    }

    const maxSeconds = assessment.timeLimitMinutes * 60 + 5;
    if (timeTakenSeconds > maxSeconds) {
      return res.status(400).json({ error: 'Time limit exceeded. Submission rejected.' });
    }

    if (!answers || answers.length !== assessment.questions.length) {
      return res.status(400).json({ error: `Expected ${assessment.questions.length} answers` });
    }

    let score = 0;
    let totalPoints = 0;
    assessment.questions.forEach((q, i) => {
      if (answers[i] === -1 || answers[i] === null || answers[i] === undefined) {
        return;
      }
      totalPoints += q.points;
      if (answers[i] === q.correctAnswer) {
        score += q.points;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    // Cap snapshots to 20 max
    const sanitizedSnapshots = (proctoringSnapshots || []).slice(0, 20).map(s => ({
      image: s.image,
      timestamp: s.timestamp || new Date(),
      faceCount: s.faceCount ?? -1,
    }));

    const submission = {
      user: userId,
      answers,
      score,
      totalPoints,
      percentage,
      timeTakenSeconds: timeTakenSeconds || 0,
      proctoringEnabled: !!proctoringEnabled,
      proctoringViolations: proctoringViolations || 0,
      proctoringSnapshots: sanitizedSnapshots,
    };

    assessment.submissions.push(submission);
    await assessment.save();

    const results = assessment.questions.map((q, i) => ({
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      selectedAnswer: answers[i],
      isCorrect: answers[i] === q.correctAnswer,
      points: q.points,
    }));

    res.json({
      success: true,
      score,
      totalPoints,
      percentage,
      timeTakenSeconds: timeTakenSeconds || 0,
      results,
    });
  } catch (error) {
    console.error('Assessment submit error:', error);
    res.status(500).json({ error: 'Submission failed: ' + error.message });
  }
};

// GET /api/assessments/:id/leaderboard — Company-only leaderboard
const getAssessmentLeaderboard = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate('submissions.user', 'username email college');
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (assessment.company.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Only the assessment creator can view the leaderboard.' });
    }

    const leaderboard = assessment.submissions
      .map(s => ({
        user: s.user,
        score: s.score,
        totalPoints: s.totalPoints,
        percentage: s.percentage,
        timeTakenSeconds: s.timeTakenSeconds,
        proctoringEnabled: s.proctoringEnabled,
        proctoringViolations: s.proctoringViolations,
        snapshotCount: s.proctoringSnapshots?.length || 0,
        submittedAt: s.submittedAt,
      }))
      .sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.timeTakenSeconds - b.timeTakenSeconds;
      })
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    const totalParticipants = leaderboard.length;
    const avgPercentage = totalParticipants > 0
      ? Math.round(leaderboard.reduce((s, e) => s + e.percentage, 0) / totalParticipants)
      : 0;
    const avgTimeTaken = totalParticipants > 0
      ? Math.round(leaderboard.reduce((s, e) => s + e.timeTakenSeconds, 0) / totalParticipants)
      : 0;

    res.json({
      assessmentTitle: assessment.title,
      totalQuestions: assessment.questions.length,
      timeLimitMinutes: assessment.timeLimitMinutes,
      totalParticipants,
      avgPercentage,
      avgTimeTaken,
      leaderboard,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/assessments/:id/tab-violation — Student reports a tab switch
const reportTabViolation = async (req, res) => {
  const userId = req.user.id;
  const MAX_TAB_SWITCHES = 3;

  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (assessment.bannedUsers.some(uid => uid.toString() === userId)) {
      return res.status(403).json({
        error: 'You have been banned from this assessment due to tab-switching violations.',
        banned: true,
        violationCount: MAX_TAB_SWITCHES,
      });
    }

    const alreadySubmitted = assessment.submissions.some(s => s.user.toString() === userId);
    if (alreadySubmitted) {
      return res.status(400).json({ error: 'Assessment already submitted.' });
    }

    let violation = assessment.tabViolations.find(v => v.user.toString() === userId);
    if (!violation) {
      assessment.tabViolations.push({ user: userId, count: 0, violations: [] });
      violation = assessment.tabViolations[assessment.tabViolations.length - 1];
    }

    violation.count += 1;
    violation.violations.push({ timestamp: new Date() });

    if (violation.count >= MAX_TAB_SWITCHES) {
      violation.bannedAt = new Date();
      assessment.bannedUsers.push(userId);
      await assessment.save();

      return res.status(403).json({
        error: 'You have been banned from this assessment. You switched tabs 3 times.',
        banned: true,
        violationCount: violation.count,
      });
    }

    await assessment.save();

    res.json({
      warning: `Tab switch detected! Warning ${violation.count}/${MAX_TAB_SWITCHES}. You will be banned after ${MAX_TAB_SWITCHES} switches.`,
      violationCount: violation.count,
      maxAllowed: MAX_TAB_SWITCHES,
      banned: false,
    });
  } catch (error) {
    console.error('Tab violation error:', error);
    res.status(500).json({ error: 'Failed to report violation: ' + error.message });
  }
};

module.exports = { createAssessment, getAssessments, getAssessmentById, submitAssessment, getAssessmentLeaderboard, reportTabViolation };
