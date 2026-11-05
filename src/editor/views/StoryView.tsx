import { TextArea, TextField } from '../components/fields';
import { caseIssues } from '../model';
import { casesOfChapter, navigate, updateStory, useEditor } from '../store';
import type { StoryData } from '../../types';

type TextKey = 'title' | 'subtitle' | 'setting' | 'tone' | 'synopsis' | 'notes';

/** Vue d'ensemble : l'histoire et un tableau de bord de toutes les affaires. */
export function StoryView() {
  const s = useEditor();
  const st = s.story;
  const set = (k: TextKey) => (v: string) => updateStory((x: StoryData) => (x[k] = v));

  const rows = [
    ...st.chapters.map((ch, i) => ({ label: `${i + 1}. ${ch.title || 'Sans titre'}`, cases: casesOfChapter(ch.id) })),
    { label: 'Sans chapitre', cases: casesOfChapter(null) },
  ].filter((g) => g.cases.length > 0);

  const all = s.cases;
  const totalWords = all.reduce((n, c) => n + Object.keys(c.data.words).length, 0);
  const totalErrors = all.reduce((n, c) => n + caseIssues(c.data, c.files, st).errors.length, 0);
  const drafts = all.filter((c) => c.data.draft).length;

  return (
    <div class="view">
      <h1 class="view-title">Vue d'ensemble</h1>
      <div class="grid-2">
        <section class="card">
          <h2>L'histoire</h2>
          <TextField label="Titre du jeu" value={st.title} onInput={set('title')} big />
          <TextField
            label="Phrase d'accroche"
            hint="Affichée sous le titre, dans le menu du jeu."
            value={st.subtitle ?? ''}
            onInput={set('subtitle')}
          />
          <div class="row-2">
            <TextField label="Époque et lieu" value={st.setting ?? ''} onInput={set('setting')} placeholder="Venise, 1650" />
            <TextField label="Ton" value={st.tone ?? ''} onInput={set('tone')} placeholder="sombre, ironique…" />
          </div>
          <TextArea
            label="Le fil rouge"
            hint="Le grand mystère qui relie toutes les affaires, et ce que le joueur découvre à la fin."
            value={st.synopsis ?? ''}
            onInput={set('synopsis')}
            rows={10}
          />
          <TextArea label="Notes libres" value={st.notes ?? ''} onInput={set('notes')} rows={5} />
        </section>

        <section class="card">
          <h2>Tableau de bord</h2>
          <div class="stats">
            <Stat value={st.chapters.length} label="chapitres" />
            <Stat value={all.length} label="affaires" sub={drafts ? `dont ${drafts} brouillon${drafts > 1 ? 's' : ''}` : undefined} />
            <Stat value={st.characters.length} label="personnages" />
            <Stat value={totalWords} label="mots à trouver" />
            <Stat value={totalErrors} label="problèmes" tone={totalErrors ? 'error' : 'ok'} />
          </div>

          {rows.length === 0 ? (
            <p class="empty">Aucune affaire. Créez-en une depuis un chapitre, dans la colonne de gauche.</p>
          ) : (
            rows.map((g) => (
              <div key={g.label} class="dash-group">
                <h3>{g.label}</h3>
                {g.cases.map((c) => {
                  const issues = caseIssues(c.data, c.files, st);
                  return (
                    <button
                      key={c.folder}
                      class="dash-case"
                      onClick={() => navigate({ view: 'case', folder: c.folder, tab: issues.errors.length ? 'verif' : 'recit' })}
                    >
                      <span class="dash-title">{c.data.title || 'Sans titre'}</span>
                      {c.data.draft && <span class="tag">brouillon</span>}
                      <span class="muted small">
                        {c.data.zones.length} zones · {Object.keys(c.data.words).length} mots · {c.data.pages.length} pages
                      </span>
                      {issues.errors.length > 0 ? (
                        <span class="badge error">{issues.errors.length} à corriger</span>
                      ) : (
                        <span class="badge ok">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function Stat(p: { value: number; label: string; sub?: string; tone?: 'ok' | 'error' }) {
  return (
    <div class={`stat ${p.tone ?? ''}`}>
      <strong>{p.value}</strong>
      <span>{p.label}</span>
      {p.sub && <small>{p.sub}</small>}
    </div>
  );
}
