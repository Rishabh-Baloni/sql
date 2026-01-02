import { NextResponse } from 'next/server';
import { evaluateSubmission } from '@/server/practice/engine';
import { QUESTIONS } from '@/server/practice/questions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, questionId, referenceQuery } = body;

    if (!query || !questionId) {
      return NextResponse.json({ error: 'Missing query or questionId' }, { status: 400 });
    }

    // Phase 6: Support AI-generated questions
    let refQuery = referenceQuery;

    // Fallback to bank questions if no reference query provided
    if (!refQuery) {
      const question = QUESTIONS.find(q => q.id === questionId);
      if (!question) {
        return NextResponse.json({ error: 'Invalid questionId' }, { status: 404 });
      }
      refQuery = question.referenceQuery;
    }

    // Execute Deterministic Evaluation (Phase 2 Logic)
    const result = evaluateSubmission(query, refQuery);

    // Return result directly (Frontend will hide correctness until summary)
    // We do NOT log to practice DB or learning profile to keep stats separate.
    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
