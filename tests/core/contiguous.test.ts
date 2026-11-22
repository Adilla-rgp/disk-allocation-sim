import { describe, it } from 'vitest';

describe('Alocação contígua', () => {
  describe('alocação', () => {
    it.todo('aloca um arquivo em blocos consecutivos a partir do primeiro buraco livre');
    it.todo('registra no diretório o bloco inicial e o tamanho do arquivo');
    it.todo('first-fit escolhe o primeiro buraco que comporta o arquivo');
    it.todo('best-fit escolhe o menor buraco que comporta o arquivo');
    it.todo('worst-fit escolhe o maior buraco disponível');
    it.todo('falha com duplicate-name ao criar arquivo com nome já existente');
    it.todo('falha com invalid-size para tamanho zero ou negativo');
  });

  describe('remoção', () => {
    it.todo('libera todos os blocos do arquivo e remove a entrada do diretório');
    it.todo('blocos liberados formam um buraco reutilizável');
    it.todo('lança erro ao remover arquivo inexistente');
  });

  describe('fragmentação externa', () => {
    it.todo(
      'falha com external-fragmentation quando há espaço livre total suficiente, mas nenhum buraco contíguo comporta o arquivo',
    );
    it.todo('falha com insufficient-space quando o espaço livre total não basta');
    it.todo('uma falha não altera o disco nem o diretório');
  });

  describe('acesso', () => {
    it.todo('blocksOf retorna o intervalo [start, start + length)');
    it.todo('accessCost é 1 para qualquer bloco (acesso direto)');
  });
});
