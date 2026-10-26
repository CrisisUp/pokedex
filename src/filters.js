/**
 * filters.js — Busca, filtros por tipo e controles relacionados.
 *
 * Responsabilidade: ler inputs do usuário, atualizar `state` e avisar o main
 * via callback. NÃO FAZ: renderizar cards (isso é do infinite-scroll),
 * fetch, cache.
 *
 * Fluxo: usuário age → atualiza state.searchQuery / state.activeTypes →
 * chama onFilterChange() → main.js chama refresh() → resetScroll().
 */

import { ALL_TYPES } from './constants.js';
import { state } from './state.js';

/** @type {() => void} */
let onFilterChange = () => {};

/**
 * Inicializa os listeners de busca, filtros e botão de limpar.
 * Deve ser chamado uma única vez, após o DOM estar pronto.
 *
 * @param {() => void} callback - Invocado sempre que um filtro muda.
 */
export const initFilters = (callback) => {
  onFilterChange = callback;

  // Cria os botões de tipo a partir de ALL_TYPES (ordem canônica)
  const filtersEl = document.getElementById('type-filters');
  filtersEl.innerHTML = '';
  ALL_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'type-btn';
    btn.style.background = `var(--${type})`;
    btn.textContent = type;
    btn.dataset.type = type;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
      pressed ? state.activeTypes.delete(type) : state.activeTypes.add(type);
      onFilterChange();
    });
    filtersEl.appendChild(btn);
  });

  // Busca com debounce de 200ms.
  // Sem isso, digitar "pikachu" dispararia 7 rerenders completos da lista.
  const search = document.getElementById('search');
  let debounceTimer;
  search.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.searchQuery = search.value.toLowerCase().trim();
      onFilterChange();
    }, 200);
  });

  // Limpar todos os filtros de uma vez
  const clearBtn = document.getElementById('clear-filters');
  clearBtn.addEventListener('click', () => {
    search.value = '';
    state.searchQuery = '';
    state.activeTypes.clear();
    filtersEl.querySelectorAll('.type-btn').forEach(b =>
      b.setAttribute('aria-pressed', 'false')
    );
    onFilterChange();
  });
};

/**
 * Aplica busca + filtros de tipo sobre a lista completa.
 * Tipos selecionados funcionam como OR (mostra Pokémon que tenham QUALQUER um deles).
 *
 * @param {Array<Object>} pokemons - Lista completa normalizada.
 * @returns {Array<Object>} Subconjunto filtrado (ou a própria lista, sem filtros).
 */
export const applyFilters = (pokemons) => {
  const { searchQuery, activeTypes } = state;
  return pokemons.filter(p => {
    const matchesQuery = !searchQuery ||
      p.name.includes(searchQuery) ||
      String(p.id).includes(searchQuery);
    const matchesType = activeTypes.size === 0 ||
      p.types.some(t => activeTypes.has(t));
    return matchesQuery && matchesType;
  });
};

/**
 * Mostra o botão "Limpar filtros" apenas quando há algo para limpar.
 * Reduz ruído visual no estado padrão.
 */
export const updateClearButton = () => {
  const btn = document.getElementById('clear-filters');
  const hasFilters = state.searchQuery !== '' || state.activeTypes.size > 0;
  btn.hidden = !hasFilters;
};