#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dbBankPath = path.resolve(process.cwd(), 'bank_questions.db');
const dbLocalPath = path.resolve(process.cwd(), 'local.db');
const db = new Database(dbBankPath);
const dbLocal = new Database(dbLocalPath);

function initBank() {
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

function initLocal() {
  dbLocal.exec(`
    CREATE TABLE IF NOT EXISTS employee (
      emp_id INTEGER PRIMARY KEY,
      emp_name TEXT,
      department TEXT,
      salary INTEGER,
      manager_id INTEGER
    );
  `);
  const countRow = dbLocal.prepare('SELECT COUNT(*) as count FROM employee').get();
  if (!countRow || countRow.count === 0) {
    const insert = dbLocal.prepare(`
      INSERT INTO employee (emp_id, emp_name, department, salary, manager_id)
      VALUES (@emp_id, @emp_name, @department, @salary, @manager_id)
    `);
    const employees = [
      { emp_id: 1, emp_name: 'Alice Johnson', department: 'Engineering', salary: 90000, manager_id: null },
      { emp_id: 2, emp_name: 'Bob Smith', department: 'Engineering', salary: 80000, manager_id: 1 },
      { emp_id: 3, emp_name: 'Charlie Brown', department: 'HR', salary: 60000, manager_id: null },
      { emp_id: 4, emp_name: 'David Lee', department: 'Marketing', salary: 75000, manager_id: null },
      { emp_id: 5, emp_name: 'Eve White', department: 'Engineering', salary: 82000, manager_id: 1 },
      { emp_id: 6, emp_name: 'Frank Green', department: 'HR', salary: 55000, manager_id: 3 },
      { emp_id: 7, emp_name: 'Grace Black', department: 'Marketing', salary: 70000, manager_id: 4 },
      { emp_id: 8, emp_name: 'Hank Blue', department: 'Sales', salary: 65000, manager_id: null }
    ];
    const tx = dbLocal.transaction((rows) => { for (const r of rows) insert.run(r); });
    tx(employees);
  }
}

function validateQuestion(q) {
  try {
    const stmt = dbLocal.prepare(q.reference_query);
    if (!stmt.reader) return { isValid: false, error: 'Reference query must be a SELECT statement' };
    const rows = stmt.all();
    const columns = stmt.columns().map(c => c.name);
    if (rows.length === 0) return { isValid: false, error: 'Reference query returned no results' };
    if (!Array.isArray(q.expected_columns)) return { isValid: false, error: 'expected_columns must be array' };
    if (columns.length !== q.expected_columns.length) return { isValid: false, error: `Column count mismatch. Expected ${q.expected_columns.length}, got ${columns.length}` };
    for (let i = 0; i < q.expected_columns.length; i++) {
      if (columns[i] !== q.expected_columns[i]) return { isValid: false, error: `Column name mismatch at index ${i}. Expected '${q.expected_columns[i]}', got '${columns[i]}'` };
    }
    return { isValid: true };
  } catch (e) {
    return { isValid: false, error: `Query execution failed: ${e.message}` };
  }
}

function insertBank(q) {
  const exists = db.prepare(`SELECT id FROM bank_questions WHERE reference_query = ?`).get(q.reference_query);
  if (exists && exists.id) {
    console.log('Skip duplicate:', q.title);
    return exists.id;
  }
  try {
    const stmt = db.prepare(`
      INSERT INTO bank_questions (title, problem, schema, reference_query, expected_columns, skill, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      q.title,
      q.problem,
      q.schema,
      q.reference_query,
      JSON.stringify(q.expected_columns),
      q.skill,
      q.difficulty
    );
    return res.lastInsertRowid;
  } catch (e) {
    console.log('Skip duplicate (constraint):', q.title);
    return -1;
  }
}

const filePath = process.argv[2] || path.resolve(process.cwd(), 'bank-questions.json');
if (!fs.existsSync(filePath)) {
  console.error('Missing bank-questions.json. Provide a path: node scripts/seed-bank.js <path>');
  process.exit(1);
}

const raw = fs.readFileSync(filePath, 'utf-8');
let items = [];
try {
  items = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}

initBank();
initLocal();
let inserted = 0;
for (const item of items) {
  const genShape = {
    skill: item.skill,
    difficulty: item.difficulty,
    problem: item.problem || item.description,
    schema: item.schema || 'employee(emp_id, emp_name, department, salary, manager_id)',
    reference_query: item.reference_query,
    expected_columns: item.expected_columns,
    title: item.title || `${item.skill} - ${item.difficulty}`
  };
  const result = validateQuestion(genShape);
  if (!result.isValid) {
    console.log('Skip invalid:', result.error);
    continue;
  }
  insertBank(genShape);
  inserted++;
}

console.log(`Seeded ${inserted} bank questions from ${filePath}`);
