import { caseIssues } from '../model';
import { deleteCase, getCase, navigate, setCaseChapter, updateCase, useEditor, type CaseTab, type Route } from '../store';
import { CheckTab } from './case/CheckTab';
import { PagesTab } from './case/PagesTab';
import { RecitTab } from './case/RecitTab';
import { SceneTab } from './case/SceneTab';
import { WordsTab } from './case/WordsTab';

type CaseRoute = Extract<Route, { view: 'case' }>;

/** Une affaire : en-tête (titre, chapitre, brouillon) et onglets. */
export function CaseView({ route }: { route: CaseRoute }) {
  const s = useEditor();
  const entry = getCase(route.folder);
  if (!entry) return <div class="view"><p class="empty">Cette affaire n'existe plus.</p></div>;
  const { data, folder } = entry;
  const issues = caseIssues(data, entry.files, s.story);

  const tabs: { id: CaseTab; label: string; count?: number; tone?: string }[] = [
    { id: 'recit', label: 'Récit' },
    { id: 'scene', label: 'Scène', count: data.zones.length },
    { id: 'mots', label: 'Mots', count: Object.keys(data.words).length },
    { id: 'reflexion', label: 'Réflexion', count: data.pages.length },
    {
      id: 'verif',
      label: 'Vérification',
      count: issues.errors.length || issues.warnings.length || undefined,
      tone: issues.errors.length ? 'error' : issues.warnings.length ? 'warn' : 'ok',
    },
  ];

  function remove() {
    if (confirm(`Supprimer l'affaire « ${data.title} » ? Elle sera déplacée dans le dossier « corbeille » du projet.`)) {
      void deleteCase(folder);
    }
  }

  return (
    <div class="view case-view">
      <header class="case-head">
        <input
          class="input title-input"
          value={data.title}
          placeholder="Titre de l'affaire"
          aria-label="Titre de l'affaire"
          onInput={(e) => {
            const v = e.currentTarget.value;
            updateCase(folder, (c) => (c.title = v));
          }}
        />
        <div class="case-meta">
          <label class="inline-field">
            Chapitre
            <select class="input" value={data.chapter ?? ''} onChange={(e) => setCaseChapter(folder, e.currentTarget.value)}>
              <option value="">Sans chapitre</option>
              {s.story.chapters.map((ch, i) => (
                <option key={ch.id} value={ch.id}>
                  {i + 1}. {ch.title}
                </option>
              ))}
            </select>
          </label>
          <label class="check" title="Un brouillon n'apparaît pas dans la version publiée du jeu">
            <input
              type="checkbox"
              checked={!!data.draft}
              onChange={(e) => {
                const v = e.currentTarget.checked;
                updateCase(folder, (c) => {
                  if (v) c.draft = true;
                  else delete c.draft;
                });
              }}
            />
            Brouillon
          </label>
          <span class="spacer" />
          <a class="btn" href={`./#${folder}`} target="jeu-deduction">
            ▶ Tester
          </a>
          <button class="btn danger" onClick={remove}>
            Supprimer
          </button>
        </div>
      </header>

      <nav class="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={route.tab === t.id}
            class={`tab${route.tab === t.id ? ' active' : ''}`}
            onClick={() => navigate({ view: 'case', folder, tab: t.id }, true)}
          >
            {t.label}
            {t.count !== undefined && <span class={`tab-count ${t.tone ?? ''}`}>{t.count}</span>}
            {t.id === 'verif' && t.count === undefined && <span class="tab-count ok">✓</span>}
          </button>
        ))}
      </nav>

      <div class="tab-body">
        {route.tab === 'recit' && <RecitTab entry={entry} />}
        {route.tab === 'scene' && <SceneTab entry={entry} zoneId={route.zone ?? null} />}
        {route.tab === 'mots' && <WordsTab entry={entry} />}
        {route.tab === 'reflexion' && <PagesTab entry={entry} pageId={route.page ?? null} />}
        {route.tab === 'verif' && <CheckTab entry={entry} issues={issues} />}
      </div>
    </div>
  );
}
