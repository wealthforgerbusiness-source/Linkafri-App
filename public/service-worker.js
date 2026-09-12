// ============================================================
// service-worker.js — Linkafri
// Gestion du cache pour le fonctionnement hors-ligne de la PWA
// ============================================================

// Nom du cache, versionné : incrémenter ce numéro à chaque mise à jour
// des fichiers statiques pour forcer le renouvellement du cache
const CACHE_NAME = 'linkafri-cache-v1';

// Fichiers statiques essentiels mis en cache dès l'installation
const FICHIERS_A_METTRE_EN_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
];

// ------------------------------------------------------------
// Installation du service worker
// ------------------------------------------------------------
// On ouvre le cache versionné et on y ajoute les fichiers essentiels
// nécessaires au chargement minimal de l'application.
self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FICHIERS_A_METTRE_EN_CACHE);
    })
  );

  // Force le nouveau service worker à s'activer immédiatement,
  // sans attendre la fermeture des anciens onglets
  self.skipWaiting();
});

// ------------------------------------------------------------
// Activation du service worker
// ------------------------------------------------------------
// On nettoie les anciens caches (versions précédentes) dont le nom
// ne correspond plus au CACHE_NAME actuel.
self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys().then((nomsDeCache) => {
      return Promise.all(
        nomsDeCache
          .filter((nom) => nom !== CACHE_NAME)
          .map((ancienNom) => caches.delete(ancienNom))
      );
    })
  );

  // Permet au service worker de prendre le contrôle des pages
  // ouvertes immédiatement après son activation
  self.clients.claim();
});

// ------------------------------------------------------------
// Interception des requêtes réseau (fetch)
// ------------------------------------------------------------
// Stratégie appliquée :
//   - Requêtes vers /api/ : toujours envoyées au réseau, jamais mises
//     en cache, car ce sont des données dynamiques (Firestore, etc.)
//   - Autres requêtes (fichiers statiques) : stratégie "cache d'abord,
//     sinon réseau" (cache-first)
self.addEventListener('fetch', (evenement) => {
  const url = new URL(evenement.request.url);

  // Les appels à l'API ne passent jamais par le cache
  if (url.pathname.startsWith('/api/')) {
    evenement.respondWith(fetch(evenement.request));
    return;
  }

  // Stratégie cache-first pour tout le reste (fichiers statiques)
  evenement.respondWith(
    caches.match(evenement.request).then((reponseEnCache) => {
      // Si la ressource est déjà en cache, on la sert directement
      if (reponseEnCache) {
        return reponseEnCache;
      }

      // Sinon, on va la chercher sur le réseau, puis on la met en cache
      // pour les prochaines requêtes
      return fetch(evenement.request).then((reponseReseau) => {
        // On ne met en cache que les réponses valides (évite de stocker
        // des erreurs ou des réponses opaques inutiles)
        if (!reponseReseau || reponseReseau.status !== 200) {
          return reponseReseau;
        }

        const reponseAMettreEnCache = reponseReseau.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(evenement.request, reponseAMettreEnCache);
        });

        return reponseReseau;
      });
    })
  );
});
