# Quality gates

Deux filets automatiques pour limiter les régressions sans multiplier les tests unitaires.

## À chaque commit (`pre-commit`)

- TypeScript sur le chemin auth critique (`typecheck:gate`)
- Build API Nest (compile TypeScript serveur)
- ESLint auto-fix sur les fichiers **stagés** client + API (`lint-staged`)

Durée typique : 20 à 40 secondes.

Pour un typecheck complet du client (hors scope du hook) : `npm run typecheck --prefix client`.

## Avant chaque push (`pre-push`)

- Smoke Playwright sur les parcours critiques :
  - chargement de `/auth`
  - inscription complète (API mockée)
  - déconnexion (session effacée)
  - ajout d'un exercice depuis le catalogue (perf incluse)
  - enregistrement d'une performance sur la fiche exercice
  - onboarding intro (slider features → Commencer → genre)
  - onboarding body + intent + record → palier → compte
  - onboarding body (genre, profil) inclus dans `POST /auth/register`
  - onboarding skip (âge → compte → catalogue exercices)
  - onboarding salle temporairement désactivé (pas de gym-wait, home accessible)
  - cloche notifications sur l'accueil (drawer vide)
  - landing store web (CTA unique vers le OneLink AppsFlyer)

Durée typique : 30 à 60 secondes (build Vite + preview inclus).

## Commandes manuelles

```bash
task check          # filet rapide
task check:smoke    # smoke Playwright
task check:all      # les deux
```

Depuis la racine :

```bash
npm run check:fast
npm run check:smoke
```

## Bypass d'urgence

```bash
git commit --no-verify
git push --no-verify
```

À réserver aux cas exceptionnels.

## Ajouter un parcours smoke

1. Copier un fichier dans [`client/e2e/smoke/`](../client/e2e/smoke/).
2. Réutiliser [`helpers.ts`](../client/e2e/smoke/helpers.ts) et [`workflow-api.ts`](../client/e2e/smoke/workflow-api.ts).
3. Vérifier les sélecteurs sur le texte UI français (`UI.*` dans `translations.ts`).
4. Lancer `task check:smoke` avant de pousser.

Pour générer un test à partir d'une description : skill [`.cursor/skills/e2e-test/SKILL.md`](../.cursor/skills/e2e-test/SKILL.md).

## Ce que ça attrape

| Problème | Couche |
|----------|--------|
| Import manquant (`peekPendingInviteCode`) | pre-commit (TypeScript) |
| Erreur JS au runtime sur l'inscription | pre-push (Playwright) |
| Session non effacée au logout | pre-push (Playwright) |
| Ajout exercice / perf ne navigue pas | pre-push (Playwright) |
| `setBrokenImageIds` ou erreur JS catalogue | pre-push (Playwright) |

## Timer de repos (tests manuels mobile)

Non couvert par Playwright. À valider sur **appareil physique** après changement du plugin [`rest-timer`](../client/plugins/rest-timer/) :

| Scénario | Android | iOS (16.2+) |
|----------|---------|-------------|
| Perf enregistrée | Notif ongoing avec chrono + progression | Live Activity visible |
| Écran verrouillé jusqu'à la fin | Fin à ±1 s, son natif | Live Activity « terminé » |
| App au premier plan | Toast + son Web Audio, pas de notif système | Live Activity masquée |
| Changement cible (+/- 15 s) | Notif resynchronisée | Live Activity mise à jour |
| Nouvelle perf | Ancien timer annulé | Idem |
| Tap notif / Live Activity | Ouvre `/exercise/{id}` | Idem |

Build iOS : ouvrir `App.xcworkspace`, cible `OneMoreRestTimer` incluse. `pod install` après `cap sync`.
