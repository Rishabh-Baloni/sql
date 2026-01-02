import { QUESTIONS } from './questions';
import { generateQuestion, Skill, Difficulty } from '../ai/questionGenerator';
import { generateAndValidate } from '../utils/questionValidator';
import { storeGeneratedQuestion, getStoredQuestion, incrementUsageCount } from '../db/generated';
import { SkillID, SKILLS } from '../learning/skills';

export interface QuestionData {
  id?: number;
  title: string;
  description: string;
  referenceQuery: string;
  source: 'bank' | 'ai';
  skill?: Skill;
  difficulty?: Difficulty;
}

// Map internal SkillID to AI Skill format
const SKILL_MAP: Record<SkillID, Skill> = {
  'S1': 'Filtering',
  'S2': 'Aggregation',
  'S3': 'Filtering',  // Aliasing is part of general querying, map to Filtering
  'S4': 'Joins',
  'S5': 'Filtering'   // Projection is SELECT, map to Filtering
};

/**
 * Get a question using hybrid source (50% bank, 50% AI).
 * 
 * @param skill - Optional skill preference (mapped from SkillID)
 * @param difficulty - Optional difficulty level
 */
export async function getHybridQuestion(
  skill?: Skill,
  difficulty?: Difficulty
): Promise<QuestionData | null> {
  // Randomly choose source (50% bank, 50% AI)
  const useBank = Math.random() < 0.5;

  if (useBank) {
    return getBankQuestion(skill, difficulty);
  } else {
    return getAIQuestion(skill, difficulty);
  }
}

/**
 * Get a question from the stored question bank.
 */
function getBankQuestion(skill?: Skill, difficulty?: Difficulty): QuestionData | null {
  // Filter bank questions by skill/difficulty if provided
  let candidates = QUESTIONS;

  // Since bank questions don't have explicit skill/difficulty metadata,
  // we'll use a simple mapping based on question ID:
  // Q1 (High Earners) = Filtering, Easy
  // Q2 (Dept Avg) = Aggregation, Medium
  // Q3 (Managers) = Joins, Hard

  if (skill || difficulty) {
    candidates = QUESTIONS.filter(q => {
      const qSkill = q.id === 1 ? 'Filtering' : q.id === 2 ? 'Aggregation' : 'Joins';
      const qDiff = q.id === 1 ? 'Easy' : q.id === 2 ? 'Medium' : 'Hard';

      return (!skill || qSkill === skill) && (!difficulty || qDiff === difficulty);
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  // Pick a random question from candidates
  const question = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    id: question.id,
    title: question.title,
    description: question.description,
    referenceQuery: question.referenceQuery,
    source: 'bank'
  };
}

/**
 * Get an AI-generated question (from storage or freshly generated).
 */
async function getAIQuestion(skill?: Skill, difficulty?: Difficulty): Promise<QuestionData | null> {
  // If skill and difficulty are not provided, choose randomly
  const targetSkill = skill || getRandomSkill();
  const targetDifficulty = difficulty || getRandomDifficulty();

  // Try to get from storage first (prefer lower usage count)
  const stored = getStoredQuestion(targetSkill, targetDifficulty);
  if (stored) {
    incrementUsageCount(stored.problem);
    return {
      title: `${stored.skill} - ${stored.difficulty}`,
      description: stored.problem,
      referenceQuery: stored.reference_query,
      source: 'ai',
      skill: stored.skill,
      difficulty: stored.difficulty
    };
  }

  // Generate fresh question with validation
  const generated = await generateAndValidate(
    () => generateQuestion(targetSkill, targetDifficulty),
    2  // max attempts
  );

  if (!generated) {
    // Fallback to bank question
    console.warn('AI generation failed, falling back to bank');
    return getBankQuestion(targetSkill, targetDifficulty);
  }

  // Store the validated question
  storeGeneratedQuestion(generated);

  return {
    title: `${generated.skill} - ${generated.difficulty}`,
    description: generated.problem,
    referenceQuery: generated.reference_query,
    source: 'ai',
    skill: generated.skill,
    difficulty: generated.difficulty
  };
}

function getRandomSkill(): Skill {
  const skills: Skill[] = ['Filtering', 'Aggregation', 'Joins'];
  return skills[Math.floor(Math.random() * skills.length)];
}

function getRandomDifficulty(): Difficulty {
  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];
  return difficulties[Math.floor(Math.random() * difficulties.length)];
}

/**
 * Map SkillID to AI Skill format
 */
export function mapSkillIDToAISkill(skillId: SkillID): Skill {
  return SKILL_MAP[skillId];
}
