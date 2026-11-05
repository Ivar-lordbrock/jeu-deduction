import { CATEGORY_ORDER, type CaseData } from '../types';
import { wordIdsIn } from './markup';
import { expectedSlots } from './validation';

export interface CaseReport {
  /** Problèmes qui cassent l'affaire : une réponse impossible à trouver, une référence cassée… */
  errors: string[];
  /** Points à vérifier, sans bloquer : mot jamais utilisé, etc. */
  warnings: string[];
}

const ZONE_KINDS = ['person', 'object', 'document'];
const PAGE_KINDS = ['sentences', 'identities', 'chronology'];

/**
 * Vérifie la cohérence d'une affaire. La règle d'or : chaque réponse attendue
 * doit pouvoir être collectée quelque part dans la scène.
 */
export function checkCase(c: CaseData): CaseReport {
  const id = typeof c?.id === 'string' ? c.id : '?';
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(`[${id}] ${m}`);
  const warn = (m: string) => warnings.push(`[${id}] ${m}`);

  for (const field of ['id', 'title', 'intro', 'epilogue'] as const) {
    if (typeof c[field] !== 'string' || !c[field]) err(`champ « ${field} » manquant`);
  }
  if (typeof c.order !== 'number') err('champ « order » manquant (nombre)');
  const scene = c.scene;
  if (!scene || typeof scene.image !== 'string' || !(scene.width > 0) || !(scene.height > 0)) {
    err('« scene » doit contenir image, width et height');
  }
  if (!c.words || typeof c.words !== 'object') err('« words » manquant');
  if (!Array.isArray(c.zones)) err('« zones » doit être une liste');
  if (!Array.isArray(c.pages) || c.pages.length === 0) err('« pages » doit contenir au moins une page');
  if (errors.length) return { errors, warnings };

  const words = c.words;
  for (const [wid, w] of Object.entries(words)) {
    if (!w?.label) err(`mot « ${wid} » sans label`);
    if (!CATEGORY_ORDER.includes(w?.category)) {
      err(`mot « ${wid} » : catégorie « ${w?.category} » inconnue (${CATEGORY_ORDER.join(', ')})`);
    }
  }

  // Mots collectables dans la scène.
  const obtainable = new Set<string>();
  const collectFrom = (text: unknown, where: string) => {
    if (typeof text !== 'string') {
      err(`${where} : texte manquant`);
      return;
    }
    for (const w of wordIdsIn(text)) {
      if (!words[w]) err(`${where} : le mot [[${w}]] n'existe pas dans « words »`);
      obtainable.add(w);
    }
  };
  for (const w of c.startingWords ?? []) {
    if (!words[w]) err(`startingWords : le mot « ${w} » n'existe pas`);
    obtainable.add(w);
  }

  const zoneIds = new Set<string>();
  for (const z of c.zones) {
    const where = `zone « ${z.id} »`;
    if (!z.id) err('une zone n\'a pas d\'id');
    if (zoneIds.has(z.id)) err(`${where} : id en double`);
    zoneIds.add(z.id);
    if (!ZONE_KINDS.includes(z.kind)) err(`${where} : kind « ${z.kind} » inconnu (${ZONE_KINDS.join(', ')})`);
    if (!z.label) err(`${where} : label manquant`);
    const r = z.rect;
    if (!r || [r.x, r.y, r.w, r.h].some((v) => typeof v !== 'number')) {
      err(`${where} : rect doit contenir x, y, w, h`);
    } else if (r.w <= 0 || r.h <= 0 || r.x < 0 || r.y < 0 || r.x + r.w > scene.width || r.y + r.h > scene.height) {
      err(`${where} : rect sort de l'image (${scene.width}×${scene.height})`);
    }
    collectFrom(z.text, where);
    z.details?.forEach((d, i) => collectFrom(d.text, `${where}, détail ${i + 1}`));
  }

  // Pages de réflexion.
  const pageIds = new Set<string>();
  for (const page of c.pages) {
    const where = `page « ${page.id} »`;
    if (!page.id) err('une page n\'a pas d\'id');
    if (pageIds.has(page.id)) err(`${where} : id en double`);
    pageIds.add(page.id);
    if (!page.title) err(`${where} : titre manquant`);
    if (!PAGE_KINDS.includes(page.kind)) {
      err(`${where} : kind « ${(page as { kind: string }).kind} » inconnu (${PAGE_KINDS.join(', ')})`);
      continue;
    }

    if (page.kind === 'chronology') {
      if (!Array.isArray(page.events) || page.events.length < 2) err(`${where} : il faut au moins 2 événements`);
      else if (new Set(page.events).size !== page.events.length) err(`${where} : deux événements identiques`);
      continue;
    }

    if (page.kind === 'sentences') {
      if (!Array.isArray(page.sentences) || page.sentences.length === 0) {
        err(`${where} : aucune phrase`);
        continue;
      }
    }
    if (page.kind === 'identities') {
      if (!Array.isArray(page.people) || page.people.length === 0) {
        err(`${where} : aucun personnage`);
        continue;
      }
      for (const p of page.people) {
        const zone = c.zones.find((z) => z.id === p.zone);
        if (!zone) err(`${where} : la zone « ${p.zone} » n'existe pas`);
        else if (zone.kind !== 'person') warn(`${where} : la zone « ${p.zone} » n'est pas un personnage`);
      }
    }

    const slots = expectedSlots(page);
    if (slots.length === 0) err(`${where} : aucune case à remplir`);
    slots.forEach((answers, i) => {
      for (const a of answers) {
        if (!words[a]) err(`${where}, case ${i + 1} : la réponse « ${a} » n'existe pas dans « words »`);
      }
      if (!answers.some((a) => obtainable.has(a))) {
        err(`${where}, case ${i + 1} : la réponse « ${answers.join('/')} » ne peut être trouvée nulle part dans la scène`);
      }
    });
  }

  // Les mots qui ne sont la réponse d'aucune case sont normaux : ce sont les fausses pistes.
  for (const wid of Object.keys(words)) {
    if (!obtainable.has(wid)) warn(`le mot « ${wid} » est défini mais n'apparaît dans aucun texte`);
  }

  return { errors, warnings };
}
