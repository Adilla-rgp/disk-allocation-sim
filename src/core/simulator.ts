import type { Allocator } from './allocators/allocator';
import { createAllocator, TECHNIQUES, type AllocatorOptions } from './allocators/factory';
import { createDirectory, hasEntry, listEntries } from './directory';
import { cloneDisk, createDisk, findHoles, freeBlocks } from './disk';
import { computeMetrics, type Metrics } from './metrics';
import type {
  AllocationFailureReason,
  AllocationResult,
  Directory,
  Disk,
  Operation,
  RemoveResult,
  Scenario,
  SimulationEvent,
  Snapshot,
} from './types';

/** Um passo da simulação: a operação executada e o estado antes/depois dela. */
export interface SimulationStep {
  /** Número do passo, começando em 1. */
  step: number;
  operation: Operation;
  /** Estado antes da operação (cópia profunda). */
  before: Snapshot;
  /** Estado depois da operação (cópia profunda). */
  after: Snapshot;
  /** Resultado da alocação (`create`) ou da remoção (`remove`). */
  result: AllocationResult | RemoveResult;
  /** Eventos gerados por esta operação. */
  events: SimulationEvent[];
  /** Métricas calculadas sobre `after`, com as falhas acumuladas até este passo. */
  metrics: Metrics;
}

/** Resultado completo de um roteiro executado com uma técnica. */
export interface SimulationResult {
  scenario: Scenario;
  technique: Allocator['name'];
  /** Nome legível da técnica com suas opções. */
  label: string;
  steps: SimulationStep[];
  /** Log completo de eventos, em ordem. */
  events: SimulationEvent[];
  /** Estado final (cópia profunda). */
  finalSnapshot: Snapshot;
  /** Métricas ao final do roteiro. */
  finalMetrics: Metrics;
}

/** Descrição curta de cada motivo de falha, usada no log. */
export const FAILURE_REASON_LABELS: Record<AllocationFailureReason, string> = {
  'insufficient-space': 'espaço insuficiente',
  'external-fragmentation': 'fragmentação externa',
  'index-overflow': 'bloco de índice cheio',
  'duplicate-name': 'nome duplicado',
  'invalid-size': 'tamanho inválido',
};

/**
 * Tira uma fotografia imutável (cópia profunda) do disco e do diretório. Alterar o disco
 * depois não afeta o snapshot, e vice-versa.
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
  return {
    step,
    moment,
    blockSize: disk.blockSize,
    blocks: cloneDisk(disk).blocks,
    directory: listEntries(dir),
  };
}

/** Formata uma lista de blocos como `3, 9, 14`. */
function formatBlocks(blocks: number[]): string {
  return blocks.join(', ');
}

/**
 * Executa uma única operação (criar ou remover arquivo) e devolve o resultado e os eventos
 * gerados, com mensagens em português. Nunca lança erro por falha de alocação ou por
 * remoção de arquivo inexistente: esses casos viram eventos `fail` e `error`.
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
): { result: AllocationResult | RemoveResult; events: SimulationEvent[] } {
  const { fileName } = operation;

  if (operation.type === 'remove') {
    if (!hasEntry(dir, fileName)) {
      const message = `Não foi possível remover ${fileName}: o arquivo não existe.`;
      return {
        result: { success: false, blocks: [], reason: 'not-found', message },
        events: [{ step, type: 'error', fileName, blocks: [], message }],
      };
    }
    const blocks = allocator.remove(disk, dir, fileName);
    const message = `${fileName} removido; blocos ${formatBlocks(blocks)} liberados`;
    return {
      result: { success: true, blocks },
      events: [{ step, type: 'remove', fileName, blocks, message }],
    };
  }

  const result = allocator.allocate(disk, dir, fileName, operation.sizeInBytes);
  if (result.success) {
    const first = disk.blocks[result.blocks[0]];
    const indexNote = first.isIndexBlock ? ` (índice no bloco ${first.index})` : '';
    const message = `${fileName} alocado nos blocos ${formatBlocks(result.blocks)}${indexNote}`;
    return {
      result,
      events: [{ step, type: 'allocate', fileName, blocks: result.blocks, message }],
    };
  }

  let detail = result.message;
  if (result.reason === 'insufficient-space' || result.reason === 'external-fragmentation') {
    const free = freeBlocks(disk).length;
    const largest = findHoles(disk).reduce((max, h) => Math.max(max, h.length), 0);
    detail = `precisa de ${result.requiredBlocks} blocos; ${free} blocos livres, maior buraco = ${largest}`;
  }
  const message = `${fileName} falhou (${FAILURE_REASON_LABELS[result.reason]}): ${detail}`;
  return {
    result,
    events: [{ step, type: 'fail', fileName, blocks: [], reason: result.reason, message }],
  };
}

/**
 * Atualiza o conjunto de arquivos solicitados pelo roteiro após uma operação.
 *
 * Um `create` conta como pedido mesmo se a alocação falhar por falta de espaço, para que
 * as métricas mostrem quantos bytes a técnica deixou de armazenar. Pedidos inválidos
 * (tamanho inválido ou nome duplicado) não contam. Um `remove` retira o pedido.
 */
function trackRequest(
  requested: Map<string, number>,
  operation: Operation,
  result: AllocationResult | RemoveResult,
): void {
  if (operation.type === 'remove') {
    requested.delete(operation.fileName);
    return;
  }
  const rejected =
    !result.success && (result.reason === 'invalid-size' || result.reason === 'duplicate-name');
  if (!rejected) requested.set(operation.fileName, operation.sizeInBytes);
}

/**
 * Executa um roteiro completo com a técnica informada, a partir de um disco vazio,
 * gerando snapshots antes/depois de cada operação, o log de eventos e as métricas.
 *
 * @param scenario Roteiro com tamanho do disco e operações.
 * @param allocator Técnica de alocação a usar.
 * @returns Todos os passos (numerados a partir de 1) e o estado final.
 */
export function runScenario(scenario: Scenario, allocator: Allocator): SimulationResult {
  const disk = createDisk(scenario.diskSize, scenario.blockSize);
  const dir = createDirectory();
  const steps: SimulationStep[] = [];
  const events: SimulationEvent[] = [];
  let failures = 0;
  /** Arquivos que o roteiro pede que existam agora (nome -> bytes), mesmo os que falharam. */
  const requested = new Map<string, number>();
  const requestedBytes = () => [...requested.values()].reduce((sum, b) => sum + b, 0);

  scenario.operations.forEach((operation, i) => {
    const step = i + 1;
    const before = takeSnapshot(disk, dir, step, 'before');
    const outcome = applyOperation(disk, dir, allocator, operation, step);
    const after = takeSnapshot(disk, dir, step, 'after');
    failures += outcome.events.filter((e) => e.type === 'fail').length;
    trackRequest(requested, operation, outcome.result);
    events.push(...outcome.events);
    steps.push({
      step,
      operation,
      before,
      after,
      ...outcome,
      metrics: computeMetrics(after, allocator, failures, requestedBytes()),
    });
  });

  const finalSnapshot = takeSnapshot(disk, dir, steps.length, 'after');
  return {
    scenario,
    technique: allocator.name,
    label: allocator.label,
    steps,
    events,
    finalSnapshot,
    finalMetrics: computeMetrics(finalSnapshot, allocator, failures, requestedBytes()),
  };
}

/**
 * Executa o mesmo roteiro com as três técnicas, para a página/tabela de comparação.
 *
 * @param scenario Roteiro a executar.
 * @param options Opções repassadas a cada técnica (estratégia, política, semente...).
 * @returns Um resultado por técnica, na ordem de {@link TECHNIQUES}.
 */
export function runComparison(
  scenario: Scenario,
  options: AllocatorOptions = {},
): SimulationResult[] {
  return TECHNIQUES.map((t) => runScenario(scenario, createAllocator(t, options)));
}
