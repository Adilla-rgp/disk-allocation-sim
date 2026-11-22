import { useMemo } from 'react';
import {
  createAllocator,
  runComparison,
  type Allocator,
  type Operation,
  type SimulationResult,
} from '../../core';
import { allocatorOptions, buildScenario, type SimConfig, type SimSetup } from '../config';
import { usePlayer, type Player } from './usePlayer';

/** Resultado de uma técnica na comparação, com o alocador usado. */
export interface ComparisonRun {
  allocator: Allocator;
  result: SimulationResult;
}

/** Estado da ComparisonPage: as três execuções e um único player para todas. */
export interface Comparison {
  runs: ComparisonRun[];
  player: Player;
}

/**
 * Executa o mesmo roteiro com as três técnicas (`runComparison` do core) e controla os
 * passos de todas com um único player, para que as grades andem juntas.
 *
 * @param config Parâmetros vindos da ConfigPage.
 * @param operations Roteiro de operações.
 * @param scenarioId Cenário pronto de origem (só define o nome exibido).
 */
export function useComparison(
  config: SimConfig,
  operations: Operation[],
  scenarioId?: SimSetup['scenarioId'],
): Comparison | { error: string } {
  const computed = useMemo((): ComparisonRun[] | { error: string } => {
    try {
      const options = allocatorOptions(config);
      const results = runComparison(buildScenario(config, operations, scenarioId), options);
      return results.map((result) => ({
        result,
        allocator: createAllocator(result.technique, options),
      }));
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, [config, operations, scenarioId]);

  const runs = Array.isArray(computed) ? computed : [];
  const player = usePlayer(runs[0]?.result.steps.length ?? 0);

  if (!Array.isArray(computed)) return computed;
  if (runs[0].result.steps.length === 0) return { error: 'O roteiro não tem operações.' };
  return { runs, player };
}
