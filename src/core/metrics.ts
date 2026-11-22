import type { Allocator } from './allocators/allocator';
import type { Directory, Disk, SimulationEvent } from './types';

/** Conjunto de métricas exibidas nos cards e na página de comparação. */
export interface Metrics {
  totalBlocks: number;
  usedBlocks: number;
  freeBlocks: number;
  /** Fração de blocos ocupados (0 a 1). */
  occupancy: number;
  /** Blocos gastos com estrutura (blocos de índice) em vez de dados. */
  overheadBlocks: number;
  /** Bytes gastos com estrutura: ponteiros dentro dos blocos + blocos de índice. */
  overheadBytes: number;
  /** Quantidade de buracos (sequências máximas de blocos livres). */
  holeCount: number;
  /** Tamanho do maior buraco, em blocos. */
  largestHole: number;
  /** Quantidade de alocações que falharam. */
  failures: number;
  /** Custo médio (leituras de bloco) para acessar o último bloco de cada arquivo. */
  averageAccessCost: number;
}

/**
 * Calcula a ocupação do disco: blocos usados / total de blocos.
 *
 * @param disk Disco consultado.
 * @returns Valor entre 0 e 1.
 */
export function occupancy(disk: Disk): number {
  throw new Error('Não implementado');
}

/**
 * Calcula o overhead em bytes: na encadeada, `pointerSize` bytes por bloco de dados;
 * na indexada, um bloco inteiro (`blockSize`) por bloco de índice; na contígua, zero.
 *
 * @param disk Disco consultado.
 * @param pointerSize Tamanho de um ponteiro, em bytes.
 * @returns Total de bytes de overhead.
 */
export function overheadBytes(disk: Disk, pointerSize: number): number {
  throw new Error('Não implementado');
}

/**
 * Conta os buracos (sequências máximas de blocos livres consecutivos).
 *
 * @param disk Disco consultado.
 */
export function holeCount(disk: Disk): number {
  throw new Error('Não implementado');
}

/**
 * Retorna o tamanho, em blocos, do maior buraco do disco (0 se o disco estiver cheio).
 *
 * @param disk Disco consultado.
 */
export function largestHole(disk: Disk): number {
  throw new Error('Não implementado');
}

/**
 * Conta os eventos de falha de alocação no log.
 *
 * @param events Log de eventos da simulação.
 */
export function failureCount(events: SimulationEvent[]): number {
  throw new Error('Não implementado');
}

/**
 * Calcula o custo médio de acesso ao último bloco de cada arquivo do diretório,
 * usando `allocator.accessCost`. Retorna 0 se o diretório estiver vazio.
 *
 * @param disk Disco consultado.
 * @param dir Diretório consultado.
 * @param allocator Técnica usada na simulação.
 */
export function averageAccessCost(disk: Disk, dir: Directory, allocator: Allocator): number {
  throw new Error('Não implementado');
}

/**
 * Reúne todas as métricas do estado atual da simulação.
 *
 * @param disk Disco consultado.
 * @param dir Diretório consultado.
 * @param allocator Técnica usada na simulação.
 * @param events Log de eventos até o momento.
 * @param pointerSize Tamanho de um ponteiro, em bytes.
 */
export function computeMetrics(
  disk: Disk,
  dir: Directory,
  allocator: Allocator,
  events: SimulationEvent[],
  pointerSize: number,
): Metrics {
  throw new Error('Não implementado');
}
