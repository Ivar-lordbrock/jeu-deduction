import { NumberField, TextArea } from '../../components/fields';
import { updateCase, type CaseEntry } from '../../store';
import type { CaseNotes } from '../../../types';

/** Onglet Récit : les textes montrés au joueur et les notes d'écriture. */
export function RecitTab({ entry }: { entry: CaseEntry }) {
  const { data, folder } = entry;
  const setNote = (k: keyof CaseNotes) => (v: string) => updateCase(folder, (c) => ((c.notes ??= {})[k] = v));
  const notes = data.notes ?? {};

  return (
    <div class="grid-2">
      <section class="card">
        <h2>Pour le joueur</h2>
        <TextArea
          label="Introduction"
          hint="Affichée avant l'exploration : le lieu, le moment, ce qu'on attend du joueur."
          value={data.intro}
          onInput={(v) => updateCase(folder, (c) => (c.intro = v))}
          rows={6}
        />
        <TextArea
          label="Conclusion"
          hint="Affichée quand toutes les pages de réflexion sont validées : ce qui s'est vraiment passé."
          value={data.epilogue}
          onInput={(v) => updateCase(folder, (c) => (c.epilogue = v))}
          rows={6}
        />
        <NumberField
          label="Tolérance"
          hint="Nombre d'erreurs sous lequel le jeu dit « N erreurs ou moins »."
          value={data.tolerance ?? 2}
          min={0}
          max={5}
          onInput={(v) => updateCase(folder, (c) => (c.tolerance = Math.max(0, Math.round(v))))}
        />
      </section>

      <section class="card notes-card">
        <h2>
          Notes d'écriture <small>invisibles en jeu</small>
        </h2>
        <TextArea
          label="Le moment figé"
          hint="L'instant précis que montre la scène, comme une photo."
          value={notes.moment ?? ''}
          onInput={setNote('moment')}
          rows={3}
        />
        <TextArea
          label="La vérité complète"
          hint="Qui a fait quoi, comment, pourquoi, et dans quel ordre (y compris avant la scène)."
          value={notes.truth ?? ''}
          onInput={setNote('truth')}
          rows={7}
        />
        <TextArea
          label="Les fausses pistes"
          hint="Ce qui doit faire douter le joueur."
          value={notes.falseLeads ?? ''}
          onInput={setNote('falseLeads')}
          rows={3}
        />
        <TextArea label="Autres notes" value={notes.other ?? ''} onInput={setNote('other')} rows={3} />
      </section>
    </div>
  );
}
