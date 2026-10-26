/**
 * Testes da camada de API.
 * Foco: pool de concorrência, allSettled, erros HTTP.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPokemon, fetchTotalPokemonCount, poolFetch } from '../src/api.js';

const mockFetchOk = (data) => ({ ok: true, status: 200, json: async () => data });
const mockFetchFail = (status) => ({ ok: false, status, json: async () => ({}) });

describe('fetchPokemon', () => {
  it('retorna JSON quando status 200', async () => {
    global.fetch = vi.fn(async () => mockFetchOk({ id: 1, name: 'bulbasaur' }));
    const result = await fetchPokemon(1);
    expect(result).toEqual({ id: 1, name: 'bulbasaur' });
    expect(global.fetch).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/1');
  });

  it('lança erro quando status != 2xx', async () => {
    global.fetch = vi.fn(async () => mockFetchFail(404));
    await expect(fetchPokemon(9999)).rejects.toThrow('HTTP 404');
  });
});

describe('fetchTotalPokemonCount', () => {
  it('retorna data.count', async () => {
    global.fetch = vi.fn(async () => mockFetchOk({ count: 1025 }));
    expect(await fetchTotalPokemonCount()).toBe(1025);
  });
});

describe('poolFetch', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('retorna todos os resultados em lotes', async () => {
    global.fetch = vi.fn(async (url) => {
      const id = url.split('/').pop();
      return mockFetchOk({ id: Number(id) });
    });
    const results = await poolFetch([1, 2, 3, 4, 5], 2);
    expect(results).toHaveLength(5);
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
  });

  it('respeita o limite de concorrência', async () => {
    let active = 0;
    let maxActive = 0;
    global.fetch = vi.fn(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 10));
      active--;
      return mockFetchOk({});
    });

    await poolFetch(Array.from({ length: 20 }, (_, i) => i + 1), 5);

    expect(maxActive).toBeLessThanOrEqual(5);
  });

  it('continua mesmo com falhas (allSettled, não all)', async () => {
    let n = 0;
    global.fetch = vi.fn(async () => {
      n++;
      return n % 2 === 0 ? mockFetchFail(500) : mockFetchOk({ id: n });
    });

    const results = await poolFetch([1, 2, 3, 4], 2);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(2);
  });

  it('chama onProgress a cada lote', async () => {
    global.fetch = vi.fn(async () => mockFetchOk({}));
    const progress = [];
    await poolFetch([1, 2, 3, 4, 5], 2, (done, total) => progress.push([done, total]));
    expect(progress).toEqual([[2, 5], [4, 5], [5, 5]]);
  });
});