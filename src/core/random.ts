/**
 * Gerador de números pseudoaleatórios determinístico (sem `Math.random`), para que
 * simulações com a política `random` sejam reproduzíveis a partir de uma semente.
 */

/** Função que devolve um número em [0, 1) a cada chamada. */
export type Rng = () => number;

/**
 * Cria um PRNG Mulberry32: rápido, com estado de 32 bits e totalmente determinístico.
 *
 * @param seed Semente (qualquer número; é convertido para inteiro de 32 bits).
 * @returns Função que devolve números em [0, 1); a mesma semente gera a mesma sequência.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calcula um hash FNV-1a de 32 bits de uma string. Usado para combinar a semente com o
 * nome do arquivo, de modo que cada arquivo tenha sua própria sequência aleatória.
 *
 * @param text Texto de entrada.
 * @returns Inteiro sem sinal de 32 bits.
 */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Sorteia um inteiro em [0, max).
 *
 * @param rng Gerador a usar.
 * @param max Limite superior (exclusivo).
 */
export function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}
