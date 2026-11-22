import type { AllocationResult, Directory, Disk, FitStrategy } from '../types';
import type { Allocator } from './allocator';

/** Um buraco: sequência máxima de blocos livres consecutivos. */
export interface Hole {
  /** Primeiro bloco do buraco. */
  start: number;
  /** Quantidade de blocos livres consecutivos. */
  length: number;
}

/**
 * Lista todos os buracos (sequências máximas de blocos livres) do disco, da esquerda
 * para a direita.
 *
 * @param disk Disco consultado.
 * @returns Buracos em ordem crescente de `start`.
 */
export function findHoles(disk: Disk): Hole[] {
  throw new Error('Não implementado');
}

/**
 * Escolhe um buraco com pelo menos `size` blocos segundo a estratégia:
 * - `first-fit`: o primeiro buraco que couber;
 * - `best-fit`: o menor buraco que couber;
 * - `worst-fit`: o maior buraco.
 *
 * @param holes Buracos disponíveis (ver {@link findHoles}).
 * @param size Quantidade de blocos necessária.
 * @param strategy Estratégia de escolha.
 * @returns O buraco escolhido, ou `null` se nenhum couber.
 */
export function chooseHole(holes: Hole[], size: number, strategy: FitStrategy): Hole | null {
  throw new Error('Não implementado');
}

/**
 * Alocação contígua: cada arquivo ocupa um intervalo de blocos consecutivos.
 * O diretório guarda o bloco inicial e o tamanho. Sofre de fragmentação externa.
 */
export class ContiguousAllocator implements Allocator {
  readonly name = 'contiguous' as const;

  /**
   * @param strategy Estratégia de escolha de buraco (padrão: `first-fit`).
   */
  constructor(public readonly strategy: FitStrategy = 'first-fit') {}

  /**
   * Procura um buraco com a estratégia configurada e ocupa os blocos consecutivos.
   * Falha com `external-fragmentation` quando há espaço livre total suficiente, mas
   * nenhum buraco grande o bastante; e com `insufficient-space` quando nem o total basta.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBlocks: number): AllocationResult {
    throw new Error('Não implementado');
  }

  /** Libera o intervalo `[start, start + length)` e remove a entrada do diretório. */
  remove(disk: Disk, dir: Directory, fileName: string): void {
    throw new Error('Não implementado');
  }

  /** Retorna `start, start + 1, ..., start + length - 1`. */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[] {
    throw new Error('Não implementado');
  }

  /** Acesso direto: sempre 1 leitura. */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number {
    throw new Error('Não implementado');
  }
}
