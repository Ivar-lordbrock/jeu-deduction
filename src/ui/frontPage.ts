/**
 * Fin d'affaire : le rapport de l'inspecteur (temps, indices, erreurs) et la une de
 * « The Whitechapel Lantern », imprimée avec l'article du joueur. La une est dessinée sur un
 * canevas : ce qu'on voit est exactement l'image qu'on télécharge pour la partager.
 */
import type { LoadedCase } from '../cases/registry';
import { GAME_TITLE } from '../config';
import { h } from '../dom';
import { parseSentence } from '../engine/markup';
import type { CaseProgress } from '../engine/progress';
import type { Zone } from '../types';
import paperUrl from '../assets/textures/paper.jpg';
import { portraitRect } from './gazette';
import { playSound } from './sound';

// ———————————————————————————————— le rapport de l'inspecteur ————————————————————————————————

export interface Report {
  time: string;
  hints: number;
  mistakes: number;
  verdict: string;
}

/** « 12 min », « 1 h 05 » ; « — » si l'affaire a été résolue avant que le jeu ne compte le temps. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return '—';
  const min = Math.round(ms / 60000);
  if (min < 1) return 'moins d\'une minute';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export function inspectorReport(p: CaseProgress): Report {
  const hints = Object.values(p.hints).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const mistakes = p.mistakes;
  const verdict =
    hints === 0 && mistakes === 0
      ? 'Digne de Scotland Yard'
      : hints <= 1 && mistakes <= 2
        ? 'Fin limier'
        : hints <= 3 && mistakes <= 5
          ? 'Bon reporter'
          : 'Apprenti détective';
  return { time: formatDuration(p.elapsed), hints, mistakes, verdict };
}

const plural = (n: number, word: string) => `${word}${n > 1 ? 's' : ''}`;

/** Le rapport, tel qu'il s'affiche dans la fenêtre de fin d'affaire. */
export function renderReport(p: CaseProgress): HTMLElement {
  const r = inspectorReport(p);
  const stat = (value: string | number, label: string) => h('div', { class: 'report-stat' }, h('dd', {}, String(value)), h('dt', {}, label));
  return h(
    'section',
    { class: 'report', 'aria-label': 'Rapport de l\'inspecteur' },
    h('h3', { class: 'report-title' }, 'Rapport de l\'inspecteur'),
    h(
      'dl',
      { class: 'report-grid' },
      stat(r.time, 'Temps d\'enquête'),
      stat(r.hints, plural(r.hints, 'Indice') + ' ' + plural(r.hints, 'demandé')),
      stat(r.mistakes, plural(r.mistakes, 'Article') + ' ' + plural(r.mistakes, 'refusé')),
    ),
    h('p', { class: 'report-verdict' }, r.verdict),
  );
}

// ———————————————————————————————— la une ————————————————————————————————

const W = 1200;
const M = 56; // marges
const INNER = W - 2 * M;
const PAPER = '#efe6cf';
const INK = '#2a211b';
const STAMP = '#8c2a1c';
const SERIF = '"IM Fell English", Georgia, serif';
const BLACKLETTER = 'UnifrakturMaguntia, "Old English Text MT", serif';
/** Les gravures de la une : la scène en noir et blanc, comme imprimée. */
const PRINT = 'grayscale(1) sepia(0.3) contrast(1.15) brightness(1.25)';

const BODY = 19;
const LEAD = 26;
const COLS = 3;
const GUTTER = 28;
const COL_W = (INNER - GUTTER * (COLS - 1)) / COLS;

interface Seg {
  text: string;
  italic: boolean;
}

/** Une rangée du texte en colonnes : une ligne, un intertitre, un blanc entre deux paragraphes. */
interface Row {
  h: number;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
  /** Intertitre : ne reste jamais seul en bas d'une colonne. */
  keep?: boolean;
  /** Blanc : inutile en haut d'une colonne. */
  gap?: boolean;
}

export interface FrontPageOptions {
  /** Numéro de l'affaire (« N° 1 »). */
  number?: number;
  onClose?: () => void;
}

/** Ouvre la une par-dessus l'écran, avec le bouton pour la télécharger. */
export function openFrontPage(data: LoadedCase, progress: CaseProgress, opts: FrontPageOptions = {}): void {
  document.querySelector('.frontpage-overlay')?.remove();
  playSound('press');

  let blobUrl: string | null = null;
  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    opts.onClose?.();
  };
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    close();
  }
  window.addEventListener('keydown', onKey, true);

  const sheet = h('div', { class: 'frontpage-sheet' }, h('p', { class: 'frontpage-wait' }, 'Les presses tournent…'));
  const download = h('a', { class: 'btn primary disabled', 'aria-disabled': 'true' }, 'Télécharger l\'image');
  const overlay = h(
    'div',
    {
      class: 'overlay frontpage-overlay',
      onClick: (e: MouseEvent) => {
        if (e.target === overlay) close();
      },
    },
    h(
      'div',
      { class: 'frontpage', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'La une de The Whitechapel Lantern' },
      sheet,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn ghost', onClick: close }, 'Fermer'), download),
    ),
  );
  document.body.append(overlay);

  void drawFrontPage(data, progress, opts.number)
    .then((canvas) => new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png')))
    .then((blob) => {
      if (!blob || !overlay.isConnected) return;
      blobUrl = URL.createObjectURL(blob);
      sheet.replaceChildren(h('img', { src: blobUrl, alt: `La une de The Whitechapel Lantern : ${data.title}` }));
      download.href = blobUrl;
      download.download = `the-whitechapel-lantern-${data.id}.png`;
      download.classList.remove('disabled');
      download.removeAttribute('aria-disabled');
    })
    .catch(() => {
      sheet.replaceChildren(h('p', { class: 'frontpage-wait' }, 'Les presses se sont enrayées : impossible d\'imprimer la une.'));
    });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const img = new Image();
  img.src = src;
  return img.decode().then(
    () => img,
    () => null,
  );
}

/** Le jour de la semaine se calcule : « le 30 septembre 1888 » devient « Dimanche 30 septembre 1888 ». */
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function caseDate(data: LoadedCase): string {
  const re = new RegExp(`(\\d{1,2})(?:er)? (${MONTHS.join('|')}) (18\\d\\d)`, 'i');
  const m = re.exec(data.intro) ?? re.exec(data.notes?.moment ?? '');
  if (!m) return 'Londres, automne 1888';
  const date = new Date(Number(m[3]), MONTHS.indexOf(m[2].toLowerCase()), Number(m[1]));
  const text = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Espaces insécables de la typographie française (pas de « ? » seul en début de ligne). */
const french = (t: string) =>
  t
    .replace(/[ \t\r\n]+/g, ' ')
    .replace(/ ([?!:;»])/g, ' $1')
    .replace(/« /g, '« ');

const fontOf = (size: number, italic: boolean) => `${italic ? 'italic ' : ''}${size}px ${SERIF}`;

/** Découpe un texte en mots ; un mot peut mêler romain et italique (« Row » en italique suivi d'un point). */
function tokenize(runs: Seg[]): Seg[][] {
  const words: Seg[][] = [];
  let cur: Seg[] = [];
  for (const r of runs) {
    french(r.text)
      .split(' ')
      .forEach((part, i) => {
        if (i > 0 && cur.length) {
          words.push(cur);
          cur = [];
        }
        if (part) cur.push({ text: part, italic: r.italic });
      });
  }
  if (cur.length) words.push(cur);
  return words;
}

function wordWidth(ctx: CanvasRenderingContext2D, word: Seg[], size: number): number {
  return word.reduce((w, s) => {
    ctx.font = fontOf(size, s.italic);
    return w + ctx.measureText(s.text).width;
  }, 0);
}

/** Lignes justifiées (sauf la dernière du paragraphe, et celles qui s'étireraient trop). */
function paragraphRows(ctx: CanvasRenderingContext2D, runs: Seg[], width: number, prefix?: string): Row[] {
  const indent = prefix ? 30 : 0;
  const words = tokenize(runs).map((segs) => ({ segs, w: wordWidth(ctx, segs, BODY) }));
  ctx.font = fontOf(BODY, false);
  const space = ctx.measureText(' ').width;
  const lines: (typeof words)[] = [];
  let line: typeof words = [];
  let used = 0;
  for (const w of words) {
    const add = line.length ? space + w.w : w.w;
    if (line.length && used + add > width - indent) {
      lines.push(line);
      line = [w];
      used = w.w;
    } else {
      line.push(w);
      used += add;
    }
  }
  if (line.length) lines.push(line);

  return lines.map((ws, li) => ({
    h: LEAD,
    draw(c, x, y) {
      const last = li === lines.length - 1;
      const total = ws.reduce((s, w) => s + w.w, 0);
      let gap = space;
      if (!last && ws.length > 1) {
        const stretched = (width - indent - total) / (ws.length - 1);
        if (stretched < space * 2.4) gap = stretched;
      }
      c.fillStyle = INK;
      c.textBaseline = 'alphabetic';
      if (prefix && li === 0) {
        c.font = fontOf(BODY, false);
        c.fillText(prefix, x, y + BODY);
      }
      let cx = x + indent;
      for (const w of ws) {
        for (const s of w.segs) {
          c.font = fontOf(BODY, s.italic);
          c.fillText(s.text, cx, y + BODY);
          cx += c.measureText(s.text).width;
        }
        cx += gap;
      }
    },
  }));
}

/** Intertitre centré, en italique, entre deux filets courts. */
function headingRows(ctx: CanvasRenderingContext2D, text: string, width: number): Row[] {
  const size = 22;
  const rows = paragraphRowsCentered(ctx, french(text), width, size);
  rows[0].h += 10;
  const first = rows[0];
  const drawFirst = first.draw;
  first.draw = (c, x, y) => {
    c.strokeStyle = INK;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + width / 2 - 40, y + 4);
    c.lineTo(x + width / 2 + 40, y + 4);
    c.stroke();
    drawFirst(c, x, y + 10);
  };
  rows.forEach((r) => (r.keep = true));
  return rows;
}

function paragraphRowsCentered(ctx: CanvasRenderingContext2D, text: string, width: number, size: number): Row[] {
  ctx.font = fontOf(size, true);
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > width) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.map((l) => ({
    h: size + 8,
    draw(c, x, y) {
      c.font = fontOf(size, true);
      c.fillStyle = INK;
      c.textAlign = 'center';
      c.fillText(l, x + width / 2, y + size);
      c.textAlign = 'left';
    },
  }));
}

const gap = (h = 10): Row => ({ h, gap: true, draw() {} });

/** Le texte de la une : les articles du joueur, cases remplies en italique, puis l'épilogue. */
function articleRows(ctx: CanvasRenderingContext2D, data: LoadedCase, progress: CaseProgress): Row[] {
  const label = (id: string) => data.words[id]?.label ?? id;
  const rows: Row[] = [];
  for (const page of data.pages) {
    if (page.kind === 'identities') continue; // les portraits sont au-dessus des colonnes
    if (rows.length) rows.push(gap(14));
    rows.push(...headingRows(ctx, page.title, COL_W));
    if (page.kind === 'sentences') {
      const slots = progress.slots[page.id] ?? [];
      let i = 0;
      const runs: Seg[] = [];
      page.sentences.forEach((sentence, si) => {
        if (si > 0) runs.push({ text: ' ', italic: false });
        for (const seg of parseSentence(sentence)) {
          if (seg.type === 'text') runs.push({ text: seg.text, italic: false });
          else {
            runs.push({ text: label(slots[i] ?? seg.answers[0]), italic: true });
            i++;
          }
        }
      });
      rows.push(...paragraphRows(ctx, runs, COL_W));
    } else {
      page.events.forEach((ev, n) => {
        if (n > 0) rows.push(gap(4));
        rows.push(...paragraphRows(ctx, [{ text: ev, italic: false }], COL_W, `${n + 1}.`));
      });
    }
  }
  const epilogue = data.epilogue.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (epilogue.length) {
    rows.push(gap(14), ...headingRows(ctx, 'Dernière heure', COL_W));
    epilogue.forEach((p, k) => {
      if (k > 0) rows.push(gap(8));
      rows.push(...paragraphRows(ctx, [{ text: p, italic: false }], COL_W));
    });
  }
  return rows;
}

/** Répartit les rangées dans les colonnes de hauteur `colH` ; null si elles débordent. */
function place(rows: Row[], colH: number): { col: number; y: number }[] | null {
  const out: { col: number; y: number }[] = [];
  let col = 0;
  let y = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.gap && y === 0) {
      out.push({ col, y: -1 });
      continue;
    }
    // un intertitre emmène avec lui les deux lignes qui le suivent
    let need = r.h;
    if (r.keep) {
      for (let j = i + 1, k = 0; j < rows.length && k < 2; j++) {
        need += rows[j].h;
        if (!rows[j].keep && !rows[j].gap) k++;
      }
    }
    if (y > 0 && y + need > colH) {
      col++;
      y = 0;
      if (r.gap) {
        out.push({ col, y: -1 });
        continue;
      }
    }
    if (col >= COLS) return null;
    out.push({ col, y });
    y += r.h;
  }
  return out;
}

/** Dessine une partie de la scène, imprimée comme une gravure, dans le cadre (dx, dy, dw, dh). */
function engraving(ctx: CanvasRenderingContext2D, img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.filter = PRINT;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
}

function hrule(ctx: CanvasRenderingContext2D, y: number, weight = 1) {
  ctx.fillStyle = INK;
  ctx.fillRect(M, y, INNER, weight);
}

function centered(ctx: CanvasRenderingContext2D, text: string, y: number, font: string, spacing = 0) {
  ctx.font = font;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  ctx.fillText(text, W / 2, y);
  if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = '0px';
  ctx.textAlign = 'left';
}

/** Coupe un titre en lignes de largeur `width`. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of french(text).split(' ')) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > width) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawFrontPage(data: LoadedCase, progress: CaseProgress, number?: number): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load(`${BODY}px "IM Fell English"`),
    document.fonts.load(`italic ${BODY}px "IM Fell English"`),
    document.fonts.load('100px UnifrakturMaguntia'),
  ]).catch(() => undefined);
  const [scene, paper] = await Promise.all([loadImage(data.sceneUrl), loadImage(paperUrl)]);

  const measure = document.createElement('canvas').getContext('2d')!;
  const rows = articleRows(measure, data, progress);

  // ——— hauteur de chaque bloc, de haut en bas ———
  measure.font = `64px ${SERIF}`;
  const headline = wrapText(measure, data.title.toUpperCase(), INNER - 40);
  const people = data.pages.flatMap((p) =>
    p.kind === 'identities'
      ? p.people.map((person, i) => ({ zone: data.zones.find((z) => z.id === person.zone), word: progress.slots[p.id]?.[i] ?? person.answer.split('/')[0] }))
      : [],
  );
  const shown = people.filter((p): p is { zone: Zone; word: string } => !!p.zone).slice(0, 6);

  const yHeadline = 372;
  const yDeck = yHeadline + (headline.length - 1) * 70 + 50;
  const yImage = yDeck + 30;
  const IMAGE_H = scene ? 430 : 0;
  const yCaption = yImage + IMAGE_H + 26;
  const yPeople = scene ? yCaption + 26 : yImage;
  const PORTRAIT = { w: 96, h: 128 };
  const peopleH = shown.length && scene ? PORTRAIT.h + 62 : 0;
  const yCols = yPeople + peopleH + 24;

  // colonnes équilibrées : la plus petite hauteur où tout le texte tient
  const total = rows.reduce((s, r) => s + r.h, 0);
  let colH = Math.ceil(total / COLS);
  let placed = place(rows, colH);
  while (!placed && colH < total + LEAD) placed = place(rows, (colH += 6));
  const yReport = yCols + colH + 34;
  const REPORT_H = 150;
  const H = yReport + REPORT_H + 80;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ——— le papier ———
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  if (paper) {
    const pattern = ctx.createPattern(paper, 'repeat');
    if (pattern) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vignette.addColorStop(0, 'rgb(90 60 20 / 0)');
  vignette.addColorStop(1, 'rgb(90 60 20 / 0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ——— le titre du journal ———
  ctx.font = `italic 17px ${SERIF}`;
  ctx.fillStyle = INK;
  ctx.fillText(number ? `N° ${number}` : 'Édition spéciale', M, 76);
  ctx.textAlign = 'right';
  ctx.fillText('Un demi-penny', W - M, 76);
  ctx.textAlign = 'left';
  centered(ctx, 'LONDRES · WHITECHAPEL', 76, `15px ${SERIF}`, 3);
  hrule(ctx, 88);
  centered(ctx, 'The Whitechapel Lantern', 200, `112px ${BLACKLETTER}`);
  centered(ctx, 'Le journal qui éclaire les ruelles de l\'East End', 236, `italic 20px ${SERIF}`);
  hrule(ctx, 252, 3);
  hrule(ctx, 258);
  centered(ctx, `${caseDate(data).toUpperCase()} · ÉDITION SPÉCIALE`, 281, `15px ${SERIF}`, 3);
  hrule(ctx, 293);

  // ——— le gros titre ———
  headline.forEach((line, i) => centered(ctx, line, yHeadline + i * 70, `64px ${SERIF}`, 2));
  centered(ctx, 'Le récit complet de notre reporter, vérifié pièce par pièce', yDeck, `italic 26px ${SERIF}`);

  // ——— la gravure de la scène ———
  if (scene) {
    const sw = data.scene.width;
    const sh = (sw * IMAGE_H) / INNER;
    const sy = Math.max(0, (data.scene.height - sh) / 2);
    engraving(ctx, scene, 0, sy, sw, sh, M, yImage, INNER, IMAGE_H);
    centered(ctx, 'La scène, telle que notre reporter l\'a trouvée.', yCaption, `italic 16px ${SERIF}`);

    // les portraits, découpés dans la scène comme dans la gazette
    if (shown.length) {
      const step = Math.min(170, INNER / shown.length);
      const x0 = W / 2 - (step * shown.length) / 2;
      shown.forEach(({ zone, word }, k) => {
        const r = portraitRect(zone);
        const scale = Math.min(PORTRAIT.w / r.w, PORTRAIT.h / r.h);
        const sw2 = PORTRAIT.w / scale;
        const sh2 = PORTRAIT.h / scale;
        const cx = x0 + step * k + step / 2;
        const dx = Math.round(cx - PORTRAIT.w / 2);
        engraving(ctx, scene, r.x + r.w / 2 - sw2 / 2, r.y + r.h / 2 - sh2 / 2, sw2, sh2, dx, yPeople, PORTRAIT.w, PORTRAIT.h);
        ctx.textAlign = 'center';
        ctx.fillStyle = INK;
        ctx.font = `italic 19px ${SERIF}`;
        ctx.fillText(data.words[word]?.label ?? word, cx, yPeople + PORTRAIT.h + 24, step - 8);
        ctx.font = `13px ${SERIF}`;
        ctx.fillText(zone.label, cx, yPeople + PORTRAIT.h + 44, step - 8);
        ctx.textAlign = 'left';
      });
    }
  }

  // ——— les colonnes ———
  hrule(ctx, yCols - 14);
  const colX = (c: number) => M + c * (COL_W + GUTTER);
  for (let c = 1; c < COLS; c++) ctx.fillRect(colX(c) - GUTTER / 2, yCols, 1, colH);
  rows.forEach((r, i) => {
    const p = placed?.[i];
    if (p && p.y >= 0 && p.col < COLS) r.draw(ctx, colX(p.col), yCols + p.y);
  });

  // ——— le rapport de l'inspecteur ———
  const rep = inspectorReport(progress);
  hrule(ctx, yReport - 14, 3);
  hrule(ctx, yReport - 8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(M + 0.5, yReport + 0.5, INNER - 1, REPORT_H);
  ctx.font = `italic 22px ${SERIF}`;
  ctx.fillStyle = INK;
  ctx.fillText('Rapport de l\'inspecteur', M + 24, yReport + 38);
  const stats: [string, string][] = [
    [rep.time, 'Temps d\'enquête'],
    [String(rep.hints), plural(rep.hints, 'Indice') + ' ' + plural(rep.hints, 'demandé')],
    [String(rep.mistakes), plural(rep.mistakes, 'Article') + ' ' + plural(rep.mistakes, 'refusé')],
  ];
  stats.forEach(([value, lbl], k) => {
    const x = M + 24 + k * 220;
    ctx.font = `40px ${SERIF}`;
    ctx.fillText(value, x, yReport + 96);
    ctx.font = `italic 16px ${SERIF}`;
    ctx.fillText(lbl, x, yReport + 124);
  });
  // le tampon de l'inspecteur
  ctx.save();
  ctx.translate(W - M - 190, yReport + REPORT_H / 2 + 4);
  ctx.rotate(-0.07);
  ctx.strokeStyle = STAMP;
  ctx.fillStyle = STAMP;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.strokeRect(-160, -42, 320, 84);
  ctx.lineWidth = 1;
  ctx.strokeRect(-153, -35, 306, 70);
  ctx.textAlign = 'center';
  ctx.font = `13px ${SERIF}`;
  if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = '3px';
  ctx.fillText('APPRÉCIATION', 0, -14);
  if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = '0px';
  ctx.font = `italic 27px ${SERIF}`;
  ctx.fillText(rep.verdict, 0, 20, 290);
  ctx.restore();

  // ——— pied de page ———
  hrule(ctx, H - 58);
  centered(ctx, `Imprimé à Whitechapel pour notre reporter · ${GAME_TITLE}`, H - 32, `italic 15px ${SERIF}`);
  return canvas;
}
