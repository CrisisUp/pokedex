/**
 * setup.js — Configuração global dos testes.
 * Roda antes de CADA arquivo de teste.
 */

import { beforeEach, vi } from 'vitest';

// jsdom NÃO implementa window.matchMedia (API de browser).
// Sem este mock, qualquer código que chame matchMedia (como theme.js) quebra.
// Simulamos o comportamento mínimo: retorna um objeto com matches=false,
// addEventListener/addListener como no-op, e removeEventListener/removeListener idem.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),      // API legada (Safari antigo)
    removeListener: vi.fn(),   // API legada
    dispatchEvent: vi.fn(),
  }),
});

// jsdom fornece localStorage, mas resetamos entre testes para evitar
// "vazamento" de estado de um teste para outro.
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// Mock mínimo de getComputedStyle para cores de tipo
// (jsdom não aplica style.css, então sem isso getTypeColor() retornaria '')
globalThis.getComputedStyle = () => ({
  getPropertyValue: (prop) => {
    const colors = {
      '--fire': '#f7bf97',
      '--water': '#96afe9',
      '--grass': '#caeebb',
      '--electric': '#ffe88d',
      '--normal': '#d8d8cb',
    };
    return colors[prop] ?? '';
  },
});