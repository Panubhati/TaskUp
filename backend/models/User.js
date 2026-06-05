const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'company', 'admin'], required: true },
  // Company approval status — only relevant for company accounts
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  // Student fields
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  dob: { type: Date },
  college: { type: String, default: '' },
  qualifyingYear: { type: Number },
  city: { type: String, default: '' },
  // Company detail fields (filled after admin approval)
  companyName: { type: String, default: '' },
  industry: { type: String, default: '' },
  companySize: { type: String, default: '' },
  website: { type: String, default: '' },
  companyDescription: { type: String, default: '' },
  companyDetailsCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);