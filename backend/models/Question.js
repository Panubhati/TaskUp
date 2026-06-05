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

const QuestionSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  category: { type: String, required: true },
  tags: { type: [String], default: [] },
  source: { type: String, default: 'Original' },
  constraints: { type: String, default: '' },
  examples: { type: [ExampleSchema], default: [] },
  testCases: { type: [TestCaseSchema], default: [] },
  starterCode: {
    javascript: { type: String, default: '' },
    python: { type: String, default: '' },
    cpp: { type: String, default: '' },
    java: { type: String, default: '' },
  },
  isCustom: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});

QuestionSchema.index({ difficulty: 1, category: 1 });
QuestionSchema.index({ tags: 1 });

module.exports = mongoose.model('Question', QuestionSchema);
