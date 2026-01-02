
import db from '../db/sqlite';

export interface SkillStats {
  skill_id: string;
  attempts: number;
  failures: number;
  last_failed_at: number | null; // Unix timestamp
}

export function initLearningDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_profile (
      skill_id TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 0,
      failures INTEGER DEFAULT 0,
      last_failed_at INTEGER
    )
  `);
}

export function getSkillStats(skillId: string): SkillStats | undefined {
  const stmt = db.prepare('SELECT * FROM learning_profile WHERE skill_id = ?');
  return stmt.get(skillId) as SkillStats | undefined;
}

export function getAllSkillStats(): SkillStats[] {
  const stmt = db.prepare('SELECT * FROM learning_profile');
  return stmt.all() as SkillStats[];
}

export function updateSkillStats(skillId: string, isFailure: boolean) {
  const now = Date.now();
  
  // Upsert logic
  const existing = getSkillStats(skillId);
  
  if (existing) {
    const stmt = db.prepare(`
      UPDATE learning_profile 
      SET attempts = attempts + 1,
          failures = failures + ?,
          last_failed_at = ?
      WHERE skill_id = ?
    `);
    // Only update last_failed_at if it's a failure, or keep existing?
    // "update last_failed_at" usually implies on failure. 
    // If success, we don't change last_failed_at.
    const newLastFailed = isFailure ? now : existing.last_failed_at;
    stmt.run(isFailure ? 1 : 0, newLastFailed, skillId);
  } else {
    const stmt = db.prepare(`
      INSERT INTO learning_profile (skill_id, attempts, failures, last_failed_at)
      VALUES (?, 1, ?, ?)
    `);
    stmt.run(skillId, isFailure ? 1 : 0, isFailure ? now : null);
  }
}
