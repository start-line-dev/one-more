import { expect, test, type Page } from "@playwright/test";
import { mockAuthApi, trackPageErrors } from "./helpers";
import { UI } from "../../src/lib/translations";

const continueButton = (page: Page) =>
  page.getByRole("button", { name: UI.continue, exact: true });

test("skip depuis l'âge mène au compte puis au catalogue exercices", async ({
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await mockAuthApi(page);

  await page.goto("/#/onboarding");

  await page.getByRole("button", { name: UI.onboardingIntroCta }).click();
  await continueButton(page).click();
  await continueButton(page).click();
  await continueButton(page).click();

  await expect(
    page.getByRole("heading", { name: UI.onboardingBodyTitleAge }),
  ).toBeVisible();
  await page.getByRole("button", { name: UI.onboardingSkip }).click();

  await page.getByLabel("Email").fill("skip-onboarding@one-more.test");
  await page.getByRole("button", { name: "Rejoindre", exact: true }).click();

  await page.getByLabel("Prénom").fill("Skip");
  await continueButton(page).click();

  await page.getByLabel("Nom").fill("Onboarding");
  await continueButton(page).click();

  await page.getByLabel("Pseudo").fill("skip_user");
  await expect(page.getByText("Pseudo disponible")).toBeVisible({
    timeout: 5_000,
  });
  await continueButton(page).click();

  await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
  await page.getByLabel("Confirmer le mot de passe").fill("password123");
  await page.getByRole("button", { name: "Créer mon compte", exact: true }).click();

  await expect(page).toHaveURL(/#\/exercises/, { timeout: 10_000 });

  expect(pageErrors).toEqual([]);
});
