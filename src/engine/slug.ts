/** « Le Dîner d'Aldric » → « le-diner-d-aldric » : identifiants et noms de dossiers lisibles. */
export function slugify(text: string, max = 40): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

/** Identifiant libre : base, base-2, base-3… */
export function uniqueId(base: string, taken: Iterable<string>, fallback = 'element'): string {
  const set = new Set(taken);
  const b = base || fallback;
  if (!set.has(b)) return b;
  let i = 2;
  while (set.has(`${b}-${i}`)) i++;
  return `${b}-${i}`;
}
