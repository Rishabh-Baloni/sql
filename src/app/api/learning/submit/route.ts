
import { NextResponse } from 'next/server';
import { evaluateSubmission } from '@/server/practice/engine';
import { logAttempt } from '@/server/db/practice';
import { updateProfileAfterSubmission } from '@/server/learning/engine';
import { QUESTIONS } from '@/server/practice/questions';
import { findBankById } from '@/server/db/bank';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, questionId, referenceQuery } = body;

    if (!query || !questionId) {
      return NextResponse.json({ error: 'Missing query or questionId' }, { status: 400 });
    }

    // Phase 6: Support AI-generated questions
    let refQuery = referenceQuery;
    let question = null;
    let bankQuestion = null;

    // Try to find in bank questions first
    question = QUESTIONS.find(q => q.id === questionId);
    
    if (question) {
      refQuery = question.referenceQuery;
    } else if (!refQuery) {
      bankQuestion = findBankById(Number(questionId));
      if (bankQuestion) {
        refQuery = bankQuestion.reference_query;
      } else {
        return NextResponse.json({ error: 'Invalid questionId or missing referenceQuery' }, { status: 404 });
      }
    }

    // 1. Execute Phase 2 Logic (Deterministic Evaluation)
    const result = evaluateSubmission(query, refQuery);

    // 2. Log Attempt (Phase 2 Requirement) - only for bank questions
    if (question) {
      logAttempt(questionId, query, result.isCorrect ? 'Correct' : 'Incorrect');
    }

    // 3. Update Learning Profile (Phase 4 Requirement) - only for bank questions
    // AI questions don't map to existing QUESTION_SKILLS yet
    if (question || bankQuestion) {
      updateProfileAfterSubmission(questionId, query, result.isCorrect, result.message);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
