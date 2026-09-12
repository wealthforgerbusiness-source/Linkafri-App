// ============================================================
// routes/auth.js — Linkafri
// Route d'authentification : vérifie l'ID token Google/Firebase,
// crée le profil utilisateur s'il n'existe pas encore, ou
// synchronise sa photo si le compte existe déjà.
// ============================================================

const express = require('express');
const { admin, db } = require('../config/firebase');

const router = express.Router();

// ------------------------------------------------------------
// POST /google — Connexion / inscription via Google
// ------------------------------------------------------------
router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  // Étape 1-2 : vérification de la présence de l'ID token
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Le jeton de connexion (idToken) est manquant dans la requête.",
    });
  }

  try {
    // Étape 3 : vérification du token auprès de Firebase Auth
    const tokenDecode = await admin.auth().verifyIdToken(idToken);

    // Étape 4 : extraction des informations utiles du token décodé
    const { uid, name, email, picture } = tokenDecode;

    const collectionUtilisateurs = db.collection('users');
    const referenceDocument = collectionUtilisateurs.doc(uid);
    const documentUtilisateur = await referenceDocument.get();

    let slug;

    if (!documentUtilisateur.exists) {
      // Étape 6 : le document n'existe pas -> création d'un nouveau profil

      // Génération d'un slug unique à partir du nom (ou de l'email en repli)
      slug = await genererSlugUnique(name || email, collectionUtilisateurs);

      await referenceDocument.set({
        uid,
        email: email || null,
        displayName: name || null,
        photoURL: picture || null,
        slug,
        theme: {
          background: '#0A0A0A',
          text: '#FFFFFF',
        },
        links: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Étape 7 : le document existe déjà -> on synchronise uniquement la photo,
      // sans toucher au reste du profil (slug, liens, thème, etc.)
      const donneesExistantes = documentUtilisateur.data();
      slug = donneesExistantes.slug;

      await referenceDocument.update({
        photoURL: picture || null,
      });
    }

    // Étape 8 : réponse de succès avec le slug du panel de l'utilisateur
    return res.status(200).json({
      success: true,
      slug,
    });

  } catch (erreur) {
    console.error('❌ Erreur lors de l\'authentification Google :', erreur);

    // Les erreurs de vérification de token Firebase contiennent un "code"
    // (ex: "auth/id-token-expired", "auth/argument-error", etc.)
    if (erreur.code && erreur.code.startsWith('auth/')) {
      return res.status(401).json({
        success: false,
        message: "Jeton de connexion invalide ou expiré. Merci de te reconnecter.",
      });
    }

    // Toute autre erreur (Firestore, inattendue) : on ne renvoie jamais
    // le détail technique brut au client, seulement un message générique
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la connexion. Merci de réessayer.",
    });
  }
});

// ------------------------------------------------------------
// Fonction utilitaire : génération d'un slug unique
// ------------------------------------------------------------
/**
 * Génère un slug lisible (minuscules, mots séparés par des tirets) à partir
 * d'une chaîne source (nom ou email), puis vérifie son unicité dans la
 * collection Firestore fournie. En cas de collision, un court suffixe
 * aléatoire est ajouté jusqu'à obtenir un slug disponible.
 *
 * @param {string} texteSource - nom ou email à partir duquel générer le slug
 * @param {FirebaseFirestore.CollectionReference} collectionUtilisateurs
 * @returns {Promise<string>}
 */
async function genererSlugUnique(texteSource, collectionUtilisateurs) {
  const slugDeBase = normaliserEnSlug(texteSource);

  let slugCandidat = slugDeBase;
  let estUnique = false;

  while (!estUnique) {
    const resultat = await collectionUtilisateurs
      .where('slug', '==', slugCandidat)
      .limit(1)
      .get();

    if (resultat.empty) {
      estUnique = true;
    } else {
      // Collision : on ajoute un court suffixe aléatoire (4 caractères)
      slugCandidat = `${slugDeBase}-${genererSuffixeAleatoire(4)}`;
    }
  }

  return slugCandidat;
}

/**
 * Transforme un texte libre en slug propre : minuscules, sans accents,
 * espaces et caractères spéciaux remplacés par des tirets simples.
 *
 * @param {string} texte
 * @returns {string}
 */
function normaliserEnSlug(texte) {
  const texteDeBase = (texte || 'utilisateur')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // suppression des accents
    .toLowerCase()
    .replace(/@.*$/, '') // si c'est un email, on ne garde que la partie avant "@"
    .replace(/[^a-z0-9]+/g, '-') // caractères non alphanumériques -> tiret
    .replace(/^-+|-+$/g, ''); // suppression des tirets en début/fin

  return texteDeBase || 'utilisateur';
}

/**
 * Génère un suffixe aléatoire court (lettres et chiffres) pour garantir
 * l'unicité d'un slug en cas de collision.
 *
 * @param {number} longueur
 * @returns {string}
 */
function genererSuffixeAleatoire(longueur) {
  const caracteres = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffixe = '';
  for (let i = 0; i < longueur; i++) {
    suffixe += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return suffixe;
}

module.exports = router;
