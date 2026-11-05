import { useState } from 'preact/hooks';
import { CATEGORY_LABELS, CATEGORY_ORDER, type WordCategory } from '../../../types';
import {
  addWord,
  analyzeWords,
  CATEGORY_SINGULAR,
  findWordByText,
  normalizeText,
  removeWord,
  WORD_STATUS_LABELS,
  wordStatus,
  type WordStatus,
} from '../../model';
import { navigate, updateCase, type CaseEntry } from '../../store';

const STATUS_ORDER: WordStatus[] = ['missing', 'answer', 'decoy', 'unplaced'];

/** Onglet Mots : la liste complète des mots à trouver, où ils sont et à quoi ils servent. */
export function WordsTab({ entry }: { entry: CaseEntry }) {
  const { data, folder } = entry;
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<WordCategory>('person');
  const [catFilter, setCatFilter] = useState<WordCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const usage = analyzeWords(data);
  const statusOf = (id: string) => wordStatus(usage.get(id) ?? { foundIn: [], answerIn: [], starting: false });
  const counts = Object.fromEntries(STATUS_ORDER.map((st) => [st, 0])) as Record<WordStatus, number>;
  Object.keys(data.words).forEach((id) => counts[statusOf(id)]++);

  const ids = Object.keys(data.words)
    .filter((id) => catFilter === 'all' || data.words[id].category === catFilter)
    .filter((id) => statusFilter === 'all' || statusOf(id) === statusFilter)
    .filter((id) => !query || normalizeText(data.words[id].label).includes(normalizeText(query)))
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(data.words[a].category) - CATEGORY_ORDER.indexOf(data.words[b].category) ||
        data.words[a].label.localeCompare(data.words[b].label, 'fr'),
    );

  function add(e: Event) {
    e.preventDefault();
    const text = label.trim();
    if (!text) return;
    const existing = findWordByText(data, text);
    if (existing) {
      setNotice(`« ${data.words[existing].label} » existe déjà.`);
      return;
    }
    updateCase(folder, (c) => addWord(c, text, category));
    setLabel('');
    setNotice(null);
  }

  function remove(id: string) {
    const u = usage.get(id);
    const used = (u?.foundIn.length ?? 0) + (u?.answerIn.length ?? 0) > 0;
    const msg = used
      ? `Supprimer « ${data.words[id].label} » ? Dans les textes, il redeviendra du texte normal ; les cases qui l'attendent seront à corriger.`
      : `Supprimer « ${data.words[id].label} » ?`;
    if (confirm(msg)) updateCase(folder, (c) => removeWord(c, id));
  }

  return (
    <div class="words-tab">
      <section class="card">
        <form class="word-add" onSubmit={add}>
          <input
            class="input"
            placeholder="Nouveau mot (ex. arsenic)"
            value={label}
            onInput={(e) => setLabel(e.currentTarget.value)}
            aria-label="Nouveau mot"
          />
          <select class="input" value={category} onChange={(e) => setCategory(e.currentTarget.value as WordCategory)} aria-label="Catégorie">
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_SINGULAR[c]}
              </option>
            ))}
          </select>
          <button class="btn primary" type="submit">
            Ajouter
          </button>
          {notice && <span class="tool-notice">{notice}</span>}
        </form>
        <p class="field-hint">
          Plus rapide : dans un texte de la scène, sélectionnez le mot et cliquez « ★ Mot à trouver » pour le créer et le
          placer d'un coup.
        </p>
      </section>

      <div class="word-filters">
        <div class="chips">
          <button class={`chip filter${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>
            Tous <b>{Object.keys(data.words).length}</b>
          </button>
          {STATUS_ORDER.map((st) => (
            <button
              key={st}
              class={`chip filter status-${st}${statusFilter === st ? ' active' : ''}`}
              title={WORD_STATUS_LABELS[st].hint}
              onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
            >
              {WORD_STATUS_LABELS[st].label} <b>{counts[st]}</b>
            </button>
          ))}
        </div>
        <div class="chips">
          <button class={`chip filter${catFilter === 'all' ? ' active' : ''}`} onClick={() => setCatFilter('all')}>
            Toutes catégories
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c}
              class={`chip filter cat-${c}${catFilter === c ? ' active' : ''}`}
              onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
          <input class="input search" placeholder="Rechercher…" value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
        </div>
      </div>

      {Object.keys(data.words).length === 0 ? (
        <p class="empty">Aucun mot pour l'instant.</p>
      ) : (
        <div class="table-wrap">
          <table class="word-table">
            <thead>
              <tr>
                <th>Mot</th>
                <th>Catégorie</th>
                <th>Trouvé dans</th>
                <th>Réponse dans</th>
                <th title="Déjà dans la banque au début de l'affaire">Au départ</th>
                <th>État</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ids.map((id) => {
                const w = data.words[id];
                const u = usage.get(id);
                const st = statusOf(id);
                return (
                  <tr key={id} class={`status-${st}`}>
                    <td>
                      <input
                        class={`input word-label cat-${w.category}`}
                        value={w.label}
                        aria-label="Texte du mot"
                        onInput={(e) => {
                          const v = e.currentTarget.value;
                          updateCase(folder, (c) => (c.words[id].label = v));
                        }}
                      />
                      <span class="word-id">{id}</span>
                    </td>
                    <td>
                      <select
                        class="input"
                        value={w.category}
                        aria-label="Catégorie"
                        onChange={(e) => {
                          const v = e.currentTarget.value as WordCategory;
                          updateCase(folder, (c) => (c.words[id].category = v));
                        }}
                      >
                        {CATEGORY_ORDER.map((c) => (
                          <option key={c} value={c}>
                            {CATEGORY_SINGULAR[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div class="chips">
                        {u?.foundIn.map((z) => (
                          <button
                            key={z.id}
                            class="chip link"
                            onClick={() => navigate({ view: 'case', folder, tab: 'scene', zone: z.id }, true)}
                          >
                            {z.label}
                          </button>
                        ))}
                        {!u?.foundIn.length && <span class="muted small">—</span>}
                      </div>
                    </td>
                    <td>
                      <div class="chips">
                        {u?.answerIn.map((pg) => (
                          <button
                            key={pg.id}
                            class="chip link"
                            onClick={() => navigate({ view: 'case', folder, tab: 'reflexion', page: pg.id }, true)}
                          >
                            {pg.title}
                          </button>
                        ))}
                        {!u?.answerIn.length && <span class="muted small">—</span>}
                      </div>
                    </td>
                    <td class="center">
                      <input
                        type="checkbox"
                        checked={!!u?.starting}
                        aria-label="Déjà noté au départ"
                        onChange={(e) => {
                          const v = e.currentTarget.checked;
                          updateCase(folder, (c) => {
                            const set = new Set(c.startingWords ?? []);
                            if (v) set.add(id);
                            else set.delete(id);
                            if (set.size) c.startingWords = [...set];
                            else delete c.startingWords;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <span class={`status-badge status-${st}`} title={WORD_STATUS_LABELS[st].hint}>
                        {WORD_STATUS_LABELS[st].label}
                      </span>
                    </td>
                    <td>
                      <button class="icon-btn danger" title="Supprimer ce mot" onClick={() => remove(id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ids.length === 0 && <p class="empty">Aucun mot ne correspond aux filtres.</p>}
        </div>
      )}

      <dl class="legend">
        {STATUS_ORDER.map((st) => (
          <div key={st}>
            <dt>
              <span class={`status-badge status-${st}`}>{WORD_STATUS_LABELS[st].label}</span>
            </dt>
            <dd>{WORD_STATUS_LABELS[st].hint}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
