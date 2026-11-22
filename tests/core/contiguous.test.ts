import { describe, expect, it } from 'vitest';
import {
  chooseHole,
  cloneDirectory,
  cloneDisk,
  ContiguousAllocator,
  createDirectory,
  createDisk,
  findHoles,
  type FitStrategy,
} from '../../src/core';

const BS = 100;

/**
 * Disco de 16 blocos totalmente ocupado e depois com três buracos:
 * [0-2] = 3 blocos, [5-9] = 5 blocos, [12-13] = 2 blocos (10 livres no total).
 */
function fragmentedSetup(strategy: FitStrategy = 'first-fit') {
  const disk = createDisk(16, BS);
  const dir = createDirectory();
  const alloc = new ContiguousAllocator(strategy);
  alloc.allocate(disk, dir, 'H1', 3 * BS);
  alloc.allocate(disk, dir, 'X1', 2 * BS);
  alloc.allocate(disk, dir, 'H2', 5 * BS);
  alloc.allocate(disk, dir, 'X2', 2 * BS);
  alloc.allocate(disk, dir, 'H3', 2 * BS);
  alloc.allocate(disk, dir, 'X3', 2 * BS);
  for (const f of ['H1', 'H2', 'H3']) alloc.remove(disk, dir, f);
  return { disk, dir, alloc };
}

describe('Alocação contígua', () => {
  describe('alocação', () => {
    it('usa ceil(bytes / blockSize) blocos consecutivos', () => {
      const disk = createDisk(10, BS);
      const dir = createDirectory();
      const alloc = new ContiguousAllocator();
      expect(alloc.allocate(disk, dir, 'A', 250)).toEqual({ success: true, blocks: [0, 1, 2] });
      expect(alloc.allocate(disk, dir, 'B', 100)).toEqual({ success: true, blocks: [3] });
      expect(disk.blocks.slice(0, 4).map((b) => b.owner)).toEqual(['A', 'A', 'A', 'B']);
      expect(disk.blocks.every((b) => b.next === null && !b.isIndexBlock)).toBe(true);
    });

    it('registra no diretório o bloco inicial, o tamanho em blocos e em bytes', () => {
      const disk = createDisk(10, BS);
      const dir = createDirectory();
      const alloc = new ContiguousAllocator();
      alloc.allocate(disk, dir, 'A', 150);
      alloc.allocate(disk, dir, 'B', 301);
      expect(dir.entries.get('B')).toEqual({
        name: 'B',
        sizeInBytes: 301,
        technique: 'contiguous',
        start: 2,
        length: 4,
      });
    });

    it('first-fit escolhe o primeiro buraco que comporta o arquivo', () => {
      const { disk, dir, alloc } = fragmentedSetup('first-fit');
      expect(alloc.allocate(disk, dir, 'N', 2 * BS).blocks).toEqual([0, 1]);
    });

    it('best-fit escolhe o menor buraco que comporta o arquivo', () => {
      const { disk, dir, alloc } = fragmentedSetup('best-fit');
      expect(alloc.allocate(disk, dir, 'N', 2 * BS).blocks).toEqual([12, 13]);
    });

    it('worst-fit escolhe o maior buraco disponível', () => {
      const { disk, dir, alloc } = fragmentedSetup('worst-fit');
      expect(alloc.allocate(disk, dir, 'N', 2 * BS).blocks).toEqual([5, 6]);
    });

    it('chooseHole desempata pelo buraco mais à esquerda', () => {
      const holes = [
        { start: 0, length: 3 },
        { start: 5, length: 3 },
      ];
      expect(chooseHole(holes, 2, 'best-fit')).toEqual(holes[0]);
      expect(chooseHole(holes, 2, 'worst-fit')).toEqual(holes[0]);
      expect(chooseHole(holes, 4, 'first-fit')).toBeNull();
    });

    it('falha com duplicate-name ao criar arquivo com nome já existente', () => {
      const disk = createDisk(10, BS);
      const dir = createDirectory();
      const alloc = new ContiguousAllocator();
      alloc.allocate(disk, dir, 'A', 100);
      const r = alloc.allocate(disk, dir, 'A', 100);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.reason).toBe('duplicate-name');
    });

    it.each([0, -10, 1.5, Number.NaN])('falha com invalid-size para %s bytes', (size) => {
      const r = new ContiguousAllocator().allocate(createDisk(4, BS), createDirectory(), 'A', size);
      expect(r).toMatchObject({ success: false, reason: 'invalid-size', blocks: [] });
    });
  });

  describe('remoção', () => {
    it('libera todos os blocos do arquivo, retorna-os e remove a entrada do diretório', () => {
      const disk = createDisk(10, BS);
      const dir = createDirectory();
      const alloc = new ContiguousAllocator();
      alloc.allocate(disk, dir, 'A', 200);
      alloc.allocate(disk, dir, 'B', 300);
      expect(alloc.remove(disk, dir, 'B')).toEqual([2, 3, 4]);
      expect(disk.blocks.slice(2, 5).every((b) => b.owner === null)).toBe(true);
      expect(dir.entries.has('B')).toBe(false);
      expect(dir.entries.has('A')).toBe(true);
    });

    it('blocos liberados formam um buraco reutilizável', () => {
      const disk = createDisk(6, BS);
      const dir = createDirectory();
      const alloc = new ContiguousAllocator();
      alloc.allocate(disk, dir, 'A', 200);
      alloc.allocate(disk, dir, 'B', 400);
      alloc.remove(disk, dir, 'A');
      expect(findHoles(disk)).toEqual([{ start: 0, length: 2 }]);
      expect(alloc.allocate(disk, dir, 'C', 200).blocks).toEqual([0, 1]);
    });

    it('lança erro claro ao remover arquivo inexistente', () => {
      const alloc = new ContiguousAllocator();
      expect(() => alloc.remove(createDisk(4, BS), createDirectory(), 'Z')).toThrow(
        'Arquivo "Z" não existe no diretório.',
      );
    });
  });

  describe('fragmentação externa', () => {
    it('falha com external-fragmentation quando o total livre basta, mas nenhum buraco comporta', () => {
      const { disk, dir, alloc } = fragmentedSetup();
      // livres: 3 + 5 + 2 = 10, maior buraco = 5
      const r = alloc.allocate(disk, dir, 'N', 6 * BS);
      expect(r).toMatchObject({
        success: false,
        reason: 'external-fragmentation',
        requiredBlocks: 6,
      });
      if (!r.success) expect(r.message).toContain('maior buraco tem 5');
    });

    it('falha com insufficient-space quando o espaço livre total não basta', () => {
      const { disk, dir, alloc } = fragmentedSetup();
      const r = alloc.allocate(disk, dir, 'N', 11 * BS);
      expect(r).toMatchObject({ success: false, reason: 'insufficient-space', requiredBlocks: 11 });
    });

    it('uma falha não altera o disco nem o diretório (atomicidade)', () => {
      const { disk, dir, alloc } = fragmentedSetup();
      const diskBefore = cloneDisk(disk);
      const dirBefore = cloneDirectory(dir);
      alloc.allocate(disk, dir, 'N', 6 * BS);
      alloc.allocate(disk, dir, 'N', 11 * BS);
      alloc.allocate(disk, dir, 'X1', BS);
      alloc.allocate(disk, dir, 'N', 0);
      expect(disk).toEqual(diskBefore);
      expect(dir).toEqual(dirBefore);
    });
  });

  describe('acesso', () => {
    it('blocksOf retorna o intervalo [start, start + length)', () => {
      const { disk, dir, alloc } = fragmentedSetup();
      expect(alloc.blocksOf(disk, dir, 'X2')).toEqual([10, 11]);
    });

    it('accessCost é 1 para qualquer bloco (acesso direto)', () => {
      const disk = createDisk(10, BS);
      const dir = createDirectory();
      const alloc = new ContiguousAllocator();
      alloc.allocate(disk, dir, 'A', 1000);
      for (let k = 0; k < 10; k++) expect(alloc.accessCost(disk, dir, 'A', k)).toBe(1);
    });

    it('accessCost rejeita k fora do arquivo', () => {
      const disk = createDisk(10, BS);
      const dir = createDirectory();
      const alloc = new ContiguousAllocator();
      alloc.allocate(disk, dir, 'A', 200);
      expect(() => alloc.accessCost(disk, dir, 'A', 2)).toThrow(RangeError);
      expect(() => alloc.accessCost(disk, dir, 'A', -1)).toThrow(RangeError);
    });
  });
});
