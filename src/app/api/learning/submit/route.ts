
import { NextResponse } from 'next/server';
import { evaluateSubmission } from '@/server/practice/engine';
import { logAttempt } from '@/server/db/practice';
import { updateProfileAfterSubmission } from '@/server/learning/engine';
import { QUESTIONS } from '@/server/practice/questions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, questionId } = body;

    if (!query || !questionId) {
      return NextResponse.json({ error: 'Missing query or questionId' }, { status: 400 });
    }

    const question = QUESTIONS.find(q => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Invalid questionId' }, { status: 404 });
    }

    // 1. Execute Phase 2 Logic (Deterministic Evaluation)
    const result = evaluateSubmission(query, question.referenceQuery);

    // 2. Log Attempt (Phase 2 Requirement)
    logAttempt(questionId, query, result.isCorrect ? 'Correct' : 'Incorrect');

    // 3. Update Learning Profile (Phase 4 Requirement)
    // We do this synchronously here, but could be async.
    // We need the error message if incorrect.
    updateProfileAfterSubmission(questionId, query, result.isCorrect, result.message);

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
