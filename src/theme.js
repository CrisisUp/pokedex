/**
 * theme.js — Alternância de tema (light/dark) com persistência.
 *
 * Responsabilidade: ler/aplicar/salvar o tema e reagir ao toggle.
 * NÃO FAZ: CSS (as cores estão em style.css via data-theme), DOM além do botão.
 *
 * Estratégia anti-flash: o tema inicial é aplicado por um script inline no
 * <head> do index.html. Este módulo apenas sincroniza o botão e responde a cliques.
 */

const STORAGE_KEY = 'pokedex_theme';

/** @returns {'light'|'dark'} */
const getCurrentTheme = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

/** @param {'light'|'dark'} theme */
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  updateButton(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage pode falhar (Safari privado, quota) — falha silenciosa
  }
};

/** Atualiza ícone + aria-label do botão conforme o tema atual. */
const updateButton = (theme) => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const icon = btn.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-label',
    theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
};

/**
 * Inicializa o toggle de tema.
 * Deve ser chamado uma vez, no boot.
 * Se não houver botão no DOM, a função não faz nada (torna o módulo opcional).
 */
export const initTheme = () => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  updateButton(getCurrentTheme());

  btn.addEventListener('click', () => {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  // Reage a mudanças no tema do SO (só se o usuário nunca escolheu manualmente)
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
    if (!saved) applyTheme(e.matches ? 'dark' : 'light');
  });
};