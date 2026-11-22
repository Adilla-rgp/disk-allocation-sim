import { addEntry, removeEntry, requireEntry } from '../directory';
import { findHoles, occupyBlock, releaseBlock } from '../disk';
import type { AllocationResult, Directory, Disk, FitStrategy, Hole } from '../types';
import { assertLogicalIndex, failure, validateRequest, type Allocator } from './allocator';

/**
 * Escolhe um buraco com pelo menos `size` blocos segundo a estratégia:
 * - `first-fit`: o primeiro buraco (da esquerda para a direita) que couber;
 * - `best-fit`: o menor buraco que couber (empate: o mais à esquerda);
 * - `worst-fit`: o maior buraco (empate: o mais à esquerda), se couber.
 *
 * @param holes Buracos disponíveis, em ordem crescente de `start` (ver `findHoles`).
 * @param size Quantidade de blocos necessária.
 * @param strategy Estratégia de escolha.
 * @returns O buraco escolhido, ou `null` se nenhum couber.
 */
export function chooseHole(holes: Hole[], size: number, strategy: FitStrategy): Hole | null {
  const fitting = holes.filter((h) => h.length >= size);
  if (fitting.length === 0) return null;
  switch (strategy) {
    case 'first-fit':
      return fitting[0];
    case 'best-fit':
      return fitting.reduce((best, h) => (h.length < best.length ? h : best));
    case 'worst-fit':
      return fitting.reduce((worst, h) => (h.length > worst.length ? h : worst));
  }
}

/**
 * Alocação contígua: cada arquivo ocupa um intervalo de blocos consecutivos.
 * O diretório guarda o bloco inicial e o tamanho. Permite acesso direto em uma leitura,
 * mas sofre de fragmentação externa.
 */
export class ContiguousAllocator implements Allocator {
  readonly name = 'contiguous' as const;

  /**
   * @param strategy Estratégia de escolha de buraco (padrão: `first-fit`).
   */
  constructor(public readonly strategy: FitStrategy = 'first-fit') {}

  /** Nome legível, com a estratégia. */
  get label(): string {
    return `Contígua (${this.strategy})`;
  }

  /** O bloco inteiro guarda dados: não há ponteiros. */
  dataBytesPerBlock(blockSize: number): number {
    return blockSize;
  }

  /** `ceil(bytes / blockSize)`. */
  dataBlocksFor(blockSize: number, sizeInBytes: number): number {
    return Math.ceil(sizeInBytes / this.dataBytesPerBlock(blockSize));
  }

  /**
   * Procura um buraco com a estratégia configurada e ocupa os blocos consecutivos.
   *
   * Falhas: `invalid-size`, `duplicate-name`; `insufficient-space` quando o espaço livre
   * total não basta; `external-fragmentation` quando o total basta, mas nenhum buraco
   * comporta o arquivo. Em qualquer falha o disco não é alterado.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBytes: number): AllocationResult {
    const invalid = validateRequest(dir, fileName, sizeInBytes);
    if (invalid) return invalid;

    const needed = this.dataBlocksFor(disk.blockSize, sizeInBytes);
    const holes = findHoles(disk);
    const totalFree = holes.reduce((sum, h) => sum + h.length, 0);

    if (totalFree < needed) {
      return failure(
        'insufficient-space',
        `Espaço insuficiente para "${fileName}": precisa de ${needed} blocos, há ${totalFree} livres.`,
        needed,
      );
    }

    const hole = chooseHole(holes, needed, this.strategy);
    if (!hole) {
      const largest = Math.max(...holes.map((h) => h.length));
      return failure(
        'external-fragmentation',
        `Fragmentação externa: "${fileName}" precisa de ${needed} blocos contíguos; ` +
          `há ${totalFree} livres, mas o maior buraco tem ${largest}.`,
        needed,
      );
    }

    const blocks = Array.from({ length: needed }, (_, i) => hole.start + i);
    for (const b of blocks) occupyBlock(disk, b, fileName);
    addEntry(dir, {
      name: fileName,
      sizeInBytes,
      technique: 'contiguous',
      start: hole.start,
      length: needed,
    });
    return { success: true, blocks };
  }

  /** Libera o intervalo `[start, start + length)` e remove a entrada do diretório. */
  remove(disk: Disk, dir: Directory, fileName: string): number[] {
    const blocks = this.blocksOf(disk, dir, fileName);
    for (const b of blocks) releaseBlock(disk, b);
    removeEntry(dir, fileName);
    return blocks;
  }

  /** Retorna `start, start + 1, ..., start + length - 1`. */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[] {
    const entry = requireEntry(dir, fileName, 'contiguous');
    return Array.from({ length: entry.length }, (_, i) => entry.start + i);
  }

  /** Acesso direto: o bloco `start + k` é lido em 1 leitura. */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number {
    const entry = requireEntry(dir, fileName, 'contiguous');
    assertLogicalIndex(fileName, k, entry.length);
    return 1;
  }
}
