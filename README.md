# FitForce - App Fitness Mobile (MVP + Premium)

FitForce est une application de fitness moderne conçue pour iOS et Android:
- Entraînement maison et salle
- Goals tracking avancé
- Dashboard de progression
- Nutrition + hydratation (premium)
- Base monétisation abonnement

## Stack choisie
- Mobile: React Native + Expo Router
- Backend: Node.js + Express + MongoDB
- Auth: JWT (email/password), structure prête pour Google/Apple OAuth
- Paiements: Stripe (checkout session + mock premium)

## Architecture

```txt
apps/
  api/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      data/
  mobile/
    app/
      auth.tsx
      (tabs)/
        index.tsx
        programs.tsx
        workout.tsx
        goals.tsx
        nutrition.tsx
        profile.tsx
    src/
      api/
      components/
      context/
      constants/
      theme/
      types/
```

## Fonctionnalités livrées

### 1) Système utilisateur
- Inscription / connexion email
- Endpoint `GET /auth/me`
- Profil utilisateur complet (nom, âge, poids, taille, niveau, objectif)
- Placeholders d'intégration Google/Apple côté mobile

### 2) Entraînement Maison
- Programmes `mode=home`
- Exemples: full body, HIIT, abdos, haltères
- Écran session active avec minuteur + compteur de reps
- Enregistrement de séance + progression streak

### 3) Entraînement Salle
- Programmes `mode=gym`
- Exemples PPL / split logique
- Saisie manuelle séries/reps/charges (session active)
- Historique des séances (`GET /workouts`)

### 4) Goals Tracking
- Objectifs personnalisables (`PUT /goals`)
- Progress bar dynamique (`GET /goals/progress`)
- Streak inclus

### 5) Dashboard
- Totaux séances / minutes / calories
- Meilleure perf en charge
- Graphique hebdo
- Delta vs semaine précédente

### 6) Premium
- Nutrition tracker
- Hydratation tracker
- Suggestion calories auto selon objectif
- Billing Stripe endpoint + activation mock

## Lancer le projet

## Prérequis
- Node 20+
- MongoDB local ou Atlas
- Expo CLI (via `npx expo`)

## Installation
```bash
npm install
cp apps/api/.env.example apps/api/.env
```

### API
```bash
npm run dev:api
```

### Seed exercices/programmes
```bash
npm run seed
```

### Mobile
```bash
npm run dev:mobile
```

## Endpoints API principaux
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/users/profile`
- `GET /api/programs?mode=home|gym`
- `POST /api/workouts`
- `GET /api/workouts`
- `GET /api/goals/progress`
- `PUT /api/goals`
- `GET /api/dashboard`
- `GET /api/nutrition/summary`
- `POST /api/nutrition/log`
- `POST /api/nutrition/hydration`
- `POST /api/billing/checkout-session`
- `POST /api/billing/mock-activate`

## MVP vs Premium
- Gratuit: auth, programmes, entraînements, goals, dashboard de base
- Premium: nutrition, hydratation, recommandations, features avancées à étendre

## Publication App Store / Google Play
Voir `docs/deployment.md`.

## Notes prod
- Ajouter OAuth réel (Google/Apple) via Expo AuthSession / Firebase Auth
- Ajouter notifications push (Expo Notifications)
- Ajouter CI/CD, tests, observabilité et gestion abonnement store native
