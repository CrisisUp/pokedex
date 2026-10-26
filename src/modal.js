/**
 * modal.js — Modal de detalhes de um Pokémon.
 *
 * Responsabilidade: montar o HTML do modal e gerenciar abertura/fechamento.
 * NÃO FAZ: fetch (usa `indexPokemons` para lookup), cache, filtros.
 *
 * Estratégia: em vez de guardar dados nos cards (data-*), mantemos um Map
 * global id → pokemon. Isso permite que o modal funcione mesmo se o card
 * for re-renderizado, filtrado ou ainda não estiver no DOM.
 */

import { SPRITE_BASE, SPRITE_FALLBACK, BULBAPEDIA_BASE } from './constants.js';

// Labels legíveis para os stats (a API retorna kebab-case)
const STAT_LABELS = {
  hp: 'HP', attack: 'Attack', defense: 'Defense',
  'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', speed: 'Speed',
};

// Cor de cada barra de stat (baseada nas cores de tipo para consistência visual)
const STAT_COLORS = {
  hp: '#f7a39f', attack: '#f7bf97', defense: '#ffe88d',
  'special-attack': '#96afe9', 'special-defense': '#caeebb', speed: '#daacda',
};

// Referência para a barra (maior stat existente é ~255; 200 é um bom "full" visual)
const MAX_STAT = 200;

/** @type {Map<string, Object>} id → dados normalizados */
const pokemonById = new Map();

/**
 * Popula o índice interno. Deve ser chamado após fetch ou load do cache.
 * Indexa TODOS os Pokémon carregados (não só os renderizados).
 *
 * @param {Array<Object>} pokemons - Lista completa normalizada.
 */
export const indexPokemons = (pokemons) => {
  pokemonById.clear();
  pokemons.forEach(p => pokemonById.set(String(p.id), p));
};

/**
 * Lê a cor de um tipo a partir das CSS custom properties.
 * Feito sob demanda para que mudanças de tema (ex: dark mode) reflitam.
 *
 * @param {string} type - Nome do tipo ('fire', 'water', ...).
 * @returns {string} Valor CSS da cor.
 */
const getTypeColor = (type) => {
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue(`--${type}`).trim() || '#ccc';
};

/**
 * Monta o HTML interno do modal para um Pokémon.
 * @param {Object} p - Pokémon normalizado.
 * @returns {string}
 */
const buildModalHTML = (p) => {
  const typesHTML = p.types.map(t =>
    `<span style="background:${getTypeColor(t)}">${t}</span>`
  ).join('');

  const abilitiesHTML = p.abilities.map(a => `<li>${a}</li>`).join('');

  // Barra proporcional (limitada a 100% para stats > MAX_STAT)
  const statsHTML = p.stats.map(s => {
    const pct = Math.min(100, (s.value / MAX_STAT) * 100);
    return `
      <div class="stat-row">
        <span>${STAT_LABELS[s.name] ?? s.name}</span>
        <div class="stat-bar">
          <div style="width:${pct}%; background:${STAT_COLORS[s.name] ?? '#96afe9'}"></div>
        </div>
        <strong>${s.value}</strong>
      </div>`;
  }).join('');

  // Bulbapedia usa "(Pokémon)" no título de página — sem isso, redireciona ou 404
  const bulbapediaUrl = `${BULBAPEDIA_BASE}/${encodeURIComponent(
    p.name.charAt(0).toUpperCase() + p.name.slice(1)
  )}_(Pok%C3%A9mon)`;

  return `
    <img class="modal-image"
         src="${SPRITE_BASE}/${p.id}.png"
         alt="${p.name}"
         onerror="this.onerror=null;this.src='${SPRITE_FALLBACK}/${p.id}.png'" />
    <h2 id="modal-title">${p.id}. ${p.name}</h2>
    <div class="modal-types">${typesHTML}</div>

    <div class="modal-section">
      <h3>Habilidades</h3>
      <ul>${abilitiesHTML}</ul>
    </div>

    <div class="modal-section">
      <h3>Stats base</h3>
      ${statsHTML}
    </div>

    <a class="modal-link" href="${bulbapediaUrl}" target="_blank" rel="noopener noreferrer">
      Ver na Bulbapedia →
    </a>
  `;
};

/**
 * Inicializa o modal e registra event delegation no grid.
 * Deve ser chamado UMA vez, no boot.
 *
 * Nota: o `<dialog>` nativo já lida com ESC e foco; só precisamos cuidar
 * de cliques externos e do botão de fechar.
 */
export const initModal = () => {
  const modal = document.getElementById('pokemon-modal');
  const content = modal.querySelector('.modal-content');
  const closeBtn = modal.querySelector('.modal-close');
  const grid = document.querySelector('[data-js="pokedex"]');

  const open = (id) => {
    const pokemon = pokemonById.get(String(id));
    if (!pokemon) return;
    content.innerHTML = buildModalHTML(pokemon);
    modal.showModal();
  };

  const close = () => modal.close();

  // Clique nos cards (event delegation — funciona para cards futuros também)
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) open(card.dataset.id);
  });

  // Acessibilidade: Enter e Space abrem, igual a um botão nativo
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if (card) {
      e.preventDefault(); // Space rolaria a página sem isso
      open(card.dataset.id);
    }
  });

  closeBtn.addEventListener('click', close);

  // Clique no backdrop fecha; clique dentro do conteúdo não propaga até aqui
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
};