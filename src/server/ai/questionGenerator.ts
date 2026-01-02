import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

export type Skill = 'Filtering' | 'Aggregation' | 'Joins';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface GeneratedQuestion {
  skill: Skill;
  difficulty: Difficulty;
  problem: string;
  schema: string;
  reference_query: string;
  expected_columns: string[];
}

/**
 * Generate a SQL question using AI.
 * Returns strict JSON only - no markdown, no explanation.
 */
export async function generateQuestion(
  skill: Skill,
  difficulty: Difficulty
): Promise<GeneratedQuestion> {
  const prompt = buildPrompt(skill, difficulty);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Remove markdown code blocks if present
    let jsonText = text;
    if (text.startsWith('```')) {
      jsonText = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonText);

    // Validate the structure
    if (!isValidQuestionFormat(parsed)) {
      throw new Error('Invalid question format from AI');
    }

    return parsed as GeneratedQuestion;
  } catch (error: any) {
    throw new Error(`AI question generation failed: ${error.message}`);
  }
}

function buildPrompt(skill: Skill, difficulty: Difficulty): string {
  return `You are a SQL question generator. Generate ONE SQL question with the following requirements:

SKILL: ${skill}
DIFFICULTY: ${difficulty}

CONTEXT:
- Use the existing "employee" table schema: employee(emp_id, emp_name, department, salary, manager_id)
- All employees have these columns available
- manager_id can be NULL or reference another emp_id
- The database is already populated with sample data

REQUIREMENTS:
1. Create a natural language problem statement
2. Write a correct reference SQL query that solves it
3. List the expected column names in the result

DIFFICULTY GUIDELINES:
- Easy: Simple WHERE clauses, basic SELECT, 1-2 conditions
- Medium: Multiple conditions, basic aggregations (COUNT, AVG, SUM), GROUP BY, HAVING
- Hard: Multiple JOINs, subqueries, complex aggregations, self-joins

SKILL GUIDELINES:
- Filtering: Focus on WHERE clauses, comparison operators, logical operators (AND, OR)
- Aggregation: Focus on GROUP BY, HAVING, COUNT, SUM, AVG, MIN, MAX
- Joins: Focus on INNER JOIN, LEFT JOIN, self-joins, joining multiple conditions

CRITICAL: Return ONLY valid JSON with NO additional text, NO markdown, NO explanations.

Required JSON format:
{
  "skill": "${skill}",
  "difficulty": "${difficulty}",
  "problem": "Natural language problem statement here",
  "schema": "employee(emp_id, emp_name, department, salary, manager_id)",
  "reference_query": "SELECT ... FROM employee ...",
  "expected_columns": ["column1", "column2"]
}

Generate the question now:`;
}

function isValidQuestionFormat(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.skill === 'string' &&
    (obj.skill === 'Filtering' || obj.skill === 'Aggregation' || obj.skill === 'Joins') &&
    typeof obj.difficulty === 'string' &&
    (obj.difficulty === 'Easy' || obj.difficulty === 'Medium' || obj.difficulty === 'Hard') &&
    typeof obj.problem === 'string' &&
    typeof obj.schema === 'string' &&
    typeof obj.reference_query === 'string' &&
    Array.isArray(obj.expected_columns) &&
    obj.expected_columns.length > 0
  );
}
