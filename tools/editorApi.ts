/**
 * API de l'éditeur, active uniquement avec « npm run dev ».
 * L'éditeur (editeur.html) lit et écrit directement les fichiers du jeu :
 * src/story/story.json et src/cases/<dossier>/case.json (+ images).
 */
import { promises as fs } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Plugin } from 'vite';
import { slugify, uniqueId } from '../src/engine/slug.ts';
import { REPORT_INBOX } from '../src/signalements.ts';

const FOLDER_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
const IMAGE_FILE_RE = /^[a-z0-9][a-z0-9_-]{0,80}\.(svg|png|jpe?g|webp)$/i;
const IMAGE_EXT_RE = /\.(svg|png|jpe?g|webp)$/i;
const MAX_BODY = 25 * 1024 * 1024;

/** Événement envoyé au jeu quand une donnée change : il se recharge, l'éditeur non. */
export const DATA_CHANGED_EVENT = 'jeu:data-changed';

const DEFAULT_STORY = {
  title: 'Jeu de déduction',
  subtitle: '',
  setting: '',
  tone: '',
  synopsis: '',
  notes: '',
  characters: [],
  chapters: [],
};

const placeholderSvg = (title: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="#2a211b"/>
  <rect x="40" y="40" width="1520" height="820" fill="none" stroke="#5a4a3c" stroke-width="4" stroke-dasharray="18 14"/>
  <text x="800" y="430" font-family="Georgia, serif" font-size="56" fill="#d4a94f" text-anchor="middle">${escapeXml(title)}</text>
  <text x="800" y="500" font-family="Georgia, serif" font-size="30" fill="#a3957f" text-anchor="middle">Scène à illustrer : importez une image dans l'éditeur</text>
</svg>
`;

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Fichier trop lourd (25 Mo maximum)'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse((await readBody(req)).toString('utf8'));
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, 'Données JSON invalides');
  }
}

async function readJsonFile(file: string): Promise<unknown> {
  return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^﻿/, ''));
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

const stringify = (data: unknown) => JSON.stringify(data, null, 2) + '\n';

export function editorApi(): Plugin {
  let root = process.cwd();
  const casesDir = () => path.join(root, 'src', 'cases');
  const storyFile = () => path.join(root, 'src', 'story', 'story.json');
  const tmpDir = () => path.join(root, 'node_modules', '.editor-tmp');
  const trashDir = () => path.join(root, 'corbeille');

  /** Écriture atomique : le fichier temporaire est hors de src pour ne pas déclencher de rechargement. */
  async function writeFileSafe(file: string, content: string | Buffer) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.mkdir(tmpDir(), { recursive: true });
    const tmp = path.join(tmpDir(), `${path.basename(file)}.${process.pid}.${Date.now()}`);
    await fs.writeFile(tmp, content);
    try {
      await fs.rename(tmp, file);
    } catch {
      await fs.writeFile(file, content);
      await fs.rm(tmp, { force: true });
    }
  }

  function caseDir(folder: string): string {
    if (!FOLDER_RE.test(folder)) throw new HttpError(400, `Nom de dossier invalide : ${folder}`);
    return path.join(casesDir(), folder);
  }

  async function readProject() {
    const story = (await exists(storyFile())) ? await readJsonFile(storyFile()) : DEFAULT_STORY;
    const cases: { folder: string; data?: unknown; error?: string; files: string[] }[] = [];
    for (const entry of await fs.readdir(casesDir(), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(casesDir(), entry.name);
      const names = await fs.readdir(dir);
      if (!names.includes('case.json')) continue;
      const files = names.filter((n) => IMAGE_EXT_RE.test(n));
      try {
        cases.push({ folder: entry.name, data: await readJsonFile(path.join(dir, 'case.json')), files });
      } catch (e) {
        cases.push({ folder: entry.name, error: `case.json illisible : ${(e as Error).message}`, files });
      }
    }
    return { story, cases };
  }

  async function createCase(body: Record<string, unknown>) {
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Nouvelle affaire';
    const chapter = typeof body.chapter === 'string' && body.chapter ? body.chapter : undefined;
    const { cases } = await readProject();
    const folders = cases.map((c) => c.folder);
    const datas = cases.map((c) => c.data as { id?: string; chapter?: string; order?: number } | undefined);

    const nextNum = Math.max(0, ...folders.map((f) => parseInt(f, 10)).filter((n) => !Number.isNaN(n))) + 1;
    const slug = slugify(title) || 'affaire';
    const folder = uniqueId(`${String(nextNum).padStart(2, '0')}-${slug}`, folders);
    const id = uniqueId(slug, datas.map((d) => d?.id ?? ''));
    const order = Math.max(0, ...datas.filter((d) => d?.chapter === chapter).map((d) => d?.order ?? 0)) + 1;

    const data = {
      id,
      order,
      ...(chapter ? { chapter } : {}),
      draft: true,
      title,
      intro: '',
      epilogue: '',
      notes: { moment: '', truth: '', falseLeads: '', other: '' },
      scene: { image: 'scene.svg', width: 1600, height: 900 },
      tolerance: 2,
      words: {},
      zones: [],
      pages: [],
    };
    const dir = caseDir(folder);
    await writeFileSafe(path.join(dir, 'scene.svg'), placeholderSvg(title));
    await writeFileSafe(path.join(dir, 'case.json'), stringify(data));
    return { folder, data, files: ['scene.svg'] };
  }

  async function trashCase(folder: string) {
    const dir = caseDir(folder);
    if (!(await exists(dir))) throw new HttpError(404, 'Affaire introuvable');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const target = path.join(trashDir(), `${folder}-${stamp}`);
    await fs.mkdir(trashDir(), { recursive: true });
    try {
      await fs.rename(dir, target);
    } catch {
      await fs.cp(dir, target, { recursive: true });
      await fs.rm(dir, { recursive: true, force: true });
    }
    return { trashedTo: path.relative(root, target) };
  }

  /** Clé de la boîte aux lettres des signalements : SIGNALEMENTS_CLE dans .env.local (jamais dans le dépôt). */
  async function inboxKey(): Promise<string> {
    try {
      const env = await fs.readFile(path.join(root, '.env.local'), 'utf8');
      return /^\s*SIGNALEMENTS_CLE\s*=\s*(\S+)\s*$/m.exec(env)?.[1] ?? '';
    } catch {
      return '';
    }
  }

  /** Relit la boîte aux lettres (tools/signalements.gs) ou y change un statut : le script répond en JSON. */
  async function inbox(params: Record<string, string>) {
    const cle = await inboxKey();
    if (!REPORT_INBOX || !cle) throw new HttpError(503, 'Boîte aux lettres pas encore branchée : adresse dans src/signalements.ts, clé SIGNALEMENTS_CLE dans .env.local');
    const r = await fetch(`${REPORT_INBOX}?${new URLSearchParams({ ...params, cle })}`, { redirect: 'follow' });
    let body: { ok?: boolean; erreur?: string } = {};
    try {
      body = await r.json();
    } catch {
      throw new HttpError(502, `Réponse illisible de la boîte aux lettres (${r.status})`);
    }
    if (!body.ok) throw new HttpError(502, `Boîte aux lettres : ${body.erreur ?? 'refus'}`);
    return body;
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const method = req.method ?? 'GET';
    const route = `${method} ${parts[0] ?? ''}${parts.length > 1 ? '/:folder' : ''}${parts.length > 2 ? '/' + parts[2] : ''}`;

    switch (route) {
      case 'GET project':
        return send(res, 200, await readProject());

      case 'PUT story': {
        const story = await readJsonBody(req);
        if (typeof story.title !== 'string' || !Array.isArray(story.chapters) || !Array.isArray(story.characters)) {
          throw new HttpError(400, 'Histoire incomplète (title, chapters, characters)');
        }
        await writeFileSafe(storyFile(), stringify(story));
        return send(res, 200, { ok: true });
      }

      case 'POST cases':
        return send(res, 201, await createCase(await readJsonBody(req)));

      case 'PUT cases/:folder': {
        const dir = caseDir(parts[1]);
        if (!(await exists(path.join(dir, 'case.json')))) throw new HttpError(404, 'Affaire introuvable');
        const data = await readJsonBody(req);
        if (typeof data.id !== 'string' || !Array.isArray(data.zones) || !Array.isArray(data.pages) || typeof data.words !== 'object') {
          throw new HttpError(400, 'Affaire incomplète (id, words, zones, pages)');
        }
        await writeFileSafe(path.join(dir, 'case.json'), stringify(data));
        return send(res, 200, { ok: true });
      }

      case 'DELETE cases/:folder':
        return send(res, 200, await trashCase(parts[1]));

      case 'GET signalements':
        return send(res, 200, await inbox({ action: 'liste' }));

      case 'POST signalements': {
        const body = await readJsonBody(req);
        return send(res, 200, await inbox({ action: 'statut', ligne: String(body.ligne ?? ''), statut: String(body.statut ?? '') }));
      }

      case 'PUT cases/:folder/files': {
        const dir = caseDir(parts[1]);
        const name = parts[3] ?? '';
        if (!IMAGE_FILE_RE.test(name)) throw new HttpError(400, 'Nom d\'image invalide (svg, png, jpg ou webp)');
        if (!(await exists(dir))) throw new HttpError(404, 'Affaire introuvable');
        await writeFileSafe(path.join(dir, name), await readBody(req));
        return send(res, 200, { ok: true, file: name });
      }

      default:
        throw new HttpError(404, `Route inconnue : ${method} ${url.pathname}`);
    }
  }

  return {
    name: 'jeu-deduction-editor-api',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use('/__api', (req, res) => {
        handle(req, res).catch((e: unknown) => {
          const status = e instanceof HttpError ? e.status : 500;
          send(res, status, { error: e instanceof Error ? e.message : String(e) });
        });
      });
    },
    // « post » : passe après le plugin import.meta.glob de Vite, qui sinon rechargerait
    // toutes les pages (l'éditeur compris) à chaque création de fichier.
    hotUpdate: {
      order: 'post',
      handler(options) {
        const normalizedRoot = root.replace(/\\/g, '/');
        const file = options.file.replace(/\\/g, '/');
        const src = `${normalizedRoot}/src/`;
        const isData =
          (file.startsWith(src + 'cases/') || file.startsWith(src + 'story/')) && /\.(json|svg|png|jpe?g|webp)$/i.test(file);
        if (!isData) return;
        if (this.environment.name !== 'client') return [];

        // Le registre relance son import.meta.glob (nouvelles affaires, nouvelles images).
        const graph = this.environment.moduleGraph;
        graph.getModulesByFile(src + 'cases/registry.ts')?.forEach((m) => graph.invalidateModule(m));
        options.modules.forEach((m) => graph.invalidateModule(m));
        this.environment.hot.send({ type: 'custom', event: DATA_CHANGED_EVENT, data: { file: file.slice(src.length) } });
        return [];
      },
    },
  };
}
