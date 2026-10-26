<#
.SYNOPSIS
    Cria a estrutura de testes (Vitest + jsdom) com conteúdo pronto.
.DESCRIPTION
    Gera vitest.config.js, tests/setup.js, 4 arquivos de teste,
    .gitignore e .github/workflows/test.yml — todos com conteúdo.
    Também atualiza o package.json (scripts + type: module + devDeps)
    se ele já existir, ou cria um novo se não existir.
.NOTES
    Rodar na raiz do projeto (onde fica o index.html).
    Idempotente: pode rodar várias vezes sem quebrar.
#>

$ErrorActionPreference = 'Stop'
$root = $PWD

Write-Host "📦 Configurando suite de testes em: $root`n" -ForegroundColor Cyan

# ---------------------------------------------------------------
# 1. Cria pastas
# ---------------------------------------------------------------
$folders = @('tests', '.github\workflows')
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path (Join-Path $root $folder) | Out-Null
    Write-Host "📁 $folder\" -ForegroundColor Yellow
}

# ---------------------------------------------------------------
# 2. Conteúdo dos arquivos
# ---------------------------------------------------------------
$files = @{

'vitest.config.js' = @'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/main.js'],
    },
  },
});
'@

'tests/setup.js' = @'
/**
 * setup.js — Configuração global dos testes.
 * Roda antes de CADA arquivo de teste.
 */

import { beforeEach, vi } from 'vitest';

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
'@

'tests/cache.test.js' = @'
/**
 * Testes do módulo de cache.
 * Cobre: persistência, TTL, idempotência do slim, tolerância a erros.
 */

import { describe, it, expect, vi } from 'vitest';
import { saveToCache, loadFromCache, clearCache } from '../src/cache.js';
import { CACHE_KEY } from '../src/constants.js';

const normalized = [
  { id: 25, name: 'pikachu', types: ['electric'], abilities: ['static'], stats: [{ name: 'hp', value: 35 }] },
];

const raw = [
  {
    id: 25,
    name: 'pikachu',
    types: [{ type: { name: 'electric' } }],
    abilities: [{ ability: { name: 'static' } }],
    stats: [{ base_stat: 35, stat: { name: 'hp' } }],
  },
];

describe('cache', () => {
  describe('saveToCache + loadFromCache', () => {
    it('salva e recupera dados já normalizados', () => {
      saveToCache(normalized);
      expect(loadFromCache()).toEqual(normalized);
    });

    it('normaliza dados crus da API (idempotência do slim)', () => {
      saveToCache(raw);
      const loaded = loadFromCache();
      expect(loaded[0].types).toEqual(['electric']);
      expect(loaded[0].abilities).toEqual(['static']);
      expect(loaded[0].stats).toEqual([{ name: 'hp', value: 35 }]);
    });

    it('funciona se chamado duas vezes (idempotente)', () => {
      saveToCache(normalized);
      saveToCache(normalized);
      expect(loadFromCache()).toEqual(normalized);
    });
  });

  describe('TTL', () => {
    it('retorna null quando cache está expirado', () => {
      const expired = {
        data: normalized,
        timestamp: Date.now() - 1000 * 60 * 60 * 25,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(expired));

      expect(loadFromCache()).toBeNull();
      expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    });

    it('aceita cache dentro do TTL (23h)', () => {
      const recent = {
        data: normalized,
        timestamp: Date.now() - 1000 * 60 * 60 * 23,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(recent));
      expect(loadFromCache()).toEqual(normalized);
    });
  });

  describe('robustez', () => {
    it('retorna null quando não há cache', () => {
      expect(loadFromCache()).toBeNull();
    });

    it('retorna null quando JSON está corrompido', () => {
      localStorage.setItem(CACHE_KEY, '{not valid json');
      expect(loadFromCache()).toBeNull();
    });

    it('clearCache remove do storage', () => {
      saveToCache(normalized);
      clearCache();
      expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    });

    it('saveToCache não lança se localStorage falhar', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
      expect(() => saveToCache(normalized)).not.toThrow();
    });
  });
});
'@

'tests/api.test.js' = @'
/**
 * Testes da camada de API.
 * Foco: pool de concorrência, allSettled, erros HTTP.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPokemon, fetchTotalPokemonCount, poolFetch } from '../src/api.js';

const mockFetchOk = (data) => ({ ok: true, status: 200, json: async () => data });
const mockFetchFail = (status) => ({ ok: false, status, json: async () => ({}) });

describe('fetchPokemon', () => {
  it('retorna JSON quando status 200', async () => {
    global.fetch = vi.fn(async () => mockFetchOk({ id: 1, name: 'bulbasaur' }));
    const result = await fetchPokemon(1);
    expect(result).toEqual({ id: 1, name: 'bulbasaur' });
    expect(global.fetch).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/1');
  });

  it('lança erro quando status != 2xx', async () => {
    global.fetch = vi.fn(async () => mockFetchFail(404));
    await expect(fetchPokemon(9999)).rejects.toThrow('HTTP 404');
  });
});

describe('fetchTotalPokemonCount', () => {
  it('retorna data.count', async () => {
    global.fetch = vi.fn(async () => mockFetchOk({ count: 1025 }));
    expect(await fetchTotalPokemonCount()).toBe(1025);
  });
});

describe('poolFetch', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('retorna todos os resultados em lotes', async () => {
    global.fetch = vi.fn(async (url) => {
      const id = url.split('/').pop();
      return mockFetchOk({ id: Number(id) });
    });
    const results = await poolFetch([1, 2, 3, 4, 5], 2);
    expect(results).toHaveLength(5);
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
  });

  it('respeita o limite de concorrência', async () => {
    let active = 0;
    let maxActive = 0;
    global.fetch = vi.fn(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 10));
      active--;
      return mockFetchOk({});
    });

    await poolFetch(Array.from({ length: 20 }, (_, i) => i + 1), 5);

    expect(maxActive).toBeLessThanOrEqual(5);
  });

  it('continua mesmo com falhas (allSettled, não all)', async () => {
    let n = 0;
    global.fetch = vi.fn(async () => {
      n++;
      return n % 2 === 0 ? mockFetchFail(500) : mockFetchOk({ id: n });
    });

    const results = await poolFetch([1, 2, 3, 4], 2);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(2);
  });

  it('chama onProgress a cada lote', async () => {
    global.fetch = vi.fn(async () => mockFetchOk({}));
    const progress = [];
    await poolFetch([1, 2, 3, 4, 5], 2, (done, total) => progress.push([done, total]));
    expect(progress).toEqual([[2, 5], [4, 5], [5, 5]]);
  });
});
'@

'tests/render.test.js' = @'
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
'@

'tests/filters.test.js' = @'
/**
 * Testes de filtros.
 * Foco: logica pura de applyFilters + inicializacao com DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { applyFilters, updateClearButton } from '../src/filters.js';

const sample = [
  { id: 1, name: 'bulbasaur', types: ['grass', 'poison'], abilities: [], stats: [] },
  { id: 4, name: 'charmander', types: ['fire'], abilities: [], stats: [] },
  { id: 7, name: 'squirtle', types: ['water'], abilities: [], stats: [] },
  { id: 25, name: 'pikachu', types: ['electric'], abilities: [], stats: [] },
];

describe('applyFilters', () => {
  beforeEach(() => {
    state.searchQuery = '';
    state.activeTypes = new Set();
  });

  it('sem filtros, retorna tudo', () => {
    expect(applyFilters(sample)).toHaveLength(4);
  });

  it('filtra por nome (case insensitive)', () => {
    state.searchQuery = 'pika';
    expect(applyFilters(sample)).toEqual([sample[3]]);
  });

  it('filtra por ID', () => {
    state.searchQuery = '25';
    expect(applyFilters(sample)).toEqual([sample[3]]);
  });

  it('filtra por tipo unico', () => {
    state.activeTypes = new Set(['fire']);
    expect(applyFilters(sample)).toEqual([sample[1]]);
  });

  it('multiplos tipos funcionam como OR', () => {
    state.activeTypes = new Set(['fire', 'water']);
    const result = applyFilters(sample);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['charmander', 'squirtle']);
  });

  it('busca + tipo combinados (AND)', () => {
    state.searchQuery = 'char';
    state.activeTypes = new Set(['fire']);
    expect(applyFilters(sample)).toEqual([sample[1]]);

    state.searchQuery = 'bulba';
    expect(applyFilters(sample)).toEqual([]);
  });

  it('retorna vazio quando nada casa', () => {
    state.searchQuery = 'zzzzz';
    expect(applyFilters(sample)).toEqual([]);
  });
});

describe('updateClearButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="clear-filters" hidden></button>';
    state.searchQuery = '';
    state.activeTypes = new Set();
  });

  it('fica oculto sem filtros', () => {
    updateClearButton();
    expect(document.getElementById('clear-filters').hidden).toBe(true);
  });

  it('fica visivel com busca ativa', () => {
    state.searchQuery = 'pika';
    updateClearButton();
    expect(document.getElementById('clear-filters').hidden).toBe(false);
  });

  it('fica visivel com tipo ativo', () => {
    state.activeTypes = new Set(['fire']);
    updateClearButton();
    expect(document.getElementById('clear-filters').hidden).toBe(false);
  });
});
'@

'.github/workflows/test.yml' = @'
name: Tests

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run coverage
'@

}

# ---------------------------------------------------------------
# 3. Escreve os arquivos (UTF-8 sem BOM)
# ---------------------------------------------------------------
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

foreach ($path in $files.Keys) {
    $fullPath = Join-Path $root $path
    $parent = Split-Path $fullPath -Parent
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    [System.IO.File]::WriteAllText($fullPath, $files[$path], $utf8NoBom)
    Write-Host "📄 $path" -ForegroundColor Green
}

# ---------------------------------------------------------------
# 4. Atualiza .gitignore (adiciona linhas se não existirem)
# ---------------------------------------------------------------
$gitignorePath = Join-Path $root '.gitignore'
$gitignoreLines = @('node_modules/', 'coverage/', '.vitest/')

if (-not (Test-Path $gitignorePath)) {
    Set-Content -Path $gitignorePath -Value ($gitignoreLines -join "`n") -Encoding UTF8
    Write-Host "📄 .gitignore (criado)" -ForegroundColor Green
} else {
    $existing = Get-Content $gitignorePath -Raw
    $toAdd = @()
    foreach ($line in $gitignoreLines) {
        if ($existing -notmatch [regex]::Escape($line)) { $toAdd += $line }
    }
    if ($toAdd.Count -gt 0) {
        Add-Content -Path $gitignorePath -Value ($toAdd -join "`n") -Encoding UTF8
        Write-Host "📄 .gitignore (atualizado: $($toAdd -join ', '))" -ForegroundColor Green
    } else {
        Write-Host "📄 .gitignore (já estava completo)" -ForegroundColor DarkGray
    }
}

# ---------------------------------------------------------------
# 5. Atualiza/cria package.json
# ---------------------------------------------------------------
$pkgPath = Join-Path $root 'package.json'

if (Test-Path $pkgPath) {
    Write-Host "`n⚠️  package.json já existe — atualizando campos necessários" -ForegroundColor Yellow
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json

    if (-not $pkg.type) { $pkg | Add-Member -NotePropertyName 'type' -NotePropertyValue 'module' -Force }

    if (-not $pkg.scripts) {
        $pkg | Add-Member -NotePropertyName 'scripts' -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    $scriptsToSet = @{
        'dev'         = 'npx serve .'
        'test'        = 'vitest run'
        'test:watch'  = 'vitest'
        'test:ui'     = 'vitest --ui'
        'coverage'    = 'vitest run --coverage'
    }
    foreach ($k in $scriptsToSet.Keys) {
        if (-not $pkg.scripts.PSObject.Properties[$k]) {
            $pkg.scripts | Add-Member -NotePropertyName $k -NotePropertyValue $scriptsToSet[$k] -Force
        }
    }

    if (-not $pkg.devDependencies) {
        $pkg | Add-Member -NotePropertyName 'devDependencies' -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    $depsToSet = @{
        'vitest'                 = '^1.6.0'
        '@vitest/coverage-v8'    = '^1.6.0'
        'jsdom'                  = '^24.0.0'
    }
    foreach ($k in $depsToSet.Keys) {
        if (-not $pkg.devDependencies.PSObject.Properties[$k]) {
            $pkg.devDependencies | Add-Member -NotePropertyName $k -NotePropertyValue $depsToSet[$k] -Force
        }
    }

    $pkg | ConvertTo-Json -Depth 10 | Set-Content -Path $pkgPath -Encoding UTF8
    Write-Host "📄 package.json atualizado" -ForegroundColor Green
} else {
    Write-Host "`n📄 package.json não existe — criando do zero" -ForegroundColor Yellow
    $newPkg = [ordered]@{
        name = 'pokedex'
        version = '1.0.0'
        type = 'module'
        scripts = [ordered]@{
            dev = 'npx serve .'
            test = 'vitest run'
            'test:watch' = 'vitest'
            'test:ui' = 'vitest --ui'
            coverage = 'vitest run --coverage'
        }
        devDependencies = [ordered]@{
            'vitest' = '^1.6.0'
            '@vitest/coverage-v8' = '^1.6.0'
            'jsdom' = '^24.0.0'
        }
    }
    $newPkg | ConvertTo-Json -Depth 10 | Set-Content -Path $pkgPath -Encoding UTF8
    Write-Host "📄 package.json criado" -ForegroundColor Green
}

# ---------------------------------------------------------------
# 6. Resumo
# ---------------------------------------------------------------
Write-Host "`n✅ Estrutura criada com sucesso!" -ForegroundColor Cyan
Write-Host "`nPróximos passos:" -ForegroundColor White
Write-Host "  1. npm install" -ForegroundColor Gray
Write-Host "  2. npm test" -ForegroundColor Gray
Write-Host "  3. npm run coverage    (opcional: ver % de cobertura)" -ForegroundColor Gray

# Mostra a árvore final (ignora node_modules)
Write-Host "`n🌳 Estrutura final:" -ForegroundColor White
Get-ChildItem -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\coverage\\' } |
    ForEach-Object { $_.FullName.Replace($root.Path + '\', '') } |
    Sort-Object