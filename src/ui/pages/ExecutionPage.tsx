import { useMemo, useState } from 'react';
import { DirectoryTable } from '../components/DirectoryTable';
import { DiskGrid, DiskLegend } from '../components/DiskGrid';
import { EventLog } from '../components/EventLog';
import { MetricsCards } from '../components/MetricsCards';
import { MomentToggle, PlayerControls } from '../components/PlayerControls';
import type { SimSetup } from '../config';
import { describeOperation, fileColors } from '../format';
import { useSimulation } from '../hooks/useSimulation';
import { stepMarks } from '../marks';

/**
 * Modo execução: roda o roteiro com a técnica escolhida e permite navegar passo a passo.
 *
 * Layout: player no topo; diretório + buracos à esquerda; disco no centro (com toggle
 * antes/depois); log de eventos à direita; cards de métricas no rodapé.
 */
export function ExecutionPage({ setup }: { setup: SimSetup }) {
  const sim = useSimulation(setup.config, setup.operations, setup.scenarioId);
  const colors = useMemo(() => fileColors(setup.operations), [setup.operations]);
  const [hovered, setHovered] = useState<string | null>(null);

  if ('error' in sim) {
    return <p className="errors">Não foi possível executar a simulação: {sim.error}</p>;
  }

  const { allocator, result, player, step, snapshot, metrics } = sim;
  const failed = step.events.find((e) => e.type === 'fail' || e.type === 'error');

  return (
    <div className="execution-page">
      <PlayerControls
        player={player}
        caption={
          <>
            <span className={`op-tag ${failed ? 'op-failed' : ''}`}>
              {describeOperation(step.operation)}
            </span>
            <span className="hint">
              {result.label} · cenário {result.scenario.name} · {result.scenario.diskSize} blocos de{' '}
              {result.scenario.blockSize} B
            </span>
          </>
        }
      />

      <div className="execution-main">
        <section className="card">
          <h2 className="card-title">
            <span className="dot" /> Diretório
          </h2>
          <DirectoryTable
            snapshot={snapshot}
            technique={allocator.name}
            colors={colors}
            hovered={hovered}
            onHover={setHovered}
          />
        </section>

        <section className="card disk-card">
          <div className="disk-header">
            <h2 className="card-title" style={{ margin: 0 }}>
              <span className="dot" /> Disco
            </h2>
            <MomentToggle player={player} />
          </div>
          <DiskGrid
            snapshot={snapshot}
            allocator={allocator}
            colors={colors}
            hovered={hovered}
            onHover={setHovered}
            marks={stepMarks(step, player.moment)}
            animKey={`${step.step}-${player.moment}`}
          />
          {failed && player.moment === 'after' && <p className="step-alert">{failed.message}</p>}
          <DiskLegend technique={allocator.name} />
        </section>

        <section className="card log-card">
          <h2 className="card-title">
            <span className="dot" /> Eventos
          </h2>
          <EventLog
            events={result.events}
            currentStep={step.step}
            onSelect={(s) => player.goTo(s - 1)}
          />
        </section>
      </div>

      <MetricsCards metrics={metrics} />
    </div>
  );
}
