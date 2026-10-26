/**
 * constants.js — Constantes compartilhadas por todos os módulos.
 *
 * Responsabilidade: centralizar URLs, limites e chaves usadas em mais de um lugar.
 * NÃO FAZ: nenhuma lógica, nenhum import. Deve ser o arquivo mais "burro" do projeto.
 *
 * Regra: se um número/string aparece em 2+ arquivos, ele mora aqui.
 */

// URLs base da PokeAPI e dos sprites oficiais
export const API_BASE = 'https://pokeapi.co/api/v2';
export const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
export const SPRITE_FALLBACK = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export const BULBAPEDIA_BASE = 'https://bulbapedia.bulbagarden.net/wiki';

// Limite de requisições paralelas.
// 10 é um equilíbrio empírico: abaixo disso o carregamento fica lento;
// acima, a PokeAPI começa a responder 429 (rate limit) em conexões domésticas.
export const CONCURRENCY = 10;

// Quantos cards renderizar por vez no scroll infinito.
// 60 cabe em ~2 telas de desktop e mantém o primeiro paint abaixo de 100ms.
export const CHUNK_SIZE = 60;

// Cache local (localStorage). A chave tem versão para permitir invalidação
// sem apagar outros dados do usuário em futuras mudanças de formato.
export const CACHE_KEY = 'pokedex_cache_v2';
export const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 horas

// Ordem importa: usada para gerar os botões de filtro na UI.
// Mantida na ordem canônica dos jogos (Gen 1 → Gen 6).
export const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];