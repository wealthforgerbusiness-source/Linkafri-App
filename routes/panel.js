// ============================================================
// routes/panel.js — Linkafri
// Routes protégées permettant à un utilisateur connecté de
// consulter et modifier son panel (liens, thème, slug).
// ============================================================

const express = require('express');
const { admin, db } = require('../config/firebase');

const router = express.Router();

// ------------------------------------------------------------
// Middleware d'authentification
// ------------------------------------------------------------
/**
 * Vérifie la présence et la validité d'un ID token Firebase dans
 * l'en-tête "Authorization: Bearer <idToken>". Si valide, attache
 * l'identifiant de l'utilisateur à req.uid pour les routes suivantes.
 */
async function verifyAuth(req, res, next) {
  const enTeteAutorisation = req.headers.authorization;

  // Vérifie que l'en-tête est présent et bien au format "Bearer <token>"
  if (!enTeteAutorisation || !enTeteAutorisation.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Authentification requise. Merci de te reconnecter.",
    });
  }

  const idToken = enTeteAutorisation.split('Bearer ')[1];

  try {
    const tokenDecode = await admin.auth().verifyIdToken(idToken);
    req.uid = tokenDecode.uid;
    next();
  } catch (erreur) {
    console.error('❌ Échec de la vérification du token :', erreur);
    return res.status(401).json({
      success: false,
      message: "Session invalide ou expirée. Merci de te reconnecter.",
    });
  }
}

// Ce middleware s'applique à toutes les routes définies dans ce fichier
router.use(verifyAuth);

// ------------------------------------------------------------
// GET /me — Récupérer les données du panel de l'utilisateur connecté
// ------------------------------------------------------------
router.get('/me', async (req, res) => {
  try {
    const referenceDocument = db.collection('users').doc(req.uid);
    const documentUtilisateur = await referenceDocument.get();

    if (!documentUtilisateur.exists) {
      return res.status(404).json({
        success: false,
        message: "Profil introuvable. Merci de te reconnecter.",
      });
    }

    const donnees = documentUtilisateur.data();

    return res.status(200).json({
      success: true,
      slug: donnees.slug,
      displayName: donnees.displayName,
      photoURL: donnees.photoURL,
      theme: donnees.theme,
      links: donnees.links,
    });

  } catch (erreur) {
    console.error('❌ Erreur lors de la récupération du panel :', erreur);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du chargement de ton panel. Merci de réessayer.",
    });
  }
});

// ------------------------------------------------------------
// PUT /me — Mettre à jour les données du panel de l'utilisateur connecté
// ------------------------------------------------------------
router.put('/me', async (req, res) => {
  try {
    const { links, theme, slug } = req.body;

    // ----- Validation du champ "links" -----
    if (links !== undefined) {
      const estValide =
        Array.isArray(links) &&
        links.every(
          (lien) =>
            lien &&
            typeof lien === 'object' &&
            typeof lien.label === 'string' &&
            lien.label.trim() !== '' &&
            typeof lien.url === 'string' &&
            lien.url.trim() !== ''
        );

      if (!estValide) {
        return res.status(400).json({
          success: false,
          message:
            "Le format des liens est invalide. Chaque lien doit contenir au minimum un 'label' et une 'url'.",
        });
      }
    }

    // ----- Validation du champ "theme" -----
    if (theme !== undefined) {
      const estValide =
        theme &&
        typeof theme === 'object' &&
        typeof theme.background === 'string' &&
        typeof theme.text === 'string';

      if (!estValide) {
        return res.status(400).json({
          success: false,
          message:
            "Le format du thème est invalide. Il doit contenir 'background' et 'text'.",
        });
      }
    }

    const collectionUtilisateurs = db.collection('users');
    const referenceDocument = collectionUtilisateurs.doc(req.uid);
    const documentUtilisateur = await referenceDocument.get();

    if (!documentUtilisateur.exists) {
      return res.status(404).json({
        success: false,
        message: "Profil introuvable. Merci de te reconnecter.",
      });
    }

    const donneesActuelles = documentUtilisateur.data();
    const champsAMettreAJour = {};

    // ----- Traitement du slug (optionnel) -----
    if (slug !== undefined && slug !== donneesActuelles.slug) {
      if (typeof slug !== 'string' || slug.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "Le lien personnalisé (slug) fourni est invalide.",
        });
      }

      // Vérification de l'unicité du slug parmi tous les autres utilisateurs
      const resultatRecherche = await collectionUtilisateurs
        .where('slug', '==', slug)
        .limit(1)
        .get();

      const slugDejaPris =
        !resultatRecherche.empty &&
        resultatRecherche.docs.some((doc) => doc.id !== req.uid);

      if (slugDejaPris) {
        return res.status(409).json({
          success: false,
          message: "Ce lien est déjà pris. Merci d'en choisir un autre.",
        });
      }

      champsAMettreAJour.slug = slug;
    }

    // ----- Ajout des autres champs modifiables -----
    if (links !== undefined) {
      champsAMettreAJour.links = links;
    }

    if (theme !== undefined) {
      champsAMettreAJour.theme = theme;
    }

    // Mise à jour du document : displayName, photoURL et email ne sont
    // jamais touchés ici, uniquement les champs modifiables ci-dessus.
    await referenceDocument.update(champsAMettreAJour);

    const documentMisAJour = await referenceDocument.get();
    const donneesMisesAJour = documentMisAJour.data();

    return res.status(200).json({
      success: true,
      slug: donneesMisesAJour.slug,
      displayName: donneesMisesAJour.displayName,
      photoURL: donneesMisesAJour.photoURL,
      theme: donneesMisesAJour.theme,
      links: donneesMisesAJour.links,
    });

  } catch (erreur) {
    console.error('❌ Erreur lors de la mise à jour du panel :', erreur);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la mise à jour de ton panel. Merci de réessayer.",
    });
  }
});

module.exports = router;
