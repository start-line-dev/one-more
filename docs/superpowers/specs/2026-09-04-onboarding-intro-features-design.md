# Intro onboarding : 3 features en slider

Date : 2026-09-04  
Statut : validé en brainstorming, en attente de relecture

## Problème

L’écran d’intro (`OnboardingIntro`) existe encore mais le funnel le court-circuite : `/onboarding` et `?step=intro` redirigent vers le choix de record. Le lien « J'ai déjà un compte » a été déplacé sur cette étape. On remet une première page qui présente les 3 promesses de l’app, avec des mini-UI animées, avant le funnel record.

Hors scope : le reste de l’onboarding (record, gabarit, palier, compte, salle), la landing store.

## Décisions

- Trio : Note en 3 secondes · Bats tes records · Suis ta progression.
- Layout : logo + slider (titre / sous-titre par slide) + CTAs. Plus de hero unique « Bats tes records. / Prouve-le. » sur cet écran.
- CTAs toujours visibles : **Commencer** (accent) et **J'ai déjà un compte** (lien). On peut partir dès le premier slide.
- Slider : 3 slides, boucle, auto-avance 4 s, swipe + dots, timer reset après swipe ou tap sur un dot. Pas de flèches.
- Animations : mini-UI React fidèles à l’app, pas de GIF / Lottie / nouvelle lib d’anim. Carousel maison (scroll-snap), pas Embla.
- Landing store : `OnboardingPresentationHero` inchangé (hero + CTA store).

## Funnel

`/onboarding` sans `step`, ou `?step=intro`, affiche l’intro. Plus de `replace` vers `step=record`.

| Action | Destination |
|---|---|
| Commencer | `/onboarding?step=record` |
| J'ai déjà un compte | login, drafts jetés (comportement actuel de `finishOnboarding('/home')` + discard) |
| Retour système sur l’intro | `stay` (premier écran) |
| Retour système sur le record | `/onboarding?step=intro` (aujourd’hui `stay`, à changer) |

L’intro n’entre pas dans le compteur `1/3`. Le funnel record → gabarit → palier → compte ne bouge pas.

Le lien « J'ai déjà un compte » disparaît de l’étape record. Un seul point d’entrée login avant le funnel.

`OnboardingPage` : retirer le redirect qui envoie l’URL nue et `step=intro` vers le record. Afficher l’intro pour `step=intro` et pour l’absence de `step`, sans réécrire l’URL.

## Écran

`OnboardingShell` variante `theme` (pas la vidéo cinématique de la landing).

1. Logo One More en haut (même asset / taille que l’ancienne intro).
2. Slider `flex-1` : scène mini-UI, titre, sous-titre, dots.
3. Footer collé : Commencer pleine largeur (`variant="accent"`), puis le lien compte.

Les mini-UI sont décoratives : `pointer-events: none` (et `aria-hidden`). Un tap dans la scène ne clique pas un faux Enregistrer.

`prefers-reduced-motion: reduce` : pas d’auto-avance, scènes figées à l’état final, swipe et dots inchangés.

## Slides

Copy produit (dans `UI`, pas de `--` ni de tiret cadratin) :

| # | Titre | Sous-titre | Scène |
|---|---|---|---|
| 1 | Note en 3 secondes | Poids, reps, c'est plié. | Faux drawer : nom d’exo (Développé couché), wheels kg / reps qui défilent, bouton Enregistrer qui se confirme, reset. |
| 2 | Bats tes records | Chaque PR est célébré. | Mini célébration **de palier** (pas la modale « Nouveau record »). Trophée, titre UI `Nouveau palier !`, `RankBadge` **Platine 3 → Diamant 1** (`platinum_3` → `diamond_1`), ligne `100 kg × 5`, halo ligue. Pas de bouton Partager. |
| 3 | Suis ta progression | Tes chiffres, séance après séance. | Courbe SVG allégée (pas Recharts) : 4–5 points qui montent, dernier point mis en avant. |

Chaque scène boucle ~4 s, uniquement sur le slide visible. Les slides hors écran sont figés / réinitialisés.

Données fictives, zéro API, zéro storage.

## Composants

Réactiver `OnboardingIntro` (logo + slider + footer). Extraire le hero actuel pour que la landing continue d’importer `OnboardingPresentationHero` depuis le même fichier.

Nouveaux fichiers client :

| Fichier | Rôle |
|---|---|
| `OnboardingFeatureSlider` | Scroll-snap, index, auto-avance 4 s, dots, reset timer au geste |
| `OnboardingSceneLogPerf` | Faux drawer kg/reps |
| `OnboardingSceneLeaguePromo` | Célébration palier Platine 3 → Diamant 1 (vrais `RankBadge`) |
| `OnboardingSceneProgress` | Courbe SVG |

Copy : préfixe `UI.onboardingIntro*` dans `client/src/lib/translations.ts`. CTA principal : `onboardingIntroCta` = `Commencer`. Lien compte : `switchToLogin` (existant).

`onboardingCta` (`Établir mon premier record`) n’a plus d’écran. Le supprimer s’il n’a plus d’appelant après le chantier.

## Analytics

Réutiliser `OnboardingSteps.INTRO`.

- `onboarding_step_viewed` `intro` au mount.
- Commencer → `onboarding_step_completed` `intro` (label clic déjà `onboarding_intro_continue`).
- J'ai déjà un compte → `onboarding_step_skipped` `intro` `reason=has_account` (label déjà `onboarding_intro_has_account`).

Pas d’event par slide.

`resolveOnboardingStepFromLocation` : URL nue et `?step=intro` → `intro` (aujourd’hui `record_pick`). `?step=record` reste `record_pick`.

`PageTracker` / `onboarding_step` global suivent ce mapping.

## Navigation native

`normalizeOnboardingStep` : `intro` reste `intro`, ne plus le fusionner avec `record`. Absence de `step` → `intro`.

`resolveOnboardingBackTarget` :

- `intro` → `{ kind: "stay" }`
- `record` → `{ kind: "path", to: "/onboarding?step=intro" }`
- `body` `bodyQ=0` → toujours `/onboarding?step=record`

Mettre à jour `app-back-navigation.test.ts`.

## Tests

Smoke Playwright :

- Nouveau `client/e2e/smoke/onboarding-intro.spec.ts` : `goto("/#/onboarding")` → logo, titre du slide 1, Commencer, J'ai déjà un compte → clic Commencer → « On commence par quel record ? ». `trackPageErrors` vide. Pas d’assert sur les animations ni sur l’auto-avance.
- `onboarding-record.spec.ts` : `goto("/#/onboarding?step=record")` pour rester centré sur le funnel record. Le nouveau spec intro couvre Commencer.
- `onboarding-body-profile.spec.ts` : déjà `?step=record`, inchangé.

Unitaires :

- `onboarding-tracking.test.ts` : URL nue et `intro` → `INTRO`.
- `app-back-navigation.test.ts` : record → intro, intro → stay.

Pas de test unitaire du slider. Mettre à jour `docs/quality-gates.md` (parcours intro).

## Erreurs

Pas d’appel réseau. Ne pas réintroduire `errorMessage` (prop actuelle inutilisée). Les scènes ne doivent pas throw : composants purs, données figées. Les CTAs vivent hors du slider.

## Hors scope

- Refonte des étapes record / body / rank / gym.
- Changer le hero de la landing store.
- Lib carousel, Lottie, Framer Motion, GIFs.
- Tracking par index de slide.
- Auto-pause au toucher (timer reset au geste seulement).
