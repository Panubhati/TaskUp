const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  // AI-evaluated scores (0-100)
  correctnessScore: { type: Number, default: 0 },
  optimizationScore: { type: Number, default: 0 },
  plagiarismScore: { type: Number, default: 0 },  // 0 = no plagiarism, 100 = full copy
  // Weighted composite
  finalScore: { type: Number, default: 0 },
  testCasesPassed: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 },
  aiAnalysis: {
    timeComplexity: { type: String, default: '' },
    spaceComplexity: { type: String, default: '' },
    optimizationNotes: { type: String, default: '' },
    feedback: { type: String, default: '' },
    plagiarismNotes: { type: String, default: '' },
    similarTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  submittedAt: { type: Date, default: Date.now },
});

const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  submissions: { type: [SubmissionSchema], default: [] },
  deadline: { type: Date },
  timeLimitMinutes: { type: Number, default: 0 },  // 0 = no time limit
  maxSubmissions: { type: Number, default: 2 },      // max submissions per question per user
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

AssignmentSchema.index({ company: 1 });
AssignmentSchema.index({ 'submissions.user': 1 });

module.exports = mongoose.model('Assignment', AssignmentSchema);
