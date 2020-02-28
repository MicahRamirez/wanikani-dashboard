// https://community.wanikani.com/t/my-journey-of-368-days-the-ultimate-guide-for-wk/31318/2
export const FAST_LEVELS: { [level: number]: boolean } = {
  1: true,
  2: true,
  43: true,
  44: true,
  46: true,
  47: true,
  49: true,
  50: true,
  51: true,
  52: true,
  53: true,
  54: true,
  55: true,
  56: true,
  57: true,
  58: true,
  59: true,
  60: true
};

// TODO might be good to pull these in case they change
export const SRS_STAGES = [
  {
    srs_stage: 0,
    srs_stage_name: "Initiate",
    interval: 0,
    accelerated_interval: 0
  },
  {
    srs_stage: 1,
    srs_stage_name: "Apprentice I",
    interval: 14400,
    accelerated_interval: 7200
  },
  {
    srs_stage: 2,
    srs_stage_name: "Apprentice II",
    interval: 28800,
    accelerated_interval: 14400
  },
  {
    srs_stage: 3,
    srs_stage_name: "Apprentice III",
    interval: 82800,
    accelerated_interval: 28800
  },
  {
    srs_stage: 4,
    srs_stage_name: "Apprentice IV",
    interval: 169200,
    accelerated_interval: 82800
  },
  {
    srs_stage: 5,
    srs_stage_name: "Guru I",
    interval: 601200,
    accelerated_interval: 601200
  },
  {
    srs_stage: 6,
    srs_stage_name: "Guru II",
    interval: 1206000,
    accelerated_interval: 1206000
  },
  {
    srs_stage: 7,
    srs_stage_name: "Master",
    interval: 2588400,
    accelerated_interval: 2588400
  },
  {
    srs_stage: 8,
    srs_stage_name: "Enlightened",
    interval: 10364400,
    accelerated_interval: 10364400
  },
  {
    srs_stage: 9,
    srs_stage_name: "Burned",
    interval: 0,
    accelerated_interval: 0
  }
];

// API URLS
export const LEVEL_PROGRESSIONS_API_URL =
  "https://api.wanikani.com/v2/level_progressions";
export const RESETS_API_URL = "https://api.wanikani.com/v2/resets";
export const SUBJECTS_URL = "https://api.wanikani.com/v2/subjects";
export const ASSIGNMENTS_URL = "https://api.wanikani.com/v2/assignments";

// LOCAL STORAGE KEYS
export const LEVEL_PROGRESSION_LOCAL_STORAGE_KEY = "levelProgressions";
export const SUBJECTS_LOCAL_STORAGE_KEY = "subjects";
export const ASSIGNMENTS_LOCAL_STORAGE_KEY = "assignments";
export const RESETS_LOCAL_STORAGE_KEY = "resets";
