# Nestorya

Prototype mobile-first de gestion domestique : achats, factures, garanties, notices et entretien.

## Scan intelligent

Le bouton d’analyse envoie une photo ou un PDF à `/api/analyze`. La fonction Vercel utilise l’API OpenAI pour :

- lire le vendeur, la marque, le produit, le modèle, le prix et la date d’achat ;
- rechercher une garantie constructeur fiable ;
- calculer une date de fin de garantie si la durée est suffisamment certaine ;
- rechercher une notice ou page support officielle ;
- proposer les entretiens recommandés par le fabricant.

La fiche est toujours affichée pour validation avant enregistrement.

## Activation sur Vercel

Ajouter la variable d’environnement suivante dans le projet Vercel :

`OPENAI_API_KEY`

La clé doit rester côté Vercel et ne jamais être inscrite dans `index.html` ou dans le dépôt GitHub.

Sans cette variable, l’interface fonctionne mais le scan IA indique qu’il n’est pas configuré.
