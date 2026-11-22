/**
 * Tabela comparativa das técnicas: linhas de métricas, notas de falha e exportação CSV.
 * Os valores vêm de `SimulationResult.finalMetrics` (calculadas pelo core).
 */
import type { Metrics, SimulationResult } from '../core';
import { fmt, fmtBytes, fmtPercent } from './format';

/** Uma linha da tabela: rótulo e como formatar o valor. */
export interface MetricRow {
  key: keyof Metrics;
  label: string;
  format: (v: number) => string;
  /**
   * Qual valor é o melhor, para destacar na tabela. Omitido quando a comparação direta
   * engana (ex.: blocos usados e buracos dependem também de quais arquivos falharam).
   */
  better?: 'lower' | 'higher';
}

const count = (v: number) => fmt(v, 0);

/** Linhas da tabela, na ordem exibida (mesmas métricas da CLI `--compare`). */
export const METRIC_ROWS: MetricRow[] = [
  { key: 'usedBlocks', label: 'Blocos usados', format: count },
  { key: 'freeBlocks', label: 'Blocos livres', format: count },
  { key: 'occupancyPercent', label: 'Ocupação', format: fmtPercent },
  { key: 'overheadBlocks', label: 'Blocos de overhead (índices)', format: count, better: 'lower' },
  { key: 'pointerOverheadBytes', label: 'Bytes de ponteiros', format: fmtBytes, better: 'lower' },
  { key: 'overheadBytes', label: 'Overhead total', format: fmtBytes, better: 'lower' },
  {
    key: 'internalFragmentationBytes',
    label: 'Fragmentação interna',
    format: fmtBytes,
    better: 'lower',
  },
  { key: 'requestedBytes', label: 'Bytes solicitados', format: fmtBytes },
  { key: 'storedBytes', label: 'Bytes úteis armazenados', format: fmtBytes, better: 'higher' },
  { key: 'allocatedBytes', label: 'Bytes alocados', format: fmtBytes },
  {
    key: 'efficiencyPercent',
    label: 'Eficiência (úteis/alocados)',
    format: fmtPercent,
    better: 'higher',
  },
  { key: 'holeCount', label: 'Buracos livres', format: count },
  { key: 'largestHole', label: 'Maior buraco (blocos)', format: count },
  { key: 'failures', label: 'Falhas de alocação', format: count, better: 'lower' },
  {
    key: 'avgSequentialAccessCost',
    label: 'Custo médio acesso sequencial',
    format: fmt,
    better: 'lower',
  },
  {
    key: 'avgRandomAccessCost',
    label: 'Custo médio acesso aleatório',
    format: fmt,
    better: 'lower',
  },
];

/**
 * Notas de falha: para cada técnica que falhou, "armazenou X B de Y B solicitados" e os
 * arquivos recusados.
 */
export function failureNotes(results: SimulationResult[]): string[] {
  return results
    .filter((r) => r.finalMetrics.failures > 0)
    .map((r) => {
      const { storedBytes, requestedBytes } = r.finalMetrics;
      const files = r.events
        .filter((e) => e.type === 'fail')
        .map((e) => e.fileName)
        .join(', ');
      return (
        `${r.label} armazenou ${fmtBytes(storedBytes)} de ${fmtBytes(requestedBytes)} ` +
        `solicitados (falhou em: ${files}).`
      );
    });
}

/** Número para CSV: vírgula decimal, sem separador de milhar (ex.: `2560`, `95,4026`). */
function csvNumber(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 4, useGrouping: false });
}

/** Escapa um campo CSV (aspas, separador e quebras de linha). */
function csvField(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Monta o CSV da tabela comparativa. Usa `;` como separador e vírgula decimal, que é o
 * que o Excel/LibreOffice em português esperam.
 */
export function comparisonCsv(results: SimulationResult[]): string {
  const scenario = results[0]?.scenario;
  const lines: string[][] = [
    ['Cenário', scenario?.name ?? ''],
    ['Disco', `${scenario?.diskSize} blocos de ${scenario?.blockSize} B`],
    [],
    ['Métrica', ...results.map((r) => r.label)],
    ...METRIC_ROWS.map((row) => [
      row.label,
      ...results.map((r) => csvNumber(r.finalMetrics[row.key])),
    ]),
  ];
  const notes = failureNotes(results);
  if (notes.length) lines.push([], ...notes.map((n) => ['Nota', n]));
  return lines.map((cols) => cols.map(csvField).join(';')).join('\r\n');
}

/**
 * Baixa um texto como arquivo no navegador.
 *
 * @param fileName Nome sugerido para o arquivo.
 * @param content Conteúdo (recebe BOM UTF-8 para o Excel reconhecer os acentos).
 */
export function downloadText(fileName: string, content: string): void {
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
