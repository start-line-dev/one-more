import { expect, test, type Page } from "@playwright/test";
import { mockAuthApi, trackPageErrors } from "./helpers";
import { UI } from "../../src/lib/translations";

async function submitStarterRecord(page: Page): Promise<void> {
  await expect(page.getByText(UI.onboardingRecordTitle)).toBeVisible();
  await page.getByRole("button", { name: /Développé couché/ }).click();

  const drawer = page.getByRole("dialog", { name: "Rentre ton record" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Enregistrer" }).click();
}

test("l'onboarding record montre le palier puis le compte", async ({
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await mockAuthApi(page);

  await page.goto("/#/onboarding?step=record");

  await submitStarterRecord(page);

  await expect(page.getByRole("heading", { name: "Ton palier" })).toBeVisible();
  await expect(page.getByText("Développé couché").first()).toBeVisible();
  await expect(page.getByText("Record", { exact: true })).toBeVisible();
  await expect(page.getByText("Dernier", { exact: true })).toHaveCount(0);
  await expect(page.getByText("60", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("× 5").first()).toBeVisible();
  await expect(page.getByText(/Plus fort que \d+% des pratiquants/)).toBeVisible();
  await expect(page.getByText(/Tu es /)).toBeVisible();
  await expect(page.getByText(/Il te manque/)).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Créer mon compte et sauvegarder" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();

  const pending = await page.evaluate(() => {
    const raw = localStorage.getItem("one-more-pending-onboarding-record-v1");
    return raw ? (JSON.parse(raw) as { exerciseId: string; gifUrl?: string }) : null;
  });
  expect(pending?.exerciseId).toBe("EIeI8Vf");
  expect(pending?.gifUrl).toBe("https://static.exercisedb.dev/media/EIeI8Vf.gif");

  expect(pageErrors).toEqual([]);
});
