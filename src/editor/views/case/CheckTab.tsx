import { parseSentence } from '../../../engine/markup';
import type { Issues } from '../../model';
import type { CaseEntry } from '../../store';

/** Onglet Vérification : ce qui empêche l'affaire de fonctionner, et ce qu'il faut relire. */
export function CheckTab({ entry, issues }: { entry: CaseEntry; issues: Issues }) {
  const { data } = entry;
  const blanks = data.pages.reduce((n, p) => {
    if (p.kind === 'sentences') return n + p.sentences.flatMap((s) => parseSentence(s)).filter((x) => x.type === 'blank').length;
    if (p.kind === 'identities') return n + p.people.length;
    return n + p.events.length;
  }, 0);

  return (
    <div class="grid-2">
      <section class="card">
        <h2>À corriger</h2>
        {issues.errors.length === 0 ? (
          <p class="all-good">✓ Rien ne bloque : chaque réponse peut être trouvée dans la scène.</p>
        ) : (
          <ul class="issue-list error">
            {issues.errors.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
        <h2>À relire</h2>
        {issues.warnings.length === 0 ? (
          <p class="muted">Aucune remarque.</p>
        ) : (
          <ul class="issue-list warn">
            {issues.warnings.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
        {data.draft && (
          <p class="field-hint">
            Cette affaire est un brouillon : elle n'apparaît pas dans la version publiée tant que la case « Brouillon » est
            cochée.
          </p>
        )}
      </section>
      <section class="card">
        <h2>En chiffres</h2>
        <div class="stats">
          <div class="stat">
            <strong>{data.zones.filter((z) => z.kind === 'person').length}</strong>
            <span>témoins</span>
          </div>
          <div class="stat">
            <strong>{data.zones.filter((z) => z.kind !== 'person').length}</strong>
            <span>objets et documents</span>
          </div>
          <div class="stat">
            <strong>{Object.keys(data.words).length}</strong>
            <span>mots</span>
          </div>
          <div class="stat">
            <strong>{data.pages.length}</strong>
            <span>pages</span>
          </div>
          <div class="stat">
            <strong>{blanks}</strong>
            <span>cases à remplir</span>
          </div>
        </div>
        <p class="field-hint">
          La règle d'or : chaque réponse doit pouvoir se déduire de la scène sans deviner, et une seule réponse doit être
          possible. La vérification contrôle la première moitié ; la seconde, c'est à vous de la relire.
        </p>
      </section>
    </div>
  );
}
