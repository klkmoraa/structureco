const HERO_SESSION_KEY = 'structureco.home.hero';

export interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const resolveSessionHeroId = <Id extends string>(
  ids: readonly Id[],
  session: SessionStore,
  random: () => number = Math.random,
): Id => {
  if (ids.length === 0) throw new Error('No hay ilustraciones estructurales disponibles.');

  const stored = session.getItem(HERO_SESSION_KEY);
  if (stored && ids.includes(stored as Id)) return stored as Id;

  const sample = Math.min(Math.max(random(), 0), 0.999999999);
  const chosen = ids[Math.floor(sample * ids.length)] ?? ids[0];
  session.setItem(HERO_SESSION_KEY, chosen);
  return chosen;
};
