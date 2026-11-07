/**
 * Signalements des testeurs (un bug, une idée) : ce qui part vers la boîte aux lettres, sans DOM.
 * La boîte est un script Google attaché à un tableur (tools/signalements.gs) ; l'éditeur les relit.
 */

export type ReportKind = 'bug' | 'idee';

export const REPORT_KIND_LABELS: Record<ReportKind, string> = { bug: 'Bug', idee: 'Idée' };

export interface Report {
  kind: ReportKind;
  message: string;
  /** Nom ou pseudo du testeur, facultatif. */
  name: string;
  /** Où en est le joueur (vide s'il a choisi de ne pas le joindre). */
  context: string;
}

/** Statuts d'un signalement, dans l'éditeur. */
export const REPORT_STATUSES = ['nouveau', 'vu', 'réglé'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Un signalement relu dans la boîte aux lettres (une ligne du tableur). */
export interface InboxReport {
  ligne: number;
  date: string;
  type: string;
  message: string;
  nom: string;
  contexte: string;
  statut: ReportStatus;
}

/** L'adresse de la boîte est-elle renseignée ? Sinon, le jeu propose de copier le rapport. */
export function inboxReady(url: string): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url);
}

/** Les champs envoyés à la boîte aux lettres. */
export function inboxBody(r: Report): URLSearchParams {
  return new URLSearchParams({ type: REPORT_KIND_LABELS[r.kind], message: r.message.trim(), nom: r.name.trim(), contexte: r.context });
}

/** Le rapport en texte, à copier quand l'envoi est impossible. */
export function reportText(r: Report, game: string): string {
  return [
    `[${REPORT_KIND_LABELS[r.kind]}] ${game}`,
    '',
    r.message.trim(),
    ...(r.name.trim() ? ['', `— ${r.name.trim()}`] : []),
    ...(r.context ? ['', 'Contexte :', r.context] : []),
  ].join('\n');
}

/** Dossier de l'affaire nommée dans un contexte (« Affaire : À la morgue (02-morgue) »), pour l'ouvrir dans l'éditeur. */
export function contextFolder(context: string): string | null {
  return /^Affaire : .*\(([a-z0-9][a-z0-9-]*)\)$/m.exec(context)?.[1] ?? null;
}

export interface ContextInfo {
  /** Version du jeu (commit et date du build). */
  build: string;
  /** Écran ouvert (« Écran titre », « Affaire »…). */
  screen: string;
  /** Ce que l'écran ouvert ajoute (affaire, scène, progression…), une ligne par élément. */
  details: string[];
  browser: string;
  viewport: string;
  errors: readonly string[];
}

/** Le contexte joint au signalement, montré au testeur avant l'envoi. */
export function contextText(i: ContextInfo): string {
  return [
    `Version : ${i.build}`,
    `Écran : ${i.screen}`,
    ...i.details,
    `Fenêtre : ${i.viewport}`,
    `Navigateur : ${i.browser}`,
    ...(i.errors.length ? ['Erreurs récentes :', ...i.errors.map((e) => `  ${e}`)] : []),
  ].join('\n');
}

// Les dernières erreurs du jeu, pour les joindre à un signalement de bug.
const MAX_ERRORS = 5;
const errors: string[] = [];

export function recordError(message: string): void {
  const m = message.replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!m || errors.at(-1) === m) return;
  errors.push(m);
  if (errors.length > MAX_ERRORS) errors.shift();
}

export function recentErrors(): readonly string[] {
  return errors;
}
