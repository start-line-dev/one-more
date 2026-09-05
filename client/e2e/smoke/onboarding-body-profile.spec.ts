import { expect, test, type Page } from "@playwright/test";
import { mockAuthApi, trackPageErrors } from "./helpers";
import { UI } from "../../src/lib/translations";

const continueButton = (page: Page) =>
  page.getByRole("button", { name: UI.continue, exact: true });

async function completeBodyQuestions(page: Page): Promise<void> {
  await page.getByRole("radio", { name: UI.female }).click();
  await continueButton(page).click();
  await continueButton(page).click();
  await continueButton(page).click();
  await continueButton(page).click();
}

async function completeIntentQuestions(page: Page): Promise<void> {
  await continueButton(page).click();
  await continueButton(page).click();
  await continueButton(page).click();
}

async function completeRecordToRank(page: Page): Promise<void> {
  await expect(page.getByText(UI.onboardingRecordTitle)).toBeVisible();
  await page.getByRole("button", { name: /Développé couché/ }).click();

  const drawer = page.getByRole("dialog", { name: "Rentre ton record" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Enregistrer" }).click();
}

test("l'onboarding body (genre) est envoyé dans le register", async ({
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await mockAuthApi(page);

  const registerBodies: Array<{
    weightKg?: number;
    heightCm?: number;
    gender?: string;
    ageYears?: number;
    trainingGoal?: string;
  }> = [];
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (!request.url().includes("/auth/register")) return;
    registerBodies.push(
      request.postDataJSON() as (typeof registerBodies)[number],
    );
  });

  await page.goto("/#/onboarding?step=body&bodyQ=0");

  await completeBodyQuestions(page);
  await completeIntentQuestions(page);
  await completeRecordToRank(page);

  await expect(page.getByRole("heading", { name: "Ton palier" })).toBeVisible();
  await page.getByRole("button", { name: "Créer mon compte et sauvegarder" }).click();

  await page.getByLabel("Email").fill("body-onboarding@one-more.test");
  await page.getByRole("button", { name: "Rejoindre", exact: true }).click();

  await page.getByLabel("Prénom").fill("Body");
  await continueButton(page).click();

  await page.getByLabel("Nom").fill("Onboarding");
  await continueButton(page).click();

  await page.getByLabel("Pseudo").fill("smoke_user");
  await expect(page.getByText("Pseudo disponible")).toBeVisible({
    timeout: 5_000,
  });
  await continueButton(page).click();

  await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
  await page.getByLabel("Confirmer le mot de passe").fill("password123");
  await page.getByRole("button", { name: "Créer mon compte", exact: true }).click();

  await expect
    .poll(() => registerBodies.some((body) => body.gender === "female"), {
      timeout: 10_000,
    })
    .toBe(true);

  const bodyRegister = registerBodies.find((body) => body.gender === "female");
  expect(bodyRegister).toMatchObject({
    gender: "female",
    weightKg: 75,
    heightCm: 175,
    ageYears: 25,
    trainingGoal: "muscle",
  });

  await expect(page).toHaveURL(/#\/exercise\//, { timeout: 10_000 });

  expect(pageErrors).toEqual([]);
});
