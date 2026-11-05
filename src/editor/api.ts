/** Appels à l'API de l'éditeur (tools/editorApi.ts), disponible avec « npm run dev ». */
import type { CaseData, StoryData } from '../types';

export interface RawCase {
  folder: string;
  data?: CaseData;
  error?: string;
  files: string[];
}

export interface Project {
  story: StoryData;
  cases: RawCase[];
}

async function request<T>(method: string, url: string, body?: Blob | object): Promise<T> {
  const raw = body instanceof Blob;
  const res = await fetch(url, {
    method,
    headers: body !== undefined && !raw ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  let json: { error?: string } = {};
  try {
    json = await res.json();
  } catch {
    // réponse vide ou non JSON
  }
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json as T;
}

const caseUrl = (folder: string) => `/__api/cases/${encodeURIComponent(folder)}`;

export const loadProject = () => request<Project>('GET', '/__api/project');
export const saveStory = (story: StoryData) => request('PUT', '/__api/story', story);
export const saveCase = (folder: string, data: CaseData) => request('PUT', caseUrl(folder), data);
export const createCase = (title: string, chapter?: string) =>
  request<{ folder: string; data: CaseData; files: string[] }>('POST', '/__api/cases', { title, chapter });
export const trashCase = (folder: string) => request<{ trashedTo: string }>('DELETE', caseUrl(folder));
export const uploadFile = (folder: string, name: string, file: Blob) =>
  request('PUT', `${caseUrl(folder)}/files/${encodeURIComponent(name)}`, file);
