/**
 * Testes de renderização.
 * Foco: HTML correto, acessibilidade, fallback de imagem, append incremental.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePokemonCardHTML,
  appendCards,
  clearCards,
  setStatus,
  showLoader,
} from '../src/render.js';

const pikachu = {
  id: 25,
  name: 'pikachu',
  types: ['electric'],
  abilities: ['static', 'lightning-rod'],
  stats: [{ name: 'hp', value: 35 }],
};

describe('generatePokemonCardHTML', () => {
  it('inclui id, nome, tipos, abilities e stats', () => {
    const html = generatePokemonCardHTML(pikachu);
    expect(html).toContain('25. pikachu');
    expect(html).toContain('electric');
    expect(html).toContain('static, lightning-rod');
    expect(html).toContain('35 hp');
  });

  it('usa sprite oficial e fallback em caso de erro', () => {
    const html = generatePokemonCardHTML(pikachu);
    expect(html).toContain('/official-artwork/25.png');
    expect(html).toContain('this.onerror=null;this.src=');
  });

  it('tem atributos de acessibilidade', () => {
    const html = generatePokemonCardHTML(pikachu);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-label="Ver detalhes de pikachu"');
    expect(html).toContain('loading="lazy"');
  });

  it('NAO tem onclick inline (usa event delegation)', () => {
    const html = generatePokemonCardHTML(pikachu);
    expect(html).not.toContain('onclick');
  });

  it('aplica classes de tipo no <li>', () => {
    const html = generatePokemonCardHTML(pikachu);
    expect(html).toMatch(/class="card electric"/);
  });
});

describe('manipulacao do DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul data-js="pokedex"></ul>
      <p id="status"></p>
      <progress id="loader" max="100" value="0" hidden></progress>
    `;
  });

  it('appendCards adiciona ao final (sem apagar anteriores)', () => {
    appendCards([pikachu]);
    appendCards([{ ...pikachu, id: 26, name: 'raichu' }]);

    const cards = document.querySelectorAll('.card');
    expect(cards).toHaveLength(2);
    expect(cards[0].dataset.name).toBe('pikachu');
    expect(cards[1].dataset.name).toBe('raichu');
  });

  it('clearCards esvazia a lista', () => {
    appendCards([pikachu]);
    clearCards();
    expect(document.querySelectorAll('.card')).toHaveLength(0);
  });

  it('setStatus atualiza o texto', () => {
    setStatus('Carregando...');
    expect(document.getElementById('status').textContent).toBe('Carregando...');
  });

  it('showLoader mostra/esconde e atualiza valor', () => {
    showLoader(true, 42);
    const loader = document.getElementById('loader');
    expect(loader.hidden).toBe(false);
    expect(Number(loader.value)).toBe(42);

    showLoader(false);
    expect(loader.hidden).toBe(true);
  });
});