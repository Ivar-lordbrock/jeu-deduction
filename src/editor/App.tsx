import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { caseIssues } from './model';
import { loadReports, newReports, useReports } from './reports';
import { addChapter, casesOfChapter, createCase, flush, navigate, state, useEditor, type CaseEntry, type Route } from './store';
import { CaseView } from './views/CaseView';
import { ChapterView } from './views/ChapterView';
import { CharactersView } from './views/CharactersView';
import { ReportsView } from './views/ReportsView';
import { StoryView } from './views/StoryView';

export function App() {
  const s = useEditor();
  const mainRef = useRef<HTMLElement>(null);
  const r = s.route;
  const viewKey = r.view === 'case' ? `case:${r.folder}:${r.tab}` : r.view === 'chapter' ? `chapter:${r.id}` : r.view;

  // Nouvelle vue : on remonte en haut.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [viewKey]);

  // Les signalements des testeurs sont relus à l'ouverture : la barre latérale compte les nouveaux.
  useEffect(() => {
    void loadReports();
  }, []);

  const gameTitle = s.story?.title;
  useEffect(() => {
    document.title = `Éditeur · ${gameTitle || 'Jeu de déduction'}`;
  }, [gameTitle]);

  if (s.status === 'loading') return <div class="ed-splash">Chargement de l'histoire…</div>;
  if (s.status === 'error') {
    return (
      <div class="ed-splash error">
        <h1>L'éditeur ne peut pas démarrer</h1>
        <p>{s.loadError}</p>
      </div>
    );
  }

  return (
    <div class="ed">
      <TopBar />
      <div class="ed-body">
        <Sidebar />
        <main class="ed-main" ref={mainRef}>
          <View route={r} />
        </main>
      </div>
    </div>
  );
}

function View({ route }: { route: Route }) {
  switch (route.view) {
    case 'characters':
      return <CharactersView />;
    case 'reports':
      return <ReportsView />;
    case 'chapter':
      return <ChapterView id={route.id} />;
    case 'case':
      return <CaseView route={route} />;
    default:
      return <StoryView />;
  }
}

function TopBar() {
  const s = useEditor();
  const gameHref = s.route.view === 'case' ? `./#${s.route.folder}` : './';
  return (
    <header class="ed-top">
      <div class="ed-brand">
        <span class="ed-logo" aria-hidden="true">✎</span>
        <span>Éditeur</span>
        <span class="ed-game">{s.story.title || 'Sans titre'}</span>
      </div>
      <SaveIndicator />
      <a class="btn" href={gameHref} target="jeu-deduction" title="Le jeu se recharge tout seul à chaque enregistrement">
        ▶ Ouvrir le jeu
      </a>
    </header>
  );
}

function SaveIndicator() {
  const s = useEditor();
  switch (s.save) {
    case 'saved':
      return <span class="save-state saved">✓ Enregistré</span>;
    case 'pending':
      return <span class="save-state pending">● Modifications en cours…</span>;
    case 'saving':
      return <span class="save-state pending">Enregistrement…</span>;
    case 'error':
      return (
        <span class="save-state error" title={s.saveError ?? ''}>
          ⚠ Échec de l'enregistrement
          <button class="btn small" onClick={() => void flush()}>
            Réessayer
          </button>
        </span>
      );
  }
}

function Sidebar() {
  const s = useEditor();
  const rep = useReports();
  const r = s.route;
  const orphans = casesOfChapter(null);
  const fresh = newReports();

  return (
    <nav class="ed-side" aria-label="Navigation">
      <div class="side-section">Histoire</div>
      <SideLink active={r.view === 'story'} onClick={() => navigate({ view: 'story' })}>
        Vue d'ensemble
      </SideLink>
      <SideLink active={r.view === 'characters'} onClick={() => navigate({ view: 'characters' })}>
        Personnages <span class="count">{s.story.characters.length}</span>
      </SideLink>
      <SideLink active={r.view === 'reports'} onClick={() => navigate({ view: 'reports' })}>
        Signalements
        {fresh > 0 ? (
          <span class="badge new" title={`${fresh} signalement(s) pas encore lu(s)`}>
            {fresh}
          </span>
        ) : (
          <span class="count">{rep.status === 'ready' ? rep.items.length : ''}</span>
        )}
      </SideLink>

      <div class="side-section">
        Chapitres
        <button class="side-add" title="Nouveau chapitre" onClick={addChapter}>
          +
        </button>
      </div>
      {s.story.chapters.length === 0 && <p class="side-empty">Aucun chapitre.</p>}
      {s.story.chapters.map((ch, i) => (
        <div class="side-chapter" key={ch.id}>
          <SideLink
            active={r.view === 'chapter' && r.id === ch.id}
            class="chapter-link"
            onClick={() => navigate({ view: 'chapter', id: ch.id })}
          >
            <span class="chapter-num">{i + 1}</span>
            {ch.title || 'Sans titre'}
          </SideLink>
          {casesOfChapter(ch.id).map((c) => (
            <CaseLink key={c.folder} entry={c} />
          ))}
          <button class="side-new" onClick={() => void createCase(ch.id)}>
            + Nouvelle affaire
          </button>
        </div>
      ))}

      {orphans.length > 0 && (
        <div class="side-chapter">
          <div class="side-subtitle">Sans chapitre</div>
          {orphans.map((c) => (
            <CaseLink key={c.folder} entry={c} />
          ))}
        </div>
      )}

      {s.broken.map((b) => (
        <div key={b.folder} class="side-broken" title={b.error}>
          ⚠ {b.folder} : fichier illisible
        </div>
      ))}
    </nav>
  );
}

function CaseLink({ entry }: { entry: CaseEntry }) {
  const r = state.route;
  const issues = caseIssues(entry.data, entry.files, state.story);
  return (
    <SideLink
      active={r.view === 'case' && r.folder === entry.folder}
      class="case-link"
      onClick={() => navigate({ view: 'case', folder: entry.folder, tab: r.view === 'case' ? r.tab : 'recit' })}
    >
      <span class="case-link-title">{entry.data.title || 'Sans titre'}</span>
      {entry.data.draft && <span class="tag">brouillon</span>}
      {issues.errors.length > 0 && (
        <span class="badge error" title={`${issues.errors.length} problème(s) à corriger`}>
          {issues.errors.length}
        </span>
      )}
    </SideLink>
  );
}

function SideLink(p: { active: boolean; onClick: () => void; class?: string; children: ComponentChildren }) {
  return (
    <button class={`side-link ${p.class ?? ''}${p.active ? ' active' : ''}`} onClick={p.onClick} aria-current={p.active ? 'page' : undefined}>
      {p.children}
    </button>
  );
}
