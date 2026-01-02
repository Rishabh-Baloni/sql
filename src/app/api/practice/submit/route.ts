import { NextResponse } from 'next/server';
import { QUESTIONS } from '@/server/practice/questions';
import { evaluateSubmission } from '@/server/practice/engine';
import { logAttempt } from '@/server/db/practice';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionId, query } = body;

    if (!questionId || !query) {
      return NextResponse.json({ error: 'Missing questionId or query' }, { status: 400 });
    }

    const question = QUESTIONS.find(q => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Invalid questionId' }, { status: 404 });
    }

    const result = evaluateSubmission(query, question.referenceQuery);

    // Log the attempt
    try {
      logAttempt(questionId, query, result.isCorrect ? 'Correct' : 'Incorrect');
    } catch (logError) {
      console.error('Failed to log attempt:', logError);
      // Continue even if logging fails
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
