const mongoose = require('mongoose');

const ExampleSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  explanation: { type: String },
});

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
});

const SubmissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  score: { type: Number, required: true },
  testCasesPassed: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 },
  status: { type: String, enum: ['submitted', 'evaluated'], default: 'evaluated' },
  timeTakenSeconds: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  aiAnalysis: {
    timeComplexity: { type: String, default: 'N/A' },
    spaceComplexity: { type: String, default: 'N/A' },
    optimizationNotes: { type: String, default: '' },
    feedback: { type: String, default: '' },
  },
});

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  submissions: { type: [SubmissionSchema], default: [] },
  testCases: { type: [TestCaseSchema], default: [] },
  examples: { type: [ExampleSchema], default: [] },
});

module.exports = mongoose.model('Task', TaskSchema);