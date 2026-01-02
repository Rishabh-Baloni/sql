
import { ErrorType } from '../ai/errorClassifier';

export const SKILLS = {
  S1: 'Filtering & Conditions',
  S2: 'Aggregation & GROUP BY',
  S3: 'Aliasing',
  S4: 'Join Logic',
  S5: 'Projection'
} as const;

export type SkillID = keyof typeof SKILLS;

// Mapping Questions to Skills they target
export const QUESTION_SKILLS: Record<number, SkillID[]> = {
  1: ['S1', 'S5'],       // High Earners: WHERE, SELECT *
  2: ['S2', 'S3', 'S5'], // Dept Avg: GROUP BY, Alias, SELECT cols
  3: ['S4', 'S3', 'S1']  // Managers: JOIN, Alias, WHERE
};

// Error -> Skill Mapping (Deterministic)
export const ERROR_TO_SKILL_MAP: Record<string, SkillID[]> = {
  [ErrorType.ROW_MISMATCH]: ['S1'],
  [ErrorType.AGGREGATION_ALIAS_MISSING]: ['S3'],
  [ErrorType.COLUMN_NAME_MISMATCH]: ['S5'],
  [ErrorType.COLUMN_COUNT_MISMATCH]: ['S5'],
  [ErrorType.JOIN_LOGIC_ERROR]: ['S4']
  // S2 is implicitly targeted if AGGREGATION_ALIAS_MISSING happens, 
  // but let's stick to the prompt's explicit mapping first.
  // Prompt: "ROW_MISMATCH -> Filtering", "AGGREGATION_ALIAS_MISSING -> Aliasing", etc.
};
