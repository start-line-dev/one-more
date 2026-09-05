import { AnalyticsEvents } from "./events";
import {
  identifyUser,
  setGlobalAnalyticsProperties,
  track,
  type AnalyticsProperties,
} from "./track";
import { isGymOnboardingBypassed } from "@/lib/gym-onboarding-route";
import { readStoredSession } from "@/lib/auth-storage";
import { useEffect } from "react";

const LAST_STEP_KEY = "one-more-analytics-onboarding-last-step-v1";
const SIGNUP_METHOD_KEY = "one-more-analytics-signup-method-v1";

export const OnboardingSteps = {
  INTRO: "intro",
  RECORD_PICK: "record_pick",
  RECORD_PERF: "record_perf",
  RECORD_1RM: "record_1rm",
  RANK_REVEAL: "rank_reveal",
  BODY_GENDER: "body_gender",
  BODY_WEIGHT: "body_weight",
  BODY_HEIGHT: "body_height",
  BODY_AGE: "body_age",
  INTENT_GOAL: "intent_goal",
  INTENT_EXPERIENCE: "intent_experience",
  INTENT_FREQUENCY: "intent_frequency",
  ACCOUNT_EMAIL: "account_email",
  ACCOUNT_LOGIN: "account_login",
  ACCOUNT_REGISTER_FIRST_NAME: "account_register_first_name",
  ACCOUNT_REGISTER_LAST_NAME: "account_register_last_name",
  ACCOUNT_REGISTER_USERNAME: "account_register_username",
  ACCOUNT_REGISTER_PASSWORD: "account_register_password",
  ACCOUNT_REGISTER_REFERRAL: "account_register_referral",
  NOTIFICATIONS: "notifications",
  GYM_QUESTION: "gym_question",
  GYM_LOCATING: "gym_locating",
  GYM_CONFIRM: "gym_confirm",
  GYM_SEARCH: "gym_search",
  GYM_PERMISSIONS: "gym_permissions",
  GYM_WAIT: "gym_wait",
  FIRST_EXERCISE: "first_exercise",
} as const;

export type OnboardingStepId =
  (typeof OnboardingSteps)[keyof typeof OnboardingSteps];

export type AuthMethod = "email" | "google" | "apple";

export type OnboardingStepProps = AnalyticsProperties & {
  step: OnboardingStepId;
  substep?: string;
};

function persistLastStep(step: string): void {
  try {
    localStorage.setItem(LAST_STEP_KEY, step);
  } catch {
    /* private mode */
  }
}

export function getOnboardingLastStep(): string | null {
  try {
    return localStorage.getItem(LAST_STEP_KEY);
  } catch {
    return null;
  }
}

export function persistSignupMethod(method: AuthMethod): void {
  try {
    localStorage.setItem(SIGNUP_METHOD_KEY, method);
  } catch {
    /* private mode */
  }
}

export function getOnboardingSignupMethod(): AuthMethod | null {
  try {
    const raw = localStorage.getItem(SIGNUP_METHOD_KEY);
    if (raw === "email" || raw === "google" || raw === "apple") return raw;
    return null;
  } catch {
    return null;
  }
}

export function clearOnboardingAnalyticsState(): void {
  try {
    localStorage.removeItem(LAST_STEP_KEY);
    localStorage.removeItem(SIGNUP_METHOD_KEY);
  } catch {
    /* private mode */
  }
}

export function setOnboardingStepGlobalProperty(
  step: OnboardingStepId | null,
): void {
  setGlobalAnalyticsProperties({
    onboarding_step: step ?? "none",
  });
}

export function resolveOnboardingStepFromLocation(
  pathname: string,
  search: string,
): OnboardingStepId | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  if (pathname === "/auth") {
    return OnboardingSteps.ACCOUNT_EMAIL;
  }

  if (pathname !== "/onboarding") return null;

  const rawStep = params.get("step");
  if (!rawStep || rawStep === "intro") {
    return OnboardingSteps.INTRO;
  }
  if (rawStep === "record") {
    return OnboardingSteps.RECORD_PICK;
  }
  if (rawStep === "perf") return OnboardingSteps.RECORD_PICK;
  if (rawStep === "1rm") return OnboardingSteps.RECORD_1RM;
  if (rawStep === "rank") return OnboardingSteps.RANK_REVEAL;
  if (rawStep === "body") {
    const bodyQ = Number.parseInt(params.get("bodyQ") ?? "0", 10) || 0;
    if (bodyQ === 1) return OnboardingSteps.BODY_WEIGHT;
    if (bodyQ === 2) return OnboardingSteps.BODY_HEIGHT;
    if (bodyQ === 3) return OnboardingSteps.BODY_AGE;
    return OnboardingSteps.BODY_GENDER;
  }
  if (rawStep === "intent") {
    const intentQ = Number.parseInt(params.get("intentQ") ?? "0", 10) || 0;
    if (intentQ === 1) return OnboardingSteps.INTENT_EXPERIENCE;
    if (intentQ === 2) return OnboardingSteps.INTENT_FREQUENCY;
    return OnboardingSteps.INTENT_GOAL;
  }
  if (rawStep === "account") return OnboardingSteps.ACCOUNT_EMAIL;
  if (rawStep === "notifications") return OnboardingSteps.NOTIFICATIONS;
  if (rawStep === "gym") return OnboardingSteps.GYM_QUESTION;
  if (
    rawStep === "gym-permissions" ||
    rawStep === "gym-notifications" ||
    rawStep === "gym-location"
  ) {
    return OnboardingSteps.GYM_PERMISSIONS;
  }
  if (rawStep === "gym-wait") return OnboardingSteps.GYM_WAIT;
  return OnboardingSteps.RECORD_PICK;
}

export function bodyStepFromQuestion(bodyQ: number): OnboardingStepId {
  if (bodyQ === 1) return OnboardingSteps.BODY_WEIGHT;
  if (bodyQ === 2) return OnboardingSteps.BODY_HEIGHT;
  if (bodyQ === 3) return OnboardingSteps.BODY_AGE;
  return OnboardingSteps.BODY_GENDER;
}

export function intentStepFromQuestion(intentQ: number): OnboardingStepId {
  if (intentQ === 1) return OnboardingSteps.INTENT_EXPERIENCE;
  if (intentQ === 2) return OnboardingSteps.INTENT_FREQUENCY;
  return OnboardingSteps.INTENT_GOAL;
}

export function gymStepFromSubStep(
  subStep: "question" | "locating" | "confirm" | "search",
): OnboardingStepId {
  if (subStep === "locating") return OnboardingSteps.GYM_LOCATING;
  if (subStep === "confirm") return OnboardingSteps.GYM_CONFIRM;
  if (subStep === "search") return OnboardingSteps.GYM_SEARCH;
  return OnboardingSteps.GYM_QUESTION;
}

export function trackOnboardingStepViewed(params: OnboardingStepProps): void {
  persistLastStep(params.step);
  setOnboardingStepGlobalProperty(params.step);
  track(AnalyticsEvents.ONBOARDING_STEP_VIEWED, {
    step: params.step,
    substep: params.substep,
  });
}

export function trackOnboardingStepCompleted(
  params: OnboardingStepProps,
): void {
  persistLastStep(params.step);
  track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, params);
}

export function trackOnboardingStepSkipped(params: {
  step: OnboardingStepId;
  reason: string;
}): void {
  persistLastStep(params.step);
  track(AnalyticsEvents.ONBOARDING_STEP_SKIPPED, {
    step: params.step,
    reason: params.reason,
  });
}

export function trackOnboardingCompleted(params: {
  destination: string;
  gymBypassed?: boolean;
}): void {
  persistLastStep("completed");
  track(AnalyticsEvents.ONBOARDING_COMPLETED, {
    destination: params.destination,
    gym_bypassed: params.gymBypassed ?? isGymOnboardingBypassed(),
  });
  const session = readStoredSession();
  if (session) {
    identifyUser({
      profileId: session.user.id,
      email: session.user.email,
      properties: {
        onboarding_completed: true,
        onboarding_last_step: "completed",
        signup_method: getOnboardingSignupMethod(),
      },
    });
  }
}

export function trackAuthSuccess(params: {
  method: AuthMethod;
  isNewUser: boolean;
}): void {
  persistSignupMethod(params.method);
  track(
    params.isNewUser
      ? AnalyticsEvents.USER_REGISTERED
      : AnalyticsEvents.USER_LOGGED_IN,
    { method: params.method },
  );
}

/** Émet `onboarding_step_viewed` une fois par step (et met à jour le contexte global). */
export function useOnboardingStepViewed(
  step: OnboardingStepId | null,
  extra?: { substep?: string },
): void {
  const substep = extra?.substep;
  useEffect(() => {
    if (!step) return;
    trackOnboardingStepViewed({ step, substep });
  }, [step, substep]);
}
