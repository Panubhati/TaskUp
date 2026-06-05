const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const resumeRouter = require('./routes/resume');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/task');
const codeEvaluateRoutes = require('./routes/codeEvaluate');
const questionBankRoutes = require('./routes/questionBank');
const assignmentRoutes = require('./routes/assignment');
const companyRoutes = require('./routes/company');
const assessmentRoutes = require('./routes/assessment');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/message');
const candidateRoutes = require('./routes/candidate');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected Successfully'))
  .catch(err => console.log(err));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/resume', resumeRouter);
app.use('/api/code', codeEvaluateRoutes);
app.use('/api/questions', questionBankRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/candidates', candidateRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
