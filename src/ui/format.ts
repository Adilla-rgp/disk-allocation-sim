/** Formatação de números e cores de arquivo usadas pelos componentes. */
import type { Operation, SimulationEventType } from '../core';

/** Número com até 2 casas decimais, no padrão brasileiro. */
export function fmt(v: number, digits = 2): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: digits });
}

/** Porcentagem com 1 casa decimal (ex.: `56,3%`). */
export function fmtPercent(v: number): string {
  return `${fmt(v, 1)}%`;
}

/** Bytes com separador de milhar (ex.: `12.700 B`). */
export function fmtBytes(v: number): string {
  return `${fmt(v, 0)} B`;
}

/** Rótulo do chip de cada tipo de evento do log. */
export const EVENT_LABELS: Record<SimulationEventType, string> = {
  allocate: 'alocado',
  remove: 'removido',
  fail: 'falha',
  error: 'erro',
};

/** Mapa nome do arquivo -> cor (CSS). */
export type FileColors = Map<string, string>;

/**
 * Matizes bem separados entre si, para os arquivos não se confundirem no tema escuro.
 * Depois do 12º arquivo, as cores se repetem com outra luminosidade.
 */
const HUES = [265, 205, 150, 30, 330, 180, 55, 290, 0, 120, 230, 90];

/**
 * Atribui uma cor fixa a cada arquivo, na ordem em que aparece no roteiro. Assim, o mesmo
 * arquivo tem a mesma cor em todos os passos e nas três técnicas da comparação.
 *
 * @param operations Roteiro de operações.
 */
export function fileColors(operations: Operation[]): FileColors {
  const colors: FileColors = new Map();
  for (const op of operations) {
    if (colors.has(op.fileName)) continue;
    const i = colors.size;
    const light = i < HUES.length ? 62 : 48;
    colors.set(op.fileName, `hsl(${HUES[i % HUES.length]} 70% ${light}%)`);
  }
  return colors;
}

/** Descreve uma operação do roteiro em português (ex.: `criar A (2.400 B)`). */
export function describeOperation(op: Operation): string {
  return op.type === 'create'
    ? `criar ${op.fileName} (${fmtBytes(op.sizeInBytes)})`
    : `remover ${op.fileName}`;
}
