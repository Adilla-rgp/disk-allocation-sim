import { describe, it } from 'vitest';

describe('Alocação indexada', () => {
  describe('bloco de índice', () => {
    it.todo('reserva um bloco de índice marcado com isIndexBlock = true');
    it.todo('o bloco de índice lista em pointers os blocos de dados na ordem lógica');
    it.todo('o diretório guarda apenas o bloco de índice do arquivo');
    it.todo('um arquivo de n blocos consome n + 1 blocos do disco');
    it.todo('maxPointersPerIndexBlock = floor(blockSize / pointerSize)');
    it.todo('falha com index-overflow quando os ponteiros não cabem no bloco de índice');
  });

  describe('alocação', () => {
    it.todo('aloca blocos de dados não consecutivos sem fragmentação externa');
    it.todo('falha com insufficient-space quando faltam blocos (contando o de índice)');
  });

  describe('remoção', () => {
    it.todo('libera os blocos de dados e o bloco de índice');
    it.todo('remove a entrada do diretório');
  });

  describe('acesso', () => {
    it.todo('blocksOf retorna o bloco de índice seguido dos blocos de dados');
    it.todo('accessCost é 2 para qualquer bloco (índice + dados)');
  });
});
