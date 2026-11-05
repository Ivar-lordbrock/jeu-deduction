import { useEffect } from 'preact/hooks';
import { CATEGORY_LABELS, CATEGORY_ORDER, type ChronologyPage, type IdentitiesPage, type Page, type SentencesPage } from '../../../types';
import { RichField } from '../../components/RichField';
import { newPage, PAGE_KIND_LABELS } from '../../model';
import { updateCase, type CaseEntry } from '../../store';

type Upd = (fn: (p: Page) => void) => void;

/** Onglet Réflexion : les pages que le joueur complète avec les mots trouvés. */
export function PagesTab({ entry, pageId }: { entry: CaseEntry; pageId: string | null }) {
  const { data, folder } = entry;

  // Arrivée depuis un lien (« Réponse dans… ») : on montre la page.
  useEffect(() => {
    if (pageId) document.getElementById(`page-${pageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pageId]);

  function add(kind: Page['kind']) {
    let id = '';
    updateCase(folder, (c) => (id = newPage(c, kind).id));
    requestAnimationFrame(() => document.getElementById(`page-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <div class="pages-tab">
      <div class="pages-add">
        <span class="muted small">Ajouter une page :</span>
        {(['sentences', 'identities', 'chronology'] as const).map((k) => (
          <button key={k} class="btn" onClick={() => add(k)}>
            + {PAGE_KIND_LABELS[k]}
          </button>
        ))}
      </div>
      {data.pages.length === 0 && (
        <p class="empty">
          Aucune page. Une affaire en a souvent trois : « Qui est qui ? », « Que s'est-il passé ? » et « Dans quel ordre ? ».
        </p>
      )}
      {data.pages.map((page, i) => (
        <PageCard key={page.id} entry={entry} page={page} index={i} highlighted={page.id === pageId} />
      ))}
    </div>
  );
}

function PageCard({ entry, page, index, highlighted }: { entry: CaseEntry; page: Page; index: number; highlighted: boolean }) {
  const { data, folder } = entry;
  const count = data.pages.length;
  const upd: Upd = (fn) =>
    updateCase(folder, (c) => {
      const p = c.pages.find((x) => x.id === page.id);
      if (p) fn(p);
    });

  function move(delta: number) {
    updateCase(folder, (c) => {
      const j = index + delta;
      if (j < 0 || j >= c.pages.length) return;
      [c.pages[index], c.pages[j]] = [c.pages[j], c.pages[index]];
    });
  }

  function remove() {
    if (confirm(`Supprimer la page « ${page.title} » ?`)) updateCase(folder, (c) => (c.pages = c.pages.filter((p) => p.id !== page.id)));
  }

  return (
    <section id={`page-${page.id}`} class={`card page-card${highlighted ? ' highlighted' : ''}`}>
      <div class="card-head">
        <span class="page-kind">
          {index + 1}. {PAGE_KIND_LABELS[page.kind]}
        </span>
        <span class="spacer" />
        <button class="icon-btn" disabled={index === 0} onClick={() => move(-1)} aria-label="Monter la page">
          ▲
        </button>
        <button class="icon-btn" disabled={index === count - 1} onClick={() => move(1)} aria-label="Descendre la page">
          ▼
        </button>
        <button class="icon-btn danger" onClick={remove} aria-label="Supprimer la page">
          ✕
        </button>
      </div>
      <input
        class="input big"
        value={page.title}
        placeholder="Titre de la page"
        aria-label="Titre de la page"
        onInput={(e) => {
          const v = e.currentTarget.value;
          upd((p) => (p.title = v));
        }}
      />

      {page.kind === 'sentences' && <SentencesBody entry={entry} page={page} upd={upd} />}
      {page.kind === 'identities' && <IdentitiesBody entry={entry} page={page} upd={upd} />}
      {page.kind === 'chronology' && <ChronologyBody page={page} upd={upd} />}

      <HintsEditor page={page} upd={upd} />
    </section>
  );
}

function SentencesBody({ entry, page, upd }: { entry: CaseEntry; page: SentencesPage; upd: Upd }) {
  const each = (fn: (p: SentencesPage) => void) => upd((p) => p.kind === 'sentences' && fn(p));
  return (
    <div class="page-body">
      <p class="field-hint">
        Écrivez la phrase entière, puis sélectionnez chaque mot que le joueur doit retrouver et cliquez « ▭ Faire une case ».
      </p>
      {page.sentences.map((sentence, i) => (
        <div class="sentence-row" key={i}>
          <RichField
            mode="sentence"
            folder={entry.folder}
            data={entry.data}
            value={sentence}
            rows={2}
            placeholder="Margot a versé de l'arsenic dans le vin d'Aldric."
            onChange={(v) => each((p) => (p.sentences[i] = v))}
          />
          <div class="row-actions">
            <button
              class="icon-btn"
              disabled={i === 0}
              aria-label="Monter la phrase"
              onClick={() => each((p) => ([p.sentences[i - 1], p.sentences[i]] = [p.sentences[i], p.sentences[i - 1]]))}
            >
              ▲
            </button>
            <button
              class="icon-btn"
              disabled={i === page.sentences.length - 1}
              aria-label="Descendre la phrase"
              onClick={() => each((p) => ([p.sentences[i + 1], p.sentences[i]] = [p.sentences[i], p.sentences[i + 1]]))}
            >
              ▼
            </button>
            <button class="icon-btn danger" aria-label="Supprimer la phrase" onClick={() => each((p) => p.sentences.splice(i, 1))}>
              ✕
            </button>
          </div>
        </div>
      ))}
      <button class="btn small" onClick={() => each((p) => p.sentences.push(''))}>
        + Ajouter une phrase
      </button>
    </div>
  );
}

function IdentitiesBody({ entry, page, upd }: { entry: CaseEntry; page: IdentitiesPage; upd: Upd }) {
  const { data } = entry;
  const each = (fn: (p: IdentitiesPage) => void) => upd((p) => p.kind === 'identities' && fn(p));
  const witnesses = data.zones.filter((z) => z.kind === 'person');
  const missing = witnesses.filter((z) => !page.people.some((x) => x.zone === z.id));
  const wordIds = Object.keys(data.words);

  return (
    <div class="page-body">
      <p class="field-hint">Pour chaque témoin de la scène, le nom que le joueur doit lui attribuer.</p>
      {page.people.length > 0 && (
        <div class="identity-rows">
          {page.people.map((row, i) => (
            <div class="identity-row" key={i}>
              <select
                class="input"
                value={row.zone}
                aria-label="Témoin"
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  each((p) => (p.people[i].zone = v));
                }}
              >
                {!witnesses.some((z) => z.id === row.zone) && <option value={row.zone}>{row.zone || '— témoin —'}</option>}
                {witnesses.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
              <span class="arrow">→</span>
              <select
                class="input"
                value={row.answer}
                aria-label="Nom attendu"
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  each((p) => (p.people[i].answer = v));
                }}
              >
                <option value="">— nom attendu —</option>
                {CATEGORY_ORDER.map((cat) => {
                  const inCat = wordIds.filter((id) => data.words[id].category === cat);
                  return inCat.length ? (
                    <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                      {inCat.map((id) => (
                        <option key={id} value={id}>
                          {data.words[id].label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
              <button class="icon-btn danger" aria-label="Retirer cette ligne" onClick={() => each((p) => p.people.splice(i, 1))}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div class="btn-row">
        <button class="btn small" onClick={() => each((p) => p.people.push({ zone: missing[0]?.id ?? '', answer: '' }))}>
          + Ajouter une ligne
        </button>
        {missing.length > 0 && (
          <button
            class="btn small"
            onClick={() => each((p) => missing.forEach((z) => p.people.push({ zone: z.id, answer: '' })))}
          >
            + Ajouter les {missing.length} témoin{missing.length > 1 ? 's' : ''} manquant{missing.length > 1 ? 's' : ''}
          </button>
        )}
      </div>
      {witnesses.length === 0 && <p class="field-hint">Ajoutez d'abord des témoins dans l'onglet « Scène ».</p>}
    </div>
  );
}

function ChronologyBody({ page, upd }: { page: ChronologyPage; upd: Upd }) {
  const each = (fn: (p: ChronologyPage) => void) => upd((p) => p.kind === 'chronology' && fn(p));
  return (
    <div class="page-body">
      <p class="field-hint">Écrivez les événements dans le bon ordre : le jeu les mélangera.</p>
      <ol class="order-list">
        {page.events.map((ev, i) => (
          <li key={i}>
            <span class="order-num">{i + 1}</span>
            <input
              class="input"
              value={ev}
              placeholder="Ce qui se passe à cette étape"
              aria-label={`Événement ${i + 1}`}
              onInput={(e) => {
                const v = e.currentTarget.value;
                each((p) => (p.events[i] = v));
              }}
            />
            <button
              class="icon-btn"
              disabled={i === 0}
              aria-label="Monter"
              onClick={() => each((p) => ([p.events[i - 1], p.events[i]] = [p.events[i], p.events[i - 1]]))}
            >
              ▲
            </button>
            <button
              class="icon-btn"
              disabled={i === page.events.length - 1}
              aria-label="Descendre"
              onClick={() => each((p) => ([p.events[i + 1], p.events[i]] = [p.events[i], p.events[i + 1]]))}
            >
              ▼
            </button>
            <button class="icon-btn danger" aria-label="Supprimer" onClick={() => each((p) => p.events.splice(i, 1))}>
              ✕
            </button>
          </li>
        ))}
      </ol>
      <button class="btn small" onClick={() => each((p) => p.events.push(''))}>
        + Ajouter un événement
      </button>
    </div>
  );
}

function HintsEditor({ page, upd }: { page: Page; upd: Upd }) {
  const hints = page.hints ?? [];
  return (
    <details class="hints-editor" open={hints.length > 0}>
      <summary>
        Indices <span class="muted">({hints.length})</span>
      </summary>
      <p class="field-hint">Révélés un par un à la demande du joueur, du plus vague au plus précis.</p>
      {hints.map((h, i) => (
        <div class="row" key={i}>
          <input
            class="input"
            value={h}
            aria-label={`Indice ${i + 1}`}
            onInput={(e) => {
              const v = e.currentTarget.value;
              upd((p) => p.hints && (p.hints[i] = v));
            }}
          />
          <button
            class="icon-btn danger"
            aria-label="Supprimer l'indice"
            onClick={() =>
              upd((p) => {
                p.hints?.splice(i, 1);
                if (!p.hints?.length) delete p.hints;
              })
            }
          >
            ✕
          </button>
        </div>
      ))}
      <button class="btn small" onClick={() => upd((p) => (p.hints ??= []).push(''))}>
        + Ajouter un indice
      </button>
    </details>
  );
}
