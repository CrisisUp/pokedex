/**
 * Testes do módulo de cache.
 * Cobre: persistência, TTL, idempotência do slim, tolerância a erros.
 */

import { describe, it, expect, vi } from 'vitest';
import { saveToCache, loadFromCache, clearCache } from '../src/cache.js';
import { CACHE_KEY } from '../src/constants.js';

const normalized = [
  { id: 25, name: 'pikachu', types: ['electric'], abilities: ['static'], stats: [{ name: 'hp', value: 35 }] },
];

const raw = [
  {
    id: 25,
    name: 'pikachu',
    types: [{ type: { name: 'electric' } }],
    abilities: [{ ability: { name: 'static' } }],
    stats: [{ base_stat: 35, stat: { name: 'hp' } }],
  },
];

describe('cache', () => {
  describe('saveToCache + loadFromCache', () => {
    it('salva e recupera dados já normalizados', () => {
      saveToCache(normalized);
      expect(loadFromCache()).toEqual(normalized);
    });

    it('normaliza dados crus da API (idempotência do slim)', () => {
      saveToCache(raw);
      const loaded = loadFromCache();
      expect(loaded[0].types).toEqual(['electric']);
      expect(loaded[0].abilities).toEqual(['static']);
      expect(loaded[0].stats).toEqual([{ name: 'hp', value: 35 }]);
    });

    it('funciona se chamado duas vezes (idempotente)', () => {
      saveToCache(normalized);
      saveToCache(normalized);
      expect(loadFromCache()).toEqual(normalized);
    });
  });

  describe('TTL', () => {
    it('retorna null quando cache está expirado', () => {
      const expired = {
        data: normalized,
        timestamp: Date.now() - 1000 * 60 * 60 * 25,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(expired));

      expect(loadFromCache()).toBeNull();
      expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    });

    it('aceita cache dentro do TTL (23h)', () => {
      const recent = {
        data: normalized,
        timestamp: Date.now() - 1000 * 60 * 60 * 23,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(recent));
      expect(loadFromCache()).toEqual(normalized);
    });
  });

  describe('robustez', () => {
    it('retorna null quando não há cache', () => {
      expect(loadFromCache()).toBeNull();
    });

    it('retorna null quando JSON está corrompido', () => {
      localStorage.setItem(CACHE_KEY, '{not valid json');
      expect(loadFromCache()).toBeNull();
    });

    it('clearCache remove do storage', () => {
      saveToCache(normalized);
      clearCache();
      expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    });

    it('saveToCache não lança se localStorage falhar', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
      expect(() => saveToCache(normalized)).not.toThrow();
    });
  });
});