import { TextArea, TextField } from '../components/fields';
import { casesOfChapter, createCase, deleteChapter, moveChapter, navigate, reorderCases, updateStory, useEditor } from '../store';

/** Un chapitre : son titre, son résumé et l'ordre de ses affaires. */
export function ChapterView({ id }: { id: string }) {
  const s = useEditor();
  const index = s.story.chapters.findIndex((c) => c.id === id);
  const chapter = s.story.chapters[index];
  if (!chapter) return <div class="view"><p class="empty">Ce chapitre n'existe plus.</p></div>;

  const set = (k: 'title' | 'summary') => (v: string) =>
    updateStory((st) => {
      const c = st.chapters.find((x) => x.id === id);
      if (c) c[k] = v;
    });

  const cases = casesOfChapter(id);
  const move = (i: number, delta: number) => {
    const folders = cases.map((c) => c.folder);
    const j = i + delta;
    if (j < 0 || j >= folders.length) return;
    [folders[i], folders[j]] = [folders[j], folders[i]];
    reorderCases(folders);
  };

  return (
    <div class="view narrow">
      <div class="view-head">
        <h1 class="view-title">
          <span class="muted">Chapitre {index + 1}</span>
        </h1>
        <div class="btn-row">
          <button class="btn" disabled={index === 0} onClick={() => moveChapter(id, -1)} title="Placer ce chapitre plus tôt">
            ▲
          </button>
          <button
            class="btn"
            disabled={index === s.story.chapters.length - 1}
            onClick={() => moveChapter(id, 1)}
            title="Placer ce chapitre plus tard"
          >
            ▼
          </button>
          <button class="btn danger" onClick={() => deleteChapter(id)}>
            Supprimer
          </button>
        </div>
      </div>

      <section class="card">
        <TextField label="Titre du chapitre" value={chapter.title} onInput={set('title')} big />
        <TextArea
          label="Résumé"
          hint="Ce qui se joue dans ce chapitre, pour vous repérer (invisible en jeu)."
          value={chapter.summary ?? ''}
          onInput={set('summary')}
          rows={6}
        />
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Affaires du chapitre</h2>
          <button class="btn primary" onClick={() => void createCase(id)}>
            + Nouvelle affaire
          </button>
        </div>
        {cases.length === 0 && <p class="empty">Aucune affaire dans ce chapitre.</p>}
        <ol class="order-list">
          {cases.map((c, i) => (
            <li key={c.folder}>
              <span class="order-num">{i + 1}</span>
              <button class="link-btn" onClick={() => navigate({ view: 'case', folder: c.folder, tab: 'recit' })}>
                {c.data.title || 'Sans titre'}
              </button>
              {c.data.draft && <span class="tag">brouillon</span>}
              <span class="spacer" />
              <button class="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter">
                ▲
              </button>
              <button class="icon-btn" disabled={i === cases.length - 1} onClick={() => move(i, 1)} aria-label="Descendre">
                ▼
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
