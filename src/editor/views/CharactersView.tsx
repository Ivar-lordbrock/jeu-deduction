import { TextArea, TextField } from '../components/fields';
import { addCharacter, deleteCharacter, navigate, updateStory, useEditor } from '../store';
import type { StoryCharacter } from '../../types';

type TextKey = 'name' | 'role' | 'appearance' | 'motive' | 'notes';

/** Fiches des personnages récurrents, et les scènes où ils apparaissent. */
export function CharactersView() {
  const s = useEditor();

  function add() {
    const id = addCharacter();
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-character="${id}"] input`)?.focus());
  }

  return (
    <div class="view">
      <div class="view-head">
        <h1 class="view-title">Personnages</h1>
        <button class="btn primary" onClick={add}>
          + Nouveau personnage
        </button>
      </div>
      <p class="view-intro">
        Les fiches des personnages de l'histoire. Dans une scène, reliez un témoin à sa fiche pour l'avoir sous les yeux
        en écrivant.
      </p>
      {s.story.characters.length === 0 && <p class="empty">Aucun personnage pour l'instant.</p>}
      <div class="character-grid">
        {s.story.characters.map((ch) => (
          <CharacterCard key={ch.id} character={ch} />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({ character }: { character: StoryCharacter }) {
  const s = useEditor();
  const set = (k: TextKey) => (v: string) =>
    updateStory((st) => {
      const c = st.characters.find((x) => x.id === character.id);
      if (c) c[k] = v;
    });

  const appearances = s.cases.flatMap((entry) =>
    entry.data.zones.filter((z) => z.character === character.id).map((z) => ({ entry, zone: z })),
  );

  return (
    <section class="card character-card" data-character={character.id}>
      <div class="card-head">
        <TextField label="Nom" value={character.name} onInput={set('name')} placeholder="Nom du personnage" big />
        <button class="icon-btn danger" title="Supprimer cette fiche" onClick={() => deleteCharacter(character.id)}>
          ✕
        </button>
      </div>
      <TextField label="Rôle" value={character.role ?? ''} onInput={set('role')} placeholder="nièce du duc, cuisinier…" />
      <TextArea label="Apparence" value={character.appearance ?? ''} onInput={set('appearance')} rows={2} />
      <TextArea label="Ce qu'il veut, ce qu'il cache" value={character.motive ?? ''} onInput={set('motive')} rows={2} />
      <TextArea label="Notes" value={character.notes ?? ''} onInput={set('notes')} rows={2} />
      <div class="field">
        <span class="field-label">Apparaît dans</span>
        {appearances.length === 0 ? (
          <span class="field-hint">Aucune scène. Reliez un témoin à cette fiche depuis l'onglet « Scène » d'une affaire.</span>
        ) : (
          <div class="chips">
            {appearances.map(({ entry, zone }) => (
              <button
                key={entry.folder + zone.id}
                class="chip link"
                onClick={() => navigate({ view: 'case', folder: entry.folder, tab: 'scene', zone: zone.id })}
              >
                {entry.data.title} · {zone.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
