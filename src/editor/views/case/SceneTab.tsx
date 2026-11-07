import { useEffect, useRef, useState } from 'preact/hooks';
import { caseScenes, MAIN_SCENE, sceneById, zoneSceneId, type SceneInfo } from '../../../engine/scenes';
import type { Rect, Zone, ZoneKind } from '../../../types';
import { Segmented, Select, TextArea, TextField } from '../../components/fields';
import { RichField } from '../../components/RichField';
import { moveZoneToScene, newZone, removeScene, removeZone, ZONE_KIND_LABELS, ZONE_KINDS } from '../../model';
import { addSceneFromFile, navigate, updateCase, uploadSceneImage, useEditor, type CaseEntry } from '../../store';

type Corner = 'nw' | 'ne' | 'sw' | 'se';
interface Pt {
  x: number;
  y: number;
}
type Drag =
  | { mode: 'draw'; start: Pt; rect: Rect }
  | { mode: 'move'; zone: string; start: Pt; origin: Rect }
  | { mode: 'resize'; zone: string; corner: Corner; start: Pt; origin: Rect };

const MIN_SIZE = 12;
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
const kindOptions = ZONE_KINDS.map((k) => ({ value: k, label: ZONE_KIND_LABELS[k].one }));

/** Onglet Scène : l'image, ses zones (témoins, objets, documents) et leurs textes. */
export function SceneTab({ entry, zoneId }: { entry: CaseEntry; zoneId: string | null }) {
  const { data, folder } = entry;
  const [tool, setTool] = useState<ZoneKind>('person');
  const [showLabels, setShowLabels] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [chosen, setChosen] = useState(MAIN_SCENE);
  const fileRef = useRef<HTMLInputElement>(null);
  const zone = data.zones.find((z) => z.id === zoneId) ?? null;
  const select = (id: string | null) => navigate({ view: 'case', folder, tab: 'scene', zone: id }, true);
  const scenes = caseScenes(data);
  // La scène affichée : celle de la zone sélectionnée, sinon celle de l'onglet choisi.
  const zoneScene = zone ? zoneSceneId(zone) : null;
  const scene = sceneById(data, zoneScene ?? chosen);
  useEffect(() => {
    if (zoneScene !== null) setChosen(zoneScene);
  }, [zoneScene]);
  const pickScene = (id: string) => {
    setChosen(id);
    if (zoneScene !== null && zoneScene !== id) select(null);
  };

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await uploadSceneImage(folder, file, scene.id);
    } catch (err) {
      alert(`Import impossible : ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div class="scene-tab">
      <div class="scene-main">
        <ScenesBar entry={entry} scenes={scenes} current={scene} onPick={pickScene} />
        <div class="scene-toolbar">
          <span class="muted small">Tracer un</span>
          <Segmented value={tool} options={kindOptions} onChange={setTool} />
          <label class="check">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.currentTarget.checked)} />
            Noms
          </label>
          <span class="spacer" />
          <span class="muted small">
            {scene.image} · {scene.width}×{scene.height}
          </span>
          <button class="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Import…' : 'Changer l\'image…'}
          </button>
          <input ref={fileRef} type="file" accept=".svg,.png,.jpg,.jpeg,.webp" hidden onChange={onFile} />
        </div>
        <SceneCanvas key={scene.id} entry={entry} scene={scene} selected={zoneId} onSelect={select} tool={tool} showLabels={showLabels} />
        <p class="field-hint">
          Tracez un rectangle sur l'image pour ajouter un {ZONE_KIND_LABELS[tool].one.toLowerCase()}. Cliquez une zone pour
          la modifier, faites-la glisser pour la déplacer, tirez un coin pour la redimensionner.
        </p>
      </div>
      <aside class="scene-side">
        <ZoneList entry={entry} scene={scene} selected={zoneId} onSelect={select} />
        {zone ? (
          <ZoneForm key={zone.id} entry={entry} zone={zone} onDeleted={() => select(null)} />
        ) : (
          <p class="empty">Sélectionnez une zone pour écrire ce que le joueur découvre en cliquant dessus.</p>
        )}
      </aside>
    </div>
  );
}

/**
 * Les scènes de l'affaire : la première, puis d'autres pièces ou d'autres moments.
 * Onglets pour passer de l'une à l'autre, nom de l'onglet, ajout et suppression.
 */
function ScenesBar(p: { entry: CaseEntry; scenes: SceneInfo[]; current: SceneInfo; onPick: (id: string) => void }) {
  const { data, folder } = p.entry;
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const multi = p.scenes.length > 1;
  const isMain = p.current.id === MAIN_SCENE;
  const count = (id: string) => data.zones.filter((z) => zoneSceneId(z) === id).length;
  const title = isMain ? (data.scene.title ?? '') : p.current.title;

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const id = await addSceneFromFile(folder, file);
      if (id) p.onPick(id);
    } catch (err) {
      alert(`Import impossible : ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function setTitle(v: string) {
    updateCase(folder, (c) => {
      if (isMain) {
        if (v.trim()) c.scene.title = v;
        else delete c.scene.title;
      } else {
        const sc = c.scenes?.find((x) => x.id === p.current.id);
        if (sc) sc.title = v;
      }
    });
  }

  function remove() {
    const n = count(p.current.id);
    const zones = n === 0 ? '' : n === 1 ? '\nSa zone sera supprimée aussi.' : `\nSes ${n} zones seront supprimées aussi.`;
    if (!confirm(`Supprimer la scène « ${p.current.title} » ?${zones}\nSon image reste dans le dossier de l'affaire.`)) return;
    updateCase(folder, (c) => removeScene(c, p.current.id));
    p.onPick(MAIN_SCENE);
  }

  return (
    <div class="scene-pick">
      {multi && (
        <div class="segmented scene-pick-tabs">
          {p.scenes.map((sc, i) => (
            <button key={sc.id} class={sc.id === p.current.id ? 'active' : ''} onClick={() => p.onPick(sc.id)}>
              {i + 1}. {sc.title || 'Sans nom'} <span class="scene-pick-count">{count(sc.id)}</span>
            </button>
          ))}
        </div>
      )}
      <button
        class="btn small"
        disabled={busy}
        title="Une autre pièce, ou le même lieu à un autre moment : le joueur passe de l'une à l'autre par des onglets."
        onClick={() => fileRef.current?.click()}
      >
        {busy ? 'Import…' : '+ Ajouter une scène…'}
      </button>
      <input ref={fileRef} type="file" accept=".svg,.png,.jpg,.jpeg,.webp" hidden onChange={onFile} />
      {multi && (
        <div class="scene-pick-meta">
          <label class="scene-pick-title">
            <span class="muted small">Nom de l'onglet</span>
            <input
              class="input"
              value={title}
              placeholder={isMain ? 'Première scène' : 'Le bureau du directeur'}
              onInput={(e) => setTitle(e.currentTarget.value)}
            />
          </label>
          {!isMain && (
            <button class="btn danger small" onClick={remove}>
              Supprimer cette scène
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SceneCanvas(p: {
  entry: CaseEntry;
  scene: SceneInfo;
  selected: string | null;
  onSelect: (id: string | null) => void;
  tool: ZoneKind;
  showLabels: boolean;
}) {
  const { data, folder } = p.entry;
  const W = p.scene.width;
  const H = p.scene.height;
  const stage = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const hasImage = p.entry.files.includes(p.scene.image);
  const zones = data.zones.filter((z) => zoneSceneId(z) === p.scene.id);

  const toScene = (e: PointerEvent): Pt => {
    const r = (stage.current as HTMLDivElement).getBoundingClientRect();
    return {
      x: clamp(Math.round(((e.clientX - r.left) / r.width) * W), 0, W),
      y: clamp(Math.round(((e.clientY - r.top) / r.height) * H), 0, H),
    };
  };

  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const zoneEl = target.closest<HTMLElement>('[data-zone]');
    const cornerEl = target.closest<HTMLElement>('[data-corner]');
    const z = zoneEl ? zones.find((x) => x.id === zoneEl.dataset.zone) : undefined;
    const start = toScene(e);
    (stage.current as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    if (z && cornerEl) setDrag({ mode: 'resize', zone: z.id, corner: cornerEl.dataset.corner as Corner, start, origin: { ...z.rect } });
    else if (z) {
      p.onSelect(z.id);
      setDrag({ mode: 'move', zone: z.id, start, origin: { ...z.rect } });
    } else setDrag({ mode: 'draw', start, rect: { x: start.x, y: start.y, w: 0, h: 0 } });
  }

  function onMove(e: PointerEvent) {
    if (!drag) return;
    const pt = toScene(e);
    const dx = pt.x - drag.start.x;
    const dy = pt.y - drag.start.y;
    if (drag.mode === 'draw') {
      setDrag({
        ...drag,
        rect: { x: Math.min(pt.x, drag.start.x), y: Math.min(pt.y, drag.start.y), w: Math.abs(dx), h: Math.abs(dy) },
      });
      return;
    }
    const o = drag.origin;
    const r =
      drag.mode === 'move'
        ? { ...o, x: clamp(o.x + dx, 0, W - o.w), y: clamp(o.y + dy, 0, H - o.h) }
        : resize(o, drag.corner, dx, dy, W, H);
    const current = data.zones.find((z) => z.id === drag.zone)?.rect;
    if (!current || (current.x === r.x && current.y === r.y && current.w === r.w && current.h === r.h)) return;
    updateCase(folder, (c) => {
      const z = c.zones.find((x) => x.id === drag.zone);
      if (z) z.rect = r;
    });
  }

  function onUp() {
    if (drag?.mode === 'draw') {
      const r = drag.rect;
      if (r.w >= MIN_SIZE && r.h >= MIN_SIZE) {
        let id = '';
        updateCase(folder, (c) => (id = newZone(c, p.tool, r, p.scene.id).id));
        p.onSelect(id);
      } else p.onSelect(null);
    }
    setDrag(null);
  }

  return (
    <div class="sc-wrap">
      <div
        ref={stage}
        class="sc-stage"
        style={{ aspectRatio: `${W} / ${H}`, '--ar': String(W / H) }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {hasImage ? (
          <img class="sc-img" src={`/src/cases/${folder}/${p.scene.image}?rev=${p.entry.imageRev}`} alt="" draggable={false} />
        ) : (
          <div class="sc-missing">Image introuvable : {p.scene.image}</div>
        )}
        {zones.map((z) => {
          const sel = z.id === p.selected;
          return (
            <div
              key={z.id}
              data-zone={z.id}
              class={`sc-zone kind-${z.kind}${sel ? ' selected' : ''}`}
              style={{ left: pct(z.rect.x / W), top: pct(z.rect.y / H), width: pct(z.rect.w / W), height: pct(z.rect.h / H) }}
              title={z.label}
            >
              {p.showLabels && <span class="sc-label">{z.label}</span>}
              {sel && CORNERS.map((c) => <span key={c} data-corner={c} class={`sc-handle ${c}`} />)}
            </div>
          );
        })}
        {drag?.mode === 'draw' && (
          <div
            class={`sc-zone drawing kind-${p.tool}`}
            style={{ left: pct(drag.rect.x / W), top: pct(drag.rect.y / H), width: pct(drag.rect.w / W), height: pct(drag.rect.h / H) }}
          />
        )}
      </div>
    </div>
  );
}

function resize(o: Rect, corner: Corner, dx: number, dy: number, W: number, H: number): Rect {
  let x1 = o.x;
  let y1 = o.y;
  let x2 = o.x + o.w;
  let y2 = o.y + o.h;
  if (corner.includes('w')) x1 = clamp(x1 + dx, 0, x2 - MIN_SIZE);
  else x2 = clamp(x2 + dx, x1 + MIN_SIZE, W);
  if (corner.includes('n')) y1 = clamp(y1 + dy, 0, y2 - MIN_SIZE);
  else y2 = clamp(y2 + dy, y1 + MIN_SIZE, H);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function ZoneList(p: { entry: CaseEntry; scene: SceneInfo; selected: string | null; onSelect: (id: string) => void }) {
  const { data, folder } = p.entry;
  const sceneZones = data.zones.filter((z) => zoneSceneId(z) === p.scene.id);

  function add(kind: ZoneKind) {
    const W = p.scene.width;
    const H = p.scene.height;
    const w = Math.round(W * 0.12);
    const h = Math.round(kind === 'person' ? H * 0.45 : H * 0.12);
    let id = '';
    updateCase(folder, (c) => (id = newZone(c, kind, { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h }, p.scene.id).id));
    p.onSelect(id);
  }

  return (
    <div class="zone-list">
      {ZONE_KINDS.map((kind) => {
        const zones = sceneZones.filter((z) => z.kind === kind);
        return (
          <div class="zone-group" key={kind}>
            <div class="zone-group-head">
              <span class={`dot kind-${kind}`} />
              {ZONE_KIND_LABELS[kind].many}
              <span class="count">{zones.length}</span>
              <span class="spacer" />
              <button class="icon-btn" title={`Ajouter : ${ZONE_KIND_LABELS[kind].fresh.toLowerCase()}`} onClick={() => add(kind)}>
                +
              </button>
            </div>
            {zones.map((z) => (
              <button key={z.id} class={`zone-item${z.id === p.selected ? ' active' : ''}`} onClick={() => p.onSelect(z.id)}>
                {z.label || 'Sans nom'}
                {!z.text.trim() && (
                  <span class="warn-dot" title="Pas encore de description">
                    !
                  </span>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ZoneForm({ entry, zone, onDeleted }: { entry: CaseEntry; zone: Zone; onDeleted: () => void }) {
  const s = useEditor();
  const { data, folder } = entry;
  const upd = (fn: (z: Zone) => void) =>
    updateCase(folder, (c) => {
      const z = c.zones.find((x) => x.id === zone.id);
      if (z) fn(z);
    });
  const character = s.story.characters.find((c) => c.id === zone.character);
  const isPerson = zone.kind === 'person';
  const usedInIdentities = data.pages.some((pg) => pg.kind === 'identities' && pg.people.some((x) => x.zone === zone.id));
  const scenes = caseScenes(data);
  const scene = sceneById(data, zoneSceneId(zone));

  function remove() {
    const extra = usedInIdentities ? '\nElle sera aussi retirée de la page « Qui est qui ? ».' : '';
    if (!confirm(`Supprimer « ${zone.label} » ?${extra}`)) return;
    updateCase(folder, (c) => removeZone(c, zone.id));
    onDeleted();
  }

  const setRect = (k: keyof Rect) => (v: string) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return;
    upd((z) => {
      const r = { ...z.rect, [k]: n };
      r.w = clamp(r.w, MIN_SIZE, scene.width);
      r.h = clamp(r.h, MIN_SIZE, scene.height);
      r.x = clamp(r.x, 0, scene.width - r.w);
      r.y = clamp(r.y, 0, scene.height - r.h);
      z.rect = r;
    });
  };

  return (
    <div class="zone-form">
      <div class="card-head">
        <h3>
          <span class={`dot kind-${zone.kind}`} /> {ZONE_KIND_LABELS[zone.kind].one}
        </h3>
        <button class="btn danger small" onClick={remove}>
          Supprimer
        </button>
      </div>
      <TextField
        label="Nom affiché au survol"
        hint={isPerson ? 'Restez neutre (« Homme en bleu ») : le joueur doit deviner le vrai nom.' : undefined}
        value={zone.label}
        onInput={(v) => upd((z) => (z.label = v))}
      />
      <Segmented
        label="Type"
        value={zone.kind}
        options={kindOptions}
        onChange={(k) =>
          upd((z) => {
            z.kind = k;
            if (k !== 'person') delete z.character;
          })
        }
      />
      {scenes.length > 1 && (
        <Select
          label="Scène"
          value={scene.id}
          options={scenes.map((sc, i) => ({ value: sc.id, label: `${i + 1}. ${sc.title}` }))}
          onChange={(v) => updateCase(folder, (c) => moveZoneToScene(c, zone.id, v))}
          hint="La pièce (ou le moment) où se trouve cette zone. Elle garde sa place, à recaler sur la nouvelle image."
        />
      )}
      {isPerson && (
        <Select
          label="Personnage de l'histoire"
          value={zone.character ?? ''}
          options={[{ value: '', label: '— aucun —' }, ...s.story.characters.map((c) => ({ value: c.id, label: c.name || 'Sans nom' }))]}
          onChange={(v) =>
            upd((z) => {
              if (v) z.character = v;
              else delete z.character;
            })
          }
          hint={s.story.characters.length === 0 ? 'Créez d\'abord des fiches dans « Personnages ».' : undefined}
        />
      )}
      {character && (
        <div class="character-peek">
          <strong>{character.name}</strong>
          {character.role && <span> · {character.role}</span>}
          {character.appearance && <p>{character.appearance}</p>}
          {character.motive && <p class="muted">{character.motive}</p>}
        </div>
      )}
      <RichField
        mode="rich"
        folder={folder}
        data={data}
        label="Description"
        hint="Sélectionnez un mot puis « ★ Mot à trouver » : le joueur pourra le noter."
        placeholder="Ce que le joueur découvre en cliquant…"
        value={zone.text}
        onChange={(v) => upd((z) => (z.text = v))}
        rows={4}
      />

      <div class="field">
        <span class="field-label">
          Gros plans <span class="muted">(poche, tiroir, verso…)</span>
        </span>
        {(zone.details ?? []).map((d, i) => (
          <div class="detail-card" key={i}>
            <div class="row">
              <input
                class="input"
                value={d.label}
                placeholder="Poche de veste"
                aria-label="Titre du gros plan"
                onInput={(e) => {
                  const v = e.currentTarget.value;
                  upd((z) => z.details && (z.details[i].label = v));
                }}
              />
              <button
                class="icon-btn danger"
                title="Supprimer ce gros plan"
                onClick={() =>
                  upd((z) => {
                    z.details?.splice(i, 1);
                    if (!z.details?.length) delete z.details;
                  })
                }
              >
                ✕
              </button>
            </div>
            <RichField
              mode="rich"
              folder={folder}
              data={data}
              value={d.text}
              rows={3}
              onChange={(v) => upd((z) => z.details && (z.details[i].text = v))}
            />
          </div>
        ))}
        <button class="btn small" onClick={() => upd((z) => (z.details ??= []).push({ label: '', text: '' }))}>
          + Ajouter un gros plan
        </button>
      </div>

      <TextArea
        label="Note de l'auteur"
        hint="Invisible en jeu : ce que cette zone prouve."
        value={zone.notes ?? ''}
        onInput={(v) => upd((z) => (z.notes = v))}
        rows={2}
      />

      <div class="field">
        <span class="field-label">Position en pixels</span>
        <div class="rect-fields">
          {(['x', 'y', 'w', 'h'] as const).map((k) => (
            <label key={k}>
              {k === 'w' ? 'largeur' : k === 'h' ? 'hauteur' : k}
              <input class="input" type="number" value={zone.rect[k]} onChange={(e) => setRect(k)(e.currentTarget.value)} />
            </label>
          ))}
        </div>
      </div>
      <p class="field-hint">Identifiant : {zone.id}</p>
    </div>
  );
}
