import type { ScenarioPreset } from './types';

/**
 * Cenário "Justo" (disco de 32 blocos de 512 bytes).
 *
 * Todos os arquivos cabem nas três técnicas, então nenhuma falha e a comparação mede só o
 * custo de cada uma (overhead, eficiência e acesso). As remoções no meio abrem buracos
 * que os arquivos seguintes reaproveitam: na encadeada e na indexada (first-free) os
 * blocos desses arquivos ficam espalhados pelo disco.
 *
 * Os tamanhos não são múltiplos de 508 (bloco menos o ponteiro de 4 bytes) nem de 512,
 * e alguns fazem a encadeada precisar de um bloco a mais que a contígua.
 */
export const fairScenario: ScenarioPreset = {
  id: 'fair',
  name: 'Justo',
  description:
    'Todos os arquivos cabem nas três técnicas; as remoções no meio espalham os blocos ' +
    'dos arquivos seguintes. Bom para comparar overhead e eficiência sem falhas.',
  diskSize: 32,
  blockSize: 512,
  operations: [
    { type: 'create', fileName: 'A', sizeInBytes: 1500 },
    { type: 'create', fileName: 'B', sizeInBytes: 1000 },
    { type: 'create', fileName: 'C', sizeInBytes: 2040 },
    { type: 'create', fileName: 'D', sizeInBytes: 1200 },
    { type: 'remove', fileName: 'B' },
    { type: 'create', fileName: 'E', sizeInBytes: 2500 },
    { type: 'remove', fileName: 'A' },
    { type: 'create', fileName: 'F', sizeInBytes: 1530 },
    { type: 'create', fileName: 'G', sizeInBytes: 900 },
    { type: 'remove', fileName: 'D' },
    { type: 'create', fileName: 'H', sizeInBytes: 1800 },
  ],
};
