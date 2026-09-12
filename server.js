// ============================================================
// server.js — Point d'entrée de l'application Linkafri
// SaaS de link-in-bio — Backend Express servant une PWA
// ============================================================

// Chargement des variables d'environnement (doit être fait en tout premier)
require('dotenv').config();

// Dépendances principales
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialisation de Firebase Admin (Firestore + Authentication Google)
// La configuration réelle (credentials, initializeApp, etc.) vit dans /config/firebase.js
// Note : config/firebase.js exporte un objet { initFirebase, admin, db },
// on récupère donc bien la fonction via une déstructuration.
const { initFirebase } = require('./config/firebase');
initFirebase();

// Création de l'application Express
const app = express();

// ------------------------------------------------------------
// Middlewares globaux
// ------------------------------------------------------------

// Autorise les requêtes cross-origin (utile pour la PWA et les futurs clients API)
app.use(cors());

// Permet de parser le JSON envoyé dans le corps des requêtes
app.use(express.json());

// Sert les fichiers statiques de la PWA (HTML, CSS, JS, manifest, service worker, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// Routes API
// ------------------------------------------------------------

// Point de montage centralisé pour toutes les futures routes API.
// Chaque module de route (ex: routes/users.js, routes/links.js) sera ajouté ici
// une fois créé, par exemple :
//   const usersRouter = require('./routes/users');
//   app.use('/api/users', usersRouter);
const apiRouter = express.Router();
app.use('/api', apiRouter);

// ------------------------------------------------------------
// Route publique des panels (/:slug)
// ------------------------------------------------------------

// Extensions de fichiers connues : si le slug demandé correspond à l'une
// d'elles (ex: favicon.ico, robots.txt), on laisse Express gérer ça
// normalement (fichier statique existant, ou 404 standard sinon).
const EXTENSIONS_FICHIERS_CONNUES = [
  '.ico', '.txt', '.png', '.jpg', '.jpeg', '.svg', '.json', '.js', '.css',
];

// Cette route affiche le panel public d'un utilisateur à partir de son
// slug (ex: "linkafri-app.onrender.com/jean"). Elle doit être déclarée
// après express.static et après le montage des routes /api/* pour ne
// jamais interférer avec elles.
app.get('/:slug', (req, res, next) => {
  const { slug } = req.params;
  const extensionDemandee = path.extname(slug).toLowerCase();

  // Étape 5 : si le slug ressemble à un fichier statique connu
  // (favicon.ico, robots.txt, etc.), on laisse passer à Express
  if (extensionDemandee && EXTENSIONS_FICHIERS_CONNUES.includes(extensionDemandee)) {
    return next();
  }

  // Étape 1 : si un fichier statique réel existe déjà dans /public avec ce
  // nom (ex: /panel.html, /style.css servis via une URL directe), on ne
  // doit pas interférer : on laisse Express le servir normalement
  const cheminFichierStatique = path.join(__dirname, 'public', slug);
  if (fs.existsSync(cheminFichierStatique) && fs.statSync(cheminFichierStatique).isFile()) {
    return next();
  }

  // Étape 2 : lecture du template HTML de la page publique
  const cheminTemplateHtml = path.join(__dirname, 'public', 'u.html');

  fs.readFile(cheminTemplateHtml, 'utf8', (erreurLecture, htmlOriginal) => {
    if (erreurLecture) {
      console.error('❌ Erreur lors de la lecture de u.html :', erreurLecture);
      return next(erreurLecture);
    }

    // Étape 3 : injection du slug dans une variable globale JS, juste avant
    // le chargement du script qui affichera les données du panel
    const baliseAInjecter = `<script>window.__PANEL_SLUG__ = ${JSON.stringify(slug)};</script>\n  `;
    const htmlModifie = htmlOriginal.replace(
      '<script type="module" src="/js/public-panel.js">',
      `${baliseAInjecter}<script type="module" src="/js/public-panel.js">`
    );

    // Étape 4 : envoi du HTML modifié au visiteur
    res.send(htmlModifie);
  });
});

// ------------------------------------------------------------
// Démarrage du serveur
// ------------------------------------------------------------

// Render (et l'environnement local) définissent le port via process.env.PORT
// 3000 est utilisé par défaut en développement local
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Serveur Linkafri démarré et en écoute sur le port ${PORT}`);
});
