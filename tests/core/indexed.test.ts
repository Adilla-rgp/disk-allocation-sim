import { describe, expect, it } from 'vitest';
import {
  cloneDirectory,
  cloneDisk,
  createDirectory,
  createDisk,
  IndexedAllocator,
  LinkedAllocator,
  maxPointersPerIndexBlock,
} from '../../src/core';

/** Disco de 8 blocos em que só os blocos 1, 3, 5 e 7 estão livres. */
function alternatingSetup(alloc = new IndexedAllocator()) {
  const disk = createDisk(8, 512);
  const dir = createDirectory();
  const filler = new LinkedAllocator();
  for (let i = 0; i < 8; i++) filler.allocate(disk, dir, `F${i}`, 100);
  for (const i of [1, 3, 5, 7]) filler.remove(disk, dir, `F${i}`);
  return { disk, dir, alloc };
}

describe('Alocação indexada', () => {
  describe('bloco de índice', () => {
    it('reserva um bloco de índice que lista em pointers os blocos de dados', () => {
      const disk = createDisk(8, 512);
      const dir = createDirectory();
      const r = new IndexedAllocator().allocate(disk, dir, 'A', 1500);
      expect(r).toEqual({ success: true, blocks: [0, 1, 2, 3] });
      expect(disk.blocks[0]).toMatchObject({ owner: 'A', isIndexBlock: true, pointers: [1, 2, 3] });
      expect(disk.blocks.slice(1, 4).every((b) => b.owner === 'A' && !b.isIndexBlock)).toBe(true);
    });

    it('o diretório guarda apenas o bloco de índice e o número de blocos de dados', () => {
      const { disk, dir, alloc } = alternatingSetup();
      alloc.allocate(disk, dir, 'A', 1000);
      expect(dir.entries.get('A')).toEqual({
        name: 'A',
        sizeInBytes: 1000,
        technique: 'indexed',
        indexBlock: 1,
        length: 2,
      });
    });

    it('um arquivo de n blocos de dados consome n + 1 blocos do disco', () => {
      const alloc = new IndexedAllocator();
      expect(alloc.dataBlocksFor(512, 1025)).toBe(3);
      expect(alloc.allocate(createDisk(8, 512), createDirectory(), 'A', 1025).blocks).toHaveLength(
        4,
      );
    });

    it('maxPointersPerIndexBlock = floor(blockSize / pointerSize)', () => {
      expect(maxPointersPerIndexBlock(512, 4)).toBe(128);
      expect(maxPointersPerIndexBlock(64, 6)).toBe(10);
    });

    it('falha com index-overflow quando os ponteiros não cabem no bloco de índice', () => {
      // bloco de 64 bytes, ponteiro de 4 bytes: até 16 blocos de dados
      const alloc = new IndexedAllocator({ pointerSize: 4 });
      const disk = createDisk(40, 64);
      const dir = createDirectory();
      expect(alloc.allocate(disk, dir, 'A', 16 * 64)).toMatchObject({ success: true });
      const r = alloc.allocate(disk, dir, 'B', 16 * 64 + 1);
      expect(r).toMatchObject({ success: false, reason: 'index-overflow', requiredBlocks: 18 });
    });
  });

  describe('alocação', () => {
    it('aloca blocos não consecutivos sem fragmentação externa', () => {
      const { disk, dir, alloc } = alternatingSetup();
      expect(alloc.allocate(disk, dir, 'A', 1536)).toEqual({ success: true, blocks: [1, 3, 5, 7] });
      expect(disk.blocks[1].pointers).toEqual([3, 5, 7]);
    });

    it('falha com insufficient-space contando o bloco de índice', () => {
      const { disk, dir, alloc } = alternatingSetup();
      // 4 blocos livres; 4 blocos de dados + 1 de índice = 5
      const r = alloc.allocate(disk, dir, 'A', 4 * 512);
      expect(r).toMatchObject({ success: false, reason: 'insufficient-space', requiredBlocks: 5 });
    });

    it('falha com duplicate-name e invalid-size', () => {
      const { disk, dir, alloc } = alternatingSetup();
      expect(alloc.allocate(disk, dir, 'F0', 10)).toMatchObject({ reason: 'duplicate-name' });
      expect(alloc.allocate(disk, dir, 'A', 0)).toMatchObject({ reason: 'invalid-size' });
    });

    it('uma falha não altera o disco nem o diretório (atomicidade)', () => {
      const { disk, dir, alloc } = alternatingSetup();
      const diskBefore = cloneDisk(disk);
      const dirBefore = cloneDirectory(dir);
      alloc.allocate(disk, dir, 'A', 4 * 512);
      alloc.allocate(disk, dir, 'B', 10_000_000);
      alloc.allocate(disk, dir, 'F0', 1);
      expect(disk).toEqual(diskBefore);
      expect(dir).toEqual(dirBefore);
    });

    it('random escolhe índice e dados de forma determinística pela semente', () => {
      const run = (seed: number) => {
        const disk = createDisk(32, 512);
        const dir = createDirectory();
        const alloc = new IndexedAllocator({ freeBlockPolicy: 'random', seed });
        const { blocks } = alloc.allocate(disk, dir, 'A', 3 * 512);
        expect(disk.blocks[blocks[0]].pointers).toEqual(blocks.slice(1));
        return blocks;
      };
      expect(run(5)).toEqual(run(5));
      expect(run(5)).not.toEqual(run(6));
    });
  });

  describe('remoção', () => {
    it('libera os blocos de dados e o bloco de índice, zerando pointers', () => {
      const disk = createDisk(8, 512);
      const dir = createDirectory();
      const alloc = new IndexedAllocator();
      alloc.allocate(disk, dir, 'A', 1500);
      expect(alloc.remove(disk, dir, 'A')).toEqual([0, 1, 2, 3]);
      expect(disk.blocks[0]).toEqual({ index: 0, owner: null, next: null, isIndexBlock: false });
      expect(disk.blocks.every((b) => b.owner === null)).toBe(true);
      expect(dir.entries.size).toBe(0);
    });

    it('lança erro claro ao remover arquivo inexistente', () => {
      expect(() =>
        new IndexedAllocator().remove(createDisk(4, 512), createDirectory(), 'Z'),
      ).toThrow('Arquivo "Z" não existe no diretório.');
    });
  });

  describe('acesso', () => {
    it('blocksOf retorna o bloco de índice seguido dos blocos de dados', () => {
      const { disk, dir, alloc } = alternatingSetup();
      alloc.allocate(disk, dir, 'A', 1000);
      expect(alloc.blocksOf(disk, dir, 'A')).toEqual([1, 3, 5]);
    });

    it('accessCost é 2 para qualquer bloco (índice + dados)', () => {
      const disk = createDisk(8, 512);
      const dir = createDirectory();
      const alloc = new IndexedAllocator();
      alloc.allocate(disk, dir, 'A', 4 * 512);
      expect([0, 1, 2, 3].map((k) => alloc.accessCost(disk, dir, 'A', k))).toEqual([2, 2, 2, 2]);
      expect(() => alloc.accessCost(disk, dir, 'A', 4)).toThrow(RangeError);
    });
  });
});
