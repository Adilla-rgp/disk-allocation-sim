import type { FitStrategy, TechniqueName } from '../types';
import type { Allocator, PointerAllocatorOptions } from './allocator';
import { ContiguousAllocator } from './contiguous';
import { IndexedAllocator } from './indexed';
import { LinkedAllocator } from './linked';

/** Todas as técnicas, na ordem em que são exibidas. */
export const TECHNIQUES: readonly TechniqueName[] = ['contiguous', 'linked', 'indexed'];

/** Opções de todas as técnicas; cada uma usa apenas as que lhe dizem respeito. */
export interface AllocatorOptions extends PointerAllocatorOptions {
  /** Estratégia da contígua (padrão: `first-fit`). */
  strategy?: FitStrategy;
}

/**
 * Cria o alocador de uma técnica a partir de opções genéricas (útil para a UI e a CLI).
 *
 * @param technique Técnica desejada.
 * @param options Estratégia (contígua) e/ou ponteiro, política e semente (encadeada/indexada).
 */
export function createAllocator(
  technique: TechniqueName,
  options: AllocatorOptions = {},
): Allocator {
  switch (technique) {
    case 'contiguous':
      return new ContiguousAllocator(options.strategy);
    case 'linked':
      return new LinkedAllocator(options);
    case 'indexed':
      return new IndexedAllocator(options);
  }
}
