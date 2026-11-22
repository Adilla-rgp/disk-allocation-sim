/**
 * Tipos compartilhados do núcleo do simulador.
 *
 * Este módulo é TypeScript puro: não depende de React nem do DOM, para que o
 * mesmo código rode no navegador e no terminal (`npm run cli`).
 */

/** Nome de cada técnica de alocação suportada pelo simulador. */
export type TechniqueName = 'contiguous' | 'linked' | 'indexed';

/** Estratégia de escolha de buraco usada pela alocação contígua. */
export type FitStrategy = 'first-fit' | 'best-fit' | 'worst-fit';

/**
 * Política de escolha de blocos livres nas alocações encadeada e indexada:
 * - `first-free`: usa os blocos livres de menor índice;
 * - `random`: sorteia blocos livres com um PRNG determinístico (ver `random.ts`).
 */
export type FreeBlockPolicy = 'first-free' | 'random';

/**
 * Um bloco físico do disco.
 *
 * Um bloco está livre quando `owner === null`.
 */
export interface Block {
  /** Posição do bloco no disco (0 .. n-1). */
  index: number;
  /** Nome do arquivo dono do bloco, ou `null` se o bloco está livre. */
  owner: string | null;
  /**
   * Índice do próximo bloco do arquivo (apenas na alocação encadeada).
   * `null` indica fim da cadeia ou que a técnica não usa ponteiros.
   */
  next: number | null;
  /** `true` quando o bloco é o bloco de índice de um arquivo (alocação indexada). */
  isIndexBlock: boolean;
  /** Lista de blocos de dados do arquivo (apenas no bloco de índice). */
  pointers?: number[];
}

/** O disco simulado: um array de blocos mantido em memória. */
export interface Disk {
  /** Tamanho de cada bloco, em bytes. */
  blockSize: number;
  /** Blocos do disco, onde `blocks[i].index === i`. */
  blocks: Block[];
}

/** Um buraco: sequência máxima de blocos livres consecutivos. */
export interface Hole {
  /** Primeiro bloco do buraco. */
  start: number;
  /** Quantidade de blocos livres consecutivos. */
  length: number;
}

/** Metadados de diretório de um arquivo alocado de forma contígua. */
export interface ContiguousMeta {
  technique: 'contiguous';
  /** Primeiro bloco do arquivo. */
  start: number;
  /** Quantidade de blocos consecutivos. */
  length: number;
}

/** Metadados de diretório de um arquivo alocado de forma encadeada. */
export interface LinkedMeta {
  technique: 'linked';
  /** Primeiro bloco da cadeia. */
  start: number;
  /** Último bloco da cadeia (facilita acréscimos ao final). */
  end: number;
  /** Quantidade de blocos da cadeia. */
  length: number;
}

/** Metadados de diretório de um arquivo alocado de forma indexada. */
export interface IndexedMeta {
  technique: 'indexed';
  /** Bloco que guarda a lista de ponteiros do arquivo. */
  indexBlock: number;
  /** Quantidade de blocos de dados (sem contar o bloco de índice). */
  length: number;
}

/** Metadados específicos de cada técnica. */
export type AllocationMeta = ContiguousMeta | LinkedMeta | IndexedMeta;

/**
 * Entrada do diretório: um arquivo e os metadados da técnica que o alocou.
 * Em todas as técnicas, `length` é a quantidade de blocos de **dados** do arquivo.
 */
export type FileEntry = {
  /** Nome do arquivo (chave única no diretório). */
  name: string;
  /** Tamanho lógico do arquivo, em bytes. */
  sizeInBytes: number;
} & AllocationMeta;

/** Diretório do sistema de arquivos: nome do arquivo -> entrada. */
export interface Directory {
  entries: Map<string, FileEntry>;
}

/** Motivos possíveis de falha de alocação. */
export type AllocationFailureReason =
  /** Não há blocos livres suficientes no disco inteiro. */
  | 'insufficient-space'
  /** Há blocos livres suficientes, mas nenhum buraco contíguo grande o bastante (só na contígua). */
  | 'external-fragmentation'
  /** O bloco de índice não comporta a quantidade de ponteiros necessária (só na indexada). */
  | 'index-overflow'
  /** Já existe um arquivo com esse nome no diretório. */
  | 'duplicate-name'
  /** Tamanho inválido (zero, negativo, não inteiro ou não finito). */
  | 'invalid-size';

/** Falha de alocação. O disco e o diretório não são alterados. */
export interface AllocationFailure {
  success: false;
  /** Sempre vazio em caso de falha. */
  blocks: [];
  /** Motivo da falha. */
  reason: AllocationFailureReason;
  /** Descrição legível da falha, em português. */
  message: string;
  /** Blocos que o arquivo exigiria (incluindo o de índice), quando calculável. */
  requiredBlocks?: number;
}

/** Resultado de uma tentativa de alocação. */
export type AllocationResult =
  | {
      success: true;
      /** Blocos usados pelo arquivo, na ordem lógica (na indexada, o bloco de índice vem primeiro). */
      blocks: number[];
    }
  | AllocationFailure;

/** Resultado de uma tentativa de remoção feita pelo simulador. */
export type RemoveResult =
  | {
      success: true;
      /** Blocos liberados (inclui o bloco de índice, se houver). */
      blocks: number[];
    }
  | {
      success: false;
      blocks: [];
      reason: 'not-found';
      message: string;
    };

/** Operação de um roteiro de simulação. */
export type Operation =
  { type: 'create'; fileName: string; sizeInBytes: number } | { type: 'remove'; fileName: string };

/** Roteiro de simulação: configuração do disco + sequência de operações. */
export interface Scenario {
  name: string;
  description: string;
  /** Quantidade de blocos do disco. */
  diskSize: number;
  /** Tamanho de cada bloco, em bytes. */
  blockSize: number;
  operations: Operation[];
}

/**
 * Tipo de evento registrado no log da simulação:
 * `allocate` e `remove` (sucesso), `fail` (alocação recusada) e `error` (operação inválida,
 * como remover um arquivo inexistente).
 */
export type SimulationEventType = 'allocate' | 'remove' | 'fail' | 'error';

/** Evento do log da simulação. */
export interface SimulationEvent {
  /** Número do passo (índice da operação no roteiro). */
  step: number;
  type: SimulationEventType;
  fileName: string;
  /** Blocos envolvidos no evento. */
  blocks: number[];
  /** Motivo da falha, quando `type === 'fail'`. */
  reason?: AllocationFailureReason;
  /** Mensagem legível, em português. */
  message: string;
}

/** Fotografia imutável do estado do disco e do diretório em um instante. */
export interface Snapshot {
  step: number;
  /** Indica se a foto foi tirada antes ou depois da operação do passo. */
  moment: 'before' | 'after';
  /** Tamanho de cada bloco, em bytes. */
  blockSize: number;
  /** Cópia profunda dos blocos do disco. */
  blocks: Block[];
  /** Cópia das entradas do diretório, na ordem de criação. */
  directory: FileEntry[];
}
