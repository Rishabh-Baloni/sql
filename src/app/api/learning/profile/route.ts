
import { NextResponse } from 'next/server';
import { getWeaknessProfile, getRecommendedQuestionId } from '@/server/learning/engine';

export async function GET() {
  try {
    const profile = getWeaknessProfile();
    const recommendedQuestionId = getRecommendedQuestionId();
    
    // Find the recommended skill name for display
    let recommendedReason = '';
    if (recommendedQuestionId) {
      const weakest = profile[0];
      recommendedReason = `You often struggle with ${weakest.skillName}`;
    }

    return NextResponse.json({
      profile,
      recommendation: {
        questionId: recommendedQuestionId,
        reason: recommendedReason
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
