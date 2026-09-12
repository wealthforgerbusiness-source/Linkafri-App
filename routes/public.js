// ============================================================
// routes/public.js — Linkafri
// Route publique (sans authentification) permettant de récupérer
// les données d'un panel link-in-bio à partir de son slug.
// ============================================================

const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

// ------------------------------------------------------------
// GET /:slug — Récupérer les données publiques d'un panel
// ------------------------------------------------------------
router.get('/:slug', async (req, res) => {
  try {
    // Étape 1 : récupération du slug demandé dans l'URL
    const { slug } = req.params;

    // Étape 2 : recherche du document utilisateur correspondant à ce slug
    const resultatRecherche = await db
      .collection('users')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    // Étape 3 : aucun panel trouvé pour ce slug
    if (resultatRecherche.empty) {
      return res.status(404).json({
        error: "Panel introuvable",
      });
    }

    // Étape 4 : on ne renvoie que les champs publics, jamais de données
    // privées comme l'email ou l'uid de l'utilisateur
    const donnees = resultatRecherche.docs[0].data();

    return res.status(200).json({
      displayName: donnees.displayName,
      photoURL: donnees.photoURL,
      links: donnees.links,
      theme: donnees.theme,
    });

  } catch (erreur) {
    // Étape 5 : gestion des erreurs sans exposer de détails techniques
    console.error('❌ Erreur lors de la récupération du panel public :', erreur);
    return res.status(500).json({
      error: "Une erreur est survenue lors du chargement de ce panel. Merci de réessayer.",
    });
  }
});

module.exports = router;
