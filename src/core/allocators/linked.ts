import { addEntry, removeEntry, requireEntry } from '../directory';
import { freeBlocks, occupyBlock, releaseBlock } from '../disk';
import type { AllocationResult, Block, Directory, Disk, FreeBlockPolicy } from '../types';
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
 * Alocação encadeada: cada bloco do arquivo guarda, dentro dele, o ponteiro (`next`)
 * para o próximo bloco. O diretório guarda o primeiro e o último bloco.
 *
 * Não sofre fragmentação externa (qualquer bloco livre serve), mas cada bloco perde
 * `pointerSize` bytes para o ponteiro e o acesso ao k-ésimo bloco exige percorrer a cadeia.
 */
export class LinkedAllocator implements Allocator {
  readonly name = 'linked' as const;
  /** Bytes do ponteiro gravado em cada bloco de dados. */
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
    return `Encadeada (${this.freeBlockPolicy})`;
  }

  /**
   * `blockSize - pointerSize`: o ponteiro ocupa espaço dentro do bloco.
   *
   * @throws RangeError se o bloco não comportar o ponteiro e ao menos 1 byte de dados.
   */
  dataBytesPerBlock(blockSize: number): number {
    const bytes = blockSize - this.pointerSize;
    if (bytes <= 0) {
      throw new RangeError(
        `Bloco de ${blockSize} bytes não comporta ponteiro de ${this.pointerSize} bytes e dados.`,
      );
    }
    return bytes;
  }

  /** `ceil(bytes / (blockSize - pointerSize))`. */
  dataBlocksFor(blockSize: number, sizeInBytes: number): number {
    return Math.ceil(sizeInBytes / this.dataBytesPerBlock(blockSize));
  }

  /**
   * Escolhe blocos livres pela política configurada e os encadeia via `next`, na ordem
   * escolhida; o último bloco fica com `next = null`.
   *
   * Falhas: `invalid-size`, `duplicate-name` e `insufficient-space`. Nunca falha por
   * fragmentação externa. Em qualquer falha o disco não é alterado.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBytes: number): AllocationResult {
    const invalid = validateRequest(dir, fileName, sizeInBytes);
    if (invalid) return invalid;

    const needed = this.dataBlocksFor(disk.blockSize, sizeInBytes);
    const blocks = selectFreeBlocks(disk, needed, this.freeBlockPolicy, this.seed, fileName);
    if (!blocks) {
      return failure(
        'insufficient-space',
        `Espaço insuficiente para "${fileName}": precisa de ${needed} blocos, ` +
          `há ${freeBlocks(disk).length} livres.`,
        needed,
      );
    }

    blocks.forEach((b, i) => {
      occupyBlock(disk, b, fileName);
      disk.blocks[b].next = i + 1 < blocks.length ? blocks[i + 1] : null;
    });
    addEntry(dir, {
      name: fileName,
      sizeInBytes,
      technique: 'linked',
      start: blocks[0],
      end: blocks[blocks.length - 1],
      length: needed,
    });
    return { success: true, blocks };
  }

  /** Percorre a cadeia liberando cada bloco (zerando `next`) e remove a entrada. */
  remove(disk: Disk, dir: Directory, fileName: string): number[] {
    const blocks = this.blocksOf(disk, dir, fileName);
    for (const b of blocks) releaseBlock(disk, b);
    removeEntry(dir, fileName);
    return blocks;
  }

  /**
   * Segue os ponteiros `next` a partir de `start` até `null`.
   *
   * @throws Error se a cadeia estiver corrompida (bloco de outro dono ou ciclo).
   */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[] {
    const entry = requireEntry(dir, fileName, 'linked');
    const blocks: number[] = [];
    let current: number | null = entry.start;
    while (current !== null) {
      const block: Block | undefined = disk.blocks[current];
      if (!block || block.owner !== fileName || blocks.length >= entry.length) {
        throw new Error(`Cadeia do arquivo "${fileName}" corrompida no bloco ${current}.`);
      }
      blocks.push(current);
      current = block.next;
    }
    return blocks;
  }

  /** Acesso sequencial: são lidos os blocos 0..k da cadeia, ou seja, k + 1 leituras. */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number {
    const entry = requireEntry(dir, fileName, 'linked');
    assertLogicalIndex(fileName, k, entry.length);
    return k + 1;
  }
}
