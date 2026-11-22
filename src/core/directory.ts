import type { Directory, FileEntry, TechniqueName } from './types';

/**
 * Cria um diretório vazio (mapa nome do arquivo -> metadados da técnica).
 *
 * @returns Um diretório sem entradas.
 */
export function createDirectory(): Directory {
  return { entries: new Map() };
}

/**
 * Indica se já existe um arquivo com o nome informado.
 *
 * @param dir Diretório consultado.
 * @param fileName Nome do arquivo.
 */
export function hasEntry(dir: Directory, fileName: string): boolean {
  return dir.entries.has(fileName);
}

/**
 * Busca a entrada de um arquivo no diretório.
 *
 * @param dir Diretório consultado.
 * @param fileName Nome do arquivo.
 * @returns A entrada do arquivo, ou `undefined` se ele não existir.
 */
export function getEntry(dir: Directory, fileName: string): FileEntry | undefined {
  return dir.entries.get(fileName);
}

/**
 * Busca a entrada de um arquivo e garante que ela foi criada pela técnica esperada.
 *
 * @param dir Diretório consultado.
 * @param fileName Nome do arquivo.
 * @param technique Técnica esperada.
 * @returns A entrada, já com o tipo dos metadados da técnica.
 * @throws Error se o arquivo não existir ou pertencer a outra técnica.
 */
export function requireEntry<T extends TechniqueName>(
  dir: Directory,
  fileName: string,
  technique: T,
): Extract<FileEntry, { technique: T }> {
  const entry = dir.entries.get(fileName);
  if (!entry) {
    throw new Error(`Arquivo "${fileName}" não existe no diretório.`);
  }
  if (entry.technique !== technique) {
    throw new Error(
      `Arquivo "${fileName}" foi alocado pela técnica "${entry.technique}", não por "${technique}".`,
    );
  }
  return entry as Extract<FileEntry, { technique: T }>;
}

/**
 * Adiciona uma entrada ao diretório.
 *
 * @param dir Diretório a ser alterado.
 * @param entry Entrada com o nome e os metadados da técnica.
 * @throws Error se o nome já existir.
 */
export function addEntry(dir: Directory, entry: FileEntry): void {
  if (dir.entries.has(entry.name)) {
    throw new Error(`Já existe um arquivo chamado "${entry.name}".`);
  }
  dir.entries.set(entry.name, entry);
}

/**
 * Remove a entrada de um arquivo do diretório.
 *
 * @param dir Diretório a ser alterado.
 * @param fileName Nome do arquivo.
 * @returns A entrada removida, ou `undefined` se ela não existia.
 */
export function removeEntry(dir: Directory, fileName: string): FileEntry | undefined {
  const entry = dir.entries.get(fileName);
  dir.entries.delete(fileName);
  return entry;
}

/**
 * Lista as entradas do diretório na ordem de inserção.
 *
 * @param dir Diretório consultado.
 * @returns Cópia das entradas (alterá-las não afeta o diretório).
 */
export function listEntries(dir: Directory): FileEntry[] {
  return [...dir.entries.values()].map((e) => ({ ...e }));
}

/**
 * Cria uma cópia profunda do diretório.
 *
 * @param dir Diretório a ser copiado.
 */
export function cloneDirectory(dir: Directory): Directory {
  return { entries: new Map(listEntries(dir).map((e) => [e.name, e])) };
}

/**
 * Reconstrói um diretório a partir de uma lista de entradas (por exemplo, de um snapshot).
 *
 * @param entries Entradas, na ordem de criação.
 */
export function directoryFromEntries(entries: FileEntry[]): Directory {
  const dir = createDirectory();
  for (const e of entries) addEntry(dir, { ...e });
  return dir;
}
