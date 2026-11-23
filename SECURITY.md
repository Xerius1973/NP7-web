# Sécurité et confidentialité de NP7

Ce document décrit ce qui est protégé dans l'application, **ce que tu dois encore faire toi-même** dans Supabase, Stripe et GitHub, et comment vérifier que tout est en place.

## 1. Ce que l'application fait déjà

| Sujet | Mesure |
|---|---|
| Scripts externes | Plus aucun CDN : `supabase-js` et `zxing` sont hébergés dans `vendor/` (versions figées, licences dans `vendor/LICENSES.md`). |
| Politique de sécurité du contenu (CSP) | L'application ne peut communiquer qu'avec : elle-même, ton projet Supabase, Open Food Facts et Nominatim. Une faille d'injection ne pourrait donc pas envoyer les données de santé ailleurs. |
| Injection de code (XSS) | `esc()` échappe aussi les guillemets ; `escAttr()` neutralise les valeurs placées dans les `onclick` ; les sauvegardes importées sont validées et nettoyées. |
| Appareil partagé | À la déconnexion, les copies locales des données du compte sont effacées. Bouton « Effacer les données de cet appareil ». |
| Consentement | Case obligatoire avant création de compte / connexion (données de santé en ligne). La preuve (version + date) est enregistrée dans `np7_consents`. |
| Droits RGPD | Export des données (locales + en ligne) et suppression du compte depuis Plus › Paramètres. |
| Transparence | Page `confidentialite.html` ; mentions sur les envois vers Open Food Facts, OpenStreetMap et la dictée vocale. |
| Premium | Un nouvel achat ne retire plus de droits déjà payés (« à vie » reste « à vie », 30 jours / 1 an se prolongent). |

### Limites à connaître
- La CSP garde `'unsafe-inline'` pour les scripts, car l'application utilise des scripts et des `onclick` écrits directement dans la page. Elle limite surtout **où les données peuvent partir**, pas l'exécution de code injecté.
- GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP : pas de `frame-ancestors` (protection contre l'affichage de l'app dans une page piégée) ni de `X-Content-Type-Options`.
- La case de consentement est vérifiée dans le navigateur. La preuve enregistrée côté serveur est celle que tu peux présenter ; elle ne bloque pas techniquement un appel direct à l'API.
- Les données en local (`localStorage`) ne sont pas chiffrées : quelqu'un qui a accès à l'appareil déverrouillé peut les lire.

## 2. À faire dans Supabase (Dashboard)

1. **Exécuter `supabase/schema.sql`** dans *SQL Editor*. Il est sans danger si relancé. Il sécurise notamment la table `np7_user_data` (données de santé), qui n'était pas décrite auparavant dans le dépôt.
2. **Vérifier** avec les requêtes en bas du fichier : toutes les tables doivent afficher `rowsecurity = true`, et le rôle `anon` ne doit avoir aucun droit.
3. **Test d'accès anonyme** (à lancer depuis un terminal, avec la clé publique de `index.html`) :
   ```
   curl 'https://uloqquznjlvbgwqlkqsk.supabase.co/rest/v1/np7_user_data?select=*' \
     -H 'apikey: <CLÉ_PUBLIQUE>' -H 'Authorization: Bearer <CLÉ_PUBLIQUE>'
   ```
   Résultat attendu : `[]` ou une erreur de permission. **Jamais de lignes d'utilisateurs.** Si tu vois des données, ne mets pas l'application en ligne avant d'avoir corrigé.
4. **Authentication › Providers › Email** : activer *Confirm email* ; longueur minimale du mot de passe à 10 ou plus.
5. **Authentication › URL Configuration** : *Site URL* = `https://xerius1973.github.io/NP7-web/` ; n'autoriser que cette adresse dans *Redirect URLs*.
6. **Authentication** : désactiver les connexions anonymes et les fournisseurs inutilisés. Vérifier les limites de débit (*Rate Limits*).
7. **Edge Functions** : déployer
   - `np7-account` (export + suppression de compte), avec la vérification JWT **activée** ;
   - `create-checkout-session`, JWT **activé** ;
   - `stripe-webhook`, avec `--no-verify-jwt` (c'est Stripe qui l'appelle, la signature est vérifiée dans le code).
8. **Secrets** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (et les autres déjà utilisés) uniquement dans *Edge Functions › Secrets*, jamais dans le dépôt. La clé `service_role` ne doit jamais apparaître dans le code de l'application.
9. **Région du projet** : relever la région (Settings › General) et l'inscrire dans `confidentialite.html`. Récupérer et conserver l'accord de traitement des données (DPA) proposé par Supabase.
10. **Sauvegardes** : vérifier ce que ton offre Supabase inclut et le délai de rétention.

## 3. À faire dans Stripe

- Clé secrète uniquement dans les secrets Supabase ; envisager une clé *restreinte* limitée à *Checkout Sessions*.
- Vérifier que le point d'entrée du webhook est bien celui de `stripe-webhook` et que le secret de signature correspond.
- Prévoir la gestion des **remboursements** (non gérée par le code actuel : un remboursement n'enlève pas le droit Premium automatiquement).
- Avant d'ouvrir les achats : conditions générales de vente, information sur le droit de rétractation (contenu numérique) et mention du prix TTC.

## 4. À faire dans GitHub

- Activer la double authentification sur ton compte.
- Dans *Settings › Code security*, activer l'analyse des secrets (*Secret scanning*).
- Ne jamais publier de clé `sk_…`, `whsec_…` ni `service_role` dans le dépôt (le dernier contrôle n'en a trouvé aucune).

## 5. À compléter dans `confidentialite.html`

Les passages surlignés en jaune sont à remplacer : nom ou raison sociale de l'éditeur, adresse e-mail de contact, adresse postale (ou celle de l'hébergeur pour un particulier), directeur de la publication, région Supabase.
Ce texte est un **modèle de bonne foi**, pas un avis juridique : fais-le relire si l'application est commerciale.

## 6. Pour aller plus loin

- Tenir un **registre des traitements** (modèle simple sur cnil.fr).
- Si le nombre d'utilisateurs devient important, évaluer une **analyse d'impact (AIPD)** : les données de santé à grande échelle en relèvent souvent.
- Ajouter un **CAPTCHA** à l'inscription (nécessite aussi une modification de l'application avant de l'activer côté Supabase).
- Remplacer les `onclick` en ligne par des écouteurs d'événements, puis retirer `'unsafe-inline'` de la CSP pour qu'elle protège vraiment contre l'injection de code.
