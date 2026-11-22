import type { Block, Disk, Hole } from './types';

/**
 * Cria um bloco livre na posição informada.
 *
 * @param index Posição do bloco no disco.
 * @returns Um bloco sem dono, sem ponteiro e que não é bloco de índice.
 */
export function createFreeBlock(index: number): Block {
  return { index, owner: null, next: null, isIndexBlock: false };
}

/**
 * Cria um disco com `n` blocos livres, representado como um array de blocos em memória.
 *
 * @param n Quantidade de blocos do disco (inteiro positivo).
 * @param blockSize Tamanho de cada bloco, em bytes (inteiro positivo).
 * @returns Um disco novo em que todos os blocos estão livres.
 * @throws RangeError se `n` ou `blockSize` não forem inteiros positivos.
 */
export function createDisk(n: number, blockSize: number): Disk {
  if (!Number.isInteger(n) || n <= 0) {
    throw new RangeError(`Quantidade de blocos inválida: ${n}. Use um inteiro positivo.`);
  }
  if (!Number.isInteger(blockSize) || blockSize <= 0) {
    throw new RangeError(`Tamanho de bloco inválido: ${blockSize}. Use um inteiro positivo.`);
  }
  return { blockSize, blocks: Array.from({ length: n }, (_, i) => createFreeBlock(i)) };
}

/**
 * Copia um bloco em profundidade (inclusive a lista `pointers`).
 *
 * @param block Bloco a copiar.
 */
export function cloneBlock(block: Block): Block {
  const copy: Block = { ...block };
  if (block.pointers) copy.pointers = [...block.pointers];
  return copy;
}

/**
 * Cria uma cópia profunda do disco, para que alterações na cópia não afetem o original.
 *
 * @param disk Disco a ser copiado.
 * @returns Um novo disco com os mesmos blocos (incluindo `pointers`).
 */
export function cloneDisk(disk: Disk): Disk {
  return { blockSize: disk.blockSize, blocks: disk.blocks.map(cloneBlock) };
}

/**
 * Garante que `index` é uma posição válida do disco.
 *
 * @throws RangeError se o índice estiver fora do disco.
 */
function assertIndex(disk: Disk, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= disk.blocks.length) {
    throw new RangeError(`Bloco ${index} fora do disco (0..${disk.blocks.length - 1}).`);
  }
}

/**
 * Indica se o bloco de índice `index` está livre.
 *
 * @param disk Disco consultado.
 * @param index Índice do bloco.
 * @returns `true` se o bloco não tem dono.
 * @throws RangeError se o índice estiver fora do disco.
 */
export function isFree(disk: Disk, index: number): boolean {
  assertIndex(disk, index);
  return disk.blocks[index].owner === null;
}

/**
 * Lista os índices de todos os blocos livres do disco, em ordem crescente.
 *
 * @param disk Disco consultado.
 * @returns Índices dos blocos livres.
 */
export function freeBlocks(disk: Disk): number[] {
  return disk.blocks.filter((b) => b.owner === null).map((b) => b.index);
}

/**
 * Lista todos os buracos (sequências máximas de blocos livres consecutivos) do disco,
 * da esquerda para a direita.
 *
 * @param disk Disco consultado.
 * @returns Buracos em ordem crescente de `start`.
 */
export function findHoles(disk: Disk): Hole[] {
  const holes: Hole[] = [];
  let current: Hole | null = null;
  for (const block of disk.blocks) {
    if (block.owner === null) {
      if (current) current.length++;
      else current = { start: block.index, length: 1 };
    } else if (current) {
      holes.push(current);
      current = null;
    }
  }
  if (current) holes.push(current);
  return holes;
}

/**
 * Marca um bloco livre como pertencente a um arquivo.
 *
 * @param disk Disco a ser alterado.
 * @param index Índice do bloco.
 * @param owner Nome do arquivo dono.
 * @throws Error se o bloco já estiver ocupado.
 */
export function occupyBlock(disk: Disk, index: number, owner: string): void {
  if (!isFree(disk, index)) {
    throw new Error(`Bloco ${index} já está ocupado por "${disk.blocks[index].owner}".`);
  }
  disk.blocks[index].owner = owner;
}

/**
 * Libera um bloco, zerando dono, ponteiro `next`, marca de bloco de índice e `pointers`.
 *
 * @param disk Disco a ser alterado.
 * @param index Índice do bloco a liberar.
 */
export function releaseBlock(disk: Disk, index: number): void {
  assertIndex(disk, index);
  disk.blocks[index] = createFreeBlock(index);
}
