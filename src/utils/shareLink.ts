/** Comparte un modelo local dentro del fragmento URL, que no se envía al servidor. */
import { deflateSync, inflateSync } from 'fflate';
import { normalizeProject } from '../data/migrate';
import type { ProjectModel } from '../types';

export const SHARE_LINK_LIMIT = 8000;
const PREFIX = 'm1:';

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (text: string): Uint8Array => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export type ShareEncoding = { ok: true; fragment: string; characters: number } | { ok: false; reason: 'too-large'; characters: number; limit: number };
export const encodeProjectFragment = (project: ProjectModel): ShareEncoding => {
  const compressed = deflateSync(new TextEncoder().encode(JSON.stringify(normalizeProject(project))), { level: 9 });
  const fragment = `${PREFIX}${toBase64Url(compressed)}`;
  return fragment.length > SHARE_LINK_LIMIT
    ? { ok: false, reason: 'too-large', characters: fragment.length, limit: SHARE_LINK_LIMIT }
    : { ok: true, fragment, characters: fragment.length };
};

export type ShareLinkResult = { ok: true; url: string; characters: number } | { ok: false; reason: 'too-large'; characters: number; limit: number };
export const buildShareLink = (project: ProjectModel, baseUrl: string): ShareLinkResult => {
  const encoded = encodeProjectFragment(project);
  if (!encoded.ok) return encoded;
  const url = new URL(baseUrl);
  url.hash = encoded.fragment;
  return { ok: true, url: url.toString(), characters: encoded.characters };
};

export type ShareDecoding = { ok: true; project: ProjectModel } | { ok: false; reason: 'absent' | 'malformed' };
/** Sólo entrega proyectos normalizados de enlaces con el prefijo propio. */
export const decodeProjectFragment = (fragment: string): ShareDecoding => {
  const body = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (!body.startsWith(PREFIX)) return { ok: false, reason: 'absent' };
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(inflateSync(fromBase64Url(body.slice(PREFIX.length)))));
    if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'malformed' };
    const candidate = parsed as Partial<ProjectModel>;
    if (typeof candidate.id !== 'string' || !Array.isArray(candidate.nodes) || !Array.isArray(candidate.members)) return { ok: false, reason: 'malformed' };
    return { ok: true, project: normalizeProject(candidate as ProjectModel) };
  } catch { return { ok: false, reason: 'malformed' }; }
};
