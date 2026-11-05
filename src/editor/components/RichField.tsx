import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { parseRich, parseSentence } from '../../engine/markup';
import { CATEGORY_LABELS, CATEGORY_ORDER, type CaseData } from '../../types';
import { findWordByText, replaceSelection } from '../model';
import { WordDialog } from './WordDialog';

interface Props {
  folder: string;
  data: CaseData;
  /**
   * « rich » : texte de la scène, les mots marqués sont à collecter ([[mot]]).
   * « sentence » : phrase de réflexion, les mots marqués deviennent des cases ({mot}).
   */
  mode: 'rich' | 'sentence';
  value: string;
  onChange: (v: string) => void;
  label?: ComponentChildren;
  hint?: ComponentChildren;
  placeholder?: string;
  rows?: number;
}

interface Selection {
  start: number;
  end: number;
  text: string;
}

/**
 * Champ de texte avec une barre d'outils pour marquer les mots à trouver,
 * et un aperçu coloré de ce que verra le joueur.
 */
export function RichField(p: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [dialog, setDialog] = useState<Selection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isRich = p.mode === 'rich';

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  /** Sélection courante, sans les espaces autour. */
  function selection(): Selection {
    const el = ref.current as HTMLTextAreaElement;
    const raw = el.value.slice(el.selectionStart, el.selectionEnd);
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    return { start: el.selectionStart + lead, end: el.selectionEnd - trail, text: raw.trim() };
  }

  function markupFor(id: string, shown: string): string {
    if (!isRich) return `{${id}}`;
    return p.data.words[id]?.label === shown || !shown ? `[[${id}]]` : `[[${id}|${shown}]]`;
  }

  function insert(id: string, sel: Selection) {
    const el = ref.current as HTMLTextAreaElement;
    el.focus();
    el.setSelectionRange(sel.start, sel.end);
    replaceSelection(el, markupFor(id, sel.text));
  }

  function markSelection() {
    const sel = selection();
    if (!sel.text) return flash(isRich ? 'Sélectionnez d\'abord un mot dans le texte.' : 'Sélectionnez d\'abord le mot qui deviendra une case.');
    if (/[[\]{}]/.test(sel.text)) return flash('La sélection contient déjà un mot marqué.');
    const existing = findWordByText(p.data, sel.text);
    if (existing) insert(existing, sel);
    else setDialog(sel);
  }

  function pickExisting(id: string) {
    const sel = selection();
    // Avec une sélection, on relie ce texte au mot ; sinon on insère le mot au curseur.
    insert(id, sel);
  }

  const ids = Object.keys(p.data.words);

  return (
    <div class="field">
      {p.label && <span class="field-label">{p.label}</span>}
      <div class="rich-editor">
        <div class="rich-toolbar">
          <button type="button" class="tool primary" onMouseDown={(e) => e.preventDefault()} onClick={markSelection}>
            {isRich ? '★ Mot à trouver' : '▭ Faire une case'}
          </button>
          {ids.length > 0 && (
            <select
              class="tool"
              value=""
              onChange={(e) => {
                const v = e.currentTarget.value;
                e.currentTarget.value = '';
                if (v) pickExisting(v);
              }}
            >
              <option value="">{isRich ? 'Insérer un mot…' : 'Insérer une case…'}</option>
              {CATEGORY_ORDER.map((cat) => {
                const inCat = ids.filter((id) => p.data.words[id].category === cat);
                return inCat.length ? (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                    {inCat.map((id) => (
                      <option key={id} value={id}>
                        {p.data.words[id].label}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          )}
          {notice && <span class="tool-notice">{notice}</span>}
        </div>
        <textarea
          ref={ref}
          class="rich-input"
          rows={p.rows ?? 3}
          value={p.value}
          placeholder={p.placeholder}
          spellcheck
          onInput={(e) => p.onChange(e.currentTarget.value)}
        />
        {p.value.trim() && <div class="rich-preview">{isRich ? previewRich(p.value, p.data) : previewSentence(p.value, p.data)}</div>}
      </div>
      {p.hint && <span class="field-hint">{p.hint}</span>}
      {dialog && (
        <WordDialog
          folder={p.folder}
          data={p.data}
          initialLabel={dialog.text}
          title={isRich ? 'Nouveau mot à trouver' : 'Réponse de la case'}
          onCancel={() => setDialog(null)}
          onConfirm={(id) => {
            const sel = dialog;
            setDialog(null);
            insert(id, sel);
          }}
        />
      )}
    </div>
  );
}

function previewRich(text: string, data: CaseData) {
  return parseRich(text).map((seg, i) => {
    if (seg.type === 'text') return seg.text;
    const w = data.words[seg.id];
    if (!w) return <span key={i} class="pv-word unknown" title={`Mot inconnu : ${seg.id}`}>{seg.text ?? seg.id}</span>;
    return (
      <span key={i} class={`pv-word cat-${w.category}`} title={`Mot à trouver : ${w.label}`}>
        {seg.text ?? w.label}
      </span>
    );
  });
}

function previewSentence(text: string, data: CaseData) {
  return parseSentence(text).map((seg, i) => {
    if (seg.type === 'text') return seg.text;
    const known = seg.answers.filter((a) => data.words[a]);
    const cat = known[0] ? data.words[known[0]].category : null;
    const label = seg.answers.map((a) => data.words[a]?.label ?? `${a} ?`).join(' / ');
    return (
      <span
        key={i}
        class={`pv-blank${cat ? ` cat-${cat}` : ' unknown'}`}
        title={known.length === seg.answers.length ? 'Réponse attendue' : 'Mot inconnu dans cette case'}
      >
        {label || '?'}
      </span>
    );
  });
}
