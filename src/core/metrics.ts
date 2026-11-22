import type { Allocator } from './allocators/allocator';
import type { SimulationEvent, Snapshot } from './types';

/** Métricas de um snapshot do disco. */
export interface Metrics {
  totalBlocks: number;
  usedBlocks: number;
  freeBlocks: number;
  occupancyPercent: number;
  overheadBlocks: number;
  pointerOverheadBytes: number;
  internalFragmentationBytes: number;
  holeCount: number;
  largestHole: number;
  failures: number;
  avgSequentialAccessCost: number;
  avgRandomAccessCost: number;
}

/** Conta os eventos de falha de alocação. */
export function countFailures(events: SimulationEvent[]): number {
  throw new Error('Não implementado');
}

/** Calcula as métricas de um snapshot. */
export function computeMetrics(snapshot: Snapshot, allocator: Allocator, failures = 0): Metrics {
  throw new Error('Não implementado');
}
