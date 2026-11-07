import { GAME_TITLE } from '../config';
import { h } from '../dom';
import { contextText, inboxBody, inboxReady, recentErrors, recordError, reportText, type Report, type ReportKind } from '../engine/report';
import { REPORT_INBOX } from '../signalements';
import { icon } from './art';

/**
 * Bouton « Signaler » et sa fenêtre : un testeur décrit un bug ou propose une idée,
 * le jeu y joint où il en est, et le dépose dans la boîte aux lettres (REPORT_INBOX, src/signalements.ts),
 * que l'éditeur relit. Sans boîte renseignée, ou sans connexion, le rapport se copie pour être envoyé à la main.
 */

let screenDetails: (() => string[]) | null = null;

/** L'écran ouvert (une affaire) dit où en est le joueur ; null quand on le quitte. */
export function setReportContext(fn: (() => string[]) | null): void {
  screenDetails = fn;
}

/** Garde les dernières erreurs du jeu, pour les joindre à un signalement. */
export function watchErrors(): void {
  window.addEventListener('error', (e) => recordError(`${e.message}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`));
  window.addEventListener('unhandledrejection', (e) => recordError(`Promesse rejetée : ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`));
}

export function reportButton(extraClass = ''): HTMLButtonElement {
  return h(
    'button',
    { class: `btn ghost small report-btn ${extraClass}`.trim(), title: 'Signaler un bug ou proposer une idée', onClick: () => openReportDialog() },
    icon('quill-ink'),
    'Signaler',
  );
}

const SCREENS: Record<string, string> = { 'screen-title': 'Écran titre', 'screen-prologue': 'Prologue', 'screen-cases': 'Liste des affaires', 'screen-case': 'Affaire' };
const NAME_KEY = 'jeu-deduction:testeur';

function currentContext(): string {
  let details: string[] = [];
  try {
    details = screenDetails?.() ?? [];
  } catch (e) {
    details = [`(contexte illisible : ${e instanceof Error ? e.message : String(e)})`];
  }
  return contextText({
    build: `${import.meta.env.DEV ? 'développement, ' : ''}${__BUILD__}`,
    screen: SCREENS[document.getElementById('app')?.className ?? ''] ?? (location.hash || 'inconnu'),
    details,
    viewport: `${window.innerWidth} × ${window.innerHeight}${window.devicePixelRatio !== 1 ? ` (×${window.devicePixelRatio})` : ''}`,
    browser: navigator.userAgent,
    errors: recentErrors(),
  });
}

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeName(name: string): void {
  try {
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    // navigation privée : on ne retient pas le nom, tant pis
  }
}

const PLACEHOLDERS: Record<ReportKind, string> = {
  bug: 'Ce que vous faisiez, ce qui s\'est passé, ce que vous attendiez…',
  idee: 'Ce qui vous a manqué, gêné ou plu, ce que vous changeriez…',
};

export function openReportDialog(): void {
  document.querySelector('.report-overlay')?.remove();

  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
  };
  // Phase de capture : Échap ferme la fenêtre sans atteindre l'écran en dessous.
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    close();
  }
  window.addEventListener('keydown', onKey, true);

  const ready = inboxReady(REPORT_INBOX);
  const context = currentContext();
  let kind: ReportKind = 'bug';

  const kindButton = (k: ReportKind, label: string) =>
    h(
      'button',
      {
        type: 'button',
        class: 'btn ghost report-kind',
        role: 'radio',
        'aria-checked': String(k === kind),
        onClick: () => {
          kind = k;
          kinds.querySelectorAll('.report-kind').forEach((b, i) => b.setAttribute('aria-checked', String((i === 0 ? 'bug' : 'idee') === k)));
          message.placeholder = PLACEHOLDERS[k];
          message.focus();
        },
      },
      label,
    );
  const kinds = h('div', { class: 'report-kinds', role: 'radiogroup', 'aria-label': 'Type de signalement' }, kindButton('bug', 'Un bug'), kindButton('idee', 'Une idée'));

  const message = h('textarea', { id: 'report-message', class: 'report-field', rows: 6, maxlength: 4000, placeholder: PLACEHOLDERS[kind] });
  const name = h('input', { id: 'report-name', class: 'report-field', type: 'text', maxlength: 60, autocomplete: 'nickname', placeholder: 'Facultatif' });
  name.value = storedName();
  const attach = h('input', { type: 'checkbox', checked: true });
  const status = h('p', { class: 'report-status', role: 'status' });
  // quand le presse-papiers est refusé : le rapport à copier à la main
  const manual = h('textarea', { class: 'report-field report-manual', readonly: true, rows: 5, hidden: true, 'aria-label': 'Rapport à copier' });
  const send = h('button', { class: 'btn primary' }, ready ? 'Envoyer' : 'Copier le rapport');

  const report = (): Report => ({ kind, message: message.value, name: name.value, context: attach.checked ? context : '' });
  const say = (text: string, tone: 'ok' | 'error' | '' = '') => {
    status.textContent = text;
    status.className = `report-status${tone ? ` ${tone}` : ''}`;
  };
  const copy = async (intro = '') => {
    const text = reportText(report(), GAME_TITLE);
    const lead = intro ? `${intro} ` : '';
    try {
      await navigator.clipboard.writeText(text);
      manual.hidden = true;
      say(`${lead}Le rapport est copié : collez-le dans un message à l'auteur du jeu.`, 'ok');
    } catch {
      manual.value = text;
      manual.hidden = false;
      manual.select();
      say(`${lead}Copiez le rapport ci-dessous (Ctrl+C) et envoyez-le à l'auteur du jeu.`, 'error');
    }
  };

  send.addEventListener('click', async () => {
    if (message.value.trim().length < 3) {
      say('Écrivez d\'abord quelques mots.', 'error');
      message.focus();
      return;
    }
    storeName(name.value.trim());
    if (!ready) return copy();
    send.disabled = true;
    say('Envoi…');
    try {
      // Google ne laisse pas lire sa réponse (mode no-cors) : seule une coupure réseau se voit.
      await fetch(REPORT_INBOX, { method: 'POST', mode: 'no-cors', body: inboxBody(report()) });
      thanks();
    } catch {
      send.disabled = false;
      await copy('L\'envoi n\'a pas marché (pas de connexion ?).');
    }
  });

  const modal = h(
    'div',
    { class: 'modal report-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Signaler un bug ou une idée' },
    h('span', { class: 'modal-kicker' }, 'Pour les testeurs'),
    h('h2', {}, 'Un bug, une idée ?'),
    h('p', { class: 'report-help' }, 'Tout compte : un texte peu clair, un indice introuvable, un bouton capricieux, une envie.'),
    kinds,
    h('label', { for: 'report-message' }, 'Votre message'),
    message,
    h('label', { for: 'report-name' }, 'Votre nom ou pseudo, pour vous répondre'),
    name,
    h('label', { class: 'report-attach' }, attach, 'Joindre où j\'en suis dans le jeu'),
    h('details', { class: 'report-context' }, h('summary', {}, 'Voir ce qui sera joint'), h('pre', {}, context)),
    status,
    manual,
    h('div', { class: 'modal-actions' }, h('button', { class: 'btn ghost', onClick: close }, 'Annuler'), send),
  );

  function thanks() {
    const again = h('button', { class: 'btn ghost', onClick: () => openReportDialog() }, 'Signaler autre chose');
    const done = h('button', { class: 'btn primary', onClick: close }, 'Fermer');
    modal.replaceChildren(
      h('span', { class: 'modal-kicker solved' }, 'Merci'),
      h('h2', {}, 'C\'est envoyé'),
      h('p', { class: 'report-help' }, 'Votre message est bien parti. Merci d\'aider à améliorer le jeu !'),
      h('div', { class: 'modal-actions' }, again, done),
    );
    done.focus();
  }

  const overlay = h(
    'div',
    {
      class: 'overlay report-overlay',
      onClick: (e: MouseEvent) => {
        if (e.target === overlay) close();
      },
    },
    modal,
  );
  document.body.append(overlay);
  message.focus();
}
