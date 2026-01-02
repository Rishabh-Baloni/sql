#!/usr/bin/env node
const { generateQuestion } = require('../src/server/ai/questionGenerator');
const { generateAndValidate } = require('../src/server/utils/questionValidator');
const { storeGeneratedQuestion } = require('../src/server/db/generated');
const db = require('../src/server/db/generated').default;

const skills = ['Filtering', 'Aggregation', 'Joins'];
const difficulties = ['Easy', 'Medium', 'Hard'];

async function seed(countPerCombo = 6) {
  console.log('Seeding Phase-6 generated questions...');
  for (const skill of skills) {
    for (const difficulty of difficulties) {
      const targetCount = countPerCombo;
      let created = 0;
      for (let i = 0; i < targetCount; i++) {
        const q = await generateAndValidate(
          () => generateQuestion(skill, difficulty),
          3
        );
        if (q) {
          storeGeneratedQuestion(q);
          created++;
        }
      }
      console.log(`Seeded ${created}/${targetCount} for ${skill}/${difficulty}`);
    }
  }
  console.log('Seeding complete.');

  const rows = db.prepare(
    'SELECT skill, difficulty, COUNT(*) as count FROM generated_questions GROUP BY skill, difficulty'
  ).all();
  console.log('Generated question counts:');
  for (const r of rows) {
    console.log(`- ${r.skill}/${r.difficulty}: ${r.count}`);
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
