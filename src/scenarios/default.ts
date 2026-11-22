import type { Scenario } from '../core';

/**
 * Roteiro de exemplo: cria arquivos de tamanhos variados e remove alguns no meio,
 * abrindo buracos. O último arquivo (F) cabe no espaço livre total, mas não em
 * nenhum buraco contíguo, evidenciando a fragmentação externa da alocação contígua.
 */
export const defaultScenario: Scenario = {
  name: 'Padrão',
  description: 'Cria e remove arquivos de tamanhos variados para provocar fragmentação.',
  diskSize: 32,
  blockSize: 512,
  operations: [
    { type: 'create', fileName: 'A', sizeInBlocks: 5 },
    { type: 'create', fileName: 'B', sizeInBlocks: 3 },
    { type: 'create', fileName: 'C', sizeInBlocks: 6 },
    { type: 'create', fileName: 'D', sizeInBlocks: 4 },
    { type: 'create', fileName: 'E', sizeInBlocks: 7 },
    { type: 'delete', fileName: 'B' },
    { type: 'delete', fileName: 'D' },
    { type: 'create', fileName: 'F', sizeInBlocks: 8 },
    { type: 'create', fileName: 'G', sizeInBlocks: 2 },
    { type: 'delete', fileName: 'A' },
    { type: 'create', fileName: 'H', sizeInBlocks: 4 },
  ],
};
