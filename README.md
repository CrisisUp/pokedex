# 🦁 Pokédex

Uma Pokédex completa, construída com **JavaScript vanilla** (sem frameworks) e foco em performance, acessibilidade e boas práticas modernas.

> **Demo:** [crisisup.github.io/pokedex](https://crisisup.github.io/pokedex) · **API:** [pokeapi.co](https://pokeapi.co)

---

## ✨ Features

- 🔍 **Busca por nome ou ID** com debounce de 200ms
- 🏷️ **Filtro por tipo** (18 tipos, múltipla seleção OR)
- ♾️ **Scroll infinito** com chunks de 60 (IntersectionObserver)
- 🎴 **Modal de detalhes** com stats em barra e link para Bulbapedia
- 💾 **Cache local** (24h TTL) — reload instantâneo
- 🌙 **Dark mode** com `prefers-color-scheme` + toggle manual persistido
- ♿ **Acessibilidade**: navegação por teclado, ARIA labels, `:focus-visible`, `loading="lazy"`
- 📱 **Responsivo** (mobile-first, testado em 320px+)

---

## 🏗️ Arquitetura

O projeto é dividido em **módulos ES** com responsabilidade única:
