/**
 * render.js — Camada de renderização (DOM puro).
 *
 * Responsabilidade: transformar dados em HTML e manipulá-lo.
 * NÃO FAZ: fetch, cache, decisões de estado. Recebe dados prontos e desenha.
 *
 * Importante: os cards NÃO têm onclick inline. Os cliques são tratados
 * por event delegation em modal.js. Isso evita CSP issues, escopo global
 * e bugs com aspas em nomes de Pokémon.
 */

import { SPRITE_BASE, SPRITE_FALLBACK } from './constants.js';

/**
 * Gera o HTML de um card de Pokémon.
 *
 * Campos obrigatórios no formato normalizado:
 *   { id, name, types: string[], abilities: string[], stats: [{name,value}] }
 *
 * Acessibilidade embutida:
 *   - tabindex="0" + role="button" → focável por teclado
 *   - aria-label → leitor de tela anuncia a ação
 *   - loading="lazy" → não baixa 1000 sprites de uma vez
 *
 * @param {Object} pokemon
 * @returns {string} HTML do <li>.
 */
export const generatePokemonCardHTML = (pokemon) => {
  const { id, name, types } = pokemon;
  return `
    <li class="card ${types.join(' ')}"
        data-id="${id}"
        data-name="${name}"
        tabindex="0"
        role="button"
        aria-label="Ver detalhes de ${name}">
      <img class="card-image"
           alt="${name}"
           loading="lazy"
           src="${SPRITE_BASE}/${id}.png"
           onerror="this.onerror=null;this.src='${SPRITE_FALLBACK}/${id}.png'" />
      <h2 class="card-title">${id}. ${name}</h2>
      <p class="card-subtitle">Type: ${types.join(' | ')}</p>
      <p class="card-subtitle">Abilities: ${pokemon.abilities.join(', ')}</p>
      <p class="card-subtitle">Stats: ${pokemon.stats.map(s => `${s.value} ${s.name}`).join(', ')}</p>
    </li>`;
};

/**
 * Anexa um lote de Pokémon ao final da lista, sem recriar o que já existe.
 *
 * Usa insertAdjacentHTML em vez de innerHTML += porque o segundo
 * reparsearia todos os cards anteriores (destruindo event listeners, imagens
 * já carregadas e causando "flicker" perceptível).
 *
 * @param {Array<Object>} pokemons - Lote (idealmente <= CHUNK_SIZE).
 */
export const appendCards = (pokemons) => {
  const ul = document.querySelector('[data-js="pokedex"]');
  const html = pokemons.map(generatePokemonCardHTML).join('');
  ul.insertAdjacentHTML('beforeend', html);
};

/**
 * Esvazia a lista (usado ao reaplicar filtros).
 */
export const clearCards = () => {
  document.querySelector('[data-js="pokedex"]').innerHTML = '';
};

/**
 * Atualiza a mensagem de status visível (aria-live garante anúncio a leitores).
 * @param {string} msg
 */
export const setStatus = (msg) => {
  document.getElementById('status').textContent = msg;
};

/**
 * Mostra/oculta e atualiza a barra de progresso.
 * @param {boolean} visible
 * @param {number} [value=0] - 0..100
 */
export const showLoader = (visible, value = 0) => {
  const loader = document.getElementById('loader');
  loader.hidden = !visible;
  loader.value = value;
};