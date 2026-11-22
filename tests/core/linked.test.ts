import { describe, it } from 'vitest';

describe('Alocação encadeada', () => {
  describe('alocação', () => {
    it.todo('aloca um arquivo em blocos livres não necessariamente consecutivos');
    it.todo('cada bloco aponta (next) para o próximo e o último tem next = null');
    it.todo('registra no diretório o primeiro e o último bloco da cadeia');
    it.todo('aloca com sucesso em disco fragmentado onde a contígua falharia');
    it.todo('falha com insufficient-space quando não há blocos livres suficientes');
  });

  describe('remoção', () => {
    it.todo('percorre a cadeia liberando todos os blocos e zerando os ponteiros');
    it.todo('remove a entrada do diretório');
  });

  describe('overhead de ponteiro', () => {
    it.todo('cada bloco de dados gasta pointerSize bytes com o ponteiro');
    it.todo('overhead total = número de blocos do arquivo × pointerSize');
  });

  describe('acesso', () => {
    it.todo('blocksOf segue os ponteiros a partir do bloco inicial');
    it.todo('accessCost do k-ésimo bloco é k + 1 (acesso sequencial)');
  });
});
