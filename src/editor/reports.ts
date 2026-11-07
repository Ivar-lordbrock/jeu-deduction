/**
 * Signalements des testeurs, relus dans la boîte aux lettres (tools/signalements.gs) par l'API de l'éditeur.
 * État à part de celui des affaires : rien ici n'est enregistré dans les fichiers du jeu.
 */
import { useLayoutEffect, useState } from 'preact/hooks';
import type { InboxReport, ReportStatus } from '../engine/report';

export interface ReportsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  items: InboxReport[];
  /** Heure de la dernière lecture réussie. */
  loadedAt: Date | null;
}

export const reports: ReportsState = { status: 'idle', error: null, items: [], loadedAt: null };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useReports(): ReportsState {
  const [, setTick] = useState(0);
  useLayoutEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return reports;
}

async function call<T>(method: 'GET' | 'POST', body?: object): Promise<T> {
  const res = await fetch('/__api/signalements', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: { error?: string } = {};
  try {
    json = await res.json();
  } catch {
    // réponse vide
  }
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json as T;
}

export async function loadReports(): Promise<void> {
  if (reports.status === 'loading') return;
  reports.status = 'loading';
  emit();
  try {
    const r = await call<{ signalements: InboxReport[] }>('GET');
    reports.items = r.signalements;
    reports.status = 'ready';
    reports.error = null;
    reports.loadedAt = new Date();
  } catch (e) {
    reports.status = 'error';
    reports.error = e instanceof Error ? e.message : String(e);
  }
  emit();
}

/** Change le statut d'un signalement ; l'écran suit tout de suite, et revient en arrière si le tableur refuse. */
export async function setReportStatus(ligne: number, statut: ReportStatus): Promise<void> {
  const item = reports.items.find((x) => x.ligne === ligne);
  if (!item || item.statut === statut) return;
  const before = item.statut;
  item.statut = statut;
  emit();
  try {
    await call('POST', { ligne, statut });
  } catch (e) {
    item.statut = before;
    reports.error = `Statut non enregistré : ${e instanceof Error ? e.message : String(e)}`;
    emit();
  }
}

/** Nombre de signalements pas encore lus, pour la barre latérale. */
export const newReports = () => reports.items.filter((x) => x.statut === 'nouveau').length;
