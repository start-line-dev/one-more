# Intro onboarding slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réactiver l’intro onboarding comme slider 3 features (mini-UI) avec Commencer / J'ai déjà un compte, avant le funnel record.

**Architecture:** Carousel maison (scroll-snap) dans `OnboardingIntro`. Trois scènes décoratives React. Funnel existant inchangé après `step=record`. Analytics `intro` réutilisé.

**Tech Stack:** React, Vite, Tailwind / tw-animate-css, Playwright, Vitest (fichiers `*.test.ts` client existants).

## Global Constraints

- Copy UI : pas de `--` ni de `—` (copywriting-french). Tutoiement.
- Pas de nouvelle lib d’animation ni de carousel.
- Landing store : `OnboardingPresentationHero` inchangé.
- Mini-UI : `pointer-events: none`, `aria-hidden`, zéro API.
- `prefers-reduced-motion: reduce` : pas d’auto-avance, scènes à l’état final.

## File map

- Modify: `client/src/lib/analytics/onboarding-tracking.ts`
- Modify: `client/src/lib/analytics/onboarding-tracking.test.ts`
- Modify: `client/src/lib/app-back-navigation.ts`
- Modify: `client/src/lib/app-back-navigation.test.ts`
- Modify: `client/src/lib/translations.ts`
- Modify: `client/src/pages/OnboardingPage.tsx`
- Modify: `client/src/App.tsx` (redirects `?step=record` → `/onboarding` si onboarding needed)
- Modify: `client/src/components/onboarding/OnboardingIntro.tsx`
- Create: `client/src/components/onboarding/OnboardingFeatureSlider.tsx`
- Create: `client/src/components/onboarding/OnboardingSceneLogPerf.tsx`
- Create: `client/src/components/onboarding/OnboardingSceneLeaguePromo.tsx`
- Create: `client/src/components/onboarding/OnboardingSceneProgress.tsx`
- Create: `client/e2e/smoke/onboarding-intro.spec.ts`
- Modify: `client/e2e/smoke/onboarding-record.spec.ts`
- Modify: `docs/quality-gates.md`

---

### Task 1: Analytics + back nav (TDD)

**Files:**
- Modify: `client/src/lib/analytics/onboarding-tracking.ts`
- Modify: `client/src/lib/analytics/onboarding-tracking.test.ts`
- Modify: `client/src/lib/app-back-navigation.ts`
- Modify: `client/src/lib/app-back-navigation.test.ts`

**Produces:**
- `resolveOnboardingStepFromLocation("/onboarding", "")` → `OnboardingSteps.INTRO`
- `resolveOnboardingStepFromLocation("/onboarding", "?step=intro")` → `OnboardingSteps.INTRO`
- `resolveOnboardingBackTarget("/onboarding", "")` et `?step=intro` → `{ kind: "stay" }`
- `resolveOnboardingBackTarget("/onboarding", "?step=record")` → `{ kind: "path", to: "/onboarding?step=intro" }`

- [ ] **Step 1: Write failing tests** (valeurs intro vs record)
- [ ] **Step 2: Run tests, confirm RED**
- [ ] **Step 3: Minimal mapping implementation**
- [ ] **Step 4: Run tests, confirm GREEN**
- [ ] **Step 5: Commit**

---

### Task 2: Copy + scènes + slider + intro

**Files:** listed above (translations + new components + OnboardingIntro)

**Produces:** `OnboardingIntro({ onContinue, onHasAccount })` with slider 4 s, 3 slides, CTAs Commencer / J'ai déjà un compte.

Slides:
1. Note en 3 secondes / Poids, reps, c'est plié. / faux drawer
2. Bats tes records / Chaque PR est célébré. / palier Platine 3 → Diamant 1
3. Suis ta progression / Tes chiffres, séance après séance. / courbe SVG

- [ ] **Step 1: Add `UI.onboardingIntro*` keys**
- [ ] **Step 2: Implement scenes + slider + intro**
- [ ] **Step 3: Typecheck**
- [ ] **Step 4: Commit**

---

### Task 3: Brancher le funnel

**Files:**
- Modify: `client/src/pages/OnboardingPage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Default step `intro`, no redirect intro→record, wire CTAs, remove login link on record**
- [ ] **Step 2: Authenticated onboardingNeeded navigates to `/onboarding` not `?step=record`**
- [ ] **Step 3: Commit**

---

### Task 4: Smoke Playwright + quality-gates

**Files:**
- Create: `client/e2e/smoke/onboarding-intro.spec.ts`
- Modify: `client/e2e/smoke/onboarding-record.spec.ts`
- Modify: `docs/quality-gates.md`

- [ ] **Step 1: Write intro spec + point record spec at `?step=record`**
- [ ] **Step 2: Run `npm run test:smoke --prefix client`**
- [ ] **Step 3: Commit**
