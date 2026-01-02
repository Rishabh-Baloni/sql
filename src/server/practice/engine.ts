import db from '../db/sqlite';
import { validateSql } from '../utils/sqlValidator';

interface ComparisonResult {
  isCorrect: boolean;
  message: string;
  userRows?: any[];
  userColumns?: string[];
  expectedRows?: any[];
  expectedColumns?: string[];
}

export function evaluateSubmission(userQuery: string, referenceQuery: string): ComparisonResult {
  // 1. Basic Validation
  const validationError = validateSql(userQuery);
  if (validationError) {
    return { isCorrect: false, message: `Validation Error: ${validationError}` };
  }

  try {
    // 2. Execute User Query
    const userStmt = db.prepare(userQuery);
    if (!userStmt.reader) {
      return { isCorrect: false, message: 'Only SELECT queries are allowed.' };
    }
    const userRows = userStmt.all();
    const userColumns = userStmt.columns().map(c => c.name);

    // 3. Execute Reference Query
    const refStmt = db.prepare(referenceQuery);
    const refRows = refStmt.all();
    const refColumns = refStmt.columns().map(c => c.name);

    // 4. Compare Results
    
    // Check Columns
    if (userColumns.length !== refColumns.length) {
      return { 
        isCorrect: false, 
        message: `Column count mismatch. Expected ${refColumns.length}, got ${userColumns.length}.`,
        userRows, userColumns, expectedRows: refRows, expectedColumns: refColumns
      };
    }

    // Check Column Names (Exact match required? "Column count and column names must EXACTLY match")
    // Note: Order of columns usually matters in SQL result sets, but prompt says "Result comparison must be ORDER-INDEPENDENT".
    // Does that apply to rows only or columns too? usually rows.
    // "Column count and column names must EXACTLY match reference output"
    // I will assume column order matters for the result set structure, but row order does not.
    for (let i = 0; i < refColumns.length; i++) {
      if (userColumns[i] !== refColumns[i]) {
         return { 
          isCorrect: false, 
          message: `Column name mismatch at index ${i}. Expected '${refColumns[i]}', got '${userColumns[i]}'.`,
          userRows, userColumns, expectedRows: refRows, expectedColumns: refColumns
        };
      }
    }

    // Check Row Count
    if (userRows.length !== refRows.length) {
      return { 
        isCorrect: false, 
        message: `Row count mismatch. Expected ${refRows.length}, got ${userRows.length}.`,
        userRows, userColumns, expectedRows: refRows, expectedColumns: refColumns
      };
    }

    // Check Row Content (Order-Independent)
    // To do this efficiently, we can sort both arrays by all columns or use a frequency map.
    // Given the small dataset, sorting is fine. But wait, rows are objects.
    // We need a stable serialization for comparison.
    
    const serialize = (row: any) => JSON.stringify(row, Object.keys(row).sort());
    
    const userRowSet = userRows.map(serialize).sort();
    const refRowSet = refRows.map(serialize).sort();

    for (let i = 0; i < refRowSet.length; i++) {
      if (userRowSet[i] !== refRowSet[i]) {
        return { 
          isCorrect: false, 
          message: 'Row data mismatch. The result set does not match the expected output.',
          userRows, userColumns, expectedRows: refRows, expectedColumns: refColumns
        };
      }
    }

    return { 
      isCorrect: true, 
      message: 'Correct!',
      userRows, userColumns 
    };

  } catch (error: any) {
    return { isCorrect: false, message: `Execution Error: ${error.message}` };
  }
}
