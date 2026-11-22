import type { AllocationResult, Directory, Disk } from '../types';
import type { Allocator } from './allocator';

/** Tamanho padrão de um ponteiro de bloco, em bytes. */
export const DEFAULT_POINTER_SIZE = 4;

/**
 * Alocação encadeada: cada bloco do arquivo guarda, dentro dele, o ponteiro (`next`)
 * para o próximo bloco. O diretório guarda o primeiro e o último bloco.
 * Não sofre fragmentação externa, mas gasta `pointerSize` bytes de cada bloco
 * com o ponteiro e só permite acesso sequencial.
 */
export class LinkedAllocator implements Allocator {
  readonly name = 'linked' as const;

  /**
   * @param pointerSize Bytes ocupados pelo ponteiro em cada bloco (overhead).
   */
  constructor(public readonly pointerSize: number = DEFAULT_POINTER_SIZE) {}

  /**
   * Ocupa quaisquer blocos livres (em ordem crescente) e os encadeia via `next`;
   * o último bloco fica com `next = null`. Falha com `insufficient-space` se não
   * houver blocos livres suficientes.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBlocks: number): AllocationResult {
    throw new Error('Não implementado');
  }

  /** Percorre a cadeia a partir de `start`, liberando cada bloco, e remove a entrada. */
  remove(disk: Disk, dir: Directory, fileName: string): void {
    throw new Error('Não implementado');
  }

  /** Segue os ponteiros `next` a partir de `start` até `null`. */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[] {
    throw new Error('Não implementado');
  }

  /** Acesso sequencial: k + 1 leituras para chegar ao k-ésimo bloco. */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number {
    throw new Error('Não implementado');
  }
}
