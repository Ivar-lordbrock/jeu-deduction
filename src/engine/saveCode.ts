/**
 * Code de sauvegarde : toute la partie tient dans un texte à copier, pour la continuer sur un
 * autre ordinateur ou un autre navigateur. Le texte est compressé (deflate) puis écrit en base64
 * « URL » : « WL1. » suivi de lettres, de chiffres, de « - » et de « _ ».
 */
import { isGameKey } from './progress';

const VERSION = 1;
/** WL1 : compressé ; WL0 : navigateur sans compression (rare), texte brut. */
const COMPRESSED = 'WL1.';
const PLAIN = 'WL0.';

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(out);
}

const canCompress = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function encodeSave(data: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: VERSION, d: data }));
  if (!canCompress()) return PLAIN + toBase64(bytes);
  return COMPRESSED + toBase64(await through(bytes, new CompressionStream('deflate-raw')));
}

/** Relit un code collé par le joueur. Lève une erreur au message lisible si le code est abîmé. */
export async function decodeSave(code: string): Promise<Record<string, unknown>> {
  const text = code.replace(/\s+/g, '');
  const tag = text.slice(0, 4);
  if (tag !== COMPRESSED && tag !== PLAIN) throw new Error('Ce n\'est pas un code de sauvegarde : il commence par « WL1. ».');
  let json: string;
  try {
    let bytes = fromBase64(text.slice(4));
    if (tag === COMPRESSED) {
      if (!canCompress()) throw new Error('compression');
      bytes = await through(bytes, new DecompressionStream('deflate-raw'));
    }
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Ce code est incomplet ou abîmé. Copiez-le en entier, sans rien changer.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Ce code est incomplet ou abîmé. Copiez-le en entier, sans rien changer.');
  }
  const p = parsed as { v?: unknown; d?: unknown };
  if (typeof parsed !== 'object' || parsed === null || typeof p.d !== 'object' || p.d === null || Array.isArray(p.d)) {
    throw new Error('Ce code ne contient pas de partie.');
  }
  if (typeof p.v === 'number' && p.v > VERSION) throw new Error('Ce code vient d\'une version plus récente du jeu.');
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p.d as Record<string, unknown>)) if (isGameKey(k)) out[k] = v;
  return out;
}
