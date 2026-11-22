import type { Scenario } from '../core';

/**
 * Roteiro de exemplo (disco de 32 blocos de 512 bytes).
 *
 * Cria arquivos de tamanhos variados (não múltiplos do bloco, para gerar fragmentação
 * interna) e remove B e D, abrindo buracos de 3 e 4 blocos. O arquivo F (4000 bytes =
 * 8 blocos) cabe no espaço livre total (14 blocos), mas não no maior buraco (7 blocos):
 * a contígua falha por fragmentação externa, enquanto encadeada e indexada conseguem.
 *
 * Blocos ocupados por técnica (contígua / encadeada / indexada, com ponteiro de 4 bytes):
 * A 5/5/6, B 3/3/4, C 6/6/7, D 4/4/5, E 7/7/8, F 8/8/9, G 1/1/2, H 4/4/5.
 */
export const defaultScenario: Scenario = {
  name: 'Padrão',
  description: 'Cria e remove arquivos de tamanhos variados para provocar fragmentação externa.',
  diskSize: 32,
  blockSize: 512,
  operations: [
    { type: 'create', fileName: 'A', sizeInBytes: 2400 },
    { type: 'create', fileName: 'B', sizeInBytes: 1300 },
    { type: 'create', fileName: 'C', sizeInBytes: 3000 },
    { type: 'create', fileName: 'D', sizeInBytes: 1800 },
    { type: 'create', fileName: 'E', sizeInBytes: 3500 },
    { type: 'remove', fileName: 'B' },
    { type: 'remove', fileName: 'D' },
    { type: 'create', fileName: 'F', sizeInBytes: 4000 },
    { type: 'create', fileName: 'G', sizeInBytes: 400 },
    { type: 'remove', fileName: 'A' },
    { type: 'create', fileName: 'H', sizeInBytes: 1800 },
  ],
};
