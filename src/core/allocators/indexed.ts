import type { AllocationResult, Directory, Disk, FreeBlockPolicy } from '../types';
import {
  DEFAULT_POINTER_SIZE,
  DEFAULT_SEED,
  type Allocator,
  type PointerAllocatorOptions,
} from './allocator';

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

/** Alocação indexada: cada arquivo tem um bloco de índice com a lista de blocos de dados. */
export class IndexedAllocator implements Allocator {
  readonly name = 'indexed' as const;
  readonly pointerSize: number;
  readonly freeBlockPolicy: FreeBlockPolicy;
  readonly seed: number;

  constructor(options: PointerAllocatorOptions = {}) {
    this.pointerSize = options.pointerSize ?? DEFAULT_POINTER_SIZE;
    this.freeBlockPolicy = options.freeBlockPolicy ?? 'first-free';
    this.seed = options.seed ?? DEFAULT_SEED;
  }

  get label(): string {
    return `Indexada (${this.freeBlockPolicy})`;
  }

  dataBytesPerBlock(blockSize: number): number {
    throw new Error('Não implementado');
  }

  dataBlocksFor(blockSize: number, sizeInBytes: number): number {
    throw new Error('Não implementado');
  }

  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBytes: number): AllocationResult {
    throw new Error('Não implementado');
  }

  remove(disk: Disk, dir: Directory, fileName: string): number[] {
    throw new Error('Não implementado');
  }

  blocksOf(disk: Disk, dir: Directory, fileName: string): number[] {
    throw new Error('Não implementado');
  }

  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number {
    throw new Error('Não implementado');
  }
}
