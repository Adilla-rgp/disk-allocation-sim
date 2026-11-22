# Simulador de Alocação de Arquivos em Disco

Trabalho final de **Sistemas Operacionais I — UFMA**.

## Objetivo

Simular, de forma visual e interativa, as três técnicas clássicas de alocação de arquivos
em disco e comparar seu comportamento:

- **Contígua** — cada arquivo ocupa blocos consecutivos (estratégias _first-fit_,
  _best-fit_ e _worst-fit_). Acesso direto rápido, mas sofre **fragmentação externa**.
- **Encadeada** — cada bloco guarda um ponteiro para o próximo. Sem fragmentação externa,
  mas com **overhead de ponteiro** em todo bloco e acesso apenas sequencial.
- **Indexada** — cada arquivo tem um **bloco de índice** com a lista dos seus blocos.
  Acesso direto sem fragmentação externa, ao custo de um bloco extra por arquivo.

O simulador executa um roteiro de operações (criar/remover arquivos), mostra o disco e o
diretório antes e depois de cada passo, registra um log de eventos e calcula métricas
(ocupação, overhead, número de buracos, maior buraco, falhas e custo de acesso).
A interface é inspirada visualmente no [SOPlay](https://soplay.vercel.app).

## Como rodar

Requer Node.js 20+.

```bash
npm i            # instala as dependências
npm run dev      # sobe a interface web (Vite)
npm run cli      # roda o cenário padrão no terminal e imprime o disco em texto
npm test         # roda os testes (Vitest)
```

A CLI aceita a técnica e a estratégia como argumentos:

```bash
npm run cli -- contiguous best-fit
npm run cli -- linked
npm run cli -- indexed
```

Outros scripts: `npm run build`, `npm run lint`, `npm run format`.

## Arquitetura

A lógica de alocação fica em `src/core/`, em **TypeScript puro**, sem depender de React
nem do DOM. A interface apenas consome o core, e a CLI usa o mesmo core pelo terminal.
Essa regra é verificada automaticamente:

- `tsconfig.core.json` compila `src/core`, `src/scenarios` e `cli` **sem** a lib DOM
  (faz parte do `npm run build`);
- o ESLint proíbe importar `react` ou `src/ui` dentro de `src/core`.

## Mapa das pastas

```
src/
  core/                 # núcleo puro (sem React/DOM)
    types.ts            # Block, Disk, FileEntry, AllocationResult, SimulationEvent, Snapshot...
    disk.ts             # createDisk(n, blockSize): disco como array de blocos em memória
    directory.ts        # diretório: nome do arquivo -> metadados da técnica
    allocators/
      allocator.ts      # interface comum Allocator
      contiguous.ts     # contígua (first-fit, best-fit, worst-fit)
      linked.ts         # encadeada (ponteiro para o próximo bloco)
      indexed.ts        # indexada (bloco de índice)
    metrics.ts          # ocupação, overhead, buracos, maior buraco, falhas, custo de acesso
    simulator.ts        # executa um roteiro, gera snapshots antes/depois e log de eventos
    index.ts            # API pública do core
  scenarios/
    default.ts          # roteiro de exemplo
  ui/
    components/         # DiskGrid, DirectoryTable, EventLog, MetricsCards, PlayerControls
    pages/              # ConfigPage, ExecutionPage, ComparisonPage
  App.tsx
  main.tsx
cli/
  run.ts                # roda um cenário no terminal (fallback para os prints)
tests/
  core/                 # um arquivo de teste por técnica + métricas
docs/
  relatorio/
    prints/             # capturas de tela para o relatório
```

## Divisão da equipe

| Frente | Responsabilidade                     | Arquivos principais                                                                                   |
| ------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1      | Disco, diretório, contígua e remoção | `core/disk.ts`, `core/directory.ts`, `core/allocators/contiguous.ts`, `tests/core/contiguous.test.ts` |
| 2      | Encadeada, indexada e métricas       | `core/allocators/linked.ts`, `core/allocators/indexed.ts`, `core/metrics.ts`, testes correspondentes  |
| 3      | Interface, cenários e relatório      | `src/ui/`, `src/scenarios/`, `core/simulator.ts`, `cli/run.ts`, `docs/relatorio/`                     |

Cada frente trabalha contra os contratos de `core/types.ts` e `core/allocators/allocator.ts`;
os testes em `tests/core/` (hoje como `it.todo`) descrevem o comportamento esperado.
