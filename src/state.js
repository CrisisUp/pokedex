/**
 * state.js — Estado global da aplicação (single source of truth).
 *
 * Responsabilidade: guardar o estado mutável que vários módulos precisam ler/escrever.
 * NÃO FAZ: fetch, DOM, cache. É apenas um objeto observável "na unha".
 *
 * Por que existe: sem isso, cada módulo teria variáveis soltas e o fluxo
 * de dados ficaria implícito. Com o state centralizado, dá para debugar
 * olhando um único objeto no console (`state`).
 *
 * Trade-off: um objeto global mutável é simples, mas não notifica mudanças.
 * Se o app crescer, considere migrar para algo como Zustand ou um proxy reativo.
 */

export const state = {
  /** @type {Array<{id:number,name:string,types:string[],abilities:string[],stats:Array<{name:string,value:number}>}>} */
  allPokemons: [],       // lista completa normalizada (vem do fetch ou cache)

  /** @type {Array} */
  filteredPokemons: [],  // resultado de aplicar busca + filtros sobre allPokemons

  /** @type {number} */
  renderedCount: 0,      // quantos já foram inseridos no DOM (controle do scroll infinito)

  /** @type {Set<string>} */
  activeTypes: new Set(), // tipos selecionados nos botões de filtro (vazio = todos)

  /** @type {string} */
  searchQuery: '',        // texto atual da busca (já lowercase + trim)

  /** @type {boolean} */
  loading: false,         // reservado para estados de carregamento futuros
};