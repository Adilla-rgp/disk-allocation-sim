import type { AllocationResult, Directory, Disk, FreeBlockPolicy } from '../types';
import {
  DEFAULT_POINTER_SIZE,
  DEFAULT_SEED,
  type Allocator,
  type PointerAllocatorOptions,
} from './allocator';

/** Alocação encadeada: cada bloco guarda o ponteiro (`next`) para o próximo. */
export class LinkedAllocator implements Allocator {
  readonly name = 'linked' as const;
  readonly pointerSize: number;
  readonly freeBlockPolicy: FreeBlockPolicy;
  readonly seed: number;

  constructor(options: PointerAllocatorOptions = {}) {
    this.pointerSize = options.pointerSize ?? DEFAULT_POINTER_SIZE;
    this.freeBlockPolicy = options.freeBlockPolicy ?? 'first-free';
    this.seed = options.seed ?? DEFAULT_SEED;
  }

  get label(): string {
    return `Encadeada (${this.freeBlockPolicy})`;
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
