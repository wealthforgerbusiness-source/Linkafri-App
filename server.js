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

// Initialisation de Firebase Admin (Firestore + Authentication Google)
// La configuration réelle (credentials, initializeApp, etc.) vit dans /config/firebase.js
const initFirebase = require('./config/firebase');
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
// Démarrage du serveur
// ------------------------------------------------------------

// Render (et l'environnement local) définissent le port via process.env.PORT
// 3000 est utilisé par défaut en développement local
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Serveur Linkafri démarré et en écoute sur le port ${PORT}`);
});
