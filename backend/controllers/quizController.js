const Quiz = require('../models/Quiz');

/* ═══════════ Controllers ═══════════ */

// POST /api/quizzes — Company creates a quiz
const createQuiz = async (req, res) => {
  const { title, description, questions, timeLimitMinutes } = req.body;
  try {
    if (!title || !questions?.length || !timeLimitMinutes) {
      return res.status(400).json({ error: 'Title, questions, and time limit are required' });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.options || q.options.length !== 4) {
        return res.status(400).json({ error: `Question ${i + 1}: Must have text and exactly 4 options` });
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
        return res.status(400).json({ error: `Question ${i + 1}: Correct answer must be 0-3` });
      }
    }

    const quiz = new Quiz({
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

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/quizzes — List quizzes
const getQuizzes = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'company') {
      // Companies see only their own quizzes
      filter.company = req.user.id;
    } else {
      // Students see only active quizzes
      filter.isActive = true;
    }

    const quizzes = await Quiz.find(filter)
      .populate('company', 'username')
      .select('-questions.correctAnswer') // hide answers in listing
      .sort({ createdAt: -1 });

    // For students, add whether they already attempted each quiz
    if (req.user?.role === 'student') {
      const result = quizzes.map(q => {
        const obj = q.toObject();
        obj.hasAttempted = q.submissions.some(
          s => s.user.toString() === req.user.id
        );
        // Check if banned
        obj.isBanned = (q.bannedUsers || []).some(uid => uid.toString() === req.user.id);
        // Find student's own submission if exists
        const mySub = q.submissions.find(s => s.user.toString() === req.user.id);
        if (mySub) {
          obj.myScore = mySub.score;
          obj.myPercentage = mySub.percentage;
        }
        obj.totalQuestions = q.questions.length;
        // Don't expose full submissions list to students
        delete obj.submissions;
        delete obj.bannedUsers;
        delete obj.tabViolations;
        return obj;
      });
      return res.json(result);
    }

    // For companies, add stats
    const result = quizzes.map(q => {
      const obj = q.toObject();
      obj.totalQuestions = q.questions.length;
      obj.totalSubmissions = q.submissions.length;
      obj.uniqueParticipants = new Set(q.submissions.map(s => s.user.toString())).size;
      delete obj.submissions; // don't send full submissions in listing
      return obj;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/quizzes/:id — Get quiz detail
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('company', 'username');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const obj = quiz.toObject();

    if (req.user?.role === 'student') {
      // Check if banned from this quiz
      if (quiz.bannedUsers.some(uid => uid.toString() === req.user.id)) {
        return res.status(403).json({
          error: 'You have been banned from this quiz due to tab-switching violations.',
          banned: true,
        });
      }
      // Check if already attempted
      const mySub = quiz.submissions.find(s => s.user.toString() === req.user.id);
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

      // Hide correct answers if not yet attempted
      if (!mySub) {
        obj.questions = obj.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          points: q.points,
          // correctAnswer is hidden
        }));
      }
      // Don't expose other submissions
      delete obj.submissions;
    }

    return res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/quizzes/:id/submit — Student submits quiz
const submitQuiz = async (req, res) => {
  const { answers, timeTakenSeconds } = req.body;
  const userId = req.user.id;

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    if (!quiz.isActive) {
      return res.status(400).json({ error: 'This quiz is no longer active' });
    }

    // Check if student is banned from this quiz
    if (quiz.bannedUsers.some(uid => uid.toString() === userId)) {
      return res.status(403).json({
        error: 'You have been banned from this quiz due to tab-switching violations.',
        banned: true,
      });
    }

    // Check if already attempted (one attempt only)
    const alreadyAttempted = quiz.submissions.some(s => s.user.toString() === userId);
    if (alreadyAttempted) {
      return res.status(400).json({ error: 'You have already attempted this quiz. Only one attempt is allowed.' });
    }

    // Validate timer — reject if time taken exceeds limit + 5s grace
    const maxSeconds = quiz.timeLimitMinutes * 60 + 5;
    if (timeTakenSeconds > maxSeconds) {
      return res.status(400).json({ error: 'Time limit exceeded. Submission rejected.' });
    }

    // Validate answers array
    if (!answers || answers.length !== quiz.questions.length) {
      return res.status(400).json({ error: `Expected ${quiz.questions.length} answers` });
    }

    // Score the quiz — only evaluate answered questions (skip -1 / unanswered)
    let score = 0;
    let totalPoints = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === -1 || answers[i] === null || answers[i] === undefined) {
        return; // skip unanswered questions
      }
      totalPoints += q.points;
      if (answers[i] === q.correctAnswer) {
        score += q.points;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    const submission = {
      user: userId,
      answers,
      score,
      totalPoints,
      percentage,
      timeTakenSeconds: timeTakenSeconds || 0,
    };

    quiz.submissions.push(submission);
    await quiz.save();

    // Return results with correct answers revealed
    const results = quiz.questions.map((q, i) => ({
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
    console.error('Quiz submit error:', error);
    res.status(500).json({ error: 'Submission failed: ' + error.message });
  }
};

// GET /api/quizzes/:id/leaderboard — Company-only leaderboard
const getQuizLeaderboard = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('submissions.user', 'username email college');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Verify requesting user is the quiz owner
    if (quiz.company.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Only the quiz creator can view the leaderboard.' });
    }

    // Build leaderboard sorted by percentage (desc), then time taken (asc)
    const leaderboard = quiz.submissions
      .map(s => ({
        user: s.user,
        score: s.score,
        totalPoints: s.totalPoints,
        percentage: s.percentage,
        timeTakenSeconds: s.timeTakenSeconds,
        submittedAt: s.submittedAt,
      }))
      .sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.timeTakenSeconds - b.timeTakenSeconds; // faster is better
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
      quizTitle: quiz.title,
      totalQuestions: quiz.questions.length,
      timeLimitMinutes: quiz.timeLimitMinutes,
      totalParticipants,
      avgPercentage,
      avgTimeTaken,
      leaderboard,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/quizzes/:id/tab-violation — Student reports a tab switch
const reportTabViolation = async (req, res) => {
  const userId = req.user.id;
  const MAX_TAB_SWITCHES = 3;

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Already banned
    if (quiz.bannedUsers.some(uid => uid.toString() === userId)) {
      return res.status(403).json({
        error: 'You have been banned from this quiz due to tab-switching violations.',
        banned: true,
        violationCount: MAX_TAB_SWITCHES,
      });
    }

    // Already submitted — ignore violations
    const alreadySubmitted = quiz.submissions.some(s => s.user.toString() === userId);
    if (alreadySubmitted) {
      return res.status(400).json({ error: 'Quiz already submitted.' });
    }

    // Find or create violation record for this user
    let violation = quiz.tabViolations.find(v => v.user.toString() === userId);
    if (!violation) {
      quiz.tabViolations.push({ user: userId, count: 0, violations: [] });
      violation = quiz.tabViolations[quiz.tabViolations.length - 1];
    }

    violation.count += 1;
    violation.violations.push({ timestamp: new Date() });

    // Ban if exceeds limit
    if (violation.count >= MAX_TAB_SWITCHES) {
      violation.bannedAt = new Date();
      quiz.bannedUsers.push(userId);
      await quiz.save();

      return res.status(403).json({
        error: 'You have been banned from this quiz. You switched tabs 3 times.',
        banned: true,
        violationCount: violation.count,
      });
    }

    await quiz.save();

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

module.exports = { createQuiz, getQuizzes, getQuizById, submitQuiz, getQuizLeaderboard, reportTabViolation };
