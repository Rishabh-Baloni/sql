export enum ErrorType {
  COLUMN_NAME_MISMATCH = 'COLUMN_NAME_MISMATCH',
  COLUMN_COUNT_MISMATCH = 'COLUMN_COUNT_MISMATCH',
  ROW_MISMATCH = 'ROW_MISMATCH',
  AGGREGATION_ALIAS_MISSING = 'AGGREGATION_ALIAS_MISSING', // Heuristic-based
  JOIN_LOGIC_ERROR = 'JOIN_LOGIC_ERROR', // Heuristic-based
  GENERAL_LOGIC_ERROR = 'GENERAL_LOGIC_ERROR',
  SYNTAX_ERROR = 'SYNTAX_ERROR'
}

export function classifyError(errorMessage: string, userQuery: string): ErrorType {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('validation error') || msg.includes('execution error')) {
    // Phase 2 engine returns "Execution Error: ..." for sqlite exceptions
    // which are mostly syntax errors or invalid column usage.
    return ErrorType.SYNTAX_ERROR;
  }

  if (msg.includes('column count mismatch')) {
    return ErrorType.COLUMN_COUNT_MISMATCH;
  }

  if (msg.includes('column name mismatch')) {
    // Check if it's likely an alias issue (e.g., avg(salary) vs avg_salary)
    if (userQuery.toLowerCase().includes('avg(') && !userQuery.toLowerCase().includes(' as ')) {
       return ErrorType.AGGREGATION_ALIAS_MISSING;
    }
    return ErrorType.COLUMN_NAME_MISMATCH;
  }

  if (msg.includes('row count mismatch')) {
    return ErrorType.ROW_MISMATCH;
  }

  if (msg.includes('row data mismatch')) {
     // Check for potential JOIN issues if the query has multiple tables
     if (userQuery.toLowerCase().includes('join')) {
         return ErrorType.JOIN_LOGIC_ERROR;
     }
     return ErrorType.ROW_MISMATCH;
  }

  return ErrorType.GENERAL_LOGIC_ERROR;
}
