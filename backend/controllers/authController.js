const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const signup = async (req, res) => {
  const { username, password, role, email, phone, dob, college, qualifyingYear, city, companyName } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { username, password: hashedPassword, role };

    // Company accounts start as pending, save basic company info
    if (role === 'company') {
      userData.status = 'pending';
      if (companyName) userData.companyName = companyName;
      if (email) userData.email = email;
      if (city) userData.city = city;
    }

    // Add student-specific fields
    if (role === 'student') {
      if (email) userData.email = email;
      if (phone) userData.phone = phone;
      if (dob) userData.dob = new Date(dob);
      if (college) userData.college = college;
      if (qualifyingYear) userData.qualifyingYear = parseInt(qualifyingYear);
      if (city) userData.city = city;
    }

    const user = new User(userData);
    await user.save();

    if (role === 'company') {
      return res.status(201).json({ message: 'Registration submitted! Please wait for admin approval before you can log in.' });
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Block pending/rejected companies
    if (user.role === 'company') {
      if (user.status === 'pending') {
        return res.status(403).json({ message: 'Your account is awaiting admin approval. Please check back later.' });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({ message: 'Your registration has been rejected by the administrator.' });
      }
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({
      token,
      role: user.role,
      username: user.username,
      status: user.status,
      companyDetailsCompleted: user.companyDetailsCompleted || false,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { signup, login };