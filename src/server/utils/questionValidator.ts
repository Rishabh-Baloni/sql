import db from '../db/sqlite';
import { GeneratedQuestion } from '../ai/questionGenerator';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate an AI-generated question by executing its reference query.
 * 
 * VALIDATION STEPS:
 * 1. Execute reference_query on SQLite DB
 * 2. Ensure query executes without error
 * 3. Ensure result is NOT empty
 * 4. Ensure column names EXACTLY match expected_columns
 */
export function validateGeneratedQuestion(question: GeneratedQuestion): ValidationResult {
  try {
    // Execute the reference query
    const stmt = db.prepare(question.reference_query);
    
    // Ensure it's a SELECT query
    if (!stmt.reader) {
      return {
        isValid: false,
        error: 'Reference query must be a SELECT statement'
      };
    }

    const rows = stmt.all();
    const columns = stmt.columns().map(c => c.name);

    // Check 1: Result must not be empty
    if (rows.length === 0) {
      return {
        isValid: false,
        error: 'Reference query returned no results'
      };
    }

    // Check 2: Column count must match
    if (columns.length !== question.expected_columns.length) {
      return {
        isValid: false,
        error: `Column count mismatch. Expected ${question.expected_columns.length}, got ${columns.length}`
      };
    }

    // Check 3: Column names must EXACTLY match (case-sensitive)
    for (let i = 0; i < question.expected_columns.length; i++) {
      if (columns[i] !== question.expected_columns[i]) {
        return {
          isValid: false,
          error: `Column name mismatch at index ${i}. Expected '${question.expected_columns[i]}', got '${columns[i]}'`
        };
      }
    }

    return { isValid: true };

  } catch (error: any) {
    return {
      isValid: false,
      error: `Query execution failed: ${error.message}`
    };
  }
}

/**
 * Generate and validate a question with retry logic.
 * Returns null if validation fails after all retries.
 */
export async function generateAndValidate(
  generateFn: () => Promise<GeneratedQuestion>,
  maxAttempts: number = 2
): Promise<GeneratedQuestion | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log('[Phase-6] Generating AI question (attempt', attempt, '/', maxAttempts, ')');
      const question = await generateFn();
      const validation = validateGeneratedQuestion(question);

      if (validation.isValid) {
        console.log('[Phase-6] Validation success', {
          skill: question.skill,
          difficulty: question.difficulty,
          problem: `${question.problem.substring(0, 60)}...`
        });
        return question;
      }

      console.warn(`Validation failed (attempt ${attempt}/${maxAttempts}):`, validation.error);
    } catch (error: any) {
      console.warn(`Generation failed (attempt ${attempt}/${maxAttempts}):`, error.message);
    }
  }

  return null;
}
