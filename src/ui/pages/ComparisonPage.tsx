import { useMemo, useState } from 'react';
import type { SimulationResult } from '../../core';
import { DiskGrid } from '../components/DiskGrid';
import { Icon } from '../components/Icon';
import { Narration } from '../components/Narration';
import { MomentToggle, PlayerControls } from '../components/PlayerControls';
import {
  comparisonCsv,
  downloadText,
  failureNotes,
  METRIC_ROWS,
  type MetricRow,
} from '../comparisonTable';
import type { SimSetup } from '../config';
import { describeOperation, fileColors, fmtPercent, type FileColors } from '../format';
import { useComparison, type ComparisonRun } from '../hooks/useComparison';
import type { Player } from '../hooks/usePlayer';
import { metricsAt } from '../hooks/useSimulation';
import { stepMarks } from '../marks';
import { explainStep } from '../narration';

/**
 * Comparação: o mesmo roteiro nas três técnicas, com três discos lado a lado controlados
 * por um único player, e a tabela comparativa final (exportável em CSV).
 */
export function ComparisonPage({ setup }: { setup: SimSetup }) {
  const cmp = useComparison(setup.config, setup.operations, setup.scenarioId);
  const colors = useMemo(() => fileColors(setup.operations), [setup.operations]);
  const [hovered, setHovered] = useState<string | null>(null);

  if ('error' in cmp) {
    return <p className="errors">Não foi possível executar a comparação: {cmp.error}</p>;
  }

  const { runs, player } = cmp;
  const step = runs[0].result.steps[player.index];
  const results = runs.map((r) => r.result);
  const scenario = results[0].scenario;

  return (
    <div className="comparison-page">
      <PlayerControls
        player={player}
        caption={
          <>
            <span className="op-tag">{describeOperation(step.operation)}</span>
            <span className="hint">
              cenário {scenario.name} · {scenario.diskSize} blocos de {scenario.blockSize} B
            </span>
          </>
        }
      />

      <div className="comparison-toolbar">
        <span className="hint">
          Passe o mouse (ou toque) sobre um arquivo para destacá-lo nas três grades.
        </span>
        <MomentToggle player={player} />
      </div>

      <div className="comparison-grids">
        {runs.map((run) => (
          <TechniqueColumn
            key={run.result.technique}
            run={run}
            player={player}
            colors={colors}
            hovered={hovered}
            onHover={setHovered}
          />
        ))}
      </div>

      <ComparisonTable results={results} fileName={`comparacao-${setup.scenarioId}.csv`} />
    </div>
  );
}

/** Uma coluna da comparação: disco da técnica no passo atual + evento e resumo do passo. */
function TechniqueColumn({
  run,
  player,
  colors,
  hovered,
  onHover,
}: {
  run: ComparisonRun;
  player: Player;
  colors: FileColors;
  hovered: string | null;
  onHover: (name: string | null) => void;
}) {
  const { allocator, result } = run;
  const step = result.steps[player.index];
  const metrics = metricsAt(result, allocator, player.index, player.moment);
  const event = step.events[0];

  return (
    <section className="card technique-col">
      <header className="technique-head">
        <h2>{result.label}</h2>
        {metrics.failures > 0 && (
          <span className="chip chip-fail">
            {metrics.failures} {metrics.failures === 1 ? 'falha' : 'falhas'}
          </span>
        )}
      </header>
      <DiskGrid
        snapshot={step[player.moment]}
        allocator={allocator}
        colors={colors}
        hovered={hovered}
        onHover={onHover}
        marks={stepMarks(step, player.moment)}
        animKey={`${step.step}-${player.moment}`}
        compact
      />
      <Narration
        text={explainStep(step, allocator)}
        failed={event?.type === 'fail' || event?.type === 'error'}
      />
      <dl className="technique-summary">
        <div>
          <dt>Ocupação</dt>
          <dd>{fmtPercent(metrics.occupancyPercent)}</dd>
        </div>
        <div>
          <dt>Eficiência</dt>
          <dd>{metrics.allocatedBytes ? fmtPercent(metrics.efficiencyPercent) : '—'}</dd>
        </div>
        <div>
          <dt>Buracos</dt>
          <dd>
            {metrics.holeCount} <small>(maior {metrics.largestHole})</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Índices das técnicas com o melhor valor numa linha (nenhum se todas empatam). */
function bestColumns(row: MetricRow, results: SimulationResult[]): Set<number> {
  if (!row.better) return new Set();
  const values = results.map((r) => r.finalMetrics[row.key]);
  const best = row.better === 'lower' ? Math.min(...values) : Math.max(...values);
  if (values.every((v) => v === best)) return new Set();
  return new Set(values.flatMap((v, i) => (v === best ? [i] : [])));
}

/** Tabela comparativa final (via `runComparison`), notas de falha e exportação CSV. */
function ComparisonTable({ results, fileName }: { results: SimulationResult[]; fileName: string }) {
  const notes = failureNotes(results);
  return (
    <section className="card">
      <div className="table-head">
        <h2 className="card-title" style={{ margin: 0 }}>
          Quem se saiu melhor <small>resultado ao final do roteiro</small>
        </h2>
        <button className="btn" onClick={() => downloadText(fileName, comparisonCsv(results))}>
          <Icon name="download" size={16} /> Exportar CSV
        </button>
      </div>
      <div className="table-scroll">
        <table className="data-table comparison-table">
          <thead>
            <tr>
              <th>Métrica</th>
              {results.map((r) => (
                <th key={r.technique} className="num">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => {
              const best = bestColumns(row, results);
              return (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {results.map((r, i) => (
                    <td key={r.technique} className={`num ${best.has(i) ? 'best' : ''}`}>
                      {row.format(r.finalMetrics[row.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {notes.length > 0 ? (
        <ul className="notes">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : (
        <p className="hint" style={{ marginBottom: 0 }}>
          Nenhuma técnica falhou: todas armazenaram os bytes solicitados.
        </p>
      )}
      <p className="hint" style={{ marginBottom: 0 }}>
        Em destaque, o melhor valor de cada linha (quando há diferença).
      </p>
    </section>
  );
}
