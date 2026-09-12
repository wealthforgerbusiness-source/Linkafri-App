// ============================================================
// public/js/firebase-client.js — Linkafri
// Initialisation de Firebase côté client (navigateur) et
// gestion de la connexion Google via Firebase Authentication.
// À charger avec <script type="module" src="/js/firebase-client.js"></script>
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

// ------------------------------------------------------------
// Configuration Firebase côté client
// ------------------------------------------------------------
// ⚠️ Ces valeurs viennent de la "config web" du projet Firebase
// (Console Firebase > Paramètres du projet > Vos applications > Config).
// Ce ne sont PAS les mêmes valeurs que les variables d'environnement
// serveur (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
// utilisées côté backend dans /config/firebase.js — celles-ci sont publiques
// et sans danger à exposer dans le code client.
const firebaseConfig = {
  apiKey: 'REMPLACER_PAR_API_KEY',
  authDomain: 'REMPLACER_PAR_AUTH_DOMAIN', // ex: linkafri.firebaseapp.com
  projectId: 'REMPLACER_PAR_PROJECT_ID',
  storageBucket: 'REMPLACER_PAR_STORAGE_BUCKET', // ex: linkafri.appspot.com
  messagingSenderId: 'REMPLACER_PAR_MESSAGING_SENDER_ID',
  appId: 'REMPLACER_PAR_APP_ID',
};

// Initialisation de l'application Firebase côté client
const app = initializeApp(firebaseConfig);

// Instance d'authentification, exportée pour permettre à d'autres fichiers
// d'écouter les changements d'état de connexion via onAuthStateChanged(auth, ...)
export const auth = getAuth(app);

// Fournisseur d'authentification Google
const googleProvider = new GoogleAuthProvider();

// ------------------------------------------------------------
// Connexion avec Google
// ------------------------------------------------------------
/**
 * Déclenche la connexion Google via une popup, puis récupère les
 * informations de l'utilisateur ainsi que son ID token Firebase.
 *
 * Note : l'envoi de cet ID token au backend (pour créer une session
 * serveur ou vérifier l'utilisateur via Firebase Admin) sera géré
 * dans un fichier séparé — ici on se contente de le récupérer.
 *
 * @returns {Promise<{ utilisateur: object, idToken: string }>}
 */
export async function signInWithGoogle() {
  try {
    const resultat = await signInWithPopup(auth, googleProvider);
    const utilisateurFirebase = resultat.user;

    // Informations utiles de l'utilisateur connecté
    const utilisateur = {
      uid: utilisateurFirebase.uid,
      nom: utilisateurFirebase.displayName,
      email: utilisateurFirebase.email,
      photoURL: utilisateurFirebase.photoURL,
    };

    // Récupération du ID token Firebase (utile plus tard pour authentifier
    // les appels à l'API backend, mais pas encore envoyé ici)
    const idToken = await utilisateurFirebase.getIdToken();

    console.log('✅ Connexion Google réussie :', utilisateur);
    console.log('🔑 ID token récupéré :', idToken);

    return { utilisateur, idToken };
  } catch (erreur) {
    console.error('❌ Erreur lors de la connexion Google :', erreur);
    throw erreur;
  }
}

// ------------------------------------------------------------
// Déconnexion
// ------------------------------------------------------------
/**
 * Déconnecte l'utilisateur actuellement connecté à Firebase Auth.
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    console.log('✅ Utilisateur déconnecté.');
  } catch (erreur) {
    console.error('❌ Erreur lors de la déconnexion :', erreur);
    throw erreur;
  }
}
