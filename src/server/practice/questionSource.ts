import { QUESTIONS } from './questions';
import { generateQuestion, Skill, Difficulty } from '../ai/questionGenerator';
import { generateAndValidate } from '../utils/questionValidator';
import { storeGeneratedQuestion, getStoredQuestion, incrementUsageCount, getQuestionCount } from '../db/generated';
import { getBankQuestion as getBankQuestionFromDB, incrementBankUsage, getBankCount } from '../db/bank';
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
  difficulty?: Difficulty,
  sourceMode: 'ai' | 'bank' | 'hybrid' = 'hybrid'
): Promise<QuestionData | null> {
  const AI_SOURCE_RATIO = 0.7;
  const useBank = sourceMode === 'hybrid' ? (Math.random() >= AI_SOURCE_RATIO) : sourceMode === 'bank';

  if (useBank) {
    const bankQ = getBankQuestion(skill, difficulty);
    if (bankQ) {
      trackRecent(bankQ.description);
      console.log('[Phase-6] Serving BANK question');
    }
    return bankQ;
  } else {
    const aiQ = await getAIQuestion(skill, difficulty);
    if (aiQ) {
      trackRecent(aiQ.description);
      console.log('[Phase-6] Serving AI question', { skill: aiQ.skill, difficulty: aiQ.difficulty });
    }
    return aiQ;
  }
}

/**
 * Get a question from the stored question bank.
 */
function getBankQuestion(skill?: Skill, difficulty?: Difficulty): QuestionData | null {
  const dbQ = getBankQuestionFromDB(skill, difficulty, RECENT_PROBLEMS);
  if (dbQ) {
    incrementBankUsage(dbQ.problem);
    return {
      id: dbQ.id,
      title: dbQ.title,
      description: dbQ.problem,
      referenceQuery: dbQ.reference_query,
      source: 'bank',
      skill: dbQ.skill,
      difficulty: dbQ.difficulty
    };
  }
  let candidates = QUESTIONS;
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
  const filtered = candidates.filter(q => !RECENT_PROBLEMS.includes(q.description));
  const pool = filtered.length > 0 ? filtered : candidates;
  const question = pool[Math.floor(Math.random() * pool.length)];
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
  const stored = getStoredQuestion(targetSkill, targetDifficulty, RECENT_PROBLEMS);
  if (stored) {
    incrementUsageCount(stored.problem);
    const result: QuestionData = {
      id: stored.id,
      title: `${stored.skill} - ${stored.difficulty}`,
      description: stored.problem,
      referenceQuery: stored.reference_query,
      source: 'ai',
      skill: stored.skill,
      difficulty: stored.difficulty
    };
    return result;
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
  const newId = storeGeneratedQuestion(generated);

  const result: QuestionData = {
    id: newId,
    title: `${generated.skill} - ${generated.difficulty}`,
    description: generated.problem,
    referenceQuery: generated.reference_query,
    source: 'ai',
    skill: generated.skill,
    difficulty: generated.difficulty
  };
  return result;
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

const RECENT_PROBLEMS: string[] = [];
function trackRecent(problem: string) {
  if (!problem) return;
  RECENT_PROBLEMS.push(problem);
  if (RECENT_PROBLEMS.length > 3) {
    RECENT_PROBLEMS.shift();
  }
}

async function preseedQuestionsIfSparse() {
  const skills: Skill[] = ['Filtering', 'Aggregation', 'Joins'];
  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];
  for (const skill of skills) {
    for (const difficulty of difficulties) {
      const minCount = difficulty === 'Hard' ? 2 : 8;
      const current = getQuestionCount(skill, difficulty);
      if (current < minCount) {
        const toCreate = minCount - current;
        for (let i = 0; i < toCreate; i++) {
          const q = await generateAndValidate(() => generateQuestion(skill, difficulty), 3);
          if (q) {
            storeGeneratedQuestion(q);
          }
        }
        console.log('[Phase-6] Preseeded questions', { skill, difficulty, created: toCreate });
      }
    }
  }
}

preseedQuestionsIfSparse().catch(() => {});
