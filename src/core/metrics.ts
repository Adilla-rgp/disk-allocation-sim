import type { Allocator } from './allocators/allocator';
import { directoryFromEntries } from './directory';
import { findHoles } from './disk';
import type { Disk, SimulationEvent, Snapshot } from './types';

/** Métricas de um snapshot do disco, exibidas nos cards e na página de comparação. */
export interface Metrics {
  /** Total de blocos do disco. */
  totalBlocks: number;
  /** Blocos ocupados (dados + índices). */
  usedBlocks: number;
  /** Blocos livres. */
  freeBlocks: number;
  /** Ocupação do disco, em porcentagem (0 a 100). */
  occupancyPercent: number;
  /** Blocos gastos com estrutura em vez de dados (blocos de índice). */
  overheadBlocks: number;
  /** Bytes gastos com ponteiros dentro dos blocos de dados (encadeada). */
  pointerOverheadBytes: number;
  /** Bytes desperdiçados no último bloco de cada arquivo (fragmentação interna). */
  internalFragmentationBytes: number;
  /**
   * Bytes que o roteiro pede que estejam no disco neste ponto: soma dos tamanhos dos
   * arquivos criados (mesmo os que falharam) e ainda não removidos. Sem falhas, é igual a
   * {@link Metrics.storedBytes}.
   */
  requestedBytes: number;
  /** Bytes úteis armazenados: soma dos tamanhos lógicos dos arquivos do diretório. */
  storedBytes: number;
  /** Bytes alocados: blocos usados × tamanho do bloco. */
  allocatedBytes: number;
  /**
   * Eficiência de armazenamento, em porcentagem (0 a 100): bytes úteis / bytes alocados.
   * Vale 0 quando nada está alocado.
   */
  efficiencyPercent: number;
  /** Overhead total em bytes: ponteiros + blocos de índice × tamanho do bloco. */
  overheadBytes: number;
  /** Quantidade de buracos (sequências máximas de blocos livres). */
  holeCount: number;
  /** Tamanho do maior buraco, em blocos (0 se o disco estiver cheio). */
  largestHole: number;
  /** Total de alocações que falharam até este ponto. */
  failures: number;
  /**
   * Leituras por bloco de dados para ler todos os arquivos do início ao fim
   * (contígua e encadeada: 1; indexada: (n + 1) / n por causa do bloco de índice).
   */
  avgSequentialAccessCost: number;
  /**
   * Média de `accessCost(k)` sobre todos os blocos de dados de todos os arquivos
   * (contígua: 1; encadeada: (n + 1) / 2; indexada: 2).
   */
  avgRandomAccessCost: number;
}

/**
 * Conta os eventos de falha de alocação (`type === 'fail'`) no log.
 *
 * @param events Log de eventos da simulação.
 */
export function countFailures(events: SimulationEvent[]): number {
  return events.filter((e) => e.type === 'fail').length;
}

/**
 * Calcula as métricas de um snapshot do disco. Não altera o snapshot.
 *
 * @param snapshot Estado do disco e do diretório.
 * @param allocator Técnica que produziu o snapshot (define ponteiros e custo de acesso).
 * @param failures Total de falhas de alocação até o snapshot (ver {@link countFailures}).
 * @param requestedBytes Bytes solicitados até o snapshot (padrão: os bytes armazenados, ou
 *   seja, supõe que nenhum pedido falhou).
 * @returns As métricas do snapshot.
 */
export function computeMetrics(
  snapshot: Snapshot,
  allocator: Allocator,
  failures = 0,
  requestedBytes?: number,
): Metrics {
  const disk: Disk = { blockSize: snapshot.blockSize, blocks: snapshot.blocks };
  const dir = directoryFromEntries(snapshot.directory);

  const totalBlocks = disk.blocks.length;
  const usedBlocks = disk.blocks.filter((b) => b.owner !== null).length;
  const holes = findHoles(disk);

  const dataBytesPerBlock = allocator.dataBytesPerBlock(disk.blockSize);
  const pointerBytesPerBlock = disk.blockSize - dataBytesPerBlock;

  let dataBlocks = 0;
  let storedBytes = 0;
  let pointerOverheadBytes = 0;
  let internalFragmentationBytes = 0;
  let sequentialReads = 0;
  let randomReads = 0;
  for (const entry of snapshot.directory) {
    dataBlocks += entry.length;
    storedBytes += entry.sizeInBytes;
    pointerOverheadBytes += entry.length * pointerBytesPerBlock;
    internalFragmentationBytes += entry.length * dataBytesPerBlock - entry.sizeInBytes;
    sequentialReads += allocator.blocksOf(disk, dir, entry.name).length;
    for (let k = 0; k < entry.length; k++) {
      randomReads += allocator.accessCost(disk, dir, entry.name, k);
    }
  }

  const overheadBlocks = disk.blocks.filter((b) => b.isIndexBlock).length;
  const allocatedBytes = usedBlocks * disk.blockSize;

  return {
    totalBlocks,
    usedBlocks,
    freeBlocks: totalBlocks - usedBlocks,
    occupancyPercent: (usedBlocks / totalBlocks) * 100,
    overheadBlocks,
    pointerOverheadBytes,
    internalFragmentationBytes,
    requestedBytes: requestedBytes ?? storedBytes,
    storedBytes,
    allocatedBytes,
    efficiencyPercent: allocatedBytes ? (storedBytes / allocatedBytes) * 100 : 0,
    overheadBytes: pointerOverheadBytes + overheadBlocks * disk.blockSize,
    holeCount: holes.length,
    largestHole: holes.reduce((max, h) => Math.max(max, h.length), 0),
    failures,
    avgSequentialAccessCost: dataBlocks ? sequentialReads / dataBlocks : 0,
    avgRandomAccessCost: dataBlocks ? randomReads / dataBlocks : 0,
  };
}
