# Onboarding : questions avant record + sliders visuels

Date : 2026-09-04  
Statut : validé en brainstorming, en attente de relecture

## Problème

Le funnel actuel passe par le choix de record avant le gabarit (genre, puis poids + taille sur le même écran). On veut :

1. Poser d'abord les questions compte (genre, poids, taille, âge), une par écran.
2. Puis les questions profil (objectif, expérience, fréquence), une par écran.
3. Ensuite le record, puis le palier, puis le compte.
4. Des pickers plus visuels (règle horizontale, roulette verticale) avec retour haptique.
5. Permettre de passer (skip) dès l'âge, y compris sur le record, pour aller direct au compte puis au tour premier exercice.

Hors scope : parcours salle (déjà bypass via `GYM_ONBOARDING_TEMPORARILY_DISABLED`), refonte intro slider, option genre « Autre ».

## Décisions

- **Ordre** : intro → body (4 écrans) → intent (3 écrans) → record → rank → account.
- **Genre** : Homme / Femme uniquement (modèle ligues inchangé).
- **Skip** : `Passer` visible dès l'âge, sur intent, et sur record. Un tap → compte (`?step=account`), sans record ni palier. Après auth → `/exercises` + App Tour premier exo (`setOnboardingFirstExercisePending(true)`), pas de parcours salle.
- **Parcours complet** : enregistrer une perf au record → palier → compte → fiche record (comportement actuel via `peekOnboardingRecordDestination`).
- **DA** : garder `OnboardingShell`, `StepCard`, accent, tutoiement, `font-one-more` sur les chiffres. Les maquettes servent d'inspiration UX (une question, colonne, valeur XXL), pas de style visuel.
- **Copy** : pas de paragraphe explicatif sous le titre. Micro-réassurance au-dessus du CTA : `Tes données restent privées.`
- **Progression** : barre continue uniquement. Retirer le compteur `1/3` / `onboardingStepIndicator` sur ces écrans.
- **Persistance** : nouveaux champs profil en API + client + register (option A validée).

## Funnel

| Action | Destination |
|---|---|
| Intro → Commencer | `/onboarding?step=body&bodyQ=0` |
| Body genre/poids/taille → Continuer | question suivante (`bodyQ+1`) |
| Body âge → Continuer | `/onboarding?step=intent&intentQ=0` |
| Intent → Continuer | `intentQ+1`, puis record après la 3e |
| Record → perf enregistrée | `/onboarding?step=rank` |
| Rank → CTA compte | `/onboarding?step=account` |
| Passer (âge, intent, record) | `/onboarding?step=account` (purge draft record si skip depuis record) |
| Passer + auth OK | `resolvePostAuthNavigation` → tour premier exo si pas de record |
| J'ai déjà un compte (intro) | login, drafts jetés (inchangé) |

Intro hors barre de progression. Salle : inchangée, bypass actif, ne pas réintroduire dans ce chantier.

## Écrans body (`?step=body&bodyQ=0..3`)

| bodyQ | Titre (`UI`) | Contrôle | Obligatoire | Passer |
|---|---|---|---|---|
| 0 | `onboardingBodyTitleGender` | 2 cartes colonne (Homme, Femme), icônes Mars/Venus, haptique | oui | non |
| 1 | `onboardingBodyTitleWeight` | Règle horizontale + valeur XXL `xx,x kg` | oui | non |
| 2 | `onboardingBodyTitleHeight` | Roulette verticale + valeur XXL `xxx cm` | oui | non |
| 3 | `onboardingBodyTitleAge` | Roulette verticale + valeur XXL `xx ans` | non (skip) | oui |

**Bornes**

- Poids : 30–300 kg, step 0,5, défaut 75.
- Taille : 100–250 cm, step 1, défaut 175.
- Âge : 16–80 ans, step 1, défaut 25.

**Persistance body** : après bodyQ=2 (taille validée), sauver `gender`, `weightKg`, `heightCm` comme aujourd'hui (`setPendingOnboardingProfile` si anonyme, `setUserProfile` si auth). À la fin de bodyQ=3 (Continuer ou skip), ajouter `ageYears` si renseigné.

## Écrans intent (`?step=intent&intentQ=0..2`)

Cartes colonne (même pattern que genre), icône Lucide + label + sous-label optionnel.

| intentQ | Titre | Choix (valeur API) |
|---|---|---|
| 0 | `onboardingIntentTitleGoal` | muscle · force · weight_loss · athlete |
| 1 | `onboardingIntentTitleExperience` | beginner (0–1 an) · intermediate (1–3 ans) · advanced (3+ ans) |
| 2 | `onboardingIntentTitleFrequency` | low (0–1/sem) · moderate (2–4/sem) · high (5–7/sem) |

Toutes skippables (`Passer` → account). Valeurs choisies persistées dans le draft profil puis envoyées au register / PUT profile.

## Record et palier

- Record : écran actuel (`OnboardingExerciseList` + drawer). Ajouter `Passer` en header (via prop `StepCard` ou wrapper).
- Skip record : `clearPendingOnboardingRecord()`, `setOnboardingFirstExercisePending(true)`, `trackOnboardingStepSkipped`, → account.
- Perf enregistrée : draft record + → rank (plus → body).
- Palier : inchangé. CTA compte si anonyme, « Bats ce record » si déjà auth.

## Composants

| Fichier | Rôle |
|---|---|
| `OnboardingRulerPicker.tsx` | Poids : règle horizontale scroll-snap, tick 0,5 kg, valeur hero, haptique par cran |
| `OnboardingVerticalWheelPicker.tsx` | Taille / âge : wrapper `@ncdai/react-wheel-picker` vertical, valeur hero au-dessus, haptique (réutilise `wheel-picker.tsx`) |
| `OnboardingChoiceList.tsx` | Cartes colonne génériques (genre, objectif, expérience, fréquence) |
| `OnboardingQuestionStep.tsx` | Layout commun : titre, contenu, réassurance, Continuer, Passer optionnel |

Extraire le genre de `OnboardingPage` vers `OnboardingChoiceList`. `HorizontalWheelPicker` reste pour l'app (drawer perf), pas pour l'onboarding body.

**StepCard** : ajouter props optionnelles `onSkip`, `skipLabel`, `skipAnalyticsLabel` pour le bouton `Passer` en haut à droite (miroir du back à gauche).

## Données profil (API + client)

Nouveaux champs sur `user_profiles` :

| Colonne | Type | Nullable | Valeurs |
|---|---|---|---|
| `ageYears` | `integer` | oui | 16–80 |
| `trainingGoal` | `text` | oui | `muscle` \| `strength` \| `weight_loss` \| `athlete` |
| `trainingExperience` | `text` | oui | `beginner` \| `intermediate` \| `advanced` |
| `sessionsPerWeek` | `text` | oui | `low` \| `moderate` \| `high` |

**Client** : étendre `UserProfile`, `PendingOnboardingBodyProfile` → renommer conceptuellement en draft profil onboarding incluant les 4 nouveaux champs optionnels.

**API** :

- Migration TypeORM.
- `UpsertProfileDto` + `RegisterDto` : champs optionnels avec validation `@IsIn`.
- `ProfileService.toProfileDto` : exposer les nouveaux champs.
- RevenueCat attributes (optionnel, même pattern que `weight_kg`) : `age_years`, `training_goal`, etc.

**Settings** : section « Profil d'entraînement » avec les 3 champs intent éditables (Select). Âge éditable (Input number). Pas de refonte settings genre/poids/taille dans ce chantier.

## Analytics

Nouveaux steps dans `OnboardingSteps` :

| Step ID | URL |
|---|---|
| `body_gender` | `body&bodyQ=0` |
| `body_weight` | `body&bodyQ=1` |
| `body_height` | `body&bodyQ=2` |
| `body_age` | `body&bodyQ=3` |
| `intent_goal` | `intent&intentQ=0` |
| `intent_experience` | `intent&intentQ=1` |
| `intent_frequency` | `intent&intentQ=2` |
| `record_pick` | `step=record` |
| `rank_reveal` | `step=rank` |

- `onboarding_step_viewed` au mount de chaque question.
- `onboarding_step_completed` sur Continuer (props : `gender`, `weight_kg`, `height_cm`, `age_years`, `training_goal`, etc.).
- `onboarding_step_skipped` sur Passer (`reason=skipped`, step courant).
- Passer depuis record : step `record_pick`, reason `skipped_to_account`.
- Funnel activation mis à jour dans `openpanel-tracking.mdc` (doc only).

Supprimer le mapping `bodyQ=1` → `BODY_WEIGHT` qui regroupait poids+taille. `bodyStepFromQuestion` → renommer / étendre en `onboardingQuestionStepFromParams(step, bodyQ, intentQ)`.

## Navigation native

`resolveOnboardingBackTarget` :

| Écran | Retour |
|---|---|
| `body&bodyQ=0` | `/onboarding?step=intro` |
| `body&bodyQ=1..3` | `bodyQ-1` |
| `intent&intentQ=0` | `/onboarding?step=body&bodyQ=3` |
| `intent&intentQ=1..2` | `intentQ-1` |
| `record` | `/onboarding?step=intent&intentQ=2` |
| `rank` | `/onboarding?step=record` |
| `account` | rank si draft record, sinon record si draft record partiel, sinon `intent&intentQ=2` |
| `intro` | stay |

Intro → Commencer : `body&bodyQ=0` (plus `record`).

Mettre à jour `App.tsx` redirects si nécessaire (`onboardingNeeded` → `/onboarding` pas `?step=record`).

## Progression barre

Calcul global sur 9 étapes post-intro :

```
bodyQ 0→3 : 11% → 44%
intentQ 0→2 : 55% → 77%
record : 88%
rank : 100%
```

Intro et account sans barre (ou barre figée à 100% sur account, au choix implémentation : account sans barre).

## Skip → post-auth

Quand l'utilisateur arrive au compte via Passer :

1. Purger le draft record si skip depuis record.
2. `setOnboardingFirstExercisePending(true)` avant navigation account.
3. Après register/login : `resolvePostAuthNavigation` sans `peekOnboardingRecordDestination` → `/exercises` + tour (existant).
4. Profil body/intent partiellement rempli : persister ce qui a été validé avant le skip.

Si déjà authentifié au moment du skip : bypass account, `markOnboardingDone('/exercises')`, `setOnboardingFirstExercisePending(true)`.

## Tests

**Smoke Playwright**

- Mettre à jour `onboarding-intro.spec.ts` : Commencer → titre genre (plus « On commence par quel record ? »).
- Mettre à jour `onboarding-body-profile.spec.ts` : parcours body complet → intent → record → rank → register avec nouveaux champs.
- Nouveau `onboarding-skip-to-account.spec.ts` : skip depuis âge → account → register → `/exercises` (URL ou tour visible).
- `onboarding-record.spec.ts` : `goto` direct `?step=record` après seed profil body en storage si nécessaire.

**Unitaires**

- `onboarding-tracking.test.ts` : mapping bodyQ/intentQ → steps.
- `app-back-navigation.test.ts` : nouvelles cibles back.
- `storage` / draft profil : sérialisation des nouveaux champs.

Mettre à jour `docs/quality-gates.md`.

## Erreurs

- Pickers : pas de throw, valeurs clampées aux bornes.
- Skip : idempotent (double tap Passer ne casse pas).
- Register sans champs intent (skip) : champs omis, pas d'erreur API.
- `prefers-reduced-motion` : pickers fonctionnels sans animation scroll smooth excessive.

## Hors scope

- Parcours salle (gym steps).
- Genre « Autre ».
- Utilisation produit des champs intent (reco, copy dynamique).
- Refonte Settings complète (inputs number pour poids/taille).
- Tracking par cran de picker (wheel_picker_changed suffit).
