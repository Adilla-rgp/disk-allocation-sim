/**
 * Roda um cenário no terminal e imprime o disco antes/depois de cada operação.
 * Serve de fallback para os prints do relatório e prova que o core não depende da UI.
 *
 * Uso:
 *   npm run cli -- [contiguous|linked|indexed] [first-fit|best-fit|worst-fit]
 *                  [--scenario fair|fragmentation] [--policy first-free|random]
 *                  [--seed N] [--compare]
 */
import { parseArgs } from 'node:util';
import {
  createAllocator,
  runComparison,
  runScenario,
  TECHNIQUES,
  type AllocatorOptions,
  type Block,
  type FileEntry,
  type FitStrategy,
  type FreeBlockPolicy,
  type Metrics,
  type Operation,
  type SimulationResult,
  type TechniqueName,
} from '../src/core';
import { findScenario, scenarios, type ScenarioPreset } from '../src/scenarios';

const STRATEGIES: FitStrategy[] = ['first-fit', 'best-fit', 'worst-fit'];
const POLICIES: FreeBlockPolicy[] = ['first-free', 'random'];
const BLOCKS_PER_ROW = 8;

/** Rótulo e formatação de cada métrica, na ordem em que são impressas. */
const METRIC_ROWS: [keyof Metrics, string, (v: number) => string][] = [
  ['usedBlocks', 'Blocos usados', String],
  ['freeBlocks', 'Blocos livres', String],
  ['occupancyPercent', 'Ocupação', (v) => `${fmt(v)}%`],
  ['overheadBlocks', 'Blocos de overhead (índices)', String],
  ['pointerOverheadBytes', 'Bytes de overhead (ponteiros)', (v) => `${v} B`],
  ['internalFragmentationBytes', 'Fragmentação interna', (v) => `${v} B`],
  ['requestedBytes', 'Bytes solicitados', (v) => `${v} B`],
  ['storedBytes', 'Bytes úteis armazenados', (v) => `${v} B`],
  ['allocatedBytes', 'Bytes alocados', (v) => `${v} B`],
  ['efficiencyPercent', 'Eficiência (úteis/alocados)', (v) => `${fmt(v)}%`],
  ['overheadBytes', 'Overhead total (bytes)', (v) => `${v} B`],
  ['holeCount', 'Buracos livres', String],
  ['largestHole', 'Maior buraco (blocos)', String],
  ['failures', 'Falhas de alocação', String],
  ['avgSequentialAccessCost', 'Custo médio acesso sequencial', fmt],
  ['avgRandomAccessCost', 'Custo médio acesso aleatório', fmt],
];

/** Formata um número com até 2 casas decimais, no padrão brasileiro. */
function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/**
 * Representa um bloco como célula de 4 caracteres:
 * `[  ]` livre, `[A ]` dados, `[A→]` dados com ponteiro para o próximo, `[iA]` bloco de índice.
 */
function cell(block: Block): string {
  if (block.owner === null) return '[  ]';
  const c = block.owner.charAt(0);
  if (block.isIndexBlock) return `[i${c}]`;
  return block.next !== null ? `[${c}→]` : `[${c} ]`;
}

/** Converte os blocos em linhas de texto com `BLOCKS_PER_ROW` blocos e o índice inicial. */
function gridRows(blocks: Block[]): string[] {
  const rows: string[] = [];
  for (let i = 0; i < blocks.length; i += BLOCKS_PER_ROW) {
    rows.push(
      `${String(i).padStart(3)} ${blocks
        .slice(i, i + BLOCKS_PER_ROW)
        .map(cell)
        .join('')}`,
    );
  }
  return rows;
}

/** Imprime duas grades lado a lado (antes e depois). */
function printSideBySide(before: Block[], after: Block[]): void {
  const left = gridRows(before);
  const right = gridRows(after);
  const width = 4 + BLOCKS_PER_ROW * 4;
  console.log(`    ${'Antes'.padEnd(width)}    Depois`);
  left.forEach((row, i) => console.log(`${row.padEnd(width)}    ${right[i]}`));
}

/** Descreve uma operação em português. */
function describeOperation(op: Operation): string {
  return op.type === 'create'
    ? `criar ${op.fileName} (${op.sizeInBytes} bytes)`
    : `remover ${op.fileName}`;
}

/** Resumo de uma linha das métricas principais. */
function metricsLine(m: Metrics): string {
  return (
    `    ocupação ${fmt(m.occupancyPercent)}% · livres ${m.freeBlocks} · buracos ${m.holeCount}` +
    ` · maior buraco ${m.largestHole} · falhas ${m.failures}`
  );
}

/** "1 bloco" ou "n blocos". */
function blocks(n: number): string {
  return n === 1 ? '1 bloco' : `${n} blocos`;
}

/** Localização do arquivo segundo a técnica, para a tabela de diretório. */
function describeEntry(e: FileEntry): string {
  switch (e.technique) {
    case 'contiguous':
      return `início ${e.start}, ${blocks(e.length)}`;
    case 'linked':
      return `início ${e.start}, fim ${e.end}, ${blocks(e.length)}`;
    case 'indexed':
      return `índice ${e.indexBlock}, ${blocks(e.length)} de dados`;
  }
}

/** Imprime uma tabela de texto com colunas alinhadas. */
function printTable(header: string[], rows: string[][]): void {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cols: string[]) =>
    cols.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join(' │ ');
  console.log(line(header));
  console.log(widths.map((w) => '─'.repeat(w)).join('─┼─'));
  rows.forEach((r) => console.log(line(r)));
}

/** Imprime todos os passos de uma simulação, seguidos do diretório e das métricas finais. */
function printSimulation(result: SimulationResult): void {
  const { scenario } = result;
  console.log(`Cenário: ${scenario.name} — ${scenario.description}`);
  console.log(`Disco: ${scenario.diskSize} blocos de ${scenario.blockSize} bytes`);
  console.log(`Técnica: ${result.label}`);
  console.log(
    'Legenda: [  ] livre · [A ] dados · [A→] dados com ponteiro · [iA] bloco de índice\n',
  );

  for (const step of result.steps) {
    console.log(`── Passo ${step.step}: ${describeOperation(step.operation)} ──`);
    printSideBySide(step.before.blocks, step.after.blocks);
    for (const e of step.events)
      console.log(`  ${e.type === 'allocate' || e.type === 'remove' ? '✓' : '✗'} ${e.message}`);
    console.log(`${metricsLine(step.metrics)}\n`);
  }

  console.log('Diretório final:');
  printTable(
    ['Arquivo', 'Bytes', 'Localização'],
    result.finalSnapshot.directory.map((e) => [e.name, String(e.sizeInBytes), describeEntry(e)]),
  );

  console.log('\nMétricas finais:');
  printTable(
    ['Métrica', 'Valor'],
    METRIC_ROWS.map(([key, label, format]) => [label, format(result.finalMetrics[key])]),
  );
}

/** Imprime a tabela comparativa das três técnicas. */
function printComparison(results: SimulationResult[]): void {
  console.log('\nComparação das técnicas (mesmo cenário):');
  printTable(
    ['Métrica', ...results.map((r) => r.label)],
    METRIC_ROWS.map(([key, label, format]) => [
      label,
      ...results.map((r) => format(r.finalMetrics[key])),
    ]),
  );
  const failed = results.map(
    (r) =>
      `${r.label}: ${
        r.events
          .filter((e) => e.type === 'fail')
          .map((e) => e.fileName)
          .join(', ') || 'nenhum'
      }`,
  );
  console.log(`\nArquivos que falharam — ${failed.join(' · ')}`);
  for (const r of results) {
    const { failures, storedBytes, requestedBytes } = r.finalMetrics;
    if (failures > 0) {
      console.log(
        `Nota: ${r.label} armazenou ${storedBytes} B de ${requestedBytes} B solicitados.`,
      );
    }
  }
}

/** Lê e valida os argumentos da linha de comando. */
function readArgs(): {
  technique: TechniqueName;
  options: AllocatorOptions;
  compare: boolean;
  scenario: ScenarioPreset;
} {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      compare: { type: 'boolean', default: false },
      scenario: { type: 'string', default: 'fragmentation' },
      policy: { type: 'string', default: 'first-free' },
      seed: { type: 'string' },
    },
  });
  const [technique = 'contiguous', strategy = 'first-fit'] = positionals;
  if (!TECHNIQUES.includes(technique as TechniqueName)) {
    throw new Error(`Técnica inválida: "${technique}". Use ${TECHNIQUES.join(', ')}.`);
  }
  if (!STRATEGIES.includes(strategy as FitStrategy)) {
    throw new Error(`Estratégia inválida: "${strategy}". Use ${STRATEGIES.join(', ')}.`);
  }
  if (!POLICIES.includes(values.policy as FreeBlockPolicy)) {
    throw new Error(`Política inválida: "${values.policy}". Use ${POLICIES.join(', ')}.`);
  }
  const scenario = findScenario(values.scenario);
  if (!scenario) {
    throw new Error(
      `Cenário inválido: "${values.scenario}". Use ${scenarios.map((s) => s.id).join(', ')}.`,
    );
  }
  const seed = values.seed === undefined ? undefined : Number(values.seed);
  if (seed !== undefined && !Number.isInteger(seed)) {
    throw new Error(`Semente inválida: "${values.seed}". Use um inteiro.`);
  }
  return {
    technique: technique as TechniqueName,
    options: {
      strategy: strategy as FitStrategy,
      freeBlockPolicy: values.policy as FreeBlockPolicy,
      seed,
    },
    compare: values.compare,
    scenario,
  };
}

function main(): void {
  try {
    const { technique, options, compare, scenario } = readArgs();
    printSimulation(runScenario(scenario, createAllocator(technique, options)));
    if (compare) printComparison(runComparison(scenario, options));
  } catch (err) {
    console.error(`Erro: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

main();
