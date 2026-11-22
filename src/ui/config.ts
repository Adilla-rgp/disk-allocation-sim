/**
 * Configuração da simulação montada na ConfigPage e consumida pelas outras páginas.
 *
 * Aqui só existe tradução da configuração da interface para os tipos do core
 * (`Scenario` e `AllocatorOptions`) e validação dos campos do formulário: nenhuma regra de
 * alocação é implementada na UI.
 */
import {
  DEFAULT_POINTER_SIZE,
  DEFAULT_SEED,
  type AllocatorOptions,
  type FitStrategy,
  type FreeBlockPolicy,
  type Operation,
  type Scenario,
  type TechniqueName,
} from '../core';
import { fragmentationScenario, scenarios, type ScenarioId } from '../scenarios';

/** Parâmetros escolhidos no Painel de Controle. */
export interface SimConfig {
  technique: TechniqueName;
  /** Estratégia da contígua. */
  strategy: FitStrategy;
  /** Política de blocos livres da encadeada e da indexada. */
  freeBlockPolicy: FreeBlockPolicy;
  /** Semente da política `random`. */
  seed: number;
  /** Quantidade de blocos do disco. */
  diskSize: number;
  /** Tamanho do bloco, em bytes. */
  blockSize: number;
  /** Tamanho do ponteiro, em bytes (encadeada e indexada). */
  pointerSize: number;
}

/** Estado completo do formulário: parâmetros + roteiro de operações. */
export interface SimSetup {
  config: SimConfig;
  operations: Operation[];
  /** Cenário pronto de origem, ou `custom` se o roteiro foi editado. */
  scenarioId: ScenarioId | 'custom';
}

/** Limites aceitos pelo formulário (para manter o disco legível na tela). */
export const LIMITS = { maxDiskSize: 256, maxBlockSize: 65_536 } as const;

/** Nomes das técnicas em português. */
export const TECHNIQUE_LABELS: Record<TechniqueName, string> = {
  contiguous: 'Contígua',
  linked: 'Encadeada',
  indexed: 'Indexada',
};

/** Configuração inicial: cenário de fragmentação com a contígua first-fit. */
export function initialSetup(): SimSetup {
  return {
    config: {
      technique: 'contiguous',
      strategy: 'first-fit',
      freeBlockPolicy: 'first-free',
      seed: DEFAULT_SEED,
      diskSize: fragmentationScenario.diskSize,
      blockSize: fragmentationScenario.blockSize,
      pointerSize: DEFAULT_POINTER_SIZE,
    },
    operations: fragmentationScenario.operations.map((op) => ({ ...op })),
    scenarioId: fragmentationScenario.id,
  };
}

/** Opções repassadas a `createAllocator` / `runComparison`. */
export function allocatorOptions(config: SimConfig): AllocatorOptions {
  return {
    strategy: config.strategy,
    freeBlockPolicy: config.freeBlockPolicy,
    seed: config.seed,
    pointerSize: config.pointerSize,
  };
}

/**
 * Monta o `Scenario` do core a partir do formulário.
 *
 * @param config Parâmetros do disco.
 * @param operations Roteiro de operações.
 * @param scenarioId Cenário pronto de origem (só define nome e descrição).
 */
export function buildScenario(
  config: SimConfig,
  operations: Operation[],
  scenarioId: SimSetup['scenarioId'] = 'custom',
): Scenario {
  const preset = scenarios.find((s) => s.id === scenarioId);
  return {
    name: preset?.name ?? 'Personalizado',
    description: preset?.description ?? 'Roteiro editado na interface.',
    diskSize: config.diskSize,
    blockSize: config.blockSize,
    operations,
  };
}

/** `true` se `v` é inteiro entre `min` e `max`. */
function intBetween(v: number, min: number, max: number): boolean {
  return Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Valida o formulário antes de executar. A UI exige nomes preenchidos e tamanhos inteiros
 * positivos para que o roteiro fique legível (o core recusaria tamanhos inválidos com um
 * evento de falha `invalid-size`).
 *
 * @returns Lista de mensagens de erro, em português (vazia se tudo estiver certo).
 */
export function validateSetup(setup: SimSetup): string[] {
  const { config, operations } = setup;
  const errors: string[] = [];
  if (!intBetween(config.diskSize, 1, LIMITS.maxDiskSize)) {
    errors.push(`Nº de blocos deve ser um inteiro entre 1 e ${LIMITS.maxDiskSize}.`);
  }
  if (!intBetween(config.blockSize, 1, LIMITS.maxBlockSize)) {
    errors.push(`Tamanho do bloco deve ser um inteiro entre 1 e ${LIMITS.maxBlockSize}.`);
  }
  if (!intBetween(config.pointerSize, 1, LIMITS.maxBlockSize)) {
    errors.push('Tamanho do ponteiro deve ser um inteiro positivo.');
  } else if (config.pointerSize >= config.blockSize) {
    errors.push('O ponteiro precisa ser menor que o bloco (a encadeada guarda dados e ponteiro).');
  }
  if (config.freeBlockPolicy === 'random' && !Number.isInteger(config.seed)) {
    errors.push('A semente deve ser um número inteiro.');
  }
  if (operations.length === 0) errors.push('Adicione ao menos uma operação.');
  operations.forEach((op, i) => {
    if (op.fileName.trim() === '') errors.push(`Operação ${i + 1}: informe o nome do arquivo.`);
    if (op.type === 'create' && !intBetween(op.sizeInBytes, 1, Number.MAX_SAFE_INTEGER)) {
      errors.push(`Operação ${i + 1}: o tamanho deve ser um inteiro positivo de bytes.`);
    }
  });
  return errors;
}
