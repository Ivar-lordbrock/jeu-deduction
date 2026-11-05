import './style.css';
import { cases, type LoadedCase } from './cases/registry';
import { GAME_TITLE } from './config';
import { h } from './dom';
import { checkCase } from './engine/checkCase';
import { openCase } from './ui/caseScreen';
import { renderMenu } from './ui/menu';

const root = document.getElementById('app') as HTMLElement;
document.title = GAME_TITLE;

// En développement, on signale tout de suite les incohérences des affaires.
if (import.meta.env.DEV) {
  const problems: string[] = [];
  for (const c of cases) {
    const report = checkCase(c);
    report.warnings.forEach((w) => console.warn(w));
    problems.push(...report.errors);
    if (!c.sceneUrl) problems.push(`[${c.id}] image de scène « ${c.scene?.image} » introuvable dans le dossier ${c.folder}`);
  }
  if (problems.length) {
    problems.forEach((p) => console.error(p));
    document.body.append(
      h('div', { class: 'dev-banner' }, h('strong', {}, 'Affaires à corriger :'), h('ul', {}, problems.map((p) => h('li', {}, p)))),
    );
  }
}

function showMenu() {
  history.replaceState(null, '', location.pathname + location.search);
  renderMenu(root, cases, startCase);
}

function startCase(c: LoadedCase) {
  history.replaceState(null, '', `#${c.folder}`);
  openCase(root, c, showMenu);
}

// L'adresse #dossier rouvre directement une affaire (pratique quand on recharge la page).
const fromHash = cases.find((c) => c.folder === decodeURIComponent(location.hash.slice(1)));
if (fromHash) startCase(fromHash);
else showMenu();
