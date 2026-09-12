// ============================================================
// public/js/app.js — Linkafri
// Script de la landing page : déclenche la connexion Google
// et échange l'ID token avec le backend pour ouvrir le panel.
// À charger avec <script type="module" src="/js/app.js"></script>
// ============================================================

import { signInWithGoogle } from './firebase-client.js';

// Récupération du bouton de connexion présent sur la landing page
const boutonConnexionGoogle = document.getElementById('btn-google-login');

if (boutonConnexionGoogle) {
  boutonConnexionGoogle.addEventListener('click', gererClicConnexionGoogle);
} else {
  console.warn('⚠️ Élément #btn-google-login introuvable sur cette page.');
}

/**
 * Gère le clic sur le bouton "Créer mon lien gratuitement" :
 * 1. Ouvre la popup de connexion Google via Firebase Auth
 * 2. Récupère l'ID token de l'utilisateur connecté
 * 3. L'envoie au backend pour créer/retrouver son compte et sa session
 * 4. Redirige vers son panel une fois la réponse du serveur reçue
 */
async function gererClicConnexionGoogle() {
  console.log('➡️ Clic sur "Créer mon lien gratuitement" détecté.');

  try {
    // Étape 1 : connexion Google via Firebase Auth (popup)
    console.log('🔐 Ouverture de la popup de connexion Google...');
    const { utilisateur, idToken } = await signInWithGoogle();
    console.log('✅ Connexion Google réussie pour :', utilisateur.email);

    // Étape 2 : envoi de l'ID token au backend pour vérification et création de session
    console.log('📤 Envoi de l\'ID token au backend (/api/auth/google)...');
    const reponse = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    // Étape 3 : traitement de la réponse du serveur
    if (!reponse.ok) {
      // Le serveur a répondu avec une erreur (ex: token invalide, refus, erreur 500)
      const messageErreur = await lireMessageErreur(reponse);
      console.error('❌ Le serveur a refusé la connexion :', messageErreur);
      afficherErreur(messageErreur);
      return;
    }

    const donnees = await reponse.json();
    console.log('✅ Réponse du serveur reçue :', donnees);

    // Étape 4 : redirection vers le panel de l'utilisateur.
    // On utilise l'URL renvoyée par le serveur si elle existe, sinon "/panel" par défaut.
    const urlDeRedirection = donnees.redirectUrl || donnees.panelUrl || '/panel';
    console.log('➡️ Redirection vers :', urlDeRedirection);
    window.location.href = urlDeRedirection;

  } catch (erreur) {
    // Regroupe les erreurs possibles : popup fermée par l'utilisateur,
    // problème réseau, ou toute autre erreur inattendue
    console.error('❌ Erreur lors du processus de connexion :', erreur);
    afficherErreur(
      'La connexion a échoué. Vérifie ta connexion internet et réessaie.'
    );
  }
}

/**
 * Extrait un message d'erreur lisible depuis une réponse HTTP en échec.
 * @param {Response} reponse
 * @returns {Promise<string>}
 */
async function lireMessageErreur(reponse) {
  try {
    const donnees = await reponse.json();
    return donnees.message || `Erreur du serveur (code ${reponse.status}).`;
  } catch {
    return `Erreur du serveur (code ${reponse.status}).`;
  }
}

/**
 * Affiche un message d'erreur simple à l'utilisateur.
 * Utilise alert() pour l'instant, à remplacer plus tard par un composant visuel.
 * @param {string} message
 */
function afficherErreur(message) {
  alert(message);
}
