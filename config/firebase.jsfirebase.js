// ============================================================
// config/firebase.js — Initialisation de Firebase Admin SDK
// Application Linkafri (PWA de link-in-bio)
// Utilise Firestore + Authentication Google
// ============================================================

const admin = require('firebase-admin');

// Instance Firestore, disponible après l'appel à initFirebase()
let db;

/**
 * Initialise l'application Firebase Admin à partir des variables
 * d'environnement (aucun fichier JSON de compte de service n'est utilisé,
 * ce qui est adapté à un déploiement sur Render).
 *
 * Variables d'environnement requises :
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY
 */
function initFirebase() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  // Vérification que toutes les variables nécessaires sont bien définies
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error(
      '❌ Configuration Firebase incomplète : vérifiez que FIREBASE_PROJECT_ID, ' +
      'FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY sont bien définies dans les variables ' +
      "d'environnement (fichier .env en local, ou variables d'environnement Render en production)."
    );
    throw new Error('Variables d\'environnement Firebase manquantes.');
  }

  // La clé privée contient des "\n" littéraux dans les variables d'environnement
  // (elle est stockée sur une seule ligne). Il faut les convertir en vrais retours
  // à la ligne pour que la clé PEM soit valide.
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const serviceAccount = {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey,
  };

  // Évite une double initialisation si le module est importé plusieurs fois
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialisé avec succès.');
  }

  // Initialisation de l'instance Firestore, exportée pour être utilisée
  // dans le reste de l'application (routes, contrôleurs, etc.)
  db = admin.firestore();
  module.exports.db = db;

  return { admin, db };
}

// Exports :
// - initFirebase : fonction à appeler au démarrage du serveur
// - admin        : instance admin (utile pour vérifier les tokens Google Auth)
// - db           : instance Firestore (undefined tant que initFirebase() n'a pas été appelée)
module.exports = {
  initFirebase,
  admin,
  db,
};
