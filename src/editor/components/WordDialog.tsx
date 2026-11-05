import { useEffect, useRef, useState } from 'preact/hooks';
import { slugify, uniqueId } from '../../engine/slug';
import { CATEGORY_ORDER, type CaseData, type WordCategory } from '../../types';
import { addWord, CATEGORY_SINGULAR, guessCategory } from '../model';
import { updateCase } from '../store';

interface Props {
  folder: string;
  data: CaseData;
  /** Texte sélectionné par l'auteur. */
  initialLabel: string;
  title: string;
  onConfirm: (wordId: string) => void;
  onCancel: () => void;
}

/** Fenêtre « Nouveau mot à trouver » : créer le mot, ou relier la sélection à un mot existant. */
export function WordDialog(p: Props) {
  const existingIds = Object.keys(p.data.words);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [label, setLabel] = useState(p.initialLabel);
  const [category, setCategory] = useState<WordCategory>(guessCategory(p.initialLabel));
  const [existing, setExisting] = useState(existingIds[0] ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && p.onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function confirm(e: Event) {
    e.preventDefault();
    if (mode === 'existing') {
      if (existing) p.onConfirm(existing);
      return;
    }
    if (!label.trim()) return;
    let id = '';
    updateCase(p.folder, (c) => (id = addWord(c, label, category)));
    p.onConfirm(id);
  }

  const previewId = uniqueId(slugify(label), existingIds, 'mot');

  return (
    <div
      class="ed-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={p.title}
      onMouseDown={(e) => e.target === e.currentTarget && p.onCancel()}
    >
      <form class="ed-dialog" onSubmit={confirm} aria-label={p.title}>
        <h2>{p.title}</h2>
        {existingIds.length > 0 && (
          <div class="segmented wide">
            <button type="button" class={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>
              Nouveau mot
            </button>
            <button type="button" class={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>
              Mot existant
            </button>
          </div>
        )}

        {mode === 'new' ? (
          <>
            <label class="field">
              <span class="field-label">Mot tel qu'il apparaîtra dans la banque</span>
              <input ref={inputRef} class="input" value={label} onInput={(e) => setLabel(e.currentTarget.value)} />
              <span class="field-hint">Identifiant : {previewId}</span>
            </label>
            <div class="field">
              <span class="field-label">Catégorie</span>
              <div class="cat-choices">
                {CATEGORY_ORDER.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    class={`chip cat-${cat}${category === cat ? ' active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {CATEGORY_SINGULAR[cat]}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <label class="field">
            <span class="field-label">Relier « {p.initialLabel} » au mot</span>
            <select class="input" value={existing} onChange={(e) => setExisting(e.currentTarget.value)}>
              {existingIds.map((id) => (
                <option key={id} value={id}>
                  {p.data.words[id].label} ({CATEGORY_SINGULAR[p.data.words[id].category]})
                </option>
              ))}
            </select>
            <span class="field-hint">Utile pour une forme différente du même mot (« empoisonné » → « poison »).</span>
          </label>
        )}

        <div class="dialog-actions">
          <button type="button" class="btn" onClick={p.onCancel}>
            Annuler
          </button>
          <button type="submit" class="btn primary">
            {mode === 'new' ? 'Créer le mot' : 'Relier'}
          </button>
        </div>
      </form>
    </div>
  );
}
