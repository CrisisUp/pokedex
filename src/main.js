/**
 * main.js — Orquestrador da aplicação (entry point).
 *
 * Responsabilidade: amarrar os módulos, decidir a ordem das operações
 * (cache → fetch → normalize → index → render) e reagir a eventos globais.
 * NÃO FAZ: lógica específica de fetch, DOM ou filtro — apenas coordena.
 *
 * Fluxo:
 *   bootstrap() decide cache vs fetch
 *     → normalize()
 *     → indexPokemons() (modal)
 *     → resetScroll() (primeiro lote)
 *   refresh() é chamado a cada mudança de filtro
 *     → applyFilters()
 *     → resetScroll()
 */

import { CONCURRENCY } from './constants.js';
import { state } from './state.js';
import { fetchTotalPokemonCount, poolFetch } from './api.js';
import { loadFromCache, saveToCache } from './cache.js';
import { setStatus, showLoader } from './render.js';
import { initFilters, applyFilters, updateClearButton } from './filters.js';
import { initModal, indexPokemons } from './modal.js';
import { initInfiniteScroll, resetScroll, showEndMessage } from './infinite-scroll.js';

/**
 * Converte a resposta crua da PokeAPI no formato interno normalizado.
 *
 * Existe para que os outros módulos (cache, render, modal) não precisem
 * saber a forma da API. Se a PokeAPI mudar, este é o único ponto a ajustar.
 *
 * @param {Object} raw - Resposta crua de /pokemon/{id}.
 * @returns {{id:number,name:string,types:string[],abilities:string[],stats:Array<{name:string,value:number}>}}
 */
const normalize = (raw) => ({
  id: raw.id,
  name: raw.name,
  types: raw.types.map(t => t.type.name),
  abilities: raw.abilities.map(a => a.ability.name),
  stats: raw.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
});

/**
 * Recalcula os filtros e rerenderiza a lista do zero.
 * Chamado a cada mudança em state.activeTypes ou state.searchQuery.
 */
const refresh = () => {
  state.filteredPokemons = applyFilters(state.allPokemons);
  updateClearButton();
  resetScroll();
};

/**
 * Carrega os dados (cache ou fetch) e prepara a UI para render.
 * Erros são exibidos no status (não apenas no console).
 */
const bootstrap = async () => {
  try {
    // 1. Tenta cache primeiro — caminho rápido em reloads
    const cached = loadFromCache();
    if (cached) {
      setStatus('Carregando do cache...');
      state.allPokemons = cached;
      indexPokemons(state.allPokemons);
      state.filteredPokemons = state.allPokemons;
      resetScroll();
      return;
    }

    // 2. Sem cache: fetch completo
    setStatus('Consultando total de Pokémon...');
    const total = await fetchTotalPokemonCount();
    const ids = Array.from({ length: total }, (_, i) => i + 1);

    showLoader(true, 0);
    setStatus(`Carregando 0 de ${total} Pokémon...`);

    const results = await poolFetch(ids, CONCURRENCY, (done, total) => {
      showLoader(true, (done / total) * 100);
      setStatus(`Carregando ${done} de ${total} Pokémon...`);
    });

    showLoader(false);

    // 3. Filtra falhas parciais (allSettled devolve settled — algumas podem ser rejected)
    const fulfilled = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failures = results.length - fulfilled.length;
    if (failures > 0) {
      console.warn(`${failures} Pokémon falharam e foram ignorados.`);
    }

    state.allPokemons = fulfilled.map(normalize);

    // 4. Persiste (slim internamente). Falha é silenciosa por design.
    saveToCache(state.allPokemons);

    // 5. Prepara índice do modal e renderiza o primeiro lote
    indexPokemons(state.allPokemons);
    state.filteredPokemons = state.allPokemons;
    resetScroll();
  } catch (error) {
    console.error(error);
    showLoader(false);
    setStatus(`Erro: ${error.message}. Tente recarregar a página.`);
  }
};

/**
 * Amarra todos os módulos. Chamado uma vez, no carregamento do script.
 */
const init = () => {
  // Filtros mudam o state; refresh() reconcilia DOM
  initFilters(() => refresh());

  // Modal usa event delegation no <ul>, que já existe no HTML
  initModal();

  // Scroll infinito avisa o main quando o usuário chegou ao fim
  initInfiniteScroll((reachedEnd) => {
    showEndMessage(reachedEnd && state.filteredPokemons.length > 0);
  });

  showEndMessage(false);

  bootstrap();
};

init();