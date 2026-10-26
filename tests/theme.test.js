/**
 * Testes do módulo de tema.
 * Cobre: aplicar tema, persistir, alternar via clique, respeitar armazenamento.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTheme } from '../src/theme.js';

const setupDOM = () => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  document.body.innerHTML = `
    <button id="theme-toggle" aria-label="">
      <span class="theme-icon"></span>
    </button>
  `;
};

describe('theme', () => {
  beforeEach(setupDOM);

  it('initTheme aplica ícone conforme tema atual', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    initTheme();
    expect(document.querySelector('.theme-icon').textContent).toBe('☀️');
  });

  it('initTheme define aria-label correto', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    initTheme();
    expect(document.getElementById('theme-toggle').getAttribute('aria-label'))
      .toBe('Ativar tema escuro');
  });

  it('clique alterna de light para dark', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    initTheme();
    document.getElementById('theme-toggle').click();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('pokedex_theme')).toBe('dark');
  });

  it('clique alterna de dark para light', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    initTheme();
    document.getElementById('theme-toggle').click();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('pokedex_theme')).toBe('light');
  });

  it('persiste a escolha em localStorage', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    initTheme();
    document.getElementById('theme-toggle').click();
    document.getElementById('theme-toggle').click();

    // light → dark → light: localStorage deve ter 'light' no final
    expect(localStorage.getItem('pokedex_theme')).toBe('light');
  });

  it('não quebra se o botão não existir', () => {
    document.body.innerHTML = '';
    expect(() => initTheme()).not.toThrow();
  });
});