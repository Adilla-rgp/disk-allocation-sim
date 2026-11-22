import type { Block, Disk } from './types';

/**
 * Cria um disco com `n` blocos livres, representado como um array de blocos em memória.
 *
 * @param n Quantidade de blocos do disco (inteiro positivo).
 * @param blockSize Tamanho de cada bloco, em bytes.
 * @returns Um disco novo em que todos os blocos estão livres.
 */
export function createDisk(n: number, blockSize: number): Disk {
  throw new Error('Não implementado');
}

/**
 * Cria uma cópia profunda do disco, para que alterações na cópia não afetem o original.
 *
 * @param disk Disco a ser copiado.
 * @returns Um novo disco com os mesmos blocos (incluindo `pointers`).
 */
export function cloneDisk(disk: Disk): Disk {
  throw new Error('Não implementado');
}

/**
 * Indica se o bloco de índice `index` está livre.
 *
 * @param disk Disco consultado.
 * @param index Índice do bloco.
 * @returns `true` se o bloco não tem dono.
 */
export function isFree(disk: Disk, index: number): boolean {
  throw new Error('Não implementado');
}

/**
 * Lista os índices de todos os blocos livres do disco, em ordem crescente.
 *
 * @param disk Disco consultado.
 * @returns Índices dos blocos livres.
 */
export function freeBlocks(disk: Disk): number[] {
  throw new Error('Não implementado');
}

/**
 * Marca um bloco como pertencente a um arquivo.
 *
 * @param disk Disco a ser alterado.
 * @param index Índice do bloco.
 * @param owner Nome do arquivo dono.
 */
export function occupyBlock(disk: Disk, index: number, owner: string): void {
  throw new Error('Não implementado');
}

/**
 * Libera um bloco, zerando dono, ponteiro `next`, marca de bloco de índice e `pointers`.
 *
 * @param disk Disco a ser alterado.
 * @param index Índice do bloco a liberar.
 */
export function releaseBlock(disk: Disk, index: number): void {
  throw new Error('Não implementado');
}

/**
 * Cria um bloco livre na posição informada (utilitário para `createDisk` e testes).
 *
 * @param index Posição do bloco no disco.
 * @returns Um bloco livre.
 */
export function createFreeBlock(index: number): Block {
  throw new Error('Não implementado');
}
