import './style.css';
import { cases, chapterIndex, type LoadedCase } from './cases/registry';
import { GAME_TITLE, SEQUENTIAL_CASES, story } from './config';
import { h } from './dom';
import { campaignStatus, nextCase } from './engine/campaign';
import { checkCase } from './engine/checkCase';
import { caseScenes } from './engine/scenes';
import { clearAllProgress, loadFlags, loadProgress, setFlag } from './engine/progress';
import { openCase } from './ui/caseScreen';
import { introSeen, openIntro } from './ui/intro';
import { renderCases } from './ui/menu';
import { renderPrologue } from './ui/prologue';
import { openRules } from './ui/rules';
import { openSaveDialog } from './ui/saveDialog';
import { ambienceFor, setAmbience, soundButton } from './ui/sound';
import { renderTitle } from './ui/title';

const root = document.getElementById('app') as HTMLElement;
document.title = GAME_TITLE;
// Le bouton du son flotte sur les menus ; dans une affaire, il est dans l'en-tête.
document.body.append(soundButton('sound-float'));

// Quand l'éditeur enregistre une affaire ou l'histoire, le jeu se recharge (sur l'écran ouvert).
if (import.meta.hot) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  import.meta.hot.on('jeu:data-changed', () => {
    clearTimeout(timer);
    timer = setTimeout(() => location.reload(), 250);
  });
}

// En développement, on signale tout de suite les incohérences des affaires (hors brouillons).
if (import.meta.env.DEV) {
  const problems: string[] = [];
  for (const c of cases) {
    if (c.draft) continue;
    const report = checkCase(c);
    report.warnings.forEach((w) => console.warn(w));
    problems.push(...report.errors);
    for (const sc of c.scene ? caseScenes(c) : []) {
      if (!c.sceneUrls[sc.id]) problems.push(`[${c.id}] image de scène « ${sc.image} » introuvable dans le dossier ${c.folder}`);
    }
  }
  if (problems.length) {
    problems.forEach((p) => console.error(p));
    document.body.append(
      h('div', { class: 'dev-banner' }, h('strong', {}, 'Affaires à corriger :'), h('ul', {}, problems.map((p) => h('li', {}, p)))),
    );
  }
}

// ---------- Navigation ----------
// Chaque écran a son adresse : le bouton « Retour » du navigateur fonctionne, et
// recharger la page rouvre le même écran.
//   (rien)       écran titre
//   #prologue    introduction de l'univers
//   #affaires    liste des affaires
//   #<dossier>   une affaire

type Route = { name: 'title' } | { name: 'prologue' } | { name: 'cases' } | { name: 'case'; c: LoadedCase };

function hashOf(r: Route): string {
  switch (r.name) {
    case 'title':
      return '';
    case 'prologue':
      return '#prologue';
    case 'cases':
      return '#affaires';
    case 'case':
      return `#${encodeURIComponent(r.c.folder)}`;
  }
}

function routeFromHash(): Route {
  const key = decodeURIComponent(location.hash.slice(1));
  if (key === 'prologue') return { name: 'prologue' };
  if (key === 'affaires') return { name: 'cases' };
  const c = cases.find((x) => x.folder === key);
  return c ? { name: 'case', c } : { name: 'title' };
}

const statuses = () => campaignStatus(cases, loadProgress, SEQUENTIAL_CASES && !import.meta.env.DEV);

/** « Affaire 1 · Chapitre 1 — L'onde de choc » */
function kickerOf(c: LoadedCase): string {
  const st = statuses().find((s) => s.data === c);
  const num = c.draft ? 'Brouillon' : `Affaire ${st?.number ?? ''}`;
  const i = chapterIndex(c.chapter);
  const chapter = story.chapters[i];
  return chapter ? `${num} · Chapitre ${i + 1} — ${chapter.title}` : num;
}

let dispose: (() => void) | null = null;

function show(r: Route, history_: 'push' | 'replace' | 'none' = 'push') {
  dispose?.();
  dispose = null;
  const url = location.pathname + location.search + hashOf(r);
  if (history_ === 'push' && location.hash !== hashOf(r)) history.pushState(null, '', url);
  else if (history_ === 'replace') history.replaceState(null, '', url);
  root.className = `screen-${r.name}`;
  window.scrollTo(0, 0);
  setAmbience(r.name === 'case' ? ambienceFor(r.c.id) : 'street');

  switch (r.name) {
    case 'title':
      renderTitle(root, statuses(), {
        start: startCampaign,
        resume: (c) => playCase(c as LoadedCase),
        cases: () => show({ name: 'cases' }),
        prologue: () => show({ name: 'prologue' }),
        intro: () => openIntro({ autoplay: true, onClose: focusTitle }),
        rules: () => openRules(),
        restart: () => {
          if (!confirm('Tout recommencer depuis le début ? Les affaires résolues, les mots notés et ce qui est écrit dans la gazette seront effacés.')) return;
          clearAllProgress();
          show({ name: 'title' }, 'replace');
        },
        save: () => openSaveDialog({ onImported: () => show({ name: 'title' }, 'replace') }),
      });
      break;
    case 'prologue':
      dispose = renderPrologue(root, story.prologue ?? [], {
        done: () => {
          setFlag('prologueSeen');
          const next = nextCase(statuses());
          if (next) playCase(next.data);
          else show({ name: 'cases' });
        },
        menu: () => show({ name: 'title' }),
      });
      break;
    case 'cases':
      renderCases(root, statuses(), {
        open: (c) => playCase(c as LoadedCase),
        menu: () => show({ name: 'title' }),
        rules: () => openRules(),
      });
      break;
    case 'case': {
      const list = statuses();
      const idx = list.findIndex((s) => s.data === r.c);
      const following = list.slice(idx + 1).find((s) => !s.data.draft);
      dispose = openCase(root, r.c, {
        kicker: kickerOf(r.c),
        number: list[idx]?.number ?? undefined,
        exit: () => show({ name: 'cases' }),
        next: following ? () => show({ name: 'case', c: following.data }) : undefined,
      });
      break;
    }
  }
}

/** Première partie : le prologue, puis la première affaire (où se joue le tutoriel). */
function startCampaign() {
  if (!loadFlags().prologueSeen && story.prologue?.length) show({ name: 'prologue' });
  else {
    const next = nextCase(statuses());
    if (next) playCase(next.data);
    else show({ name: 'cases' });
  }
}

function playCase(c: LoadedCase) {
  show({ name: 'case', c });
}

/** Après l'intro, la main revient au bouton principal de l'écran titre. */
function focusTitle() {
  document.querySelector<HTMLElement>('.title-actions .btn.primary')?.focus({ preventScroll: true });
}

window.addEventListener('popstate', () => show(routeFromHash(), 'none'));
const first = routeFromHash();
show(first, 'none');
// Première ouverture du jeu : le petit film, par-dessus l'écran titre.
if (first.name === 'title' && !introSeen()) openIntro({ autoplay: false, onClose: focusTitle });
