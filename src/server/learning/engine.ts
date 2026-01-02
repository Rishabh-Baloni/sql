
import { classifyError } from '../ai/errorClassifier';
import { updateSkillStats, getAllSkillStats, initLearningDB } from '../db/learning';
import { ERROR_TO_SKILL_MAP, QUESTION_SKILLS, SKILLS, SkillID } from './skills';

// Ensure DB is ready
initLearningDB();

export function updateProfileAfterSubmission(
  questionId: number, 
  userQuery: string, 
  isCorrect: boolean, 
  errorMessage?: string
) {
  // 1. Identify targeted skills for this question
  // Even if correct, we update "attempts" for these skills?
  // Prompt says: "Correct answers still increment attempts."
  // Which skills? "Map error type -> skill(s)" is for failures.
  // For success, do we update ALL skills associated with the question?
  // "After EVERY Practice Mode submission... Update learning profile: attempts += 1"
  // It implies we need to know WHICH skills were exercised.
  // I will assume for SUCCESS, we update the skills mapped to the question.
  // For FAILURE, we update the skills mapped to the ERROR.
  
  const targetedSkills = QUESTION_SKILLS[questionId] || [];

  if (isCorrect) {
    // Update attempts for all skills in this question
    targetedSkills.forEach(skillId => {
      updateSkillStats(skillId, false);
    });
  } else if (errorMessage) {
    // 2. Identify error type
    const errorType = classifyError(errorMessage, userQuery);
    
    // 3. Map error type -> skill(s)
    const errorSkills = ERROR_TO_SKILL_MAP[errorType];
    
    if (errorSkills && errorSkills.length > 0) {
      errorSkills.forEach(skillId => {
        updateSkillStats(skillId, true);
      });
    } else {
      // If error doesn't map to a specific skill (e.g. SYNTAX_ERROR), 
      // maybe we shouldn't penalize a specific skill, or penalize all targeted?
      // Prompt says: "Map existing Phase-2 error types to skills... Mapping must be deterministic"
      // It lists specific mappings. If not in list, maybe no update?
      // But we should still increment 'attempts' for the question's skills?
      // "Correct answers still increment attempts." -> implying Incorrect might not increment attempts if not mapped?
      // Let's assume if we can't map the error, we assume the user TRIED the question's skills but failed in an unknown way.
      // But to be safe and follow "Map error type -> skill", I'll only update if mapped.
      // However, weakness_score = failures / attempts. 
      // If I increment attempts on success but not on unmapped failure, score improves.
      // If I don't increment anything on unmapped failure, score stays same.
      // Let's stick strictly to: "Identify error type -> Map error type -> skill -> Update".
    }
  }
}

export function getWeaknessProfile() {
  const stats = getAllSkillStats();
  
  // Calculate weakness score
  const profile = stats.map(s => ({
    skillId: s.skill_id as SkillID,
    skillName: SKILLS[s.skill_id as SkillID],
    attempts: s.attempts,
    failures: s.failures,
    score: s.attempts > 0 ? s.failures / s.attempts : 0
  }));

  // Sort by score descending (highest weakness first)
  return profile.sort((a, b) => b.score - a.score);
}

export function getRecommendedQuestionId(): number | null {
  const profile = getWeaknessProfile();
  if (profile.length === 0) return null;

  // 1. Identify weakest skill
  // Filter for skills that actually have failures? Or just highest ratio?
  const weakest = profile[0];
  if (weakest.score === 0) return null; // No weaknesses found

  // 2. Identify which existing question targets that skill
  // Find a question that has this skill in its QUESTION_SKILLS
  const skillId = weakest.skillId;
  
  // Simple strategy: Find first question that contains this skill
  // Ideally, pick one the user hasn't mastered, but "No new questions".
  // Just picking any question with that skill is fine.
  
  for (const [qId, skills] of Object.entries(QUESTION_SKILLS)) {
    if (skills.includes(skillId)) {
      return parseInt(qId);
    }
  }
  
  return null;
}
