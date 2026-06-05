const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const authMiddleware = require('../middleware/authMiddleware');
const companyOnly = require('../middleware/companyOnly');
const User = require('../models/User');

// GET /api/questions — list all questions with optional filters
router.get('/', async (req, res) => {
  try {
    const { difficulty, category, tag, search } = req.query;
    const filter = {};

    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;
    if (tag) filter.tags = { $in: [tag] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const questions = await Question.find(filter)
      .select('-testCases')  // Hide test cases in listing
      .sort({ difficulty: 1, category: 1, title: 1 });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/questions/categories — get all unique categories & tags
router.get('/categories', async (req, res) => {
  try {
    const categories = await Question.distinct('category');
    const tags = await Question.distinct('tags');
    const difficulties = ['Easy', 'Medium', 'Hard'];
    res.json({ categories, tags, difficulties });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/questions/:id — get full question details
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/questions — Company creates a custom question
router.post('/', authMiddleware, companyOnly, async (req, res) => {
  try {
    const { title, description, difficulty, category, tags, constraints, examples, testCases } = req.body;

    // Validation
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!description?.trim()) return res.status(400).json({ error: 'Description is required' });
    if (!difficulty) return res.status(400).json({ error: 'Difficulty is required' });
    if (!category?.trim()) return res.status(400).json({ error: 'Category is required' });
    if (!Array.isArray(examples) || examples.length === 0) {
      return res.status(400).json({ error: 'At least one example is required' });
    }
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: 'At least one test case is required' });
    }

    // Check for duplicate title
    const exists = await Question.findOne({ title: title.trim() });
    if (exists) {
      return res.status(400).json({ error: 'A question with this title already exists' });
    }

    // Get company username for source
    const user = await User.findById(req.user.id);
    const sourceName = user?.username || 'Custom';

    const question = new Question({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      category: category.trim(),
      tags: tags || [],
      source: sourceName,
      constraints: constraints || '',
      examples,
      testCases,
      isCustom: true,
      createdBy: req.user.id,
    });

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('Create custom question error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A question with this title already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/questions/:id — Company deletes their own custom question
router.delete('/:id', authMiddleware, companyOnly, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    // Only allow deleting custom questions created by this company
    if (!question.isCustom || question.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own custom questions' });
    }

    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
