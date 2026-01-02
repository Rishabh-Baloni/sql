#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(process.cwd(), 'generated_questions.db');
const db = new Database(dbPath);
const rows = db.prepare('SELECT skill, difficulty, COUNT(*) as count FROM generated_questions GROUP BY skill, difficulty').all();
for (const r of rows) {
  console.log(`${r.skill}, ${r.difficulty}, ${r.count}`);
}
