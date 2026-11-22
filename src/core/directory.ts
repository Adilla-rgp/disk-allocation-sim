import type { Directory, FileEntry } from './types';

/**
 * Cria um diretório vazio (mapa nome do arquivo -> metadados da técnica).
 *
 * @returns Um diretório sem entradas.
 */
export function createDirectory(): Directory {
  throw new Error('Não implementado');
}

/**
 * Indica se já existe um arquivo com o nome informado.
 *
 * @param dir Diretório consultado.
 * @param fileName Nome do arquivo.
 */
export function hasEntry(dir: Directory, fileName: string): boolean {
  throw new Error('Não implementado');
}

/**
 * Busca a entrada de um arquivo no diretório.
 *
 * @param dir Diretório consultado.
 * @param fileName Nome do arquivo.
 * @returns A entrada do arquivo, ou `undefined` se ele não existir.
 */
export function getEntry(dir: Directory, fileName: string): FileEntry | undefined {
  throw new Error('Não implementado');
}

/**
 * Adiciona uma entrada ao diretório. Lança erro se o nome já existir.
 *
 * @param dir Diretório a ser alterado.
 * @param entry Entrada com o nome e os metadados da técnica.
 */
export function addEntry(dir: Directory, entry: FileEntry): void {
  throw new Error('Não implementado');
}

/**
 * Remove a entrada de um arquivo do diretório.
 *
 * @param dir Diretório a ser alterado.
 * @param fileName Nome do arquivo.
 * @returns A entrada removida, ou `undefined` se ela não existia.
 */
export function removeEntry(dir: Directory, fileName: string): FileEntry | undefined {
  throw new Error('Não implementado');
}

/**
 * Lista as entradas do diretório na ordem de inserção.
 *
 * @param dir Diretório consultado.
 * @returns Cópia das entradas (alterá-las não afeta o diretório).
 */
export function listEntries(dir: Directory): FileEntry[] {
  throw new Error('Não implementado');
}

/**
 * Cria uma cópia profunda do diretório.
 *
 * @param dir Diretório a ser copiado.
 */
export function cloneDirectory(dir: Directory): Directory {
  throw new Error('Não implementado');
}
