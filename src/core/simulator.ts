import type { Allocator } from './allocators/allocator';
import type { Metrics } from './metrics';
import type { Directory, Disk, Operation, Scenario, SimulationEvent, Snapshot } from './types';

/** Um passo da simulação: a operação executada e o estado antes/depois dela. */
export interface SimulationStep {
  step: number;
  operation: Operation;
  before: Snapshot;
  after: Snapshot;
  /** Eventos gerados por esta operação. */
  events: SimulationEvent[];
  /** Métricas calculadas após a operação. */
  metrics: Metrics;
}

/** Resultado completo de um roteiro executado com uma técnica. */
export interface SimulationResult {
  scenario: Scenario;
  technique: Allocator['name'];
  steps: SimulationStep[];
  /** Log completo de eventos, em ordem. */
  events: SimulationEvent[];
  /** Estado final do disco. */
  finalDisk: Disk;
  /** Estado final do diretório. */
  finalDirectory: Directory;
  /** Métricas ao final do roteiro. */
  finalMetrics: Metrics;
}

/**
 * Tira uma fotografia imutável (cópia profunda) do disco e do diretório.
 *
 * @param disk Disco atual.
 * @param dir Diretório atual.
 * @param step Número do passo.
 * @param moment Se a foto é anterior ou posterior à operação.
 */
export function takeSnapshot(
  disk: Disk,
  dir: Directory,
  step: number,
  moment: Snapshot['moment'],
): Snapshot {
  throw new Error('Não implementado');
}

/**
 * Executa uma única operação (criar ou remover arquivo) e devolve os eventos gerados.
 * Falhas de alocação não lançam erro: viram eventos do tipo `fail`.
 *
 * @param disk Disco a ser alterado.
 * @param dir Diretório a ser alterado.
 * @param allocator Técnica de alocação.
 * @param operation Operação a executar.
 * @param step Número do passo (para os eventos).
 */
export function applyOperation(
  disk: Disk,
  dir: Directory,
  allocator: Allocator,
  operation: Operation,
  step: number,
): SimulationEvent[] {
  throw new Error('Não implementado');
}

/**
 * Executa um roteiro completo com a técnica informada, a partir de um disco vazio,
 * gerando snapshots antes/depois de cada operação, o log de eventos e as métricas.
 *
 * @param scenario Roteiro com tamanho do disco e operações.
 * @param allocator Técnica de alocação a usar.
 * @returns Todos os passos e o estado final.
 */
export function runScenario(scenario: Scenario, allocator: Allocator): SimulationResult {
  throw new Error('Não implementado');
}
