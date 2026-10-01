# NP7 V4 — sans dépendance OpenAI

Cette version supprime la dépendance obligatoire à l'API OpenAI. Aucun `OPENAI_API_KEY` n'est nécessaire.

Fonctions : accueil, calories/macros restantes, repas, sport avec estimation MET, poids, historique, IA locale, aliments personnalisés, stockage local.

Render : Build `npm install` / Start `npm start`.

L'« IA locale » n'est pas ChatGPT : elle interprète des phrases simples avec une base d'aliments embarquée. Les valeurs nutritionnelles sont des moyennes et des estimations.


## V6 — base nutritionnelle renforcée
Ciqual 2025 couvre 3 484 aliments et 74 constituants. NP7 ajoute une base locale enrichie et une recherche de produits Open Food Facts. Les données collaboratives peuvent être incomplètes; vérifier les valeurs officielles pour les produits précis.


## V7 — Ciqual 2025 intégrée
La base officielle fournie par l'utilisateur est intégrée sous `public/data/ciqual2025.json` : 3 484 aliments, avec énergie, protéines, glucides et lipides pour 100 g. La recherche nutritionnelle utilise cette base en priorité.

## V9 — restaurants_france.json
La base restaurants est externalisée dans `public/data/restaurants_france.json`. Le moteur de l'IA locale la charge au démarrage et recherche d'abord les produits de cette base avant les autres méthodes. La base fournie est un catalogue de référence non exhaustif; les valeurs marquées « estimation » doivent être vérifiées avec la source officielle de l'enseigne lorsqu'elle est disponible.

## V10 — base restaurants élargie
Ajout d'enseignes et produits supplémentaires (Pizza Hut, Buffalo Grill, Brioche Dorée, PAUL, Starbucks, Pokawa, Big Fernand, Les Burgers de Papa, Chicken Street, Chamas Tacos, Tacos Avenue, Nabab Kebab, Pret A Manger, EXKi, Pomme de Pain, La Mie Câline, Sushi Shop, Pitaya, Columbus Café). Ajout d'un fallback d'estimation pour burger, pizza, tacos, kebab, poke, sushi, sandwich et frites lorsque la fiche exacte n'est pas trouvée.

## V11 — valeurs officielles
Mise à jour de plusieurs produits avec les valeurs nutritionnelles par portion publiées sur les sites officiels de McDonald's France et Burger King France. Les autres entrées restent identifiées comme estimations tant qu'une source officielle n'a pas été vérifiée.

## V12 — extension des données officielles
Ajout de nombreuses valeurs nutritionnelles officielles Quick France issues de la déclaration nutritionnelle valable à partir du 9 juin 2026. Les autres entrées restent estimées tant qu'une source officielle n'a pas été vérifiée.

## V13 — moteur de reconnaissance restaurants corrigé
- Normalisation robuste : accents, apostrophes, casse, ponctuation et espaces.
- Alias enseignes : McDo/Macdo/McDonald's, BK/Burger King, O'Tacos/O Tacos, Domino's, etc.
- Reconnaissance au milieu d'une phrase naturelle (« j'ai mangé un Big Mac chez McDo »).
- Gestion de quantités (« 2 Big Mac »).
- Priorité à la fiche restaurant explicitement mentionnée.
- Fonction de test navigateur : `testNP7Restaurant("j'ai mangé un Big Mac chez McDo")`.

## V14 — correction définitive de reconnaissance
Correction du problème de portée JavaScript qui empêchait le moteur V13 de voir `RESTAURANTS_JSON`. Le Big Mac dispose en plus d'une reconnaissance directe de secours afin que « Big Mac », « j'ai mangé un Big Mac », « McDo Big Mac » et formulations similaires utilisent bien la fiche McDonald's au lieu de la valeur par défaut.

## V15 — design mobile et animations
- Splash screen NP7 à l'ouverture.
- Barre de navigation fixe en bas avec icônes.
- Animation lors du changement d'onglet.
- Effets de pression sur les boutons.
- Animation de célébration avec confettis lorsque le texte d'objectif atteint est détecté.
- Design mobile-first, cartes arrondies et effets de profondeur.
