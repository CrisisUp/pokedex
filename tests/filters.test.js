/**
 * Testes de filtros.
 * Foco: logica pura de applyFilters + inicializacao com DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { applyFilters, updateClearButton } from '../src/filters.js';

const sample = [
  { id: 1, name: 'bulbasaur', types: ['grass', 'poison'], abilities: [], stats: [] },
  { id: 4, name: 'charmander', types: ['fire'], abilities: [], stats: [] },
  { id: 7, name: 'squirtle', types: ['water'], abilities: [], stats: [] },
  { id: 25, name: 'pikachu', types: ['electric'], abilities: [], stats: [] },
];

describe('applyFilters', () => {
  beforeEach(() => {
    state.searchQuery = '';
    state.activeTypes = new Set();
  });

  it('sem filtros, retorna tudo', () => {
    expect(applyFilters(sample)).toHaveLength(4);
  });

  it('filtra por nome (case insensitive)', () => {
    state.searchQuery = 'pika';
    expect(applyFilters(sample)).toEqual([sample[3]]);
  });

  it('filtra por ID', () => {
    state.searchQuery = '25';
    expect(applyFilters(sample)).toEqual([sample[3]]);
  });

  it('filtra por tipo unico', () => {
    state.activeTypes = new Set(['fire']);
    expect(applyFilters(sample)).toEqual([sample[1]]);
  });

  it('multiplos tipos funcionam como OR', () => {
    state.activeTypes = new Set(['fire', 'water']);
    const result = applyFilters(sample);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['charmander', 'squirtle']);
  });

  it('busca + tipo combinados (AND)', () => {
    state.searchQuery = 'char';
    state.activeTypes = new Set(['fire']);
    expect(applyFilters(sample)).toEqual([sample[1]]);

    state.searchQuery = 'bulba';
    expect(applyFilters(sample)).toEqual([]);
  });

  it('retorna vazio quando nada casa', () => {
    state.searchQuery = 'zzzzz';
    expect(applyFilters(sample)).toEqual([]);
  });
});

describe('updateClearButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="clear-filters" hidden></button>';
    state.searchQuery = '';
    state.activeTypes = new Set();
  });

  it('fica oculto sem filtros', () => {
    updateClearButton();
    expect(document.getElementById('clear-filters').hidden).toBe(true);
  });

  it('fica visivel com busca ativa', () => {
    state.searchQuery = 'pika';
    updateClearButton();
    expect(document.getElementById('clear-filters').hidden).toBe(false);
  });

  it('fica visivel com tipo ativo', () => {
    state.activeTypes = new Set(['fire']);
    updateClearButton();
    expect(document.getElementById('clear-filters').hidden).toBe(false);
  });
});