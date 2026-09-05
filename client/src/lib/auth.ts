import { apiFetch, refreshAccessToken } from "@/lib/api";
import type {
  SessionsPerWeekBand,
  TrainingExperienceLevel,
  TrainingGoal,
} from "@/types";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type StoredAuthSession,
} from "@/lib/auth-storage";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser?: boolean;
};

export type { StoredAuthSession };
export { clearStoredSession, readStoredSession, writeStoredSession };

export type UsernameCheckResult = {
  available: boolean;
  username: string;
  reason: "empty" | "invalid" | "taken" | null;
};

export async function checkUsernameAvailability(
  username: string,
): Promise<UsernameCheckResult> {
  const params = new URLSearchParams({ username });
  return await apiFetch<UsernameCheckResult>(
    `/auth/username/check?${params.toString()}`,
  );
}

export async function suggestUsername(params: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<{ suggested: string; available: string }> {
  const q = new URLSearchParams();
  if (params.firstName) q.set("firstName", params.firstName);
  if (params.lastName) q.set("lastName", params.lastName);
  if (params.email) q.set("email", params.email);
  return await apiFetch(`/auth/username/suggest?${q.toString()}`);
}

export async function registerWithEmail(params: {
  email: string;
  password: string;
  username: string;
  deviceId?: string;
  inviteCode?: string;
  firstName?: string;
  lastName?: string;
  weightKg?: number;
  heightCm?: number;
  gender?: "male" | "female";
  ageYears?: number;
  trainingGoal?: TrainingGoal;
  trainingExperience?: TrainingExperienceLevel;
  sessionsPerWeek?: SessionsPerWeekBand;
}): Promise<AuthSession> {
  return await apiFetch<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function loginWithEmail(params: {
  email: string;
  password: string;
  deviceId?: string;
}): Promise<AuthSession> {
  return await apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function identifyEmail(params: {
  email: string;
}): Promise<{ exists: boolean }> {
  return await apiFetch<{ exists: boolean }>("/auth/identify", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Refresh via the shared single-flight path (storage as source of truth). */
export async function refreshSession(): Promise<AuthSession> {
  return await refreshAccessToken();
}

export async function logoutSession(params: {
  refreshToken: string;
  deviceId?: string;
}): Promise<void> {
  await apiFetch<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
