/**
 * cache.js — Persistência local dos Pokémon já carregados.
 *
 * Responsabilidade: serializar/deserializar o estado em localStorage com TTL.
 * NÃO FAZ: fetch, DOM, transformação além de "slim".
 *
 * Por que cachear: ~1000 requisições à PokeAPI por reload é caro para o usuário
 * (rede) e para a API (rate limit). Com cache de 24h, o segundo load é instantâneo.
 *
 * Por que "slim": guardar o JSON cru estoura o limite do localStorage (~5MB).
 * Reduzindo ao essencial, ficamos em ~80KB.
 */

import { CACHE_KEY, CACHE_TTL } from './constants.js';

/**
 * Reduz um Pokémon ao formato mínimo persistível.
 *
 * É IDEMPOTENTE: aceita tanto o formato cru da PokeAPI
 * (types: [{ type: { name } }]) quanto o já normalizado (types: ['fire']).
 * Isso evita o bug clássico de "o cache funciona no primeiro load mas quebra
 * quando o dado chega pré-normalizado".
 *
 * @param {Object} p - Pokémon em qualquer um dos dois formatos.
 * @returns {{id:number,name:string,types:string[],abilities:string[],stats:Array<{name:string,value:number}>}}
 */
const slim = (p) => ({
  id: p.id,
  name: p.name,
  types: Array.isArray(p.types) && typeof p.types[0] === 'string'
    ? p.types
    : p.types.map(t => t.type.name),
  abilities: Array.isArray(p.abilities) && typeof p.abilities[0] === 'string'
    ? p.abilities
    : p.abilities.map(a => a.ability.name),
  stats: Array.isArray(p.stats) && p.stats[0]?.name !== undefined
    ? p.stats
    : p.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
});

/**
 * Persiste a lista de Pokémon no localStorage com timestamp.
 *
 * O try/catch é deliberado: localStorage pode falhar (modo privado no Safari,
 * quota excedida, storage desabilitado). Falhar o cache não deve quebrar o app,
 * por isso só logamos um warn e seguimos.
 *
 * @param {Array<Object>} pokemons - Lista a salvar (crua ou normalizada).
 */
export const saveToCache = (pokemons) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: pokemons.map(slim),
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Cache indisponível:', e);
  }
};

/**
 * Recupera a lista do localStorage, respeitando o TTL.
 * Se o cache estiver expirado, é removido e retorna null (forçando novo fetch).
 *
 * O try/catch cobre JSON corrompido (ex: escrita interrompida).
 *
 * @returns {Array<Object>|null} Lista cacheada ou null se inválido/expirado.
 */
export const loadFromCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

/**
 * Remove o cache manualmente (útil para debug no console).
 */
export const clearCache = () => localStorage.removeItem(CACHE_KEY);