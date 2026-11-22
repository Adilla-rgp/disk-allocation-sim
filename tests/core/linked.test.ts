import { describe, expect, it } from 'vitest';
import {
  cloneDirectory,
  cloneDisk,
  ContiguousAllocator,
  createDirectory,
  createDisk,
  LinkedAllocator,
} from '../../src/core';

/** Disco de 6 blocos em que só os blocos 1, 3 e 5 estão livres. */
function alternatingSetup(alloc = new LinkedAllocator()) {
  const disk = createDisk(6, 512);
  const dir = createDirectory();
  for (let i = 0; i < 6; i++) alloc.allocate(disk, dir, `F${i}`, 100);
  for (const i of [1, 3, 5]) alloc.remove(disk, dir, `F${i}`);
  return { disk, dir, alloc };
}

describe('Alocação encadeada', () => {
  describe('alocação', () => {
    it('cada bloco aponta (next) para o próximo e o último tem next = null', () => {
      const disk = createDisk(8, 512);
      const dir = createDirectory();
      const r = new LinkedAllocator().allocate(disk, dir, 'A', 1500);
      expect(r).toEqual({ success: true, blocks: [0, 1, 2] });
      expect(disk.blocks.slice(0, 3).map((b) => b.next)).toEqual([1, 2, null]);
      expect(disk.blocks.slice(0, 3).every((b) => b.owner === 'A')).toBe(true);
    });

    it('registra no diretório o primeiro e o último bloco da cadeia', () => {
      const { disk, dir, alloc } = alternatingSetup();
      alloc.allocate(disk, dir, 'A', 1200);
      expect(dir.entries.get('A')).toEqual({
        name: 'A',
        sizeInBytes: 1200,
        technique: 'linked',
        start: 1,
        end: 5,
        length: 3,
      });
    });

    it('aloca em blocos não consecutivos onde a contígua falharia', () => {
      const { disk, dir, alloc } = alternatingSetup();
      const contiguous = new ContiguousAllocator().allocate(
        cloneDisk(disk),
        cloneDirectory(dir),
        'A',
        1200,
      );
      expect(contiguous).toMatchObject({ success: false, reason: 'external-fragmentation' });

      const r = alloc.allocate(disk, dir, 'A', 1200);
      expect(r).toEqual({ success: true, blocks: [1, 3, 5] });
      expect([1, 3, 5].map((i) => disk.blocks[i].next)).toEqual([3, 5, null]);
    });

    it('falha só com insufficient-space quando faltam blocos (nunca external-fragmentation)', () => {
      const { disk, dir, alloc } = alternatingSetup();
      const r = alloc.allocate(disk, dir, 'A', 4 * 508);
      expect(r).toMatchObject({ success: false, reason: 'insufficient-space', requiredBlocks: 4 });
    });

    it('falha com duplicate-name e invalid-size', () => {
      const { disk, dir, alloc } = alternatingSetup();
      expect(alloc.allocate(disk, dir, 'F0', 10)).toMatchObject({ reason: 'duplicate-name' });
      expect(alloc.allocate(disk, dir, 'A', 0)).toMatchObject({ reason: 'invalid-size' });
      expect(alloc.allocate(disk, dir, 'A', -5)).toMatchObject({ reason: 'invalid-size' });
    });

    it('uma falha não altera o disco nem o diretório (atomicidade)', () => {
      const { disk, dir, alloc } = alternatingSetup();
      const diskBefore = cloneDisk(disk);
      const dirBefore = cloneDirectory(dir);
      alloc.allocate(disk, dir, 'A', 10_000);
      alloc.allocate(disk, dir, 'F0', 10);
      expect(disk).toEqual(diskBefore);
      expect(dir).toEqual(dirBefore);
    });
  });

  describe('overhead de ponteiro', () => {
    it('usa ceil(bytes / (blockSize - pointerSize)) blocos', () => {
      const alloc = new LinkedAllocator({ pointerSize: 4 });
      expect(alloc.dataBytesPerBlock(512)).toBe(508);
      expect(alloc.dataBlocksFor(512, 1016)).toBe(2);
      expect(alloc.dataBlocksFor(512, 1017)).toBe(3);
    });

    it('o ponteiro pode exigir um bloco a mais do que a contígua', () => {
      const linked = new LinkedAllocator({ pointerSize: 8 });
      const contiguous = new ContiguousAllocator();
      // 1024 bytes: contígua = 2 blocos; encadeada = ceil(1024 / 504) = 3 blocos
      expect(contiguous.dataBlocksFor(512, 1024)).toBe(2);
      expect(linked.dataBlocksFor(512, 1024)).toBe(3);
      expect(linked.allocate(createDisk(4, 512), createDirectory(), 'A', 1024).blocks).toHaveLength(
        3,
      );
    });

    it('rejeita ponteiro maior ou igual ao bloco', () => {
      const alloc = new LinkedAllocator({ pointerSize: 512 });
      expect(() => alloc.allocate(createDisk(4, 512), createDirectory(), 'A', 10)).toThrow(
        RangeError,
      );
    });
  });

  describe('política de blocos livres', () => {
    it('random escolhe blocos de forma determinística pela semente', () => {
      const run = (seed: number) => {
        const disk = createDisk(32, 512);
        return new LinkedAllocator({ freeBlockPolicy: 'random', seed }).allocate(
          disk,
          createDirectory(),
          'A',
          5 * 508,
        ).blocks;
      };
      expect(run(7)).toEqual(run(7));
      expect(run(7)).not.toEqual(run(8));
      expect(run(7)).not.toEqual([0, 1, 2, 3, 4]);
    });

    it('random encadeia os blocos na ordem sorteada', () => {
      const disk = createDisk(32, 512);
      const dir = createDirectory();
      const alloc = new LinkedAllocator({ freeBlockPolicy: 'random', seed: 3 });
      const { blocks } = alloc.allocate(disk, dir, 'A', 4 * 508);
      expect(alloc.blocksOf(disk, dir, 'A')).toEqual(blocks);
      expect(dir.entries.get('A')).toMatchObject({ start: blocks[0], end: blocks[3] });
    });
  });

  describe('remoção', () => {
    it('libera todos os blocos da cadeia, zera next e remove a entrada', () => {
      const disk = createDisk(8, 512);
      const dir = createDirectory();
      const alloc = new LinkedAllocator();
      alloc.allocate(disk, dir, 'A', 1500);
      expect(alloc.remove(disk, dir, 'A')).toEqual([0, 1, 2]);
      expect(disk.blocks.every((b) => b.owner === null && b.next === null)).toBe(true);
      expect(dir.entries.size).toBe(0);
    });

    it('lança erro claro ao remover arquivo inexistente', () => {
      expect(() =>
        new LinkedAllocator().remove(createDisk(4, 512), createDirectory(), 'Z'),
      ).toThrow('Arquivo "Z" não existe no diretório.');
    });
  });

  describe('acesso', () => {
    it('blocksOf segue os ponteiros a partir do bloco inicial', () => {
      const { disk, dir, alloc } = alternatingSetup();
      alloc.allocate(disk, dir, 'A', 1200);
      expect(alloc.blocksOf(disk, dir, 'A')).toEqual([1, 3, 5]);
    });

    it('accessCost do k-ésimo bloco é k + 1 (acesso sequencial)', () => {
      const disk = createDisk(8, 512);
      const dir = createDirectory();
      const alloc = new LinkedAllocator();
      alloc.allocate(disk, dir, 'A', 4 * 508);
      expect([0, 1, 2, 3].map((k) => alloc.accessCost(disk, dir, 'A', k))).toEqual([1, 2, 3, 4]);
      expect(() => alloc.accessCost(disk, dir, 'A', 4)).toThrow(RangeError);
    });
  });
});
