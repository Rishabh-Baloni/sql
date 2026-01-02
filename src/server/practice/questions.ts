export interface Question {
  id: number;
  title: string;
  description: string;
  referenceQuery: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'High Earners',
    description: 'List all employees earning more than 60000. Return all columns.',
    referenceQuery: 'SELECT * FROM employee WHERE salary > 60000;',
  },
  {
    id: 2,
    title: 'Department Average Salary',
    description: 'Find the average salary per department. Return columns: department, avg_salary.',
    referenceQuery: 'SELECT department, AVG(salary) as avg_salary FROM employee GROUP BY department;',
  },
  {
    id: 3,
    title: 'Managers',
    description: 'List employees whose salary is greater than their manager. Return columns: emp_name, salary.',
    referenceQuery: `
      SELECT e.emp_name, e.salary
      FROM employee e
      JOIN employee m ON e.manager_id = m.emp_id
      WHERE e.salary > m.salary;
    `,
  },
];
