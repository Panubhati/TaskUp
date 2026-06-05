const mongoose = require('mongoose');

const QuizQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [arr => arr.length === 4, 'Exactly 4 options required'],
  },
  correctAnswer: { type: Number, required: true, min: 0, max: 3 }, // index into options
  points: { type: Number, default: 1 },
});

const QuizSubmissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: Number }], // selected option index per question (-1 = unanswered)
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  timeTakenSeconds: { type: Number, default: 0 }, // how long the student took
  submittedAt: { type: Date, default: Date.now },
});

const TabViolationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, default: 0 },
  bannedAt: { type: Date, default: null },
  violations: [{ timestamp: { type: Date, default: Date.now } }],
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: { type: [QuizQuestionSchema], default: [] },
  timeLimitMinutes: { type: Number, required: true, min: 1 }, // enforced timer
  isActive: { type: Boolean, default: true },
  submissions: { type: [QuizSubmissionSchema], default: [] },
  bannedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tabViolations: { type: [TabViolationSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

QuizSchema.index({ company: 1 });
QuizSchema.index({ 'submissions.user': 1 });

module.exports = mongoose.model('Quiz', QuizSchema);
