/**
 * Boîte aux lettres des signalements des testeurs : un script Google attaché à un tableur (tools/signalements.gs).
 * L'adresse est publique : le jeu y dépose les messages. Les relire demande la clé, que seul l'éditeur connaît
 * (SIGNALEMENTS_CLE dans .env.local, jamais dans le dépôt). Vide : le bouton « Signaler » prépare un rapport à copier.
 * Fichier à part, sans dépendance : l'API de l'éditeur (tools/editorApi.ts) l'importe aussi.
 */
export const REPORT_INBOX: string =
  'https://script.google.com/macros/s/AKfycbx1dt25jE8JltDUk7trriQJiuyXMSGzoOeVBZ7uI4ZDBqPYuGu6DHREyTYEBmFQpuqbTg/exec';
