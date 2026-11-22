import { describe, it } from 'vitest';

describe('Métricas', () => {
  it.todo('occupancy é 0 em disco vazio e 1 em disco cheio');
  it.todo('occupancy conta blocos de índice como ocupados');
  it.todo('overheadBytes é 0 na contígua');
  it.todo('overheadBytes na encadeada = blocos de dados × pointerSize');
  it.todo('overheadBytes na indexada = blocos de índice × blockSize');
  it.todo('holeCount conta sequências máximas de blocos livres');
  it.todo('largestHole retorna o tamanho do maior buraco (0 em disco cheio)');
  it.todo('failureCount conta apenas eventos do tipo fail');
  it.todo('averageAccessCost é 0 com diretório vazio');
  it.todo('averageAccessCost reflete o custo de cada técnica (1, k + 1, 2)');
  it.todo('computeMetrics reúne todas as métricas de forma consistente');
});
