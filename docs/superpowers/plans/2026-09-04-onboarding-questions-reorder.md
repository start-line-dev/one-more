# Onboarding questions reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réordonner l'onboarding (body → intent → record → rank → account), une question par écran, pickers visuels, skip vers compte + tour premier exo.

**Architecture:** Deux blocs URL (`body&bodyQ`, `intent&intentQ`) dans `OnboardingPage`. Nouveaux pickers dédiés onboarding. Extension profil API (migration + DTO). Analytics/back-nav TDD first.

**Tech Stack:** React, Vite, Tailwind, `@ncdai/react-wheel-picker`, Capacitor Haptics, TypeORM migration, Playwright, Vitest.

## Global Constraints

- Copy UI : pas de `--` ni de `—`. Tutoiement. Chaînes dans `UI.*`.
- DA : `OnboardingShell`, `StepCard`, accent, pas de style maquette bleu/blanc.
- Salle : `GYM_ONBOARDING_TEMPORARILY_DISABLED` reste true, ne pas brancher gym dans le funnel.
- Genre : `male` \| `female` seulement.
- Skip Passer → account (ou post-auth direct si déjà auth) + `setOnboardingFirstExercisePending(true)`.
- Haptique : `hapticSelectionChanged` sur chaque cran picker / choix carte.

---

## File map

**API**
- Create: `api/src/database/migrations/<timestamp>-profile-training-fields.ts`
- Modify: `api/src/profile/user-profile.entity.ts`
- Modify: `api/src/profile/profile.dto.ts`
- Modify: `api/src/profile/profile.service.ts`
- Modify: `api/src/auth/auth.dto.ts`

**Client core**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/lib/storage.ts`
- Modify: `client/src/lib/auth.ts`
- Modify: `client/src/lib/analytics/onboarding-tracking.ts`
- Modify: `client/src/lib/analytics/onboarding-tracking.test.ts`
- Modify: `client/src/lib/app-back-navigation.ts`
- Modify: `client/src/lib/app-back-navigation.test.ts`
- Modify: `client/src/lib/translations.ts`

**Client UI**
- Modify: `client/src/components/StepCard.tsx`
- Create: `client/src/components/onboarding/OnboardingRulerPicker.tsx`
- Create: `client/src/components/onboarding/OnboardingVerticalWheelPicker.tsx`
- Create: `client/src/components/onboarding/OnboardingChoiceList.tsx`
- Modify: `client/src/pages/OnboardingPage.tsx`
- Modify: `client/src/pages/SettingsPage.tsx` (section intent + âge)

**Tests / docs**
- Modify: `client/e2e/smoke/onboarding-intro.spec.ts`
- Modify: `client/e2e/smoke/onboarding-body-profile.spec.ts`
- Modify: `client/e2e/smoke/onboarding-record.spec.ts`
- Create: `client/e2e/smoke/onboarding-skip-to-account.spec.ts`
- Modify: `docs/quality-gates.md`

---

### Task 1: API profil étendu

**Files:**
- Create: migration + entity + DTO + service + auth.dto

**Produces:** GET/PUT `/profile` et POST `/auth/register` acceptent `ageYears?`, `trainingGoal?`, `trainingExperience?`, `sessionsPerWeek?`.

- [ ] **Step 1: Migration** — colonnes nullable sur `user_profiles`.
- [ ] **Step 2: Entity + DTOs** — validation `@IsOptional` `@IsIn` / `@Min` `@Max` pour age.
- [ ] **Step 3: ProfileService** — read/write + toProfileDto.
- [ ] **Step 4: Tests service** — upsert avec nouveaux champs.
- [ ] **Step 5: Commit**

---

### Task 2: Analytics + back nav (TDD)

**Files:**
- Modify: `onboarding-tracking.ts`, `onboarding-tracking.test.ts`
- Modify: `app-back-navigation.ts`, `app-back-navigation.test.ts`

**Produces:**
- `resolveOnboardingStepFromLocation("/onboarding", "?step=body&bodyQ=1")` → `BODY_WEIGHT`
- `resolveOnboardingStepFromLocation("/onboarding", "?step=intent&intentQ=0")` → `INTENT_GOAL`
- Back : `bodyQ=0` → intro, `record` → `intent&intentQ=2`, `rank` → record

- [ ] **Step 1: Write failing tests** (nouveaux steps + back targets)
- [ ] **Step 2: Run tests, confirm RED**
- [ ] **Step 3: Implement mapping + `OnboardingSteps` constants**
- [ ] **Step 4: Run tests, confirm GREEN**
- [ ] **Step 5: Commit**

---

### Task 3: Copy + types + storage draft

**Files:**
- Modify: `translations.ts`, `types/index.ts`, `storage.ts`, `auth.ts`

**Produces:** clés `UI.onboardingBodyTitleAge`, `UI.onboardingIntentTitle*`, choix intent, `onboardingPrivacyHint`. Draft profil étendu.

- [ ] **Step 1: Add UI keys** (titres, labels choix, Passer, réassurance)
- [ ] **Step 2: Extend UserProfile + PendingOnboardingProfile types**
- [ ] **Step 3: Update peek/set pending profile validation**
- [ ] **Step 4: Commit**

---

### Task 4: StepCard skip + pickers onboarding

**Files:**
- Modify: `StepCard.tsx`
- Create: `OnboardingRulerPicker.tsx`, `OnboardingVerticalWheelPicker.tsx`, `OnboardingChoiceList.tsx`

**Produces:**
- `StepCard({ onSkip, skipLabel })` — bouton Passer top-right
- Ruler : scroll-snap horizontal, hero value, haptique
- Vertical wheel : réutilise `wheel-picker.tsx`, hero value centré
- ChoiceList : cartes colonne, role=radiogroup

- [ ] **Step 1: StepCard skip prop**
- [ ] **Step 2: OnboardingRulerPicker** (poids 30–300, step 0.5)
- [ ] **Step 3: OnboardingVerticalWheelPicker** (taille, âge)
- [ ] **Step 4: OnboardingChoiceList** (genre + intent)
- [ ] **Step 5: Typecheck**
- [ ] **Step 6: Commit**

---

### Task 5: Refonte OnboardingPage funnel

**Files:**
- Modify: `OnboardingPage.tsx`

**Produces:** Nouveau flux body → intent → record → rank. Intro Commencer → `body&bodyQ=0`. Skip handlers. Progress bar continue. Retrait `ONBOARDING_TOTAL` / step indicator.

- [ ] **Step 1: Constants BODY_TOTAL=4, INTENT_TOTAL=3, routing helpers**
- [ ] **Step 2: Body step rendering (4 écrans)**
- [ ] **Step 3: Intent step rendering (3 écrans)**
- [ ] **Step 4: Record skip + saveRecordFromDrawer → rank (plus body)**
- [ ] **Step 5: skipToAccount() — purge record, firstExercisePending, track skipped**
- [ ] **Step 6: Progress percent + remove step indicator**
- [ ] **Step 7: Commit**

---

### Task 6: Settings profil entraînement

**Files:**
- Modify: `SettingsPage.tsx`, `translations.ts`

- [ ] **Step 1: Card âge + objectif + expérience + fréquence (Select)**
- [ ] **Step 2: save via setUserProfileAndWait**
- [ ] **Step 3: Commit**

---

### Task 7: Smoke + unit tests + quality-gates

**Files:** e2e specs + quality-gates.md

- [ ] **Step 1: Update onboarding-intro.spec.ts** (Commencer → genre)
- [ ] **Step 2: Update onboarding-body-profile.spec.ts** (nouveau parcours + register fields)
- [ ] **Step 3: Update onboarding-record.spec.ts** (seed body draft ou goto après body)
- [ ] **Step 4: Create onboarding-skip-to-account.spec.ts**
- [ ] **Step 5: Run `npm run test:smoke --prefix client`**
- [ ] **Step 6: Update quality-gates.md**
- [ ] **Step 7: Commit**
