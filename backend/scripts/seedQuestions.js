const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const Question = require('../models/Question');
const questions = require('../data/questionBank');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Question.deleteMany({});
    console.log('Cleared existing questions');

    const inserted = await Question.insertMany(questions);
    console.log(`✅ Seeded ${inserted.length} questions successfully!`);

    // Print summary
    const categories = {};
    inserted.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1;
    });
    console.log('\n📊 Question Summary:');
    Object.entries(categories).sort().forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
