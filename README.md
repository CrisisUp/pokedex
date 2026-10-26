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

```text
src/
├── constants.js # URLs, limites, chaves de storage
├── state.js # Estado global (single source of truth)
├── api.js # Camada de acesso à PokeAPI (pool de concorrência)
├── cache.js # Persistência em localStorage (idempotente, TTL)
├── render.js # HTML puro (sem lógica de negócio)
├── filters.js # Busca + filtros + controles
├── modal.js # Modal de detalhes + event delegation
├── infinite-scroll.js # Paginação visual (IntersectionObserver)
├── theme.js # Dark mode
└── main.js # Orquestração (entry point)
```

**Regras de ouro da arquitetura:**

1. **`api.js` não conhece DOM.** Se conhecesse, não seria testável nem reutilizável.
2. **`render.js` não conhece estado.** Recebe dados prontos e devolve HTML.
3. **`main.js` só orquestra.** Toda lógica real mora em módulos testáveis.
4. **Event delegation em vez de `onclick` inline.** Mais seguro (CSP-friendly) e funciona para elementos futuros.

---

## 🚀 Decisões técnicas (o "porquê")

### Pool de concorrência em vez de `Promise.all`

Carregar 1025 Pokémon com `Promise.all` dispararia 1025 requisições simultâneas. O navegador enfileira (~6 por host) e a PokeAPI responde **429 (rate limit)**. O pool processa em lotes de 10, respeitando o servidor:

```js
for (let i = 0; i < ids.length; i += limit) {
  const batch = ids.slice(i, i + limit);
  const settled = await Promise.allSettled(batch.map(fetchPokemon));
  results.push(...settled);
}
Promise.allSettled em vez de Promise.all
Se um Pokémon falhar (404, 429, timeout), Promise.all rejeita tudo e nenhum card é renderizado. allSettled devolve {status: 'fulfilled' | 'rejected'} por item — o app filtra as falhas e continua:

```js
const fulfilled = results.filter(r => r.status === 'fulfilled').map(r => r.value);
```

Cache idempotente
O slim() aceita tanto o formato cru da PokeAPI (types: [{type: {name}}]) quanto o já normalizado (types: ['fire']). Isso evita um bug clássico: "cache funciona no primeiro load, quebra no segundo".

```js
types: Array.isArray(p.types) && typeof p.types[0] === 'string'
  ? p.types
  : p.types.map(t => t.type.name),
```

Anti-flash do dark mode
Script inline no `<head>` aplica o tema antes do CSS carregar. Sem isso, o usuário veria um "flash branco" de ~200ms antes do dark mode entrar.

insertAdjacentHTML em vez de innerHTML +=
innerHTML += reparsearia todos os cards anteriores a cada lote, destruindo event listeners e forçando re-render de imagens já carregadas. insertAdjacentHTML('beforeend', ...) só adiciona ao final.

Event delegation no `<ul>`
Um único listener no `<ul>` captura cliques em qualquer card (presente ou futuro). Sem isso, seria necessário um addEventListener por card — com 1025 cards, isso é 1025 listeners. Além disso, evita onclick inline (bloqueado por CSP em produção).

## 🧪 Testes

```bash
npm test              # roda suite uma vez
npm run test:watch    # modo watch (dev)
npm run coverage      # relatório de cobertura (HTML em coverage/)
Cobertura: 41 testes cobrindo api, cache, render, filters e theme. Os módulos puramente orquestradores (main, infinite-scroll) são testados indiretamente.
```

Filosofia: testes cobrem branches, não linhas triviais. Foco em idempotência, casos de erro e comportamento de borda.

## 🛠️ Rodando localmente

```bash
# 1. Clonar
git clone https://github.com/CrisisUp/pokedex.git
cd pokedex

# 2. Instalar dependências de desenvolvimento (Vitest + jsdom)
npm install

# 3. Rodar
npm run dev
# → http://localhost:3000
Importante: o projeto usa ES Modules (type="module"). Abrir index.html direto no navegador (file://) não funciona por CORS. Use um servidor local (npm run dev, python -m http.server, ou Live Server do VS Code).
```

## 📦 Stack

Camada	Tecnologia
Frontend	JavaScript vanilla (ES Modules), HTML, CSS
API	PokeAPI
Testes	Vitest + jsdom
CI	GitHub Actions
Deploy	GitHub Pages

Zero frameworks em produção. O bundle final é HTML + CSS + JS puro, sem transpilação, sem build step. Se você consegue ler o código-fonte, você consegue ler o código que roda.

## 🗺️ Roadmap

☑ Refatoração modular
☑ Suite de testes (Vitest)
☑ Cache local (24h TTL)
☑ Dark mode
□ Favoritos (localStorage + filtro)
□ Ordenação (ID, nome, total de stats)
□ URL state (?q=pika&types=electric)
□ PWA (offline + instalável)

## 📄 Licença

MIT — use, modifique, distribua.

## 🙏 Créditos

Dados: PokeAPI
Sprites: PokeAPI Sprites
Font: Rubik (Google Fonts)

Feito com ☕ e teimosia em não usar framework.
