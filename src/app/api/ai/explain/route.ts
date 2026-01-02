import { NextResponse } from 'next/server';
import { explainError } from '@/server/ai/gemini';
import { QUESTIONS } from '@/server/practice/questions';
import { findBankById } from '@/server/db/bank';
import { findGeneratedById } from '@/server/db/generated';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionId, userQuery, errorMessage, source, title, description, referenceQuery } = body;

    if (!questionId || !userQuery || !errorMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let qTitle = title as string | undefined;
    let qDescription = description as string | undefined;
    let qReference = referenceQuery as string | undefined;

    // If details not provided, resolve by source
    if (!qTitle || !qDescription || !qReference) {
      if (source === 'bank') {
        const bank = findBankById(Number(questionId));
        if (bank) {
          qTitle = bank.title;
          qDescription = bank.problem;
          qReference = bank.reference_query;
        }
      } else if (source === 'ai') {
        const gen = findGeneratedById(Number(questionId));
        if (gen) {
          qTitle = `${gen.skill} - ${gen.difficulty}`;
          qDescription = gen.problem;
          qReference = gen.reference_query;
        }
      }
    }

    // Fallback to static QUESTIONS (legacy)
    if (!qTitle || !qDescription || !qReference) {
      const legacy = QUESTIONS.find(q => q.id === Number(questionId));
      if (!legacy) {
        return NextResponse.json({ error: 'Invalid question reference' }, { status: 404 });
      }
      qTitle = legacy.title;
      qDescription = legacy.description;
      qReference = legacy.referenceQuery;
    }

    const result = await explainError({
      questionTitle: qTitle,
      questionDescription: qDescription,
      userQuery,
      referenceQuery: qReference,
      errorMessage
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Explanation API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
