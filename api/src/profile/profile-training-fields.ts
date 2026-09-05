export const TRAINING_GOALS = [
  'muscle',
  'strength',
  'weight_loss',
  'athlete',
] as const;

export type TrainingGoal = (typeof TRAINING_GOALS)[number];

export const TRAINING_EXPERIENCE_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

export type TrainingExperienceLevel =
  (typeof TRAINING_EXPERIENCE_LEVELS)[number];

export const SESSIONS_PER_WEEK_BANDS = ['low', 'moderate', 'high'] as const;

export type SessionsPerWeekBand = (typeof SESSIONS_PER_WEEK_BANDS)[number];

export const MIN_AGE_YEARS = 16;
export const MAX_AGE_YEARS = 80;
