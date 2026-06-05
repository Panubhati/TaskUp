const express = require('express');
const multer = require('multer');
const router = express.Router();
const pdfParse = require('pdf-parse');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// AI-powered resume evaluation
function evaluateResume(text) {
  const results = {
    overallScore: 0,
    sections: [],
    suggestions: [],
    strengths: [],
    keywords: [],
  };

  const lowerText = text.toLowerCase();
  const lines = text.split('\n').filter(l => l.trim());
  const wordCount = text.split(/\s+/).filter(w => w.trim()).length;

  // 1. Contact Information (15 pts)
  let contactScore = 0;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/i;
  const githubRegex = /github\.com\/[a-zA-Z0-9-]+/i;

  if (emailRegex.test(text)) { contactScore += 4; results.strengths.push('Email address found'); }
  else results.suggestions.push('Add a professional email address');
  
  if (phoneRegex.test(text)) { contactScore += 4; results.strengths.push('Phone number found'); }
  else results.suggestions.push('Add a phone number for contact');
  
  if (linkedinRegex.test(text)) { contactScore += 4; results.strengths.push('LinkedIn profile linked'); }
  else results.suggestions.push('Add your LinkedIn profile URL');
  
  if (githubRegex.test(text)) { contactScore += 3; results.strengths.push('GitHub profile linked'); }
  else results.suggestions.push('Consider adding your GitHub profile for technical roles');

  results.sections.push({ name: 'Contact Information', score: contactScore, maxScore: 15 });

  // 2. Education (15 pts)
  let educationScore = 0;
  const educationKeywords = ['education', 'university', 'college', 'bachelor', 'master', 'degree', 'b.tech', 'b.e', 'm.tech', 'mba', 'bsc', 'msc', 'phd', 'diploma', 'cgpa', 'gpa'];
  const hasEducation = educationKeywords.some(kw => lowerText.includes(kw));
  if (hasEducation) {
    educationScore += 10;
    results.strengths.push('Education section present');
    if (/\d\.\d/.test(text) || /cgpa|gpa/i.test(text)) {
      educationScore += 5;
      results.strengths.push('GPA/CGPA mentioned');
    } else {
      results.suggestions.push('Consider adding your GPA/CGPA if it\'s strong');
    }
  } else {
    results.suggestions.push('Add an Education section with degree details');
  }
  results.sections.push({ name: 'Education', score: educationScore, maxScore: 15 });

  // 3. Experience / Projects (20 pts)
  let experienceScore = 0;
  const experienceKeywords = ['experience', 'work', 'internship', 'intern', 'project', 'freelance', 'employment', 'position', 'role'];
  const hasExperience = experienceKeywords.some(kw => lowerText.includes(kw));
  if (hasExperience) {
    experienceScore += 10;
    results.strengths.push('Experience/Projects section found');
  } else {
    results.suggestions.push('Add a Work Experience or Projects section');
  }

  // Action verbs check
  const actionVerbs = ['developed', 'built', 'created', 'designed', 'implemented', 'managed', 'led', 'optimized', 'improved', 'achieved', 'delivered', 'launched', 'automated', 'reduced', 'increased', 'analyzed', 'coordinated', 'mentored', 'deployed', 'integrated', 'architected', 'engineered', 'collaborated', 'spearheaded'];
  const foundVerbs = actionVerbs.filter(v => lowerText.includes(v));
  if (foundVerbs.length >= 5) {
    experienceScore += 5;
    results.strengths.push(`Strong use of action verbs (${foundVerbs.length} found)`);
  } else if (foundVerbs.length >= 2) {
    experienceScore += 3;
    results.suggestions.push('Use more action verbs to describe your accomplishments');
  } else {
    results.suggestions.push('Start bullet points with strong action verbs (e.g., Developed, Implemented, Led)');
  }

  // Quantifiable achievements
  const quantRegex = /\d+\s*(%|percent|users|clients|projects|hours|reduction|increase|million|thousand|revenue)/gi;
  const quantMatches = text.match(quantRegex);
  if (quantMatches && quantMatches.length >= 3) {
    experienceScore += 5;
    results.strengths.push('Good use of quantifiable achievements');
  } else if (quantMatches && quantMatches.length >= 1) {
    experienceScore += 2;
    results.suggestions.push('Add more quantifiable metrics to your achievements');
  } else {
    results.suggestions.push('Include measurable results (e.g., "Increased performance by 40%")');
  }

  results.sections.push({ name: 'Experience & Projects', score: experienceScore, maxScore: 20 });

  // 4. Technical Skills (15 pts)
  let skillsScore = 0;
  const techSkills = ['javascript', 'python', 'java', 'c++', 'react', 'node', 'angular', 'vue', 'typescript', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes', 'git', 'html', 'css', 'django', 'flask', 'spring', 'express', 'nextjs', 'next.js', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'data science', 'linux', 'api', 'rest', 'graphql', 'figma', 'adobe', 'photoshop', 'postgres', 'mysql', 'redis', 'firebase', 'tailwind', 'bootstrap', 'sass'];
  const foundSkills = techSkills.filter(s => lowerText.includes(s));
  results.keywords = foundSkills;

  if (foundSkills.length >= 8) {
    skillsScore += 15;
    results.strengths.push(`Excellent technical breadth (${foundSkills.length} skills detected)`);
  } else if (foundSkills.length >= 5) {
    skillsScore += 10;
    results.strengths.push(`Good technical skills coverage (${foundSkills.length} skills detected)`);
  } else if (foundSkills.length >= 2) {
    skillsScore += 5;
    results.suggestions.push('Expand your skills section with more relevant technologies');
  } else {
    results.suggestions.push('Add a dedicated Technical Skills section listing your technologies');
  }

  results.sections.push({ name: 'Technical Skills', score: skillsScore, maxScore: 15 });

  // 5. Formatting & Structure (15 pts)
  let formatScore = 0;

  // Length check
  if (wordCount >= 200 && wordCount <= 800) {
    formatScore += 5;
    results.strengths.push('Resume length is optimal');
  } else if (wordCount < 200) {
    formatScore += 2;
    results.suggestions.push('Resume is too short — add more details about your experience and skills');
  } else {
    formatScore += 3;
    results.suggestions.push('Consider condensing your resume to 1-2 pages');
  }

  // Section headings check
  const commonHeadings = ['education', 'experience', 'skills', 'projects', 'achievements', 'certifications', 'summary', 'objective', 'awards', 'publications', 'extracurricular', 'hobbies', 'interests', 'languages', 'references'];
  const foundHeadings = commonHeadings.filter(h => lowerText.includes(h));
  if (foundHeadings.length >= 4) {
    formatScore += 5;
    results.strengths.push('Well-organized with clear sections');
  } else if (foundHeadings.length >= 2) {
    formatScore += 3;
    results.suggestions.push('Add more clearly defined sections (Skills, Projects, Achievements)');
  } else {
    results.suggestions.push('Organize your resume with clear section headings');
  }

  // Bullet points and structure
  const bulletCount = (text.match(/[•\-\*]/g) || []).length;
  if (bulletCount >= 5) {
    formatScore += 5;
    results.strengths.push('Good use of bullet points for readability');
  } else {
    formatScore += 2;
    results.suggestions.push('Use bullet points to make your resume more scannable');
  }

  results.sections.push({ name: 'Formatting & Structure', score: formatScore, maxScore: 15 });

  // 6. Certifications & Extras (10 pts)
  let extrasScore = 0;
  const certKeywords = ['certified', 'certification', 'certificate', 'coursera', 'udemy', 'edx', 'aws certified', 'google certified', 'microsoft certified', 'hackerrank', 'leetcode', 'codechef', 'codeforces'];
  const hasCerts = certKeywords.some(kw => lowerText.includes(kw));
  if (hasCerts) {
    extrasScore += 5;
    results.strengths.push('Certifications or online courses mentioned');
  } else {
    results.suggestions.push('Add relevant certifications to strengthen your profile');
  }

  const extracurricular = ['volunteer', 'leadership', 'club', 'society', 'event', 'hackathon', 'competition', 'award', 'publication', 'open source', 'contribution'];
  const hasExtras = extracurricular.some(kw => lowerText.includes(kw));
  if (hasExtras) {
    extrasScore += 5;
    results.strengths.push('Extracurricular activities or achievements mentioned');
  } else {
    results.suggestions.push('Include extracurricular activities, hackathons, or volunteer work');
  }

  results.sections.push({ name: 'Certifications & Extras', score: extrasScore, maxScore: 10 });

  // 7. Professional Summary (10 pts)
  let summaryScore = 0;
  const summaryKeywords = ['summary', 'objective', 'about me', 'profile', 'overview'];
  const hasSummary = summaryKeywords.some(kw => lowerText.includes(kw));
  if (hasSummary) {
    summaryScore += 10;
    results.strengths.push('Professional summary/objective present');
  } else {
    summaryScore += 2;
    results.suggestions.push('Add a brief professional summary at the top of your resume');
  }
  results.sections.push({ name: 'Professional Summary', score: summaryScore, maxScore: 10 });

  // Calculate overall score
  const totalScore = results.sections.reduce((sum, s) => sum + s.score, 0);
  const maxTotal = results.sections.reduce((sum, s) => sum + s.maxScore, 0);
  results.overallScore = Math.round((totalScore / maxTotal) * 100);

  // Overall grade
  if (results.overallScore >= 85) results.grade = 'A+';
  else if (results.overallScore >= 75) results.grade = 'A';
  else if (results.overallScore >= 65) results.grade = 'B+';
  else if (results.overallScore >= 55) results.grade = 'B';
  else if (results.overallScore >= 45) results.grade = 'C';
  else results.grade = 'D';

  return results;
}

router.post('/evaluate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract enough text from the PDF. Make sure it is not a scanned image.' });
    }

    const evaluation = evaluateResume(text);
    evaluation.pageCount = pdfData.numpages;
    evaluation.wordCount = text.split(/\s+/).filter(w => w.trim()).length;

    res.json({ success: true, evaluation });
  } catch (error) {
    console.error('Resume evaluation error:', error);
    res.status(500).json({ error: 'Error evaluating resume. Please try again.' });
  }
});

module.exports = router;