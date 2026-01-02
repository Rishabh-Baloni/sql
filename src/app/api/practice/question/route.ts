import { NextResponse } from 'next/server';
import { getHybridQuestion } from '@/server/practice/questionSource';
import { getWeaknessProfile } from '@/server/learning/engine';
import { mapSkillIDToAISkill } from '@/server/practice/questionSource';
import { Skill, Difficulty } from '@/server/ai/questionGenerator';

/**
 * GET /api/practice/question
 * 
 * Returns a question for Practice Mode using Phase-6 policy:
 * - 50% from question bank
 * - 50% from AI (validated)
 * 
 * Skill selection:
 * - 40% weak skills (from learning profile)
 * - 40% random/unexplored skills
 * - 20% strong skills (retention)
 * 
 * Difficulty rules:
 * - Weak skill → Easy or Medium
 * - Random skill → Medium
 * - Strong skill → Medium or Hard
 */
export async function GET() {
  try {
    // Get learning profile
    const profile = getWeaknessProfile();

    let targetSkill: Skill | undefined;
    let targetDifficulty: Difficulty | undefined;

    // Cold start: No learning profile yet
    if (profile.length === 0 || profile.every(p => p.attempts === 0)) {
      // Baseline mode: Random skill, Easy difficulty
      targetSkill = undefined; // Random
      targetDifficulty = 'Easy';
    } else {
      // Phase-6 skill selection policy
      const roll = Math.random();

      if (roll < 0.4) {
        // 40% weak skills
        const weakSkills = profile.filter(p => p.score > 0).sort((a, b) => b.score - a.score);
        if (weakSkills.length > 0) {
          const selectedSkill = weakSkills[0].skillId;
          targetSkill = mapSkillIDToAISkill(selectedSkill);
          // Weak skill → Easy or Medium
          targetDifficulty = Math.random() < 0.5 ? 'Easy' : 'Medium';
        }
      } else if (roll < 0.8) {
        // 40% random/unexplored skills
        targetSkill = undefined; // Random
        targetDifficulty = 'Medium';
      } else {
        // 20% strong skills (retention)
        const strongSkills = profile.filter(p => p.score === 0 && p.attempts > 0);
        if (strongSkills.length > 0) {
          const selectedSkill = strongSkills[Math.floor(Math.random() * strongSkills.length)].skillId;
          targetSkill = mapSkillIDToAISkill(selectedSkill);
          // Strong skill → Medium or Hard
          targetDifficulty = Math.random() < 0.5 ? 'Medium' : 'Hard';
        }
      }
    }

    // Get question using hybrid source
    const question = await getHybridQuestion(targetSkill, targetDifficulty);

    if (!question) {
      return NextResponse.json(
        { error: 'Failed to generate question' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: question.title,
      description: question.description,
      referenceQuery: question.referenceQuery,
      source: question.source,
      skill: question.skill,
      difficulty: question.difficulty
    });

  } catch (error: any) {
    console.error('Error getting practice question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
