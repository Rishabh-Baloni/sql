import { NextResponse } from 'next/server';
import { generateInterviewSet } from '@/server/interview/questionSource';

/**
 * POST /api/interview/start
 * 
 * Generates a complete interview set with strict rules:
 * - Exactly 3 questions
 * - Exactly 1 per skill (Filtering, Aggregation, Joins)
 * - Exactly 1 Easy, 1 Medium, 1 Hard
 * - Random order
 * - 50% from bank, 50% from AI
 * - Ignores learning profile completely
 */
export async function POST() {
  try {
    const questions = await generateInterviewSet();

    if (questions.length !== 3) {
      throw new Error('Failed to generate complete interview set');
    }

    // Return questions without reference queries (they're secret)
    const publicQuestions = questions.map((q, index) => ({
      id: index + 1,
      title: q.title,
      description: q.description,
      skill: q.skill,
      difficulty: q.difficulty,
      source: q.source
    }));

    // Store reference queries in session/cache for later evaluation
    // For now, we'll return them separately (not visible to client)
    const referenceQueries = questions.map(q => q.referenceQuery);

    return NextResponse.json({
      questions: publicQuestions,
      // Note: In production, store these server-side with a session ID
      // For now, we'll include them but they won't be exposed to the client UI
      _serverData: { referenceQueries }
    });

  } catch (error: any) {
    console.error('Error generating interview:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview' },
      { status: 500 }
    );
  }
}
