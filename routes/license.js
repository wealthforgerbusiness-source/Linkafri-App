// ============================================================
// routes/license.js — Linkafri
// Intégration avec l'API Chariow pour valider une clé de licence
// et activer/synchroniser l'abonnement de l'utilisateur.
// ============================================================

const express = require('express');
const { admin, db } = require('../config/firebase');

const router = express.Router();

// ------------------------------------------------------------
// Configuration de l'API Chariow
// ------------------------------------------------------------
const CHARIOW_BASE_URL = 'https://api.chariow.com/v1';

// ID du produit de licence sur Chariow.
// ⚠️ Valeur à remplacer une fois le produit "licence Linkafri" créé sur
// Chariow. Elle doit être utilisée pour vérifier que la licence fournie
// correspond bien à CE produit (et pas à un autre produit vendu sur le
// même compte Chariow), via un champ du type "product_id" ou "product.id"
// dans la réponse de l'API — à confirmer précisément selon la documentation
// Chariow au moment de l'intégration finale.
const CHARIOW_PRODUCT_ID = 'REMPLACER_ICI_ID_DU_PRODUIT';

// Durée de validité accordée après une activation réussie (30 jours)
const DUREE_ABONNEMENT_JOURS = 30;

// ------------------------------------------------------------
// Middleware d'authentification (basé sur le token Firebase)
// ------------------------------------------------------------
/**
 * Vérifie la présence et la validité d'un ID token Firebase dans
 * l'en-tête "Authorization: Bearer <idToken>". Si valide, attache
 * l'identifiant de l'utilisateur à req.uid.
 *
 * Note : ce middleware duplique celui de routes/panel.js. Il pourra être
 * extrait dans un fichier partagé (ex: middlewares/verifyAuth.js) plus tard.
 */
async function verifyAuth(req, res, next) {
  const enTeteAutorisation = req.headers.authorization;

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

router.use(verifyAuth);

// ------------------------------------------------------------
// POST /activate — Valider une clé de licence et activer l'abonnement
// ------------------------------------------------------------
router.post('/activate', async (req, res) => {
  try {
    const { licenseKey } = req.body;

    // Étape 1 : vérification de la présence de la clé de licence
    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: "La clé de licence est manquante.",
      });
    }

    // Étape 2 : appel à l'API Chariow pour valider la licence
    let reponseChariow;
    try {
      reponseChariow = await fetch(
        `${CHARIOW_BASE_URL}/licenses/${encodeURIComponent(licenseKey)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.CHARIOW_API_KEY}`,
          },
        }
      );
    } catch (erreurReseau) {
      // Étape 3 (cas réseau) : on ne fait jamais planter le flux, l'utilisateur
      // doit pouvoir réessayer
      console.error('❌ Erreur réseau vers Chariow :', erreurReseau);
      return res.status(200).json({
        valid: false,
        error: "Code de licence invalide",
      });
    }

    // Étape 3 (cas erreur HTTP) : la clé n'existe pas, ou une erreur serveur Chariow
    if (!reponseChariow.ok) {
      console.error('❌ Réponse Chariow non valide, statut :', reponseChariow.status);
      return res.status(200).json({
        valid: false,
        error: "Code de licence invalide",
      });
    }

    const corpsReponse = await reponseChariow.json();
    const donneesLicence = corpsReponse.data;

    if (!donneesLicence) {
      return res.status(200).json({
        valid: false,
        error: "Code de licence invalide",
      });
    }

    // Vérification optionnelle du produit associé à la licence, si l'API
    // Chariow expose ce champ (à confirmer selon la doc exacte)
    const idProduitLicence = donneesLicence.product_id || (donneesLicence.product && donneesLicence.product.id);
    if (
      CHARIOW_PRODUCT_ID !== 'REMPLACER_ICI_ID_DU_PRODUIT' &&
      idProduitLicence &&
      idProduitLicence !== CHARIOW_PRODUCT_ID
    ) {
      return res.status(200).json({
        valid: false,
        error: "Cette licence ne correspond pas au bon produit",
      });
    }

    // Étape 4 : licence inactive
    if (donneesLicence.is_active === false) {
      return res.status(200).json({
        valid: false,
        error: "Cette licence n'est pas active",
      });
    }

    // Étape 5 : licence expirée
    if (donneesLicence.is_expired === true) {
      return res.status(200).json({
        valid: false,
        error: "Cette licence a expiré",
      });
    }

    // Étape 6 : licence valide -> activation de l'abonnement pour 30 jours
    const maintenant = new Date();
    const nouvelleDateExpiration = new Date(maintenant);
    nouvelleDateExpiration.setDate(nouvelleDateExpiration.getDate() + DUREE_ABONNEMENT_JOURS);

    const referenceDocument = db.collection('users').doc(req.uid);

    await referenceDocument.update({
      subscriptionActive: true,
      subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(nouvelleDateExpiration),
      lastLicenseKey: licenseKey,
      subscriptionRenewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Étape 7 : réponse de succès
    return res.status(200).json({
      valid: true,
      expiresAt: nouvelleDateExpiration.toISOString(),
    });

  } catch (erreur) {
    // Étape 8 : toute autre erreur inattendue (Firestore, etc.)
    console.error('❌ Erreur lors de l\'activation de la licence :', erreur);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'activation de la licence. Merci de réessayer.",
    });
  }
});

// ------------------------------------------------------------
// GET /status — Lire le statut d'abonnement stocké dans Firestore
// ------------------------------------------------------------
router.get('/status', async (req, res) => {
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
    const dateExpirationStockee = donnees.subscriptionExpiresAt
      ? donnees.subscriptionExpiresAt.toDate()
      : null;

    // Vérification de fraîcheur : même si "subscriptionActive" est true en
    // base, on considère l'abonnement inactif si la date d'expiration est dépassée
    const maintenant = new Date();
    const estEncoreValide =
      Boolean(donnees.subscriptionActive) &&
      dateExpirationStockee !== null &&
      dateExpirationStockee > maintenant;

    return res.status(200).json({
      subscriptionActive: estEncoreValide,
      subscriptionExpiresAt: dateExpirationStockee ? dateExpirationStockee.toISOString() : null,
    });

  } catch (erreur) {
    console.error('❌ Erreur lors de la lecture du statut de licence :', erreur);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la vérification de ton abonnement. Merci de réessayer.",
    });
  }
});

module.exports = router;
