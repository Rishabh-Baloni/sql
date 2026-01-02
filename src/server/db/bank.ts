import Database from 'better-sqlite3';
import path from 'path';
import { Skill, Difficulty } from '../ai/questionGenerator';

const dbPath = path.resolve(process.cwd(), 'bank_questions.db');
const db = new Database(dbPath);

export interface BankQuestion {
  id: number;
  title: string;
  problem: string;
  schema: string;
  reference_query: string;
  expected_columns: string[];
  skill: Skill;
  difficulty: Difficulty;
}

export function initBankQuestionsDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      problem TEXT NOT NULL,
      schema TEXT NOT NULL,
      reference_query TEXT NOT NULL,
      expected_columns TEXT NOT NULL,
      skill TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function storeBankQuestion(q: Omit<BankQuestion, 'id'>): number {
  const stmt = db.prepare(`
    INSERT INTO bank_questions (title, problem, schema, reference_query, expected_columns, skill, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    q.title,
    q.problem,
    q.schema,
    q.reference_query,
    JSON.stringify(q.expected_columns),
    q.skill,
    q.difficulty
  );
  return result.lastInsertRowid as number;
}

export function getBankQuestion(skill?: Skill, difficulty?: Difficulty, excludeProblems?: string[]): BankQuestion | null {
  let query = 'SELECT * FROM bank_questions WHERE 1=1';
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
  query += ' ORDER BY usage_count ASC, created_at ASC LIMIT 1';
  const stmt = db.prepare(query);
  const row = stmt.get(...params) as any;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    problem: row.problem,
    schema: row.schema,
    reference_query: row.reference_query,
    expected_columns: JSON.parse(row.expected_columns),
    skill: row.skill,
    difficulty: row.difficulty
  };
}

export function incrementBankUsage(problem: string) {
  const stmt = db.prepare(`UPDATE bank_questions SET usage_count = usage_count + 1 WHERE problem = ?`);
  stmt.run(problem);
}

export function getBankCount(skill?: Skill, difficulty?: Difficulty): number {
  let query = 'SELECT COUNT(*) as count FROM bank_questions WHERE 1=1';
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

export function findBankById(id: number): BankQuestion | null {
  const stmt = db.prepare('SELECT * FROM bank_questions WHERE id = ?');
  const row = stmt.get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    problem: row.problem,
    schema: row.schema,
    reference_query: row.reference_query,
    expected_columns: JSON.parse(row.expected_columns),
    skill: row.skill,
    difficulty: row.difficulty
  };
}

initBankQuestionsDB();
export default db;
