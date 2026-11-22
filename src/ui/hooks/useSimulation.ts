import { useMemo } from 'react';
import {
  computeMetrics,
  createAllocator,
  runScenario,
  type Allocator,
  type Metrics,
  type Operation,
  type SimulationResult,
  type SimulationStep,
  type Snapshot,
} from '../../core';
import { allocatorOptions, buildScenario, type SimConfig, type SimSetup } from '../config';
import { usePlayer, type Player } from './usePlayer';

/** Uma execução do roteiro: a técnica e o resultado do simulador. */
interface Run {
  allocator: Allocator;
  result: SimulationResult;
}

/** Tudo o que a ExecutionPage precisa para desenhar o passo atual. */
export interface Simulation {
  allocator: Allocator;
  result: SimulationResult;
  player: Player;
  /** Passo atual do roteiro. */
  step: SimulationStep;
  /** Disco/diretório no momento escolhido (antes ou depois da operação). */
  snapshot: Snapshot;
  /** Métricas do momento escolhido. */
  metrics: Metrics;
}

/**
 * Métricas do estado "antes" de um passo: são as métricas "depois" do passo anterior
 * (que já trazem as falhas acumuladas); no primeiro passo, as do disco vazio.
 */
export function metricsAt(
  result: SimulationResult,
  allocator: Allocator,
  index: number,
  moment: 'before' | 'after',
): Metrics {
  const step = result.steps[index];
  if (moment === 'after') return step.metrics;
  if (index > 0) return result.steps[index - 1].metrics;
  return computeMetrics(step.before, allocator);
}

/**
 * Executa o roteiro com a técnica configurada (via `runScenario` do core) e expõe o passo
 * atual, o snapshot antes/depois e os controles do player.
 *
 * A simulação inteira é calculada uma única vez por configuração; o player apenas escolhe
 * qual snapshot mostrar.
 *
 * @param config Parâmetros vindos da ConfigPage (já validados).
 * @param operations Roteiro de operações.
 * @param scenarioId Cenário pronto de origem (só define o nome exibido).
 * @returns A simulação, ou `{ error }` se o core recusar a configuração.
 */
export function useSimulation(
  config: SimConfig,
  operations: Operation[],
  scenarioId?: SimSetup['scenarioId'],
): Simulation | { error: string } {
  const computed = useMemo((): Run | { error: string } => {
    try {
      const allocator = createAllocator(config.technique, allocatorOptions(config));
      const scenario = buildScenario(config, operations, scenarioId);
      return { allocator, result: runScenario(scenario, allocator) };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, [config, operations, scenarioId]);

  const player = usePlayer('error' in computed ? 0 : computed.result.steps.length);

  if ('error' in computed) return { error: computed.error };
  const { allocator, result } = computed;
  if (result.steps.length === 0) return { error: 'O roteiro não tem operações.' };

  const step = result.steps[player.index];
  return {
    allocator,
    result,
    player,
    step,
    snapshot: step[player.moment],
    metrics: metricsAt(result, allocator, player.index, player.moment),
  };
}
