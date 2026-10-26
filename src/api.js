/**
 * api.js — Camada de acesso à PokeAPI.
 *
 * Responsabilidade: fazer requisições HTTP e devolver dados brutos/PromiseSettled.
 * NÃO FAZ: transformar dados (isso é do main.js via normalize),
 *          cache (cache.js), DOM, formatação de UI.
 *
 * Regra de ouro: este arquivo não deve importar nada de render/ui.
 * Se precisar, é sinal de que a lógica está no lugar errado.
 */

import { API_BASE, CONCURRENCY } from './constants.js';

/**
 * Busca os dados brutos de um Pokémon específico na PokeAPI.
 * @param {number|string} id - ID numérico (1, 2, 3...) ou nome ("pikachu").
 * @returns {Promise<Object>} JSON cru da PokeAPI (não normalizado).
 * @throws {Error} Se a resposta HTTP não for 2xx.
 *
 * @example
 * const bulbasaur = await fetchPokemon(1);
 */
export const fetchPokemon = async (id) => {
  const res = await fetch(`${API_BASE}/pokemon/${id}`);
  if (!res.ok) throw new Error(`Pokémon ${id}: HTTP ${res.status}`);
  return res.json();
};

/**
 * Retorna a contagem total de espécies de Pokémon na PokeAPI.
 * Nota: esse número (~1025) é de ESPÉCIES, não de formas alternativas.
 * Por isso o app ignora Megas, regionais etc. — decisão intencional para
 * cards mais limpos.
 * @returns {Promise<number>}
 * @throws {Error} Se a resposta HTTP não for 2xx.
 */
export const fetchTotalPokemonCount = async () => {
  const res = await fetch(`${API_BASE}/pokemon-species`);
  if (!res.ok) throw new Error(`Contagem: HTTP ${res.status}`);
  const data = await res.json();
  return data.count;
};

/**
 * Executa fetches em lotes com concorrência limitada.
 *
 * Por que não usar Promise.all direto: disparar ~1000 requisições simultâneas
 * faz o navegador enfileirar (limite de ~6 por host) e a PokeAPI responder 429.
 * O pool processa em blocos de `limit`, dando tempo ao servidor.
 *
 * Por que Promise.allSettled e não Promise.all: uma única falha (404/429)
 * não deve derrubar todo o carregamento. O chamador filtra os fulfilled.
 *
 * @param {Array<number>} ids - IDs para buscar.
 * @param {number} [limit=CONCURRENCY] - Máximo de requisições em paralelo.
 * @param {(done:number, total:number) => void} [onProgress] - Callback de progresso por lote.
 * @returns {Promise<Array<PromiseSettledResult<Object>>>} Resultados por Pokémon.
 */
export const poolFetch = async (ids, limit = CONCURRENCY, onProgress) => {
  const results = [];
  for (let i = 0; i < ids.length; i += limit) {
    const batch = ids.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fetchPokemon));
    results.push(...settled);
    onProgress?.(Math.min(i + limit, ids.length), ids.length);
  }
  return results;
};