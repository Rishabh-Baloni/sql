import Database from 'better-sqlite3';
import path from 'path';
import { Skill, Difficulty, GeneratedQuestion } from '../ai/questionGenerator';

const dbPath = path.resolve(process.cwd(), 'generated_questions.db');
const db = new Database(dbPath);

// Initialize the generated questions table
export function initGeneratedQuestionsDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      problem TEXT NOT NULL,
      schema TEXT NOT NULL,
      reference_query TEXT NOT NULL,
      expected_columns TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Store a validated AI-generated question
export function storeGeneratedQuestion(question: GeneratedQuestion): number {
  const stmt = db.prepare(`
    INSERT INTO generated_questions (skill, difficulty, problem, schema, reference_query, expected_columns)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    question.skill,
    question.difficulty,
    question.problem,
    question.schema,
    question.reference_query,
    JSON.stringify(question.expected_columns)
  );

  console.log('[Phase-6] Stored AI question', {
    skill: question.skill,
    difficulty: question.difficulty,
    problem: `${question.problem.substring(0, 60)}...`
  });
  return result.lastInsertRowid as number;
}

// Get a stored question by skill and difficulty
export interface StoredQuestion {
  id: number;
  skill: Skill;
  difficulty: Difficulty;
  problem: string;
  schema: string;
  reference_query: string;
  expected_columns: string[];
}

export function getStoredQuestion(skill?: Skill, difficulty?: Difficulty, excludeProblems?: string[]): StoredQuestion | null {
  let query = 'SELECT * FROM generated_questions WHERE 1=1';
  const params: any[] = [];

  if (skill) {
    query += ' AND skill = ?';
    params.push(skill);
  }

  if (difficulty) {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  if (excludeProblems && excludeProblems.length > 0) {
    const placeholders = excludeProblems.map(() => '?').join(', ');
    query += ` AND problem NOT IN (${placeholders})`;
    params.push(...excludeProblems);
  }

  // Prefer questions with lower usage count
  query += ' ORDER BY usage_count ASC, created_at ASC LIMIT 1';

  const stmt = db.prepare(query);
  const row = stmt.get(...params) as any;

  if (!row) return null;

  const result: StoredQuestion = {
    id: row.id,
    skill: row.skill,
    difficulty: row.difficulty,
    problem: row.problem,
    schema: row.schema,
    reference_query: row.reference_query,
    expected_columns: JSON.parse(row.expected_columns)
  };
  return result;
}

// Increment usage count when a question is served
export function incrementUsageCount(problem: string) {
  const stmt = db.prepare(`
    UPDATE generated_questions 
    SET usage_count = usage_count + 1 
    WHERE problem = ?
  `);
  stmt.run(problem);
}

// Get count of available questions
export function getQuestionCount(skill?: Skill, difficulty?: Difficulty): number {
  let query = 'SELECT COUNT(*) as count FROM generated_questions WHERE 1=1';
  const params: any[] = [];

  if (skill) {
    query += ' AND skill = ?';
    params.push(skill);
  }

  if (difficulty) {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  const stmt = db.prepare(query);
  const result = stmt.get(...params) as any;
  return result.count;
}

// Initialize the database
initGeneratedQuestionsDB();

export default db;
 
export function findGeneratedById(id: number): StoredQuestion | null {
  const stmt = db.prepare('SELECT * FROM generated_questions WHERE id = ?');
  const row = stmt.get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    skill: row.skill,
    difficulty: row.difficulty,
    problem: row.problem,
    schema: row.schema,
    reference_query: row.reference_query,
    expected_columns: JSON.parse(row.expected_columns)
  };
}
