const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminOnly');
const User = require('../models/User');

// GET /api/admin/stats — Overview statistics
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCompanies = await User.countDocuments({ role: 'company' });
    const pendingCompanies = await User.countDocuments({ role: 'company', status: 'pending' });
    const approvedCompanies = await User.countDocuments({ role: 'company', status: 'approved' });
    const rejectedCompanies = await User.countDocuments({ role: 'company', status: 'rejected' });

    res.json({
      totalStudents,
      totalCompanies,
      pendingCompanies,
      approvedCompanies,
      rejectedCompanies,
      totalUsers: totalStudents + totalCompanies,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/companies — List all company users (optional ?status= filter)
router.get('/companies', authMiddleware, adminOnly, async (req, res) => {
  try {
    const filter = { role: 'company' };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const companies = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/companies/:id/approve
router.put('/companies/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  try {
    const company = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'company' },
      { status: 'approved' },
      { new: true }
    ).select('-password');

    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company approved successfully', company });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/companies/:id/reject
router.put('/companies/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  try {
    const company = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'company' },
      { status: 'rejected' },
      { new: true }
    ).select('-password');

    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company rejected', company });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users — List all users (with optional role filter)
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && req.query.role !== 'all') {
      filter.role = req.query.role;
    }
    // Exclude admin accounts from the user list
    filter.role = filter.role || { $ne: 'admin' };

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/users/:id — Delete a user
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
