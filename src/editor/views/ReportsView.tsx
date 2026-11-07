import { useEffect, useState } from 'preact/hooks';
import { contextFolder, REPORT_STATUSES, type InboxReport } from '../../engine/report';
import { loadReports, reports, setReportStatus, useReports } from '../reports';
import { navigate, useEditor } from '../store';

type KindFilter = 'tous' | 'bug' | 'idee';

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE.format(d);
};
const isBug = (r: InboxReport) => r.type.toLowerCase().startsWith('bug');

/** Les bugs et les idées envoyés par les testeurs (bouton « Signaler » du jeu). */
export function ReportsView() {
  const st = useReports();
  const [kind, setKind] = useState<KindFilter>('tous');
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (reports.status === 'idle') void loadReports();
  }, []);

  const shown = [...st.items]
    .reverse()
    .filter((r) => (kind === 'tous' ? true : kind === 'bug' ? isBug(r) : !isBug(r)))
    .filter((r) => showDone || r.statut !== 'réglé');
  const done = st.items.filter((r) => r.statut === 'réglé').length;

  return (
    <div class="view narrow reports-view">
      <div class="view-head">
        <h1 class="view-title">Signalements</h1>
        <button class="btn" onClick={() => void loadReports()} disabled={st.status === 'loading'}>
          {st.status === 'loading' ? 'Lecture…' : '↻ Rafraîchir'}
        </button>
      </div>
      <p class="view-intro">
        Les bugs et les idées que les testeurs envoient avec le bouton « Signaler » du jeu. Ils arrivent dans un tableur
        Google ; le statut choisi ici y est enregistré.
        {st.loadedAt && <span class="reports-time"> Lu à {st.loadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.</span>}
      </p>

      {st.error && <p class="reports-error">⚠ {st.error}</p>}

      {st.items.length > 0 && (
        <div class="reports-filters">
          <div class="segmented" role="group" aria-label="Type">
            {(
              [
                ['tous', 'Tous'],
                ['bug', 'Bugs'],
                ['idee', 'Idées'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} class={kind === k ? 'active' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>
                {label}
              </button>
            ))}
          </div>
          <label class="reports-done">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone((e.target as HTMLInputElement).checked)} />
            Montrer les réglés ({done})
          </label>
        </div>
      )}

      {st.status === 'ready' && shown.length === 0 && (
        <p class="empty">{st.items.length === 0 ? 'Aucun signalement pour l’instant.' : 'Rien à traiter avec ces filtres.'}</p>
      )}
      <div class="reports-list">
        {shown.map((r) => (
          <ReportCard key={r.ligne} report={r} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report: r }: { report: InboxReport }) {
  const s = useEditor();
  const folder = contextFolder(r.contexte);
  const known = folder ? s.cases.find((c) => c.folder === folder) : undefined;
  return (
    <section class={`card report-card status-${r.statut === 'réglé' ? 'regle' : r.statut}`}>
      <div class="report-head">
        <span class={`badge ${isBug(r) ? 'error' : 'idea'}`}>{r.type || '?'}</span>
        <span class="report-meta">
          {formatDate(r.date)}
          {r.nom && <> · {r.nom}</>}
          {known && <> · {known.data.title}</>}
        </span>
        <div class="segmented report-status-pick" role="group" aria-label="Statut">
          {REPORT_STATUSES.map((x) => (
            <button key={x} class={r.statut === x ? 'active' : ''} aria-pressed={r.statut === x} onClick={() => void setReportStatus(r.ligne, x)}>
              {x}
            </button>
          ))}
        </div>
      </div>
      <p class="report-message">{r.message}</p>
      <div class="report-foot">
        {r.contexte && (
          <details class="report-ctx">
            <summary>Contexte</summary>
            <pre>{r.contexte}</pre>
          </details>
        )}
        {known && (
          <button class="btn small" onClick={() => navigate({ view: 'case', folder: known.folder, tab: 'scene' })}>
            Ouvrir l'affaire
          </button>
        )}
      </div>
    </section>
  );
}
