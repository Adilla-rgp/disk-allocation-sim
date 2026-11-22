/**
 * Roda um cenário no terminal e imprime o disco em texto.
 * Serve de fallback para os prints do relatório e prova que o core não depende da UI.
 *
 * Uso: npm run cli -- [contiguous|linked|indexed] [first-fit|best-fit|worst-fit]
 */
import {
  ContiguousAllocator,
  IndexedAllocator,
  LinkedAllocator,
  runScenario,
  type Allocator,
  type Block,
  type FitStrategy,
} from '../src/core';
import { defaultScenario } from '../src/scenarios/default';

/**
 * Cria o alocador correspondente aos argumentos da linha de comando.
 *
 * @param technique Nome da técnica.
 * @param strategy Estratégia da contígua.
 */
function makeAllocator(technique: string, strategy: FitStrategy): Allocator {
  switch (technique) {
    case 'linked':
      return new LinkedAllocator();
    case 'indexed':
      return new IndexedAllocator();
    default:
      return new ContiguousAllocator(strategy);
  }
}

/**
 * Converte os blocos do disco em uma grade de texto: `.` para livre, a inicial do
 * dono para blocos de dados e `#` para blocos de índice.
 *
 * @param blocks Blocos do disco.
 * @param perRow Quantidade de blocos por linha.
 */
function renderDisk(blocks: Block[], perRow = 16): string {
  const cells = blocks.map((b) => (b.owner === null ? '.' : b.isIndexBlock ? '#' : b.owner[0]));
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += perRow) {
    rows.push(`${String(i).padStart(4)} | ${cells.slice(i, i + perRow).join(' ')}`);
  }
  return rows.join('\n');
}

function main(): void {
  const [technique = 'contiguous', strategy = 'first-fit'] = process.argv.slice(2);
  const allocator = makeAllocator(technique, strategy as FitStrategy);

  console.log(`Cenário: ${defaultScenario.name} — técnica: ${allocator.name}\n`);

  try {
    const result = runScenario(defaultScenario, allocator);
    for (const step of result.steps) {
      for (const event of step.events) console.log(`[${event.step}] ${event.message}`);
      console.log(renderDisk(step.after.blocks), '\n');
    }
    console.log('Métricas finais:', result.finalMetrics);
  } catch (err) {
    console.error(`Erro: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

main();
