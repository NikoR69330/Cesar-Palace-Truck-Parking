# Cesar Palace Truck Parking

Version sécurisée côté serveur : le code administrateur et la vérification de
l'accès ne sont plus jamais visibles dans le navigateur. Tout passe par de
petites fonctions serverless (`api/data.js`, `api/license.js`) hébergées sur
Vercel, avec les données stockées dans une base Redis (via Upstash, le
fournisseur que Vercel utilise maintenant pour ce type de stockage).

## Avant de déployer : deux points importants (juillet 2026)

1. **Plan Vercel Pro obligatoire.** Le plan gratuit "Hobby" est réservé aux
   projets non commerciaux — Vercel l'interdit explicitement pour un outil
   facturé à un client. Il faut donc le plan **Pro à 20 $/mois** (~19 €).
   C'est un coût réel à intégrer dans ton calcul de rentabilité.
2. **"Vercel KV" n'existe plus en tant que tel.** Vercel a retiré son offre
   KV fin 2024 et s'appuie maintenant sur **Upstash Redis**, disponible via
   leur Marketplace d'intégrations. Le code de ce projet est déjà à jour
   pour ça (`@upstash/redis`).

## Déploiement

1. **Créer le repo GitHub**
   - Crée un nouveau repo (ex: `cesar-palace-parking`), dépose tout ce
     dossier dedans (glisser-déposer comme d'habitude).

2. **Créer le projet Vercel et passer sur le plan Pro**
   - Sur vercel.com → "Add New Project" → importe le repo GitHub.
   - Si ce n'est pas déjà fait, passe ton compte/équipe sur le plan Pro
     (Settings → Billing).

3. **Ajouter une base Redis via Upstash**
   - Dans ton projet Vercel → onglet "Storage" (ou "Marketplace") →
     cherche "Upstash" → installe l'intégration Redis.
   - Crée une nouvelle base (ou utilise une base Upstash existante si tu en
     as déjà une pour un autre projet — une seule base peut servir plusieurs
     outils, les clés sont préfixées `parking:` dans le code pour éviter les
     collisions).
   - Connecte-la à ce projet : Vercel/Upstash ajoute automatiquement les
     variables d'environnement nécessaires (`UPSTASH_REDIS_REST_URL`,
     `UPSTASH_REDIS_REST_TOKEN` ou `KV_REST_API_URL` / `KV_REST_API_TOKEN`
     selon la version de l'intégration — le code lit les deux
     automatiquement via `Redis.fromEnv()`).
   - Un redéploiement peut être nécessaire pour que les nouvelles variables
     d'environnement soient prises en compte.

4. **Déployer**
   - Vercel déploie automatiquement à chaque push sur le repo.

5. **Premier lancement**
   - Ouvre l'URL du site (ex: `cesar-palace-parking.vercel.app`).
   - Le code administrateur par défaut est `1234`. **Change-le tout de
     suite** via le lien "Administration" en bas de page (ou sur l'écran de
     blocage), et fixe la date "payé jusqu'au" selon ce qui a été convenu
     avec le client.

## Ce qui a changé par rapport à la version précédente (artefact Claude)

- Le code administrateur n'existe **que côté serveur** (dans la base Redis,
  jamais envoyé au navigateur). Consulter le code source de la page ne
  révèle plus rien.
- Chaque tentative de lecture ou d'écriture de données passe par
  `api/data.js`, qui vérifie d'abord le statut de l'accès (`api/license.js`)
  avant de répondre. Si l'accès est bloqué, le serveur renvoie une erreur
  403 — impossible à contourner en modifiant le JavaScript du navigateur,
  puisque les données elles-mêmes ne sont jamais envoyées.
- Le site fonctionne à la même adresse pour tout le monde (poste de garde,
  direction, mobile) : mêmes données partout, mise à jour automatique toutes
  les 4 secondes.

## Limite honnête à connaître

Rien n'est jamais 100% inviolable. Ici, la limite réaliste serait quelqu'un
qui obtiendrait un accès direct à ton compte Vercel/GitHub ou à la base
Redis elle-même — mais ça n'a plus rien à voir avec "ouvrir les outils
développeur du navigateur". Pour l'usage visé (empêcher un client de
continuer à utiliser l'outil sans payer), c'est largement suffisant.
