// ============================================================
// public/js/public-panel.js — Linkafri
// Script de la page publique u.html : récupère les données
// publiques d'un panel (photo, nom, liens, thème) et les affiche.
// Script classique (pas de module), à charger avec :
// <script src="/js/public-panel.js"></script>
// ============================================================

// ------------------------------------------------------------
// Association réseau -> nom de fichier logo (dans /assets/logos/)
// ------------------------------------------------------------
const RESEAUX_CONNUS = [
  { motif: 'youtube.com', logo: 'youtube' },
  { motif: 'x.com', logo: 'x' },
  { motif: 'twitter.com', logo: 'x' },
  { motif: 'facebook.com', logo: 'facebook' },
  { motif: 'instagram.com', logo: 'instagram' },
  { motif: 'tiktok.com', logo: 'tiktok' },
  { motif: 'whatsapp.com', logo: 'whatsapp' },
];

// Icône générique utilisée quand l'URL ne correspond à aucun réseau connu
const LOGO_GENERIQUE = 'link-icon';

// Éléments du DOM utilisés sur toute la page
const conteneurPanel = document.getElementById('panel-container');
const messageIntrouvable = document.getElementById('panel-not-found');
const photoPublique = document.getElementById('public-photo');
const titrePublic = document.getElementById('public-title');
const listeLiensPublique = document.getElementById('public-links-list');

// Lancement du chargement du panel au démarrage du script
chargerPanelPublic();

/**
 * Point d'entrée principal : récupère le slug injecté par le serveur,
 * appelle l'API publique, puis affiche le panel ou le message d'erreur.
 */
async function chargerPanelPublic() {
  // Étape 1 : récupération du slug.
  // Le serveur injecte ce slug dans u.html AVANT le chargement de ce
  // script, via une variable globale, par exemple :
  //   <script>window.__PANEL_SLUG__ = "jean";</script>
  // On dépend donc entièrement de cette variable pour savoir quel panel
  // charger — sans elle, impossible de savoir de qui il s'agit.
  const slug = window.__PANEL_SLUG__;

  // Étape 2 : slug absent ou vide -> on affiche directement l'erreur
  if (!slug) {
    console.warn('⚠️ Aucun slug trouvé dans window.__PANEL_SLUG__.');
    afficherPanelIntrouvable();
    return;
  }

  try {
    // Étape 3 : appel de l'API publique
    console.log(`📡 Chargement du panel public pour le slug "${slug}"...`);
    const reponse = await fetch(`/api/public/${encodeURIComponent(slug)}`);

    // Étape 4 : réponse en erreur (404 ou autre) -> panel introuvable
    if (!reponse.ok) {
      console.warn('⚠️ Panel introuvable ou erreur serveur, statut :', reponse.status);
      afficherPanelIntrouvable();
      return;
    }

    const donnees = await reponse.json();
    console.log('✅ Données du panel reçues :', donnees);

    // Étape 5 : affichage du panel avec les données reçues
    afficherPanel(donnees);

  } catch (erreur) {
    // Erreur réseau ou inattendue -> on considère le panel indisponible
    console.error('❌ Erreur lors du chargement du panel public :', erreur);
    afficherPanelIntrouvable();
  }
}

/**
 * Affiche le message "panel introuvable" et masque le conteneur du panel.
 */
function afficherPanelIntrouvable() {
  if (conteneurPanel) {
    conteneurPanel.hidden = true;
  }
  if (messageIntrouvable) {
    messageIntrouvable.hidden = false;
  }
}

/**
 * Remplit le panel avec les données publiques reçues de l'API :
 * photo, nom, liste des liens et couleurs de thème.
 *
 * @param {object} donnees - { displayName, photoURL, links, theme }
 */
function afficherPanel(donnees) {
  // Photo de profil
  if (photoPublique) {
    photoPublique.src = donnees.photoURL || '';
    photoPublique.alt = donnees.displayName
      ? `Photo de profil de ${donnees.displayName}`
      : 'Photo de profil';
  }

  // Nom / titre
  if (titrePublic) {
    titrePublic.textContent = donnees.displayName || '';
  }

  // Application des couleurs de thème directement sur le conteneur
  if (conteneurPanel && donnees.theme) {
    if (donnees.theme.background) {
      conteneurPanel.style.backgroundColor = donnees.theme.background;
    }
    if (donnees.theme.text) {
      conteneurPanel.style.color = donnees.theme.text;
    }
  }

  // Génération de la liste des liens
  genererListeLiens(donnees.links || []);
}

/**
 * Génère dynamiquement un lien-bouton par élément du tableau de liens.
 * Chaque lien s'ouvre dans un nouvel onglet, avec l'icône du réseau
 * détecté (ou une icône générique de lien sinon).
 *
 * @param {Array<{ label: string, url: string }>} liens
 */
function genererListeLiens(liens) {
  if (!listeLiensPublique) return;

  // On repart d'une liste vide à chaque appel
  listeLiensPublique.innerHTML = '';

  liens.forEach((lien) => {
    const elementListe = document.createElement('li');

    const lienBouton = document.createElement('a');
    lienBouton.href = lien.url;
    lienBouton.target = '_blank';
    lienBouton.rel = 'noopener noreferrer';
    lienBouton.className = 'lien-bouton';

    const icone = document.createElement('img');
    const nomLogo = detecterLogoReseau(lien.url);
    icone.src = `/assets/logos/${nomLogo}.svg`;
    icone.alt = ''; // décoratif : le texte du lien porte déjà l'information
    icone.className = 'lien-bouton__icone';

    const texte = document.createElement('span');
    texte.className = 'lien-bouton__texte';
    texte.textContent = lien.label;

    lienBouton.appendChild(icone);
    lienBouton.appendChild(texte);
    elementListe.appendChild(lienBouton);
    listeLiensPublique.appendChild(elementListe);
  });
}

/**
 * Détermine le nom du fichier logo à utiliser en fonction de l'URL du lien.
 * Retourne le logo générique de lien si aucun réseau connu n'est détecté.
 *
 * @param {string} url
 * @returns {string} nom du fichier logo (sans extension)
 */
function detecterLogoReseau(url) {
  if (!url) return LOGO_GENERIQUE;

  const urlEnMinuscules = url.toLowerCase();
  const reseauTrouve = RESEAUX_CONNUS.find((reseau) =>
    urlEnMinuscules.includes(reseau.motif)
  );

  return reseauTrouve ? reseauTrouve.logo : LOGO_GENERIQUE;
}
