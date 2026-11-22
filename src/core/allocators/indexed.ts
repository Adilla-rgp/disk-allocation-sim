import type { AllocationResult, Directory, Disk } from '../types';
import type { Allocator } from './allocator';
import { DEFAULT_POINTER_SIZE } from './linked';

/**
 * Calcula quantos ponteiros cabem em um bloco de índice.
 *
 * @param blockSize Tamanho do bloco, em bytes.
 * @param pointerSize Tamanho de cada ponteiro, em bytes.
 * @returns `floor(blockSize / pointerSize)`.
 */
export function maxPointersPerIndexBlock(blockSize: number, pointerSize: number): number {
  throw new Error('Não implementado');
}

/**
 * Alocação indexada: cada arquivo tem um bloco de índice (`isIndexBlock = true`) cuja
 * lista `pointers` aponta para os blocos de dados. O diretório guarda apenas o bloco
 * de índice. Permite acesso direto sem fragmentação externa, ao custo de um bloco
 * inteiro de overhead por arquivo.
 */
export class IndexedAllocator implements Allocator {
  readonly name = 'indexed' as const;

  /**
   * @param pointerSize Bytes de cada ponteiro no bloco de índice (limita o tamanho máximo do arquivo).
   */
  constructor(public readonly pointerSize: number = DEFAULT_POINTER_SIZE) {}

  /**
   * Reserva `sizeInBlocks + 1` blocos livres: o primeiro vira bloco de índice e os demais
   * são blocos de dados listados em `pointers`. Falha com `insufficient-space` se faltarem
   * blocos e com `index-overflow` se os ponteiros não couberem em um bloco de índice.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBlocks: number): AllocationResult {
    throw new Error('Não implementado');
  }

  /** Libera os blocos de dados listados no índice, o próprio bloco de índice e a entrada. */
  remove(disk: Disk, dir: Directory, fileName: string): void {
    throw new Error('Não implementado');
  }

  /** Retorna o bloco de índice seguido dos blocos de `pointers`, nessa ordem. */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[] {
    throw new Error('Não implementado');
  }

  /** Acesso direto via índice: 2 leituras (bloco de índice + bloco de dados). */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number {
    throw new Error('Não implementado');
  }
}
