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
 * Cores escolhidas à mão (tons pastel que leem bem sobre o fundo escuro e entre si),
 * na ordem em que os arquivos aparecem: lavanda, céu, menta, damasco, rosa, água,
 * limão, coral, pervinca, lima, areia e orquídea.
 */
const PALETTE = [
  '#b8a3fb',
  '#86cdf5',
  '#8fe3b0',
  '#f9b987',
  '#f5a3c7',
  '#6fd9c8',
  '#f2dd7a',
  '#f79b8f',
  '#a3b5fb',
  '#c6e67e',
  '#e3c4a1',
  '#e6a8f0',
];

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
    // Depois da 12ª cor, gera tons intermediários para não repetir.
    const color =
      i < PALETTE.length ? PALETTE[i] : `hsl(${(i * 47) % 360} 65% ${i % 2 ? 72 : 64}%)`;
    colors.set(op.fileName, color);
  }
  return colors;
}

/** Descreve uma operação do roteiro em português (ex.: `criar A (2.400 B)`). */
export function describeOperation(op: Operation): string {
  return op.type === 'create'
    ? `criar ${op.fileName} (${fmtBytes(op.sizeInBytes)})`
    : `remover ${op.fileName}`;
}
