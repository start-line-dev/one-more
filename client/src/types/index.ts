// ExerciseDB v1 API response (normalized for our app)
export interface ExerciseDBExercise {
  id: string;
  name: string;
  nameFr?: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl?: string;
}

export interface TrackedExercise {
  id: string;
  exerciseId: string; // API id or 'custom-xxx'
  name: string;
  /** Nom d'origine (API) conservé pour les calculs de ligue après renommage */
  originalName?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  category?: string;
  gifUrl?: string;
  isCustom: boolean;

  /** Dernière modification (ISO). */
  updatedAt?: string;
  /** Suppression douce (ISO). */
  deletedAt?: string | null;
}

export interface PerformanceEntry {
  id: string;
  trackedExerciseId: string;
  date: string; // YYYY-MM-DD
  weight: number;
  reps: number;
  createdAt: string; // ISO timestamp

  /** Dernière modification (ISO). */
  updatedAt?: string;
  /** Suppression douce (ISO). */
  deletedAt?: string | null;
}

export type TrainingGoal = "muscle" | "strength" | "weight_loss" | "athlete";

export type TrainingExperienceLevel =
  | "beginner"
  | "intermediate"
  | "advanced";

export type SessionsPerWeekBand = "low" | "moderate" | "high";

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  gender: "male" | "female";
  ageYears?: number | null;
  trainingGoal?: TrainingGoal | null;
  trainingExperience?: TrainingExperienceLevel | null;
  sessionsPerWeek?: SessionsPerWeekBand | null;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  username?: string | null;
  isPremium?: boolean;
}

export type PresenceStatus = "offline" | "online" | "training";

export type FriendPresence = {
  userId: string;
  status: PresenceStatus;
  exerciseName: string | null;
  trackedExerciseId: string | null;
  gifUrl?: string | null;
  isCustom?: boolean | null;
  bodyPart?: string | null;
  target?: string | null;
  equipment?: string | null;
  lastHeartbeatAt: string;
};

export type XpGrantItem = {
  sourceType: string;
  amount: number;
};

import type { LeagueChangeDto } from "@/lib/league-types";

export type StreakXpBonus = {
  bonusPercent: number;
  multiplier: number;
  daysToMax: number;
  isMax: boolean;
  progressToMax: number;
};

export type XpGrantResult = {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  leveledUp: boolean;
  previousLevel?: number;
  grants: XpGrantItem[];
  streak: { current: number; longest: number };
  streakXpBonus?: StreakXpBonus;
  league?: LeagueChangeDto;
};

export type UserProgressState = {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streak: { current: number; longest: number };
  streakXpBonus?: StreakXpBonus;
  lastActiveDate?: string | null;
  recentGrants: XpGrantItem[];
};

export type UserActivityMonth = {
  month: string;
  activeDays: string[];
  activeDayCount: number;
  streak: { current: number; longest: number };
  bounds: { earliestMonth: string; latestMonth: string };
};
