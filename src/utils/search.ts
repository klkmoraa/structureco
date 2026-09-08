/**
 * Normaliza cadenas de búsqueda eliminando diacríticos (tildes) y convirtiendo a minúsculas,
 * permitiendo búsquedas insensibles a mayúsculas/minúsculas y acentos.
 */
export const normalizeSearch = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
