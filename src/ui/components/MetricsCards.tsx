import type { ReactNode } from 'react';
import type { Metrics } from '../../core';
import { fmt, fmtBytes, fmtPercent } from '../format';

/** Um card de métrica: valor principal, detalhe e barra opcional (0 a 100). */
function MetricCard(props: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  bar?: number;
  tone?: 'danger';
}) {
  return (
    <div className={`metric ${props.tone === 'danger' ? 'metric-danger' : ''}`}>
      <span className="metric-label">{props.label}</span>
      <span className="metric-value">{props.value}</span>
      {props.bar !== undefined && (
        <span className="metric-bar">
          <span style={{ width: `${Math.min(Math.max(props.bar, 0), 100)}%` }} />
        </span>
      )}
      {props.detail && <span className="metric-detail">{props.detail}</span>}
    </div>
  );
}

/**
 * Cards com as métricas do momento atual: ocupação, eficiência, overhead em bytes,
 * buracos/maior buraco, falhas e custo de acesso. Todos os valores vêm de `computeMetrics`.
 */
export function MetricsCards({ metrics: m }: { metrics: Metrics }) {
  return (
    <div className="metrics">
      <MetricCard
        label="Ocupação"
        value={fmtPercent(m.occupancyPercent)}
        bar={m.occupancyPercent}
        detail={`${m.usedBlocks} de ${m.totalBlocks} blocos`}
      />
      <MetricCard
        label="Eficiência"
        value={m.allocatedBytes ? fmtPercent(m.efficiencyPercent) : '—'}
        bar={m.efficiencyPercent}
        detail={`${fmtBytes(m.storedBytes)} úteis / ${fmtBytes(m.allocatedBytes)} alocados`}
      />
      <MetricCard
        label="Overhead"
        value={fmtBytes(m.overheadBytes)}
        detail={`ponteiros ${fmtBytes(m.pointerOverheadBytes)} · índices ${m.overheadBlocks} bl. · frag. interna ${fmtBytes(m.internalFragmentationBytes)}`}
      />
      <MetricCard
        label="Buracos"
        value={m.holeCount}
        detail={`maior buraco: ${m.largestHole} ${m.largestHole === 1 ? 'bloco' : 'blocos'}`}
      />
      <MetricCard
        label="Falhas"
        value={m.failures}
        tone={m.failures > 0 ? 'danger' : undefined}
        detail={
          m.failures > 0
            ? `armazenou ${fmtBytes(m.storedBytes)} de ${fmtBytes(m.requestedBytes)} solicitados`
            : 'todos os pedidos atendidos'
        }
      />
      <MetricCard
        label="Custo de acesso"
        value={
          <>
            {fmt(m.avgSequentialAccessCost)} <small>seq.</small> · {fmt(m.avgRandomAccessCost)}{' '}
            <small>aleat.</small>
          </>
        }
        detail="leituras médias por bloco de dados"
      />
    </div>
  );
}
