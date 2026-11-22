import type { Allocator } from './allocators/allocator';
import type { Metrics } from './metrics';
import type {
  AllocationResult,
  Directory,
  Disk,
  Operation,
  RemoveResult,
  Scenario,
  SimulationEvent,
  Snapshot,
} from './types';

/** Um passo da simulação. */
export interface SimulationStep {
  step: number;
  operation: Operation;
  before: Snapshot;
  after: Snapshot;
  result: AllocationResult | RemoveResult;
  events: SimulationEvent[];
  metrics: Metrics;
}

/** Resultado completo de um roteiro executado com uma técnica. */
export interface SimulationResult {
  scenario: Scenario;
  technique: Allocator['name'];
  label: string;
  steps: SimulationStep[];
  events: SimulationEvent[];
  finalSnapshot: Snapshot;
  finalMetrics: Metrics;
}

/** Tira uma fotografia (cópia profunda) do disco e do diretório. */
export function takeSnapshot(
  disk: Disk,
  dir: Directory,
  step: number,
  moment: Snapshot['moment'],
): Snapshot {
  throw new Error('Não implementado');
}

/** Executa um roteiro completo com a técnica informada. */
export function runScenario(scenario: Scenario, allocator: Allocator): SimulationResult {
  throw new Error('Não implementado');
}
