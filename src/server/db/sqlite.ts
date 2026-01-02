import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'local.db');
const db = new Database(dbPath);

function initDb() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS employee (
      emp_id INTEGER PRIMARY KEY,
      emp_name TEXT,
      department TEXT,
      salary INTEGER,
      manager_id INTEGER
    );
  `;
  db.exec(createTable);

  const stmt = db.prepare('SELECT count(*) as count FROM employee');
  const result = stmt.get() as { count: number };

  if (result.count === 0) {
    const insert = db.prepare(`
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
      { emp_id: 8, emp_name: 'Hank Blue', department: 'Sales', salary: 65000, manager_id: null },
    ];

    const insertMany = db.transaction((emps: typeof employees) => {
      for (const emp of emps) insert.run(emp);
    });

    insertMany(employees);
    console.log('Database seeded with 8 employees.');
  }
}

// Initialize on module load
try {
  initDb();
} catch (error) {
  console.error('Database initialization failed:', error);
}

export default db;
