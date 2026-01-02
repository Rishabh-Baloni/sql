import { QUESTIONS } from '../practice/questions';
import { generateQuestion, Skill, Difficulty } from '../ai/questionGenerator';
import { generateAndValidate } from '../utils/questionValidator';
import { storeGeneratedQuestion, getStoredQuestion, incrementUsageCount } from '../db/generated';

export interface InterviewQuestion {
  title: string;
  description: string;
  referenceQuery: string;
  skill: Skill;
  difficulty: Difficulty;
  source: 'bank' | 'ai';
}

/**
 * Generate a complete interview set of 3 questions.
 * 
 * STRICT RULES:
 * - Exactly 1 question per skill (Filtering, Aggregation, Joins)
 * - Exactly 1 Easy, 1 Medium, 1 Hard
 * - Order may be randomized
 * - 50% from bank, 50% from AI (hybrid source)
 * - Ignores learning profile completely
 * - Fair and unpredictable
 */
export async function generateInterviewSet(): Promise<InterviewQuestion[]> {
  const skills: Skill[] = ['Filtering', 'Aggregation', 'Joins'];
  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

  // Shuffle to create unpredictability
  const shuffledSkills = shuffle(skills);
  const shuffledDifficulties = shuffle(difficulties);

  const questions: InterviewQuestion[] = [];

  // Generate 3 questions, one per skill with unique difficulty
  for (let i = 0; i < 3; i++) {
    const skill = shuffledSkills[i];
    const difficulty = shuffledDifficulties[i];

    const question = await getInterviewQuestion(skill, difficulty);
    if (question) {
      questions.push(question);
    } else {
      // Critical failure - should not happen
      throw new Error(`Failed to generate interview question for ${skill} - ${difficulty}`);
    }
  }

  // Randomize the order of questions
  return shuffle(questions);
}

/**
 * Get a single interview question using hybrid source.
 */
async function getInterviewQuestion(
  skill: Skill,
  difficulty: Difficulty
): Promise<InterviewQuestion | null> {
  // Randomly choose source (50% bank, 50% AI)
  const useBank = Math.random() < 0.5;

  if (useBank) {
    const bankQ = getBankInterviewQuestion(skill, difficulty);
    if (bankQ) return bankQ;
    // If bank fails, fallback to AI
  }

  // Try AI generation
  const aiQ = await getAIInterviewQuestion(skill, difficulty);
  if (aiQ) return aiQ;

  // Last resort: any bank question matching skill
  return getBankInterviewQuestion(skill, difficulty) || null;
}

/**
 * Get a question from the bank for interview.
 */
function getBankInterviewQuestion(skill: Skill, difficulty: Difficulty): InterviewQuestion | null {
  // Map bank questions to skill/difficulty
  // Q1 = Filtering, Easy
  // Q2 = Aggregation, Medium
  // Q3 = Joins, Hard

  const mapping = [
    { q: QUESTIONS[0], skill: 'Filtering' as Skill, difficulty: 'Easy' as Difficulty },
    { q: QUESTIONS[1], skill: 'Aggregation' as Skill, difficulty: 'Medium' as Difficulty },
    { q: QUESTIONS[2], skill: 'Joins' as Skill, difficulty: 'Hard' as Difficulty }
  ];

  const match = mapping.find(m => m.skill === skill && m.difficulty === difficulty);
  if (!match) return null;

  return {
    title: match.q.title,
    description: match.q.description,
    referenceQuery: match.q.referenceQuery,
    skill,
    difficulty,
    source: 'bank'
  };
}

/**
 * Get an AI-generated question for interview.
 */
async function getAIInterviewQuestion(
  skill: Skill,
  difficulty: Difficulty
): Promise<InterviewQuestion | null> {
  // Try to get from storage first (prefer lower usage count)
  const stored = getStoredQuestion(skill, difficulty);
  if (stored) {
    incrementUsageCount(stored.problem);
    return {
      title: `${stored.skill} - ${stored.difficulty}`,
      description: stored.problem,
      referenceQuery: stored.reference_query,
      skill: stored.skill,
      difficulty: stored.difficulty,
      source: 'ai'
    };
  }

  // Generate fresh question with validation
  const generated = await generateAndValidate(
    () => generateQuestion(skill, difficulty),
    2  // max attempts
  );

  if (!generated) {
    return null;
  }

  // Store the validated question
  storeGeneratedQuestion(generated);

  return {
    title: `${generated.skill} - ${generated.difficulty}`,
    description: generated.problem,
    referenceQuery: generated.reference_query,
    skill: generated.skill,
    difficulty: generated.difficulty,
    source: 'ai'
  };
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
