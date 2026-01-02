import { NextResponse } from 'next/server';
import { explainError } from '@/server/ai/gemini';
import { QUESTIONS } from '@/server/practice/questions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionId, userQuery, errorMessage } = body;

    if (!questionId || !userQuery || !errorMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const question = QUESTIONS.find(q => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Invalid questionId' }, { status: 404 });
    }

    const result = await explainError({
      questionTitle: question.title,
      questionDescription: question.description,
      userQuery,
      referenceQuery: question.referenceQuery,
      errorMessage
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Explanation API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
