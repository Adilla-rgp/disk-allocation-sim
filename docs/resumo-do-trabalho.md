# Resumo do trabalho: Simulador de Alocação de Arquivos em Disco

Trabalho final de **Sistemas Operacionais I (UFMA)**. Na interface o nome do projeto é
**Blocos & Arquivos**.

Equipe: Ádilla Roberta, Brendda Thamyres, Diego Miqueias e Sarah Marques.

Repositório: https://github.com/Adilla-rgp/disk-allocation-sim

## O que é

É um simulador web que mostra, passo a passo, como as três técnicas clássicas de alocação
de arquivos em disco se comportam com o mesmo roteiro de operações (criar e remover
arquivos), e depois compara as três.

| Técnica   | Como funciona                                        | Vantagem                       | Problema                                     |
| --------- | ---------------------------------------------------- | ------------------------------ | -------------------------------------------- |
| Contígua  | Blocos consecutivos (first-fit, best-fit, worst-fit) | Acesso direto rápido           | Fragmentação externa                         |
| Encadeada | Cada bloco aponta para o próximo                     | Sem fragmentação externa       | Ponteiro em todo bloco, acesso só sequencial |
| Indexada  | Um bloco de índice lista os blocos do arquivo        | Acesso direto sem fragmentação | Um bloco extra por arquivo                   |

Em cada passo o simulador mostra o disco e o diretório antes e depois da operação,
registra os eventos e calcula as métricas: ocupação, eficiência, overhead, buracos, maior
buraco, falhas e custo de acesso.

## Como rodar

É preciso ter o Node.js 20 ou mais novo.

```bash
npm i            # instala as dependências
npm run dev      # abre a interface web
npm run cli      # roda um cenário no terminal (bom para prints do relatório)
npm test         # roda os testes
```

Exemplos da CLI:

```bash
npm run cli -- contiguous best-fit
npm run cli -- indexed --scenario fair
npm run cli -- --compare          # tabela comparando as 3 técnicas
```

## O que já está pronto

**Núcleo (lógica de alocação)**

- Disco e diretório em memória.
- As três técnicas, com as três estratégias na contígua.
- Simulador que executa um roteiro e gera snapshots de antes/depois de cada passo, além
  do log de eventos.
- Métricas de ocupação, bytes solicitados/armazenados/alocados, eficiência, overhead,
  fragmentação interna, buracos, falhas e custo de acesso.
- Dois cenários prontos:
  - **Justo** (`fair`): tudo cabe nas três técnicas, o que serve para comparar overhead e
    eficiência.
  - **Fragmentação** (`fragmentation`): a contígua falha por fragmentação externa (F
    precisa de 8 blocos, há 14 livres, mas o maior buraco tem 7), enquanto as outras duas
    ainda conseguem alocar.
- CLI que imprime o disco em texto e a tabela comparativa.
- **95 testes passando** em 9 arquivos.

**Interface (3 páginas)**

1. **Montar** (Configuração): escolha da técnica, da política de blocos livres, da
   semente, do tamanho do disco, do bloco e do ponteiro, e do roteiro de operações (um
   cenário pronto ou um roteiro editado à mão).
2. **Executar**: player com play/pause, passo a passo e velocidade (atalhos ← → e
   espaço), disco com toggle antes/depois, blocos que piscam ao serem alocados ou
   liberados, setas da cadeia (encadeada) e do índice (indexada) ao passar o mouse,
   diretório, buracos livres, linha do tempo de eventos e cards de métricas.
3. **Comparar**: os três discos lado a lado com um único player, a tabela comparativa e
   o botão **Exportar CSV** (com `;` e vírgula decimal, pronto para o Excel e para o
   relatório).

Em todas as páginas com passos há um **narrador** que explica em português simples o que
aconteceu e por quê.

**Visual**: tema escuro próprio, fontes embutidas (funciona offline no laboratório),
ícones SVG próprios e paleta de cores dos arquivos escolhida à mão. A última mudança
foi um realce violeta e um efeito de hover nos cards de métricas
([PR #2](https://github.com/Adilla-rgp/disk-allocation-sim/pull/2)).

## Regra de arquitetura

Toda a lógica de alocação fica em `src/core/`, em TypeScript puro, sem React e sem DOM. A
interface e a CLI apenas **usam** o core e não reimplementam nenhuma regra. Isso é
verificado automaticamente: o build compila o core sem a lib DOM, e o ESLint proíbe
importar React ou `src/ui` dentro de `src/core`.

## Onde está cada coisa

```
src/
  core/                       NÚCLEO (lógica pura)
    types.ts                  tipos e contratos: Block, Disk, FileEntry, Snapshot...
    disk.ts                   criação do disco (array de blocos)
    directory.ts              diretório: nome do arquivo -> metadados
    allocators/
      allocator.ts            interface comum a todas as técnicas
      contiguous.ts           contígua (first/best/worst-fit)
      linked.ts               encadeada
      indexed.ts              indexada
      factory.ts              cria o alocador a partir do nome da técnica
    metrics.ts                cálculo das métricas
    simulator.ts              executa o roteiro, gera snapshots e eventos
    random.ts                 gerador aleatório com semente (política "random")
    index.ts                  o que o core exporta para fora

  scenarios/                  CENÁRIOS PRONTOS
    index.ts                  lista de cenários
    fair.ts                   cenário "Justo"
    fragmentation.ts          cenário "Fragmentação"

  ui/                         INTERFACE (React)
    pages/
      ConfigPage.tsx          página 1: Montar
      ExecutionPage.tsx       página 2: Executar
      ComparisonPage.tsx      página 3: Comparar
    components/
      DiskGrid.tsx            desenho do disco (blocos, setas, destaques)
      DirectoryTable.tsx      tabela do diretório
      EventLog.tsx            linha do tempo de eventos
      MetricsCards.tsx        cards de métricas
      PlayerControls.tsx      botões do player
      Narration.tsx           caixa do narrador
      TechniqueSketch.tsx     miniaturas das técnicas na página Montar
      Icon.tsx                ícones SVG e logo
    hooks/
      usePlayer.ts            estado do player (passo, play, velocidade)
      useSimulation.ts        roda uma simulação usando o core
      useComparison.ts        roda as três técnicas para comparar
    config.ts                 formulário de configuração e validação
    narration.ts              textos do narrador
    marks.ts                  quais blocos piscam em cada passo
    comparisonTable.ts        tabela comparativa e geração do CSV
    format.ts                 formatação de números e cores dos arquivos
    credits.ts                nomes da equipe exibidos no rodapé
    styles.css                todo o visual (cores no topo, em variáveis)
  App.tsx                     navegação entre as 3 páginas
  main.tsx                    ponto de entrada

cli/run.ts                    versão de terminal
tests/core/                   testes de cada módulo do núcleo
docs/relatorio/prints/        capturas de tela para o relatório
README.md                     documentação completa
```

## Divisão da equipe

| Frente | Responsabilidade                     | Arquivos principais                                                               |
| ------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| 1      | Disco, diretório, contígua e remoção | `core/disk.ts`, `core/directory.ts`, `core/allocators/contiguous.ts`              |
| 2      | Encadeada, indexada e métricas       | `core/allocators/linked.ts`, `core/allocators/indexed.ts`, `core/metrics.ts`      |
| 3      | Interface, cenários e relatório      | `src/ui/`, `src/scenarios/`, `core/simulator.ts`, `cli/run.ts`, `docs/relatorio/` |
