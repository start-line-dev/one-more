import {
  trackExerciseAdded,
  trackExerciseRemoved,
  trackOnboardingCompleted,
  trackPerformanceDeleted,
  trackPerformanceEdited,
  trackPerformanceLogged,
} from "@/lib/analytics";
import {
  deletePerformanceEntryRemote,
  deleteTrackedExerciseRemote,
  patchPerformanceEntry,
  patchTrackedExercise,
  upsertPerformanceEntry,
  upsertRemoteProfile,
  upsertTrackedExercise,
} from "@/lib/data-api";
import { getLocalDateKey } from "@/lib/local-date";
import { preservePerformanceLogCreatedAt } from "@/lib/activity-from-performances";
import {
  clampRestTargetMs,
  DEFAULT_REST_TARGET_MS,
} from "@/lib/format-rest-elapsed";
import { excludePerformanceFromRestTimer } from "@/lib/rest-timer-exclude";
import { scheduleRestFinishedLocalNotificationForEntry } from "@/lib/rest-timer-local-notifications";
import {
  chronologicalPerfOrder,
  getLatestPerformanceEntry,
} from "@/lib/performance-order";
import { applyXpGrantResult } from "@/lib/progress-cache";
import type {
  PerformanceEntry,
  TrackedExercise,
  UserProfile,
  XpGrantResult,
} from "@/types";

const ONBOARDING_V1_KEY = "one-more-onboarding-v1";
const ONBOARDING_FIRST_EXERCISE_PENDING_KEY =
  "one-more-onboarding-first-exercise-pending-v1";
const ONBOARDING_TOUR_COMPLETE_KEY = "one-more-onboarding-tour-complete-v1";
const ONBOARDING_POST_AUTH_REDIRECT_KEY =
  "one-more-onboarding-post-auth-redirect-v1";
/** Draft morpho (genre/poids/taille) saisi avant auth, survit à la purge de session. */
const PENDING_ONBOARDING_PROFILE_KEY =
  "one-more-pending-onboarding-profile-v1";
/** Draft premier record saisi avant auth. */
const PENDING_ONBOARDING_RECORD_KEY =
  "one-more-pending-onboarding-record-v1";
/** Identifie le parcours d'onboarding de cet onglet ; un leftover d'une autre visite n'est pas renvoyé. */
const ONBOARDING_DRAFT_SESSION_KEY = "one-more-onboarding-draft-session-v1";
const ONBOARDING_RECORD_DESTINATION_KEY =
  "one-more-onboarding-record-destination-v1";
const ONBOARDING_GYM_PENDING_KEY = "one-more-onboarding-gym-pending-v1";
const GYM_ONBOARDING_IN_ZONE_KEY = "one-more-gym-onboarding-in-zone-v1";
const GYM_ONBOARDING_NAME_KEY = "one-more-gym-onboarding-name-v1";
const GYM_LOCATION_PROMPT_DONE_KEY =
  "one-more-gym-location-prompt-done-v1";
const GYM_NOTIFICATIONS_PROMPT_DONE_KEY =
  "one-more-gym-notifications-prompt-done-v1";
const ONBOARDING_NOTIFICATIONS_PROMPT_DONE_KEY =
  "one-more-onboarding-notifications-prompt-done-v1";
const GYM_SETUP_DONE_KEY = "one-more-gym-setup-done-v1";
const GYM_NOTIF_LAST_KEY = "one-more-gym-notif-last-v1";
const THEME_PREFERENCE_KEY = "one-more-theme-preference-v1";
const REST_TARGET_MS_KEY = "one-more-rest-target-ms-v1";
const REST_TIMER_ENABLED_KEY = "one-more-rest-timer-enabled-v1";
const REST_COUNTER_TOUR_COMPLETE_KEY = "one-more-rest-counter-tour-complete-v1";
const EXERCISE_CATALOG_TOUR_COMPLETE_KEY =
  "one-more-exercise-catalog-tour-complete-v1";
const EXERCISE_DETAIL_TOUR_COMPLETE_KEY =
  "one-more-exercise-detail-tour-complete-v1";
const HOME_TOUR_COMPLETE_KEY = "one-more-home-tour-complete-v1";
const HOME_NOTIFICATIONS_PROMPT_PENDING_KEY =
  "one-more-home-notifications-prompt-pending-v1";
const HOME_NOTIFICATIONS_PROMPT_DONE_KEY =
  "one-more-home-notifications-prompt-done-v1";
const HOME_TOUR_COMPLETE_EVENT = "one-more:home-tour-complete";
const REST_COUNTER_TOUR_COMPLETE_EVENT =
  "one-more:rest-counter-tour-complete";
const EXERCISE_CATALOG_TOUR_COMPLETE_EVENT =
  "one-more:exercise-catalog-tour-complete";
const EXERCISE_DETAIL_TOUR_COMPLETE_EVENT =
  "one-more:exercise-detail-tour-complete";

type LocalChangeKind =
  | "trackedExercise"
  | "performance"
  | "profile"
  | "progress";
export type ThemePreference = "system" | "light" | "dark";

const DEFAULT_PROFILE: UserProfile = {
  weightKg: 75,
  heightCm: 175,
  gender: "male",
};

let trackedCache: TrackedExercise[] = [];
let performanceCache: PerformanceEntry[] = [];
/** Référence stable pour useSyncExternalStore (évite une boucle de rendu). */
let activePerformanceSnapshot: PerformanceEntry[] = [];
let profileCache: UserProfile = DEFAULT_PROFILE;
let hasProfilePersistedCache = false;

function notifyLocalDataChanged(kind: LocalChangeKind): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("one-more:local-data-changed", {
      detail: { kind, at: Date.now() },
    }),
  );
}

function notifyRemoteWriteError(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("one-more:remote-write-error", {
      detail: { at: Date.now() },
    }),
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function updateTrackedCache(list: TrackedExercise[]): void {
  trackedCache = list;
}

function syncActivePerformanceSnapshot(): void {
  activePerformanceSnapshot = performanceCache.filter((e) => !e.deletedAt);
}

function updatePerformanceCache(list: PerformanceEntry[]): void {
  performanceCache = list;
  syncActivePerformanceSnapshot();
}

syncActivePerformanceSnapshot();

export function getTrackedExercises(): TrackedExercise[] {
  return trackedCache.filter((e) => !e.deletedAt);
}

/** Cache brut (y compris suppressions douces). Pour les mises à jour locales. */
export function getAllTrackedExercises(): TrackedExercise[] {
  return [...trackedCache];
}

export function setTrackedExercises(exercises: TrackedExercise[]): void {
  updateTrackedCache(exercises);
}

export function addTrackedExercise(exercise: TrackedExercise): void {
  const list = getAllTrackedExercises();
  if (
    list.some(
      (e) =>
        !e.deletedAt &&
        (e.id === exercise.id ||
          (e.exerciseId === exercise.exerciseId && !e.isCustom)),
    )
  ) {
    return;
  }
  const next: TrackedExercise = {
    ...exercise,
    updatedAt: nowIso(),
    deletedAt: null,
  };
  updateTrackedCache([...list, next]);
  notifyLocalDataChanged("trackedExercise");
  trackExerciseAdded({
    trackedExerciseId: next.id,
    source: isOnboardingFirstExercisePending() ? "onboarding" : "app",
  });
  void upsertTrackedExercise(next).catch(() => notifyRemoteWriteError());
}

export async function addTrackedExerciseAndWait(
  exercise: TrackedExercise,
): Promise<TrackedExercise> {
  const list = getAllTrackedExercises();
  const existing = list.find(
    (e) =>
      !e.deletedAt &&
      (e.id === exercise.id ||
        (e.exerciseId === exercise.exerciseId && !e.isCustom)),
  );
  if (existing) return existing;

  const next: TrackedExercise = {
    ...exercise,
    updatedAt: nowIso(),
    deletedAt: null,
  };
  updateTrackedCache([...list, next]);
  notifyLocalDataChanged("trackedExercise");
  trackExerciseAdded({
    trackedExerciseId: next.id,
    source: isOnboardingFirstExercisePending() ? "onboarding" : "app",
  });

  try {
    const remote = await upsertTrackedExercise(next);
    updateTrackedCache(
      getAllTrackedExercises().map((e) => (e.id === next.id ? remote : e)),
    );
    return remote;
  } catch (error) {
    notifyRemoteWriteError();
    throw error;
  }
}

export function removeTrackedExercise(id: string): void {
  const list = getAllTrackedExercises();
  const next = list.map((e) =>
    e.id === id ? { ...e, updatedAt: nowIso(), deletedAt: nowIso() } : e,
  );
  updateTrackedCache(next);
  notifyLocalDataChanged("trackedExercise");
  trackExerciseRemoved({ trackedExerciseId: id, source: "app" });
  void deleteTrackedExerciseRemote(id).catch(() => notifyRemoteWriteError());
}

export async function removeTrackedExerciseAndWait(id: string): Promise<void> {
  const list = getAllTrackedExercises();
  const next = list.map((e) =>
    e.id === id ? { ...e, updatedAt: nowIso(), deletedAt: nowIso() } : e,
  );
  updateTrackedCache(next);
  notifyLocalDataChanged("trackedExercise");
  trackExerciseRemoved({ trackedExerciseId: id, source: "app" });
  try {
    await deleteTrackedExerciseRemote(id);
  } catch (error) {
    notifyRemoteWriteError();
    throw error;
  }
}

function applyTrackedExerciseUpdates(
  exercise: TrackedExercise,
  updates: Partial<
    Pick<TrackedExercise, "name" | "bodyPart" | "target" | "equipment">
  >,
): TrackedExercise {
  return {
    ...exercise,
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.bodyPart !== undefined ? { bodyPart: updates.bodyPart } : {}),
    ...(updates.target !== undefined ? { target: updates.target } : {}),
    ...(updates.equipment !== undefined ? { equipment: updates.equipment } : {}),
    updatedAt: nowIso(),
  };
}

export function updateTrackedExercise(
  id: string,
  updates: Partial<
    Pick<TrackedExercise, "name" | "bodyPart" | "target" | "equipment">
  >,
): void {
  const list = getAllTrackedExercises();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return;
  list[idx] = applyTrackedExerciseUpdates(list[idx]!, updates);
  updateTrackedCache([...list]);
  notifyLocalDataChanged("trackedExercise");
  void patchTrackedExercise(id, updates).catch(() => notifyRemoteWriteError());
}

export async function updateTrackedExerciseAndWait(
  id: string,
  updates: Partial<
    Pick<TrackedExercise, "name" | "bodyPart" | "target" | "equipment">
  >,
): Promise<TrackedExercise | null> {
  const list = getAllTrackedExercises();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  list[idx] = applyTrackedExerciseUpdates(list[idx]!, updates);
  updateTrackedCache([...list]);
  notifyLocalDataChanged("trackedExercise");
  try {
    const remote = await patchTrackedExercise(id, updates);
    updateTrackedCache(
      getAllTrackedExercises().map((e) => (e.id === id ? remote : e)),
    );
    return remote;
  } catch (error) {
    notifyRemoteWriteError();
    throw error;
  }
}

export function getTrackedExerciseById(
  id: string,
): TrackedExercise | undefined {
  return trackedCache.find((e) => e.id === id && !e.deletedAt);
}

export function getPerformanceEntries(): PerformanceEntry[] {
  return activePerformanceSnapshot;
}

export function getAllPerformanceEntries(): PerformanceEntry[] {
  return [...performanceCache];
}

export function setPerformanceEntries(entries: PerformanceEntry[]): void {
  updatePerformanceCache(entries);
  notifyLocalDataChanged("performance");
}

export function getEntriesByTrackedId(
  trackedExerciseId: string,
): PerformanceEntry[] {
  return getPerformanceEntries()
    .filter((e) => e.trackedExerciseId === trackedExerciseId)
    .sort(chronologicalPerfOrder);
}

export function getAllPerformanceEntriesRecentFirst(): PerformanceEntry[] {
  return [...getPerformanceEntries()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function savePerformance(
  trackedExerciseId: string,
  weight: number,
  reps: number,
  opts?: { date?: string },
): PerformanceEntry {
  const today = getLocalDateKey();
  const day =
    opts?.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date) ? opts.date : today;
  const entry: PerformanceEntry = {
    id: crypto.randomUUID(),
    trackedExerciseId,
    date: day,
    weight,
    reps,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
  };
  updatePerformanceCache([...getAllPerformanceEntries(), entry]);
  notifyLocalDataChanged("performance");
  trackPerformanceLogged({
    trackedExerciseId,
    entryId: entry.id,
    weight,
    reps,
    date: day,
    source: "save_performance",
  });
  void upsertPerformanceEntry(entry)
    .then(({ xp }) => {
      if (xp) applyXpGrantResult(xp);
    })
    .catch(() => notifyRemoteWriteError());
  scheduleRestFinishedLocalNotificationForEntry(entry);
  return entry;
}

export async function savePerformanceAndWait(
  trackedExerciseId: string,
  weight: number,
  reps: number,
  opts?: {
    date?: string;
    id?: string;
    skipRestTimer?: boolean;
    excludeFromRestTimer?: boolean;
  },
): Promise<{ entry: PerformanceEntry; xp?: XpGrantResult }> {
  const today = getLocalDateKey();
  const day =
    opts?.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date) ? opts.date : today;
  const entry: PerformanceEntry = {
    id: opts?.id?.trim() || crypto.randomUUID(),
    trackedExerciseId,
    date: day,
    weight,
    reps,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
  };
  if (opts?.excludeFromRestTimer) {
    excludePerformanceFromRestTimer(entry.id);
  }
  updatePerformanceCache([...getAllPerformanceEntries(), entry]);
  notifyLocalDataChanged("performance");

  try {
    const { entry: remote, xp } = await upsertPerformanceEntry(entry);
    updatePerformanceCache(
      getAllPerformanceEntries().map((e) => (e.id === entry.id ? remote : e)),
    );
    if (xp) applyXpGrantResult(xp);
    trackPerformanceLogged({
      trackedExerciseId,
      entryId: remote.id,
      weight,
      reps,
      date: day,
      source: "save_performance_and_wait",
    });
    if (opts?.excludeFromRestTimer && remote.id !== entry.id) {
      excludePerformanceFromRestTimer(remote.id);
    }
    // First-perf + célébration : différer RestTimer (bridge natif sous la modale = freeze).
    if (!opts?.skipRestTimer) {
      scheduleRestFinishedLocalNotificationForEntry(remote);
    }
    return { entry: remote, xp };
  } catch (error) {
    notifyRemoteWriteError();
    throw error;
  }
}

export function deletePerformance(entryId: string): void {
  trackPerformanceDeleted({ entryId, source: "delete_performance" });
  const next = getAllPerformanceEntries().map((e) =>
    e.id === entryId ? { ...e, updatedAt: nowIso(), deletedAt: nowIso() } : e,
  );
  updatePerformanceCache(next);
  notifyLocalDataChanged("performance");
  void deletePerformanceEntryRemote(entryId).catch(() =>
    notifyRemoteWriteError(),
  );
}

export async function deletePerformanceAndWait(entryId: string): Promise<void> {
  trackPerformanceDeleted({ entryId, source: "delete_performance_and_wait" });
  const next = getAllPerformanceEntries().map((e) =>
    e.id === entryId ? { ...e, updatedAt: nowIso(), deletedAt: nowIso() } : e,
  );
  updatePerformanceCache(next);
  notifyLocalDataChanged("performance");
  try {
    await deletePerformanceEntryRemote(entryId);
  } catch (error) {
    notifyRemoteWriteError();
    throw error;
  }
}

export function updatePerformance(
  entryId: string,
  weight: number,
  reps: number,
): PerformanceEntry | null {
  const list = getAllPerformanceEntries();
  const idx = list.findIndex((e) => e.id === entryId);
  if (idx === -1) return null;
  const previous = list[idx];
  list[idx] = { ...list[idx], weight, reps, updatedAt: nowIso() };
  const updated = list[idx];
  updatePerformanceCache([...list]);
  notifyLocalDataChanged("performance");
  trackPerformanceEdited({
    entryId,
    weight,
    reps,
    previousWeight: previous.weight,
    previousReps: previous.reps,
    source: "update_performance",
  });
  void patchPerformanceEntry(entryId, { weight, reps }).catch(() =>
    notifyRemoteWriteError(),
  );
  return updated;
}

export async function updatePerformanceAndWait(
  entryId: string,
  weight: number,
  reps: number,
): Promise<PerformanceEntry | null> {
  const list = getAllPerformanceEntries();
  const idx = list.findIndex((e) => e.id === entryId);
  if (idx === -1) return null;
  const previous = list[idx];
  list[idx] = { ...list[idx], weight, reps, updatedAt: nowIso() };
  updatePerformanceCache([...list]);
  notifyLocalDataChanged("performance");
  try {
    const remote = await patchPerformanceEntry(entryId, { weight, reps });
    const merged = preservePerformanceLogCreatedAt(remote, previous);
    updatePerformanceCache(
      getAllPerformanceEntries().map((e) => (e.id === entryId ? merged : e)),
    );
    trackPerformanceEdited({
      entryId,
      weight,
      reps,
      previousWeight: previous.weight,
      previousReps: previous.reps,
      source: "update_performance_and_wait",
    });
    return merged;
  } catch (error) {
    notifyRemoteWriteError();
    throw error;
  }
}

export function getLastPerformance(
  trackedExerciseId: string,
): PerformanceEntry | undefined {
  return getLatestPerformanceEntry(getEntriesByTrackedId(trackedExerciseId));
}

export function getLatestPerformanceCreatedAt(
  trackedExerciseId: string,
): number | null {
  const entries = getPerformanceEntries().filter(
    (e) => e.trackedExerciseId === trackedExerciseId,
  );
  if (entries.length === 0) return null;
  let max = 0;
  for (const e of entries) {
    const t = new Date(e.createdAt).getTime();
    if (t > max) max = t;
  }
  return max;
}

export function getPersonalBest(
  trackedExerciseId: string,
): PerformanceEntry | undefined {
  const entries = getEntriesByTrackedId(trackedExerciseId);
  if (entries.length === 0) return undefined;
  return entries.reduce((best, curr) =>
    curr.weight > best.weight ||
    (curr.weight === best.weight && curr.reps > best.reps)
      ? curr
      : best,
  );
}

export function getUserProfile(): UserProfile {
  return profileCache;
}

export function resetUserProfileCache(): void {
  profileCache = { ...DEFAULT_PROFILE };
  hasProfilePersistedCache = false;
  notifyLocalDataChanged("profile");
}

export function resetLocalExerciseCaches(): void {
  updateTrackedCache([]);
  updatePerformanceCache([]);
  notifyLocalDataChanged("trackedExercise");
  notifyLocalDataChanged("performance");
}

export function hasPersistedUserProfile(): boolean {
  return hasProfilePersistedCache;
}

export type PendingOnboardingBodyProfile = Pick<
  UserProfile,
  | "weightKg"
  | "heightCm"
  | "gender"
  | "ageYears"
  | "trainingGoal"
  | "trainingExperience"
  | "sessionsPerWeek"
>;

function readOnboardingDraftSessionId(): string | null {
  try {
    return sessionStorage.getItem(ONBOARDING_DRAFT_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeOnboardingDraftSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(ONBOARDING_DRAFT_SESSION_KEY, sessionId);
  } catch {
    // ignore quota / private mode
  }
}

function clearOnboardingDraftSessionId(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_DRAFT_SESSION_KEY);
  } catch {
    // ignore
  }
}

function belongsToCurrentOnboardingSession(sessionId: unknown): boolean {
  if (typeof sessionId !== "string" || sessionId.length === 0) return false;
  const current = readOnboardingDraftSessionId();
  return current != null && sessionId === current;
}

/** Crée un nouveau parcours d'onboarding et jette les drafts d'une visite précédente. */
export function beginOnboardingDraftSession(): string {
  const sessionId = crypto.randomUUID();
  writeOnboardingDraftSessionId(sessionId);
  clearPendingOnboardingRecord();
  clearPendingOnboardingProfile();
  return sessionId;
}

export function ensureOnboardingDraftSession(): string {
  const existing = readOnboardingDraftSessionId();
  if (existing) return existing;
  const sessionId = crypto.randomUUID();
  writeOnboardingDraftSessionId(sessionId);
  return sessionId;
}

export function hasOnboardingDraftSession(): boolean {
  return readOnboardingDraftSessionId() != null;
}

/** Login « j'ai un compte » depuis l'intro : ne pas pousser un leftover. */
export function discardPendingOnboardingDrafts(): void {
  clearPendingOnboardingRecord();
  clearPendingOnboardingProfile();
}

/** Logout / changement de compte authentifié. */
export function clearOnboardingDraftsAndSession(): void {
  discardPendingOnboardingDrafts();
  clearOnboardingDraftSessionId();
}

function isPendingOnboardingBodyProfile(
  value: unknown,
): value is PendingOnboardingBodyProfile {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.weightKg === "number" &&
    Number.isFinite(draft.weightKg) &&
    typeof draft.heightCm === "number" &&
    Number.isFinite(draft.heightCm) &&
    (draft.gender === "male" || draft.gender === "female")
  );
}

export function peekPendingOnboardingProfile(): PendingOnboardingBodyProfile | null {
  try {
    const raw = localStorage.getItem(PENDING_ONBOARDING_PROFILE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingOnboardingBodyProfile(parsed)) return null;
    if (
      !belongsToCurrentOnboardingSession(
        (parsed as { sessionId?: unknown }).sessionId,
      )
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setPendingOnboardingProfile(
  profile: PendingOnboardingBodyProfile,
): void {
  try {
    localStorage.setItem(
      PENDING_ONBOARDING_PROFILE_KEY,
      JSON.stringify({
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        gender: profile.gender,
        ageYears: profile.ageYears ?? null,
        trainingGoal: profile.trainingGoal ?? null,
        trainingExperience: profile.trainingExperience ?? null,
        sessionsPerWeek: profile.sessionsPerWeek ?? null,
        sessionId: ensureOnboardingDraftSession(),
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearPendingOnboardingProfile(): void {
  try {
    localStorage.removeItem(PENDING_ONBOARDING_PROFILE_KEY);
  } catch {
    // ignore
  }
}

/** Après applySession (purge), réinjecte le draft morpho d'un nouvel inscrit. */
export function consumePendingOnboardingProfileToLocalCache(): void {
  const pending = peekPendingOnboardingProfile();
  if (pending) {
    setUserProfile(pending, { silent: true });
  }
  clearPendingOnboardingProfile();
}

export function applyPendingOnboardingProfileAfterAuth(
  isNewUser: boolean,
): void {
  if (isNewUser) {
    consumePendingOnboardingProfileToLocalCache();
    return;
  }
  clearPendingOnboardingProfile();
}

export type PendingOnboardingRecord = {
  exerciseId: string;
  name: string;
  originalName: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  weight: number;
  reps: number;
  clientTrackedId: string;
  clientPerfId: string;
  sessionId?: string;
};

function isPendingOnboardingRecord(
  value: unknown,
): value is PendingOnboardingRecord {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.exerciseId === "string" &&
    draft.exerciseId.length > 0 &&
    typeof draft.name === "string" &&
    typeof draft.originalName === "string" &&
    typeof draft.bodyPart === "string" &&
    typeof draft.target === "string" &&
    typeof draft.equipment === "string" &&
    (draft.gifUrl === undefined || typeof draft.gifUrl === "string") &&
    typeof draft.weight === "number" &&
    Number.isFinite(draft.weight) &&
    typeof draft.reps === "number" &&
    Number.isFinite(draft.reps) &&
    draft.reps > 0 &&
    typeof draft.clientTrackedId === "string" &&
    typeof draft.clientPerfId === "string"
  );
}

export function peekPendingOnboardingRecord(): PendingOnboardingRecord | null {
  try {
    const raw = localStorage.getItem(PENDING_ONBOARDING_RECORD_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingOnboardingRecord(parsed)) return null;
    if (!belongsToCurrentOnboardingSession(parsed.sessionId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setPendingOnboardingRecord(
  record: PendingOnboardingRecord,
): void {
  try {
    localStorage.setItem(
      PENDING_ONBOARDING_RECORD_KEY,
      JSON.stringify({
        ...record,
        sessionId: ensureOnboardingDraftSession(),
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearPendingOnboardingRecord(): void {
  try {
    localStorage.removeItem(PENDING_ONBOARDING_RECORD_KEY);
  } catch {
    // ignore
  }
}

export function setOnboardingRecordDestination(path: string): void {
  try {
    localStorage.setItem(ONBOARDING_RECORD_DESTINATION_KEY, path);
  } catch {
    // ignore
  }
}

export function peekOnboardingRecordDestination(): string | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_RECORD_DESTINATION_KEY);
    if (!raw || !raw.startsWith("/")) return null;
    return raw;
  } catch {
    return null;
  }
}

export function clearOnboardingRecordDestination(): void {
  try {
    localStorage.removeItem(ONBOARDING_RECORD_DESTINATION_KEY);
  } catch {
    // ignore
  }
}

export function setUserProfile(
  profile: Partial<UserProfile>,
  opts?: { silent?: boolean },
): void {
  profileCache = {
    ...profileCache,
    weightKg: profile.weightKg ?? profileCache.weightKg,
    heightCm: profile.heightCm ?? profileCache.heightCm,
    gender: profile.gender ?? profileCache.gender,
    ...(profile.ageYears !== undefined ? { ageYears: profile.ageYears } : {}),
    ...(profile.trainingGoal !== undefined
      ? { trainingGoal: profile.trainingGoal }
      : {}),
    ...(profile.trainingExperience !== undefined
      ? { trainingExperience: profile.trainingExperience }
      : {}),
    ...(profile.sessionsPerWeek !== undefined
      ? { sessionsPerWeek: profile.sessionsPerWeek }
      : {}),
    ...(profile.firstName !== undefined
      ? { firstName: profile.firstName }
      : {}),
    ...(profile.lastName !== undefined ? { lastName: profile.lastName } : {}),
    ...(profile.username !== undefined ? { username: profile.username } : {}),
    ...(profile.avatarUrl !== undefined ? { avatarUrl: profile.avatarUrl } : {}),
  };
  hasProfilePersistedCache = true;
  if (!opts?.silent) {
    notifyLocalDataChanged("profile");
    void upsertRemoteProfile(profileCache).catch(() =>
      notifyRemoteWriteError(),
    );
  }
}

export async function setUserProfileAndWait(
  profile: Partial<UserProfile>,
): Promise<UserProfile> {
  profileCache = {
    ...profileCache,
    weightKg: profile.weightKg ?? profileCache.weightKg,
    heightCm: profile.heightCm ?? profileCache.heightCm,
    gender: profile.gender ?? profileCache.gender,
    ...(profile.ageYears !== undefined ? { ageYears: profile.ageYears } : {}),
    ...(profile.trainingGoal !== undefined
      ? { trainingGoal: profile.trainingGoal }
      : {}),
    ...(profile.trainingExperience !== undefined
      ? { trainingExperience: profile.trainingExperience }
      : {}),
    ...(profile.sessionsPerWeek !== undefined
      ? { sessionsPerWeek: profile.sessionsPerWeek }
      : {}),
    ...(profile.firstName !== undefined
      ? { firstName: profile.firstName }
      : {}),
    ...(profile.lastName !== undefined ? { lastName: profile.lastName } : {}),
    ...(profile.username !== undefined ? { username: profile.username } : {}),
    ...(profile.avatarUrl !== undefined ? { avatarUrl: profile.avatarUrl } : {}),
  };
  hasProfilePersistedCache = true;
  notifyLocalDataChanged("profile");
  try {
    const remote = await upsertRemoteProfile(profileCache);
    profileCache = {
      weightKg: remote.weightKg,
      heightCm: remote.heightCm,
      gender: remote.gender,
      ageYears: remote.ageYears ?? null,
      trainingGoal: remote.trainingGoal ?? null,
      trainingExperience: remote.trainingExperience ?? null,
      sessionsPerWeek: remote.sessionsPerWeek ?? null,
      ...(remote.firstName !== undefined
        ? { firstName: remote.firstName }
        : {}),
      ...(remote.lastName !== undefined ? { lastName: remote.lastName } : {}),
      ...(remote.username !== undefined ? { username: remote.username } : {}),
      ...(remote.avatarUrl !== undefined ? { avatarUrl: remote.avatarUrl } : {}),
    };
    return profileCache;
  } catch (error) {
    notifyRemoteWriteError();
    throw error;
  }
}

export function setOnboardingFirstExercisePending(pending: boolean): void {
  if (pending) {
    localStorage.setItem(ONBOARDING_FIRST_EXERCISE_PENDING_KEY, "1");
  } else {
    localStorage.removeItem(ONBOARDING_FIRST_EXERCISE_PENDING_KEY);
  }
}

export function isOnboardingFirstExercisePending(): boolean {
  return localStorage.getItem(ONBOARDING_FIRST_EXERCISE_PENDING_KEY) === "1";
}

export function setOnboardingTourComplete(complete: boolean): void {
  if (complete) {
    localStorage.setItem(ONBOARDING_TOUR_COMPLETE_KEY, "1");
  } else {
    localStorage.removeItem(ONBOARDING_TOUR_COMPLETE_KEY);
  }
}

export function isOnboardingTourComplete(): boolean {
  return localStorage.getItem(ONBOARDING_TOUR_COMPLETE_KEY) === "1";
}

export function setOnboardingPostAuthRedirect(path: string | null): void {
  if (!path) {
    localStorage.removeItem(ONBOARDING_POST_AUTH_REDIRECT_KEY);
    return;
  }
  localStorage.setItem(ONBOARDING_POST_AUTH_REDIRECT_KEY, path);
}

export function getOnboardingPostAuthRedirect(): string | null {
  const raw = localStorage.getItem(ONBOARDING_POST_AUTH_REDIRECT_KEY);
  if (!raw || !raw.startsWith("/")) return null;
  return raw;
}

export function needsOnboarding(): boolean {
  if (localStorage.getItem(ONBOARDING_V1_KEY) === "done") return false;
  if (localStorage.getItem(ONBOARDING_FIRST_EXERCISE_PENDING_KEY) === "1") {
    return true;
  }
  return localStorage.getItem(ONBOARDING_V1_KEY) !== "done";
}

export function isOnboardingGymPending(): boolean {
  return localStorage.getItem(ONBOARDING_GYM_PENDING_KEY) === "1";
}

export function setOnboardingGymPending(pending: boolean): void {
  if (pending) {
    localStorage.setItem(ONBOARDING_GYM_PENDING_KEY, "1");
  } else {
    localStorage.removeItem(ONBOARDING_GYM_PENDING_KEY);
  }
}

export function clearOnboardingGymPending(): void {
  localStorage.removeItem(ONBOARDING_GYM_PENDING_KEY);
}

/** Purge l'état salle local (changement de compte). La vérité métier est côté API. */
export function clearGymOnboardingLocalState(): void {
  clearOnboardingGymPending();
  clearGymOnboardingContext();
  localStorage.removeItem(GYM_SETUP_DONE_KEY);
}

export function setGymOnboardingContext(
  inZone: boolean,
  gymName: string,
): void {
  localStorage.setItem(GYM_ONBOARDING_IN_ZONE_KEY, inZone ? "1" : "0");
  localStorage.setItem(GYM_ONBOARDING_NAME_KEY, gymName);
}

export function getGymOnboardingContext(): {
  inZone: boolean;
  gymName: string;
} | null {
  const gymName = localStorage.getItem(GYM_ONBOARDING_NAME_KEY);
  if (!gymName) return null;
  return {
    inZone: localStorage.getItem(GYM_ONBOARDING_IN_ZONE_KEY) === "1",
    gymName,
  };
}

export function clearGymOnboardingContext(): void {
  localStorage.removeItem(GYM_ONBOARDING_IN_ZONE_KEY);
  localStorage.removeItem(GYM_ONBOARDING_NAME_KEY);
}

export function isGymLocationPromptDone(): boolean {
  if (localStorage.getItem(ONBOARDING_V1_KEY) === "done") return true;
  return localStorage.getItem(GYM_LOCATION_PROMPT_DONE_KEY) === "1";
}

export function setGymLocationPromptDone(done: boolean): void {
  if (done) {
    localStorage.setItem(GYM_LOCATION_PROMPT_DONE_KEY, "1");
  } else {
    localStorage.removeItem(GYM_LOCATION_PROMPT_DONE_KEY);
  }
}

export function isGymNotificationsPromptDone(): boolean {
  if (localStorage.getItem(ONBOARDING_V1_KEY) === "done") return true;
  return localStorage.getItem(GYM_NOTIFICATIONS_PROMPT_DONE_KEY) === "1";
}

export function isOnboardingNotificationsPromptDone(): boolean {
  if (localStorage.getItem(ONBOARDING_V1_KEY) === "done") return true;
  return (
    localStorage.getItem(ONBOARDING_NOTIFICATIONS_PROMPT_DONE_KEY) === "1"
  );
}

export function setOnboardingNotificationsPromptDone(done: boolean): void {
  if (done) {
    localStorage.setItem(ONBOARDING_NOTIFICATIONS_PROMPT_DONE_KEY, "1");
    setGymNotificationsPromptDone(true);
  } else {
    localStorage.removeItem(ONBOARDING_NOTIFICATIONS_PROMPT_DONE_KEY);
  }
}

export function setGymNotificationsPromptDone(done: boolean): void {
  if (done) {
    localStorage.setItem(GYM_NOTIFICATIONS_PROMPT_DONE_KEY, "1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("one-more:gym-notifications-prompt-done"),
      );
    }
  } else {
    localStorage.removeItem(GYM_NOTIFICATIONS_PROMPT_DONE_KEY);
  }
}

export function setGymPermissionsPromptDone(done: boolean): void {
  setGymNotificationsPromptDone(done);
  setGymLocationPromptDone(done);
}

export function needsGymPermissionsPrompt(isNative: boolean): boolean {
  if (!isGymNotificationsPromptDone()) return true;
  if (isNative && !isGymLocationPromptDone()) return true;
  return false;
}

export function isGymSetupDone(): boolean {
  return localStorage.getItem(GYM_SETUP_DONE_KEY) === "1";
}

export function setGymSetupDone(done: boolean): void {
  if (done) {
    localStorage.setItem(GYM_SETUP_DONE_KEY, "1");
  } else {
    localStorage.removeItem(GYM_SETUP_DONE_KEY);
  }
}

export function getGymNotifLastAt(): number | null {
  const raw = localStorage.getItem(GYM_NOTIF_LAST_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setGymNotifLastAt(at: number): void {
  localStorage.setItem(GYM_NOTIF_LAST_KEY, String(at));
}

export function isOnboardingMarkedDone(): boolean {
  return localStorage.getItem(ONBOARDING_V1_KEY) === "done";
}

export function markOnboardingDone(destination?: string): void {
  const alreadyDone = isOnboardingMarkedDone();
  const resolvedDestination =
    destination ?? getOnboardingPostAuthRedirect() ?? "/home";
  localStorage.setItem(ONBOARDING_V1_KEY, "done");
  localStorage.removeItem(ONBOARDING_POST_AUTH_REDIRECT_KEY);
  if (!alreadyDone) {
    trackOnboardingCompleted({
      destination: resolvedDestination,
    });
  }
}

export function getThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
    return "system";
  } catch {
    return "system";
  }
}

export function setThemePreference(theme: ThemePreference): void {
  localStorage.setItem(THEME_PREFERENCE_KEY, theme);
}

export function getRestTargetMs(): number {
  try {
    const raw = localStorage.getItem(REST_TARGET_MS_KEY);
    if (raw == null) return DEFAULT_REST_TARGET_MS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_REST_TARGET_MS;
    return clampRestTargetMs(parsed);
  } catch {
    return DEFAULT_REST_TARGET_MS;
  }
}

export function setRestTargetMs(ms: number): void {
  const clamped = clampRestTargetMs(ms);
  localStorage.setItem(REST_TARGET_MS_KEY, String(clamped));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("one-more:rest-target-changed", {
        detail: { ms: clamped },
      }),
    );
  }
}

export function isRestTimerEnabled(): boolean {
  try {
    const raw = localStorage.getItem(REST_TIMER_ENABLED_KEY);
    if (raw == null) return true;
    return raw !== "0";
  } catch {
    return true;
  }
}

export function setRestTimerEnabled(enabled: boolean): void {
  localStorage.setItem(REST_TIMER_ENABLED_KEY, enabled ? "1" : "0");
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("one-more:rest-timer-enabled-changed", {
        detail: { enabled },
      }),
    );
  }
}

export function isRestCounterTourComplete(): boolean {
  try {
    return localStorage.getItem(REST_COUNTER_TOUR_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRestCounterTourComplete(complete: boolean): void {
  if (complete) {
    localStorage.setItem(REST_COUNTER_TOUR_COMPLETE_KEY, "1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(REST_COUNTER_TOUR_COMPLETE_EVENT));
    }
  } else {
    localStorage.removeItem(REST_COUNTER_TOUR_COMPLETE_KEY);
  }
}

export function subscribeRestCounterTourComplete(
  listener: () => void,
): () => void {
  window.addEventListener(REST_COUNTER_TOUR_COMPLETE_EVENT, listener);
  return () => {
    window.removeEventListener(REST_COUNTER_TOUR_COMPLETE_EVENT, listener);
  };
}

export function isExerciseCatalogTourComplete(): boolean {
  try {
    return localStorage.getItem(EXERCISE_CATALOG_TOUR_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setExerciseCatalogTourComplete(complete: boolean): void {
  if (complete) {
    localStorage.setItem(EXERCISE_CATALOG_TOUR_COMPLETE_KEY, "1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EXERCISE_CATALOG_TOUR_COMPLETE_EVENT),
      );
    }
  } else {
    localStorage.removeItem(EXERCISE_CATALOG_TOUR_COMPLETE_KEY);
  }
}

export function subscribeExerciseCatalogTourComplete(
  listener: () => void,
): () => void {
  window.addEventListener(EXERCISE_CATALOG_TOUR_COMPLETE_EVENT, listener);
  return () => {
    window.removeEventListener(EXERCISE_CATALOG_TOUR_COMPLETE_EVENT, listener);
  };
}

export function isExerciseDetailTourComplete(): boolean {
  try {
    return localStorage.getItem(EXERCISE_DETAIL_TOUR_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setExerciseDetailTourComplete(complete: boolean): void {
  if (complete) {
    localStorage.setItem(EXERCISE_DETAIL_TOUR_COMPLETE_KEY, "1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EXERCISE_DETAIL_TOUR_COMPLETE_EVENT),
      );
    }
  } else {
    localStorage.removeItem(EXERCISE_DETAIL_TOUR_COMPLETE_KEY);
  }
}

export function subscribeExerciseDetailTourComplete(
  listener: () => void,
): () => void {
  window.addEventListener(EXERCISE_DETAIL_TOUR_COMPLETE_EVENT, listener);
  return () => {
    window.removeEventListener(EXERCISE_DETAIL_TOUR_COMPLETE_EVENT, listener);
  };
}

export function isHomeTourComplete(): boolean {
  try {
    return localStorage.getItem(HOME_TOUR_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHomeTourComplete(complete: boolean): void {
  if (complete) {
    const alreadyComplete = isHomeTourComplete();
    localStorage.setItem(HOME_TOUR_COMPLETE_KEY, "1");
    if (!alreadyComplete && !isHomeNotificationsPromptDone()) {
      setHomeNotificationsPromptPending(true);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(HOME_TOUR_COMPLETE_EVENT));
    }
  } else {
    localStorage.removeItem(HOME_TOUR_COMPLETE_KEY);
  }
}

export function isHomeNotificationsPromptPending(): boolean {
  try {
    return localStorage.getItem(HOME_NOTIFICATIONS_PROMPT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHomeNotificationsPromptPending(pending: boolean): void {
  if (pending) {
    localStorage.setItem(HOME_NOTIFICATIONS_PROMPT_PENDING_KEY, "1");
  } else {
    localStorage.removeItem(HOME_NOTIFICATIONS_PROMPT_PENDING_KEY);
  }
}

export function isHomeNotificationsPromptDone(): boolean {
  try {
    return localStorage.getItem(HOME_NOTIFICATIONS_PROMPT_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHomeNotificationsPromptDone(done: boolean): void {
  if (done) {
    localStorage.setItem(HOME_NOTIFICATIONS_PROMPT_DONE_KEY, "1");
    setHomeNotificationsPromptPending(false);
    setOnboardingNotificationsPromptDone(true);
  } else {
    localStorage.removeItem(HOME_NOTIFICATIONS_PROMPT_DONE_KEY);
  }
}

export function subscribeHomeTourComplete(listener: () => void): () => void {
  window.addEventListener(HOME_TOUR_COMPLETE_EVENT, listener);
  return () => {
    window.removeEventListener(HOME_TOUR_COMPLETE_EVENT, listener);
  };
}
