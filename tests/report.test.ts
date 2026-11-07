import { describe, expect, it } from 'vitest';
import { contextFolder, contextText, inboxBody, inboxReady, recentErrors, recordError, reportText, type Report } from '../src/engine/report';
import { REPORT_INBOX } from '../src/signalements';

const REPORT: Report = { kind: 'bug', message: '  Le zoom saute.  ', name: ' Lou ', context: 'Écran : Affaire' };

describe('signalements des testeurs', () => {
  it('ne reconnaît qu’une adresse de script Google', () => {
    expect(inboxReady('https://script.google.com/macros/s/AKfycbx-Ab_12/exec')).toBe(true);
    expect(inboxReady('')).toBe(false);
    expect(inboxReady('https://script.google.com/macros/s/AKfycbx/dev')).toBe(false);
    expect(inboxReady('https://exemple.com/macros/s/AKfycbx/exec')).toBe(false);
  });

  it('l’adresse de src/signalements.ts est vide ou valide', () => {
    expect(REPORT_INBOX === '' || inboxReady(REPORT_INBOX), 'REPORT_INBOX invalide dans src/signalements.ts').toBe(true);
  });

  it('envoie chaque champ sous son nom', () => {
    const body = inboxBody(REPORT);
    expect(Object.fromEntries(body)).toEqual({ type: 'Bug', message: 'Le zoom saute.', nom: 'Lou', contexte: 'Écran : Affaire' });
    expect(inboxBody({ ...REPORT, kind: 'idee' }).get('type')).toBe('Idée');
  });

  it('met le rapport en texte, sans lignes vides inutiles', () => {
    expect(reportText(REPORT, 'Whitechapel')).toBe('[Bug] Whitechapel\n\nLe zoom saute.\n\n— Lou\n\nContexte :\nÉcran : Affaire');
    expect(reportText({ ...REPORT, name: '', context: '' }, 'W')).toBe('[Bug] W\n\nLe zoom saute.');
  });

  it('joint le contexte et les dernières erreurs', () => {
    const t = contextText({ build: 'abc123', screen: 'Affaire', details: ['Affaire : À la morgue (02-morgue)'], viewport: '1280 × 720', browser: 'Edge', errors: ['boum'] });
    expect(t).toBe('Version : abc123\nÉcran : Affaire\nAffaire : À la morgue (02-morgue)\nFenêtre : 1280 × 720\nNavigateur : Edge\nErreurs récentes :\n  boum');
    expect(contextFolder(t)).toBe('02-morgue');
    expect(contextFolder('Affaire : Le (vrai) titre (04-agence)\nZoom : ×1')).toBe('04-agence');
    expect(contextFolder('Écran : Écran titre')).toBeNull();
  });

  it('garde les cinq dernières erreurs, sans doublon de suite', () => {
    for (let i = 1; i <= 7; i++) recordError(`erreur ${i}`);
    recordError('erreur 7');
    recordError('x'.repeat(500));
    expect(recentErrors()).toHaveLength(5);
    expect(recentErrors()[0]).toBe('erreur 4');
    expect(recentErrors().at(-1)).toHaveLength(300);
  });
});
