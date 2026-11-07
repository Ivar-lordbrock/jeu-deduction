/** @OnlyCurrentDoc */
// Boîte aux lettres des signalements des testeurs (bouton « Signaler » du jeu).
// Script Google Apps Script, attaché à un tableur Google : chaque signalement y devient une ligne.
//   · le jeu y dépose les messages (POST type, message, nom, contexte) : pas besoin de clé ;
//   · l'éditeur les lit et change leur statut (nouveau, vu, réglé) : il faut la clé.
// La clé est tirée au hasard par le script et gardée dans ses propriétés : jamais dans le dépôt.
// Installation : tableur → Extensions → Apps Script → coller ce fichier → Exécuter montrerCle (une fois),
// recopier la ligne affichée dans .env.local → Déployer → Nouveau déploiement → Application Web,
// exécuter en tant que « Moi », accès « Tout le monde » → l'adresse en /exec va dans src/signalements.ts.
// Après une modification : Gérer les déploiements → modifier → nouvelle version.

const COLONNES = ['Date', 'Type', 'Message', 'Nom', 'Contexte', 'Statut'];
const STATUTS = ['nouveau', 'vu', 'réglé'];

/** La clé de lecture, créée au premier appel. */
function cle() {
  const proprietes = PropertiesService.getScriptProperties();
  let c = proprietes.getProperty('CLE');
  if (!c) {
    c = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    proprietes.setProperty('CLE', c);
  }
  return c;
}

/** À lancer une fois dans l'éditeur Apps Script : affiche la ligne à mettre dans .env.local. */
function montrerCle() {
  Logger.log('SIGNALEMENTS_CLE=' + cle());
}

function feuille() {
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (f.getLastRow() === 0) {
    f.appendRow(COLONNES);
    f.setFrozenRows(1);
  }
  return f;
}

/** Texte coupé à n caractères ; un « = » en tête ne doit pas devenir une formule. */
function texte(v, n) {
  const s = String(v == null ? '' : v).slice(0, n);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.cle) return action(p);
  if (!String(p.message || '').trim()) return json({ ok: false, erreur: 'message vide' });
  const verrou = LockService.getScriptLock();
  verrou.waitLock(10000);
  try {
    feuille().appendRow([new Date(), texte(p.type, 20), texte(p.message, 4000), texte(p.nom, 60), texte(p.contexte, 4000), 'nouveau']);
  } finally {
    verrou.releaseLock();
  }
  return json({ ok: true });
}

function doGet(e) {
  return action((e && e.parameter) || {});
}

function action(p) {
  if (!p.cle || p.cle !== cle()) return json({ ok: false, erreur: 'clé refusée' });
  const f = feuille();
  if (p.action === 'statut') {
    const ligne = Number(p.ligne);
    if (!(ligne >= 2 && ligne <= f.getLastRow()) || STATUTS.indexOf(p.statut) < 0) return json({ ok: false, erreur: 'ligne ou statut invalide' });
    f.getRange(ligne, 6).setValue(p.statut);
    return json({ ok: true });
  }
  const n = f.getLastRow();
  const lignes = n < 2 ? [] : f.getRange(2, 1, n - 1, 6).getValues();
  return json({
    ok: true,
    signalements: lignes.map(function (l, i) {
      return {
        ligne: i + 2,
        date: l[0] instanceof Date ? l[0].toISOString() : String(l[0]),
        type: String(l[1]),
        message: String(l[2]),
        nom: String(l[3]),
        contexte: String(l[4]),
        statut: STATUTS.indexOf(l[5]) >= 0 ? l[5] : 'nouveau',
      };
    }),
  });
}
