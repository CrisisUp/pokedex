/**
 * infinite-scroll.js — Paginação visual por scroll.
 *
 * Responsabilidade: renderizar a lista filtrada em lotes conforme o usuário rola.
 * NÃO FAZ: fetch, filtros, montagem de HTML (usa appendCards de render.js).
 *
 * Estratégia: IntersectionObserver + sentinel no fim da lista.
 * rootMargin de 600px faz carregar ANTES de chegar no fim, tornando a
 * experiência contínua (sem "branco" entre lotes).
 */

import { CHUNK_SIZE } from './constants.js';
import { state } from './state.js';
import { appendCards, setStatus } from './render.js';

/** @type {IntersectionObserver|null} */
let observer = null;

/** @type {(reachedEnd: boolean) => void} */
let onReachedEnd = () => {};

/**
 * Renderiza o próximo lote da lista filtrada.
 * Retorna false se não há mais nada a renderizar.
 *
 * @returns {boolean} true se renderizou algo.
 */
const renderNextChunk = () => {
  const { filteredPokemons, renderedCount } = state;
  const next = filteredPokemons.slice(renderedCount, renderedCount + CHUNK_SIZE);

  if (!next.length) return false;

  appendCards(next);
  state.renderedCount += next.length;

  setStatus(`Mostrando ${state.renderedCount} de ${filteredPokemons.length} Pokémon.`);

  // Avisa o main quando o último lote chegou ao DOM
  if (state.renderedCount >= filteredPokemons.length) {
    onReachedEnd(true);
  }

  return true;
};

/**
 * Inicializa o observer no sentinel.
 * @param {(reachedEnd: boolean) => void} endCallback - Chamado quando a lista termina.
 */
export const initInfiniteScroll = (endCallback) => {
  onReachedEnd = endCallback;

  const sentinel = document.getElementById('sentinel');

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      renderNextChunk();
    }
  }, { rootMargin: '600px' });

  observer.observe(sentinel);
};

/**
 * Reinicia a renderização após mudança de filtro.
 * Limpa o DOM e renderiza o primeiro lote imediatamente (não espera scroll).
 *
 * Caso especial: se o filtro resultar em 0 Pokémon, exibe mensagem e sinaliza fim.
 */
export const resetScroll = () => {
  state.renderedCount = 0;
  document.querySelector('[data-js="pokedex"]').innerHTML = '';
  document.getElementById('end-message').hidden = true;

  if (state.filteredPokemons.length === 0) {
    setStatus('Nenhum Pokémon encontrado.');
    onReachedEnd(true);
    return;
  }

  renderNextChunk();
};

/**
 * Mostra/oculta a mensagem "Você viu todos".
 * @param {boolean} visible
 */
export const showEndMessage = (visible) => {
  document.getElementById('end-message').hidden = !visible;
};