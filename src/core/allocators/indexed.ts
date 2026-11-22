import { addEntry, removeEntry, requireEntry } from '../directory';
import { freeBlocks, occupyBlock, releaseBlock } from '../disk';
import type { AllocationResult, Directory, Disk, FreeBlockPolicy } from '../types';
import {
  assertLogicalIndex,
  DEFAULT_POINTER_SIZE,
  DEFAULT_SEED,
  failure,
  selectFreeBlocks,
  validateRequest,
  type Allocator,
  type PointerAllocatorOptions,
} from './allocator';

/**
 * Calcula quantos ponteiros cabem em um bloco de índice, ou seja, o número máximo de
 * blocos de dados de um arquivo (índice de um único nível).
 *
 * @param blockSize Tamanho do bloco, em bytes.
 * @param pointerSize Tamanho de cada ponteiro, em bytes (inteiro positivo).
 * @returns `floor(blockSize / pointerSize)`.
 * @throws RangeError se `pointerSize` não for positivo.
 */
export function maxPointersPerIndexBlock(blockSize: number, pointerSize: number): number {
  if (!(pointerSize > 0)) {
    throw new RangeError(`Tamanho de ponteiro inválido: ${pointerSize}.`);
  }
  return Math.floor(blockSize / pointerSize);
}

/**
 * Alocação indexada: cada arquivo tem um bloco de índice (`isIndexBlock = true`) cuja
 * lista `pointers` aponta para os blocos de dados. O diretório guarda apenas o bloco
 * de índice.
 *
 * Permite acesso direto sem fragmentação externa, ao custo de um bloco inteiro de
 * overhead por arquivo; o tamanho máximo do arquivo é limitado pelos ponteiros que
 * cabem no bloco de índice.
 */
export class IndexedAllocator implements Allocator {
  readonly name = 'indexed' as const;
  /** Bytes de cada ponteiro no bloco de índice. */
  readonly pointerSize: number;
  /** Política de escolha dos blocos livres. */
  readonly freeBlockPolicy: FreeBlockPolicy;
  /** Semente do PRNG usada pela política `random`. */
  readonly seed: number;

  /**
   * @param options Tamanho do ponteiro, política de blocos livres e semente.
   */
  constructor(options: PointerAllocatorOptions = {}) {
    this.pointerSize = options.pointerSize ?? DEFAULT_POINTER_SIZE;
    this.freeBlockPolicy = options.freeBlockPolicy ?? 'first-free';
    this.seed = options.seed ?? DEFAULT_SEED;
  }

  /** Nome legível, com a política de blocos livres. */
  get label(): string {
    return `Indexada (${this.freeBlockPolicy})`;
  }

  /** Os blocos de dados não guardam ponteiros: o bloco inteiro é de dados. */
  dataBytesPerBlock(blockSize: number): number {
    return blockSize;
  }

  /** `ceil(bytes / blockSize)` blocos de dados (o bloco de índice é contado à parte). */
  dataBlocksFor(blockSize: number, sizeInBytes: number): number {
    return Math.ceil(sizeInBytes / this.dataBytesPerBlock(blockSize));
  }

  /**
   * Reserva `n + 1` blocos livres pela política configurada: o primeiro vira bloco de
   * índice e os `n` seguintes são os blocos de dados listados em `pointers`.
   *
   * Falhas: `invalid-size`, `duplicate-name`; `index-overflow` se `n` for maior que
   * `floor(blockSize / pointerSize)`; `insufficient-space` se faltarem blocos (contando o
   * de índice). Nunca falha por fragmentação externa. Em qualquer falha o disco não é alterado.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBytes: number): AllocationResult {
    const invalid = validateRequest(dir, fileName, sizeInBytes);
    if (invalid) return invalid;

    const dataBlocks = this.dataBlocksFor(disk.blockSize, sizeInBytes);
    const needed = dataBlocks + 1;
    const maxPointers = maxPointersPerIndexBlock(disk.blockSize, this.pointerSize);
    if (dataBlocks > maxPointers) {
      return failure(
        'index-overflow',
        `"${fileName}" precisa de ${dataBlocks} blocos de dados, mas o bloco de índice ` +
          `comporta só ${maxPointers} ponteiros.`,
        needed,
      );
    }

    const blocks = selectFreeBlocks(disk, needed, this.freeBlockPolicy, this.seed, fileName);
    if (!blocks) {
      return failure(
        'insufficient-space',
        `Espaço insuficiente para "${fileName}": precisa de ${needed} blocos ` +
          `(${dataBlocks} de dados + 1 de índice), há ${freeBlocks(disk).length} livres.`,
        needed,
      );
    }

    const [indexBlock, ...data] = blocks;
    for (const b of blocks) occupyBlock(disk, b, fileName);
    disk.blocks[indexBlock].isIndexBlock = true;
    disk.blocks[indexBlock].pointers = [...data];
    addEntry(dir, {
      name: fileName,
      sizeInBytes,
      technique: 'indexed',
      indexBlock,
      length: dataBlocks,
    });
    return { success: true, blocks };
  }

  /** Libera os blocos de dados, o bloco de índice (zerando `pointers`) e remove a entrada. */
  remove(disk: Disk, dir: Directory, fileName: string): number[] {
    const blocks = this.blocksOf(disk, dir, fileName);
    for (const b of blocks) releaseBlock(disk, b);
    removeEntry(dir, fileName);
    return blocks;
  }

  /**
   * Retorna o bloco de índice seguido dos blocos de `pointers`, nessa ordem.
   *
   * @throws Error se o bloco de índice estiver corrompido.
   */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[] {
    const entry = requireEntry(dir, fileName, 'indexed');
    const index = disk.blocks[entry.indexBlock];
    if (!index || !index.isIndexBlock || index.owner !== fileName || !index.pointers) {
      throw new Error(`Bloco de índice ${entry.indexBlock} do arquivo "${fileName}" corrompido.`);
    }
    return [entry.indexBlock, ...index.pointers];
  }

  /** Acesso direto via índice: 2 leituras (bloco de índice + bloco de dados). */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number {
    const entry = requireEntry(dir, fileName, 'indexed');
    assertLogicalIndex(fileName, k, entry.length);
    return 2;
  }
}
