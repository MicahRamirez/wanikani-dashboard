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

export interface AuxillaryMeaning {
  meaning: string; // A singular subject meaning.
  type: string; // Either whitelist or blacklist. When evaluating user input, whitelisted meanings are used to match for correctness. Blacklisted meanings are used to match for incorrectness.
}

export interface SubjectMeaning {
  meaning: string; // A singular subject meaning.
  primary: boolean; //	Indicates priority in the WaniKani system.
  accepted_answer: boolean; //	Indicates if the meaning is used to evaluate user input for correctness.
}

export interface Subject {
  auxiliary_meanings: AuxillaryMeaning[]; // Collection of auxiliary meanings. See table below for the object structure.
  characters: string; // The UTF-8 characters for the subject, including kanji and hiragana.
  created_at: string; // Timestamp when the subject was created.
  document_url: string; // A URL pointing to the page on wanikani.com that provides detailed information about this subject.
  hidden_at: string; // Timestamp when the subject was hidden, indicating associated assignments will no longer appear in lessons or reviews and that the subject page is no longer visible on wanikani.com.
  lesson_position: number; //The position that the subject appears in lessons. Note that the value is scoped to the level of the subject, so there are duplicate values across levels.
  level: number; // The level of the subject, from 1 to 60.
  meaning_mnemonic: string; // The subject's meaning mnemonic.
  meanings: SubjectMeaning[]; // The subject meanings. See table below for the object structure.
  slug: string; // The string that is used when generating the document URL for the subject. Radicals use their meaning, downcased. Kanji and vocabulary use their characters.
}

export interface Assignment {
  available_at: string | null; // Timestamp when the related subject will be available in the user's review queue.
  burned_at: string | null; // Timestamp when the user reaches SRS stage 9 the first time.
  created_at: string; // Timestamp when the assignment was created.
  hidden: boolean; // Indicates if the associated subject has been hidden, preventing it from appearing in lessons or reviews.
  passed_at: string | null; // Timestamp when the user reaches SRS stage 5 for the first time.
  passed: boolean; // The boolean equivalent of passed_at
  resurrected_at: string | null; // Timestamp when the subject is resurrected and placed back in the user's review queue.
  srs_stage_name: string; //	The stage name associated with the srs_stage.
  srs_stage: number; //	The current SRS stage interval, from 0 to 9.
  started_at: string | null; //	Timestamp when the user completes the lesson for the related subject.
  subject_id: number; // Unique identifier of the associated subject.
  subject_type: string; // The type of the associated subject, one of: kanji, radical, or vocabulary.
  unlocked_at: string | null; // The timestamp when the related subject has its prerequisites satisfied and is made available in lessons.
}
