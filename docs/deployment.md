# Déploiement iOS / Android (Production)

## 1. Backend
1. Héberger API sur Render, Railway, Fly.io ou AWS.
2. Utiliser MongoDB Atlas.
3. Configurer variables:
   - `PORT`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL`
   - `STRIPE_SECRET_KEY`
4. Activer HTTPS et CORS strict.

## 2. Mobile build
1. Installer EAS CLI: `npm i -g eas-cli`
2. Login Expo: `eas login`
3. Configurer `eas.json` (profiles preview/prod)
4. Lancer builds:
   - iOS: `eas build -p ios --profile production`
   - Android: `eas build -p android --profile production`

## 3. Store release
1. Apple App Store Connect
   - Créer app + bundle id `com.fitpulse.mobile`
   - Upload build via EAS
   - Configurer privacy labels + subscriptions
2. Google Play Console
   - Créer app + package `com.fitpulse.mobile`
   - Upload AAB
   - Configurer in-app subscriptions

## 4. Paiements
- iOS/Android: privilégier abonnements natifs StoreKit / Google Play Billing.
- Stripe mobile utile pour web checkout, pas recommandé comme unique méthode in-app pour stores.

## 5. Sécurité
- Rotation `JWT_SECRET`
- Validation stricte requêtes
- Rate limiting + WAF
- Chiffrement données sensibles

## 6. Checklist qualité avant soumission
- Tests QA multi-devices
- Crash-free rate > 99.5%
- Temps de chargement écran principal < 2s
- Captures store, politique de confidentialité, support URL
