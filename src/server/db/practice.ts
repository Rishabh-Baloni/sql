import db from '../db/sqlite';

function initPracticeDb() {
  const createAttemptsTable = `
    CREATE TABLE IF NOT EXISTS practice_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      user_query TEXT NOT NULL,
      evaluation_result TEXT NOT NULL, -- 'Correct' | 'Incorrect'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.exec(createAttemptsTable);
}

// Initialize immediately when imported
try {
  initPracticeDb();
} catch (error) {
  console.error('Practice DB initialization failed:', error);
}

export function logAttempt(questionId: number, userQuery: string, result: 'Correct' | 'Incorrect') {
  const insert = db.prepare(`
    INSERT INTO practice_attempts (question_id, user_query, evaluation_result)
    VALUES (?, ?, ?)
  `);
  insert.run(questionId, userQuery, result);
}

export function getAttempts(limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM practice_attempts ORDER BY timestamp DESC LIMIT ?
  `);
  return stmt.all(limit);
}

export default db; // Re-export db if needed
