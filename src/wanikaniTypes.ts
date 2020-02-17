export interface LevelProgression {
  abandoned_at: null | string; // Timestamp when the user abandons the level. This is primary used when the user initiates a reset.
  completed_at: null | string; // Timestamp when the user burns 100% of the assignments belonging to the associated subject's level.
  created_at: string; // Timestamp when the level progression is created
  level: number; // Integer	The level of the progression, with possible values from 1 to 60.
  passed_at: null | string; // Timestamp when the user passes at least 90% of the assignments with a type of kanji belonging to the associated subject's level.
  started_at: null | string; // Timestamp when the user starts their first lesson of a subject belonging to the level.
  unlocked_at: null | string; // Timestamp when the user can access lessons and reviews for the level.
}

export interface Reset {
  created_at: string; // Timestamp when the reset was created.
  original_level: number; // The user's level before the reset, from 1 to 60
  target_level: number; // The user's level after the reset, from 1 to 60. It must be less than or equal to original_level.
  confirmed_at: string; //Timestamp when the user confirmed the reset.
}
