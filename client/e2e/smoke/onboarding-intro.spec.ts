import { expect, test } from "@playwright/test";
import { mockAuthApi, trackPageErrors } from "./helpers";
import { UI } from "../../src/lib/translations";

test("l'intro onboarding montre les features puis Commencer mène au genre", async ({
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await mockAuthApi(page);

  await page.goto("/#/onboarding");

  await expect(page.getByAltText("One More")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: UI.onboardingIntroSlide1Title }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: UI.onboardingIntroCta }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: UI.switchToLogin }),
  ).toBeVisible();

  await page.getByRole("button", { name: UI.onboardingIntroCta }).click();

  await expect(
    page.getByRole("heading", { name: UI.onboardingBodyTitleGender }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: UI.switchToLogin }),
  ).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});
