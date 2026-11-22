import type { AllocationResult, Directory, Disk, TechniqueName } from '../types';

/**
 * Contrato comum a todas as técnicas de alocação.
 *
 * Cada técnica altera o disco (blocos) e o diretório (metadados) de forma consistente.
 * Nenhuma implementação pode depender de React ou do DOM.
 */
export interface Allocator {
  /** Identificador da técnica (ex.: `'contiguous'`). */
  name: TechniqueName;

  /**
   * Aloca um arquivo de `sizeInBlocks` blocos e registra seus metadados no diretório.
   * Em caso de falha, o disco e o diretório permanecem inalterados.
   *
   * @param disk Disco a ser alterado.
   * @param dir Diretório a ser alterado.
   * @param fileName Nome do novo arquivo.
   * @param sizeInBlocks Tamanho do arquivo, em blocos de dados.
   * @returns Sucesso com os blocos usados, ou falha com o motivo.
   */
  allocate(disk: Disk, dir: Directory, fileName: string, sizeInBlocks: number): AllocationResult;

  /**
   * Remove um arquivo: libera todos os seus blocos (inclusive o bloco de índice) e apaga
   * a entrada do diretório. Lança erro se o arquivo não existir.
   *
   * @param disk Disco a ser alterado.
   * @param dir Diretório a ser alterado.
   * @param fileName Nome do arquivo a remover.
   */
  remove(disk: Disk, dir: Directory, fileName: string): void;

  /**
   * Lista os blocos de um arquivo na ordem lógica, seguindo a estrutura da técnica
   * (intervalo, cadeia de ponteiros ou bloco de índice).
   *
   * @param disk Disco consultado.
   * @param dir Diretório consultado.
   * @param fileName Nome do arquivo.
   * @returns Índices dos blocos (inclui o bloco de índice na indexada, como primeiro item).
   */
  blocksOf(disk: Disk, dir: Directory, fileName: string): number[];

  /**
   * Calcula quantos blocos precisam ser lidos para acessar o k-ésimo bloco lógico
   * do arquivo (acesso direto, `k` começando em 0).
   *
   * - Contígua: 1 leitura (cálculo direto `start + k`).
   * - Encadeada: k + 1 leituras (percorre a cadeia).
   * - Indexada: 2 leituras (bloco de índice + bloco de dados).
   *
   * @param disk Disco consultado.
   * @param dir Diretório consultado.
   * @param fileName Nome do arquivo.
   * @param k Índice lógico do bloco dentro do arquivo.
   * @returns Número de leituras de bloco.
   */
  accessCost(disk: Disk, dir: Directory, fileName: string, k: number): number;
}
