import { hasEntry } from '../directory';
import { freeBlocks } from '../disk';
import { createRng, hashString, randomInt } from '../random';
import type {
  AllocationFailure,
  AllocationFailureReason,
  AllocationResult,
  Directory,
  Disk,
  FreeBlockPolicy,
  TechniqueName,
} from '../types';

/** Tamanho padrão de um ponteiro de bloco, em bytes. */
export const DEFAULT_POINTER_SIZE = 4;

/** Semente padrão da política `random`. */
export const DEFAULT_SEED = 42;

/** Opções das técnicas baseadas em ponteiros (encadeada e indexada). */
export interface PointerAllocatorOptions {
  /** Bytes ocupados por um ponteiro de bloco (padrão: {@link DEFAULT_POINTER_SIZE}). */
  pointerSize?: number;
  /** Como escolher os blocos livres (padrão: `first-free`). */
  freeBlockPolicy?: FreeBlockPolicy;
  /** Semente do PRNG usada pela política `random` (padrão: {@link DEFAULT_SEED}). */
  seed?: number;
}

/**
 * Contrato comum a todas as técnicas de alocação.
 *
 * Cada técnica altera o disco (blocos) e o diretório (metadados) de forma consistente.
 * Nenhuma implementação pode depender de React ou do DOM.
 */
export interface Allocator {
  /** Identificador da técnica (ex.: `'contiguous'`). */
  readonly name: TechniqueName;

  /** Nome legível da técnica com suas opções, em português (ex.: `Contígua (best-fit)`). */
  readonly label: string;

  /**
   * Quantos bytes de dados do arquivo cabem em um bloco nesta técnica
   * (na encadeada, o ponteiro ocupa parte do bloco).
   *
   * @param blockSize Tamanho do bloco, em bytes.
   */
  dataBytesPerBlock(blockSize: number): number;

  /**
   * Quantos blocos de **dados** um arquivo de `sizeInBytes` bytes ocupa.
   *
   * @param blockSize Tamanho do bloco, em bytes.
   * @param sizeInBytes Tamanho do arquivo, em bytes (inteiro positivo).
   */
  dataBlocksFor(blockSize: number, sizeInBytes: number): number;

  /**
   * Aloca um arquivo de `sizeInBytes` bytes e registra seus metadados no diretório.
   * A operação é atômica: em caso de falha, o disco e o diretório permanecem inalterados.
   *
   * @param disk Disco a ser alterado.
   * @param dir Diretório a ser alterado.
   * @param fileName Nome do novo arquivo.
   * @param sizeInBytes Tamanho do arquivo, em bytes.
   * @returns Sucesso com os blocos usados, ou falha com o motivo.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBytes: number): AllocationResult;

  /**
   * Remove um arquivo: libera todos os seus blocos (inclusive o bloco de índice), zera
   * `next`/`pointers` e apaga a entrada do diretório.
   *
   * @param disk Disco a ser alterado.
   * @param dir Diretório a ser alterado.
   * @param fileName Nome do arquivo a remover.
   * @returns Os blocos liberados.
   * @throws Error se o arquivo não existir no diretório.
   */
  remove(disk: Disk, dir: Directory, fileName: string): number[];

  /**
   * Lista os blocos de um arquivo na ordem lógica, seguindo a estrutura da técnica
   * (intervalo, cadeia de ponteiros ou bloco de índice).
   *
   * @param disk Disco consultado.
   * @param dir Diretório consultado.
   * @param fileName Nome do arquivo.
   * @returns Índices dos blocos (na indexada, o bloco de índice vem primeiro).
   * @throws Error se o arquivo não existir.
   */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[];

  /**
   * Calcula quantas leituras de bloco são necessárias para chegar ao k-ésimo bloco de
   * dados do arquivo (acesso direto, `k` começando em 0).
   *
   * - Contígua: 1 leitura (cálculo direto `start + k`).
   * - Encadeada: k + 1 leituras (percorre a cadeia).
   * - Indexada: 2 leituras (bloco de índice + bloco de dados).
   *
   * @param disk Disco consultado.
   * @param dir Diretório consultado.
   * @param fileName Nome do arquivo.
   * @param k Índice lógico do bloco de dados (0 .. length-1).
   * @returns Número de leituras de bloco.
   * @throws Error se o arquivo não existir; RangeError se `k` estiver fora do arquivo.
   */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number;
}

/**
 * Monta um resultado de falha de alocação.
 *
 * @param reason Motivo da falha.
 * @param message Descrição em português.
 * @param requiredBlocks Blocos que o arquivo exigiria, se conhecido.
 */
export function failure(
  reason: AllocationFailureReason,
  message: string,
  requiredBlocks?: number,
): AllocationFailure {
  const result: AllocationFailure = { success: false, blocks: [], reason, message };
  if (requiredBlocks !== undefined) result.requiredBlocks = requiredBlocks;
  return result;
}

/**
 * Verifica as falhas comuns a todas as técnicas: tamanho inválido e nome duplicado.
 *
 * @param dir Diretório consultado.
 * @param fileName Nome do novo arquivo.
 * @param sizeInBytes Tamanho pedido, em bytes.
 * @returns A falha encontrada, ou `null` se o pedido é válido.
 */
export function validateRequest(
  dir: Directory,
  fileName: string,
  sizeInBytes: number,
): AllocationFailure | null {
  if (!Number.isInteger(sizeInBytes) || sizeInBytes <= 0) {
    return failure(
      'invalid-size',
      `Tamanho inválido para "${fileName}": ${sizeInBytes} bytes (use um inteiro positivo).`,
    );
  }
  if (hasEntry(dir, fileName)) {
    return failure('duplicate-name', `Já existe um arquivo chamado "${fileName}".`);
  }
  return null;
}

/**
 * Verifica se um índice lógico `k` pertence a um arquivo de `length` blocos de dados.
 *
 * @throws RangeError se `k` estiver fora de [0, length).
 */
export function assertLogicalIndex(fileName: string, k: number, length: number): void {
  if (!Number.isInteger(k) || k < 0 || k >= length) {
    throw new RangeError(`Bloco lógico ${k} fora do arquivo "${fileName}" (0..${length - 1}).`);
  }
}

/**
 * Escolhe `count` blocos livres segundo a política, sem alterar o disco.
 *
 * - `first-free`: os `count` blocos livres de menor índice, em ordem crescente.
 * - `random`: sorteio sem reposição (Fisher-Yates parcial) com um PRNG semeado por
 *   `seed` combinado ao nome do arquivo. Mesmo disco + mesma semente + mesmo nome
 *   produzem sempre os mesmos blocos.
 *
 * @param disk Disco consultado.
 * @param count Quantidade de blocos desejada.
 * @param policy Política de escolha.
 * @param seed Semente do PRNG (usada só em `random`).
 * @param fileName Nome do arquivo (usado só em `random`).
 * @returns Os blocos escolhidos, na ordem em que serão usados, ou `null` se não houver livres suficientes.
 */
export function selectFreeBlocks(
  disk: Disk,
  count: number,
  policy: FreeBlockPolicy,
  seed: number,
  fileName: string,
): number[] | null {
  const free = freeBlocks(disk);
  if (free.length < count) return null;
  if (policy === 'first-free') return free.slice(0, count);

  const rng = createRng((seed ^ hashString(fileName)) >>> 0);
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(rng, free.length - i);
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free.slice(0, count);
}
