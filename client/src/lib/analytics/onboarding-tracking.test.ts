import { describe, expect, it } from "vitest";
import {
  OnboardingSteps,
  bodyStepFromQuestion,
  gymStepFromSubStep,
  intentStepFromQuestion,
  resolveOnboardingStepFromLocation,
} from "./onboarding-tracking";

describe("resolveOnboardingStepFromLocation", () => {
  it("maps record, body questions, account and gym query params", () => {
    expect(resolveOnboardingStepFromLocation("/onboarding", "")).toBe(
      OnboardingSteps.INTRO,
    );
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=intro"),
    ).toBe(OnboardingSteps.INTRO);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=record"),
    ).toBe(OnboardingSteps.RECORD_PICK);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=perf"),
    ).toBe(OnboardingSteps.RECORD_PICK);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=1rm"),
    ).toBe(OnboardingSteps.RECORD_1RM);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=rank"),
    ).toBe(OnboardingSteps.RANK_REVEAL);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=body&bodyQ=0"),
    ).toBe(OnboardingSteps.BODY_GENDER);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=body&bodyQ=1"),
    ).toBe(OnboardingSteps.BODY_WEIGHT);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=body&bodyQ=2"),
    ).toBe(OnboardingSteps.BODY_HEIGHT);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=body&bodyQ=3"),
    ).toBe(OnboardingSteps.BODY_AGE);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=intent&intentQ=0"),
    ).toBe(OnboardingSteps.INTENT_GOAL);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=intent&intentQ=1"),
    ).toBe(OnboardingSteps.INTENT_EXPERIENCE);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=intent&intentQ=2"),
    ).toBe(OnboardingSteps.INTENT_FREQUENCY);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=account"),
    ).toBe(OnboardingSteps.ACCOUNT_EMAIL);
    expect(resolveOnboardingStepFromLocation("/onboarding", "?step=gym")).toBe(
      OnboardingSteps.GYM_QUESTION,
    );
    expect(
      resolveOnboardingStepFromLocation(
        "/onboarding",
        "?step=gym-permissions",
      ),
    ).toBe(OnboardingSteps.GYM_PERMISSIONS);
    expect(
      resolveOnboardingStepFromLocation("/onboarding", "?step=gym-wait"),
    ).toBe(OnboardingSteps.GYM_WAIT);
    expect(
      resolveOnboardingStepFromLocation(
        "/onboarding",
        "?step=notifications",
      ),
    ).toBe(OnboardingSteps.NOTIFICATIONS);
    expect(resolveOnboardingStepFromLocation("/auth", "")).toBe(
      OnboardingSteps.ACCOUNT_EMAIL,
    );
    expect(resolveOnboardingStepFromLocation("/home", "")).toBeNull();
  });
});

describe("body and gym step helpers", () => {
  it("maps bodyQ, intentQ and gym substeps", () => {
    expect(bodyStepFromQuestion(0)).toBe(OnboardingSteps.BODY_GENDER);
    expect(bodyStepFromQuestion(1)).toBe(OnboardingSteps.BODY_WEIGHT);
    expect(bodyStepFromQuestion(2)).toBe(OnboardingSteps.BODY_HEIGHT);
    expect(bodyStepFromQuestion(3)).toBe(OnboardingSteps.BODY_AGE);
    expect(intentStepFromQuestion(0)).toBe(OnboardingSteps.INTENT_GOAL);
    expect(intentStepFromQuestion(1)).toBe(OnboardingSteps.INTENT_EXPERIENCE);
    expect(intentStepFromQuestion(2)).toBe(OnboardingSteps.INTENT_FREQUENCY);
    expect(gymStepFromSubStep("question")).toBe(OnboardingSteps.GYM_QUESTION);
    expect(gymStepFromSubStep("search")).toBe(OnboardingSteps.GYM_SEARCH);
  });
});
