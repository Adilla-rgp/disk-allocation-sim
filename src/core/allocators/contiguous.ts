import type { AllocationResult, Directory, Disk, FitStrategy, Hole } from '../types';
import type { Allocator } from './allocator';

/**
 * Escolhe um buraco com pelo menos `size` blocos segundo a estratégia.
 *
 * @param holes Buracos disponíveis (ver `findHoles`).
 * @param size Quantidade de blocos necessária.
 * @param strategy Estratégia de escolha.
 * @returns O buraco escolhido, ou `null` se nenhum couber.
 */
export function chooseHole(holes: Hole[], size: number, strategy: FitStrategy): Hole | null {
  throw new Error('Não implementado');
}

/** Alocação contígua: cada arquivo ocupa um intervalo de blocos consecutivos. */
export class ContiguousAllocator implements Allocator {
  readonly name = 'contiguous' as const;

  constructor(public readonly strategy: FitStrategy = 'first-fit') {}

  get label(): string {
    return `Contígua (${this.strategy})`;
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
