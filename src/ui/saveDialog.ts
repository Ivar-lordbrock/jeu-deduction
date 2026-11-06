import { h } from '../dom';
import { exportProgress, importProgress } from '../engine/progress';
import { decodeSave, encodeSave } from '../engine/saveCode';

interface SaveDialogOptions {
  /** Une partie vient d'être chargée depuis un code : l'écran doit se mettre à jour. */
  onImported(): void;
}

/**
 * Fenêtre « Sauvegarde » : le code de la partie en cours, à copier, et la case où coller
 * celui d'un autre ordinateur pour y reprendre la partie.
 */
export function openSaveDialog(opts: SaveDialogOptions): void {
  document.querySelector('.save-overlay')?.remove();

  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
  };
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    close();
  }
  window.addEventListener('keydown', onKey, true);

  const data = exportProgress();
  const empty = Object.keys(data).length === 0;

  const codeBox = h('textarea', { class: 'save-code', readonly: true, rows: 4, spellcheck: 'false', 'aria-label': 'Code de sauvegarde de cette partie' });
  const copied = h('span', { class: 'save-status', role: 'status' });
  const copy = h('button', { class: 'btn primary', disabled: empty }, 'Copier le code');
  copy.addEventListener('click', async () => {
    codeBox.select();
    try {
      await navigator.clipboard.writeText(codeBox.value);
      copied.textContent = 'Copié : collez-le dans un message, un fichier…';
    } catch {
      // presse-papiers refusé : le code est sélectionné, Ctrl+C suffit
      copied.textContent = 'Le code est sélectionné : Ctrl+C pour le copier.';
    }
  });
  if (empty) codeBox.value = 'Aucune partie en cours : rien à sauvegarder pour l\'instant.';
  else
    void encodeSave(data).then(
      (code) => (codeBox.value = code),
      () => (codeBox.value = 'Impossible de fabriquer le code dans ce navigateur.'),
    );

  const pasteBox = h('textarea', { class: 'save-code', rows: 4, spellcheck: 'false', placeholder: 'WL1.…', 'aria-label': 'Code de sauvegarde à charger' });
  const error = h('p', { class: 'save-error', role: 'alert' });
  const load = h('button', { class: 'btn ghost' }, 'Reprendre cette partie');
  load.addEventListener('click', async () => {
    error.textContent = '';
    if (!pasteBox.value.trim()) {
      error.textContent = 'Collez d\'abord un code de sauvegarde.';
      return;
    }
    try {
      const loaded = await decodeSave(pasteBox.value);
      if (!confirm('Remplacer la partie de ce navigateur par celle du code ? La partie actuelle sera effacée.')) return;
      importProgress(loaded);
      close();
      opts.onImported();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
    }
  });

  const overlay = h(
    'div',
    {
      class: 'overlay save-overlay',
      onClick: (e: MouseEvent) => {
        if (e.target === overlay) close();
      },
    },
    h(
      'div',
      { class: 'modal save', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Sauvegarde' },
      h('span', { class: 'modal-kicker' }, 'Sauvegarde'),
      h('h2', {}, 'Continuer ailleurs'),
      h(
        'p',
        { class: 'save-help' },
        'La partie est gardée dans ce navigateur. Pour la continuer sur un autre ordinateur, copiez ce code, puis collez-le là-bas, dans la case du dessous.',
      ),
      h('h3', {}, 'Le code de votre partie'),
      codeBox,
      h('div', { class: 'save-row' }, copied, copy),
      h('h3', {}, 'Reprendre une partie'),
      pasteBox,
      error,
      h('div', { class: 'save-row' }, h('button', { class: 'btn ghost', onClick: close }, 'Fermer'), load),
    ),
  );
  document.body.append(overlay);
}
