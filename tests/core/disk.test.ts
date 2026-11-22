import { describe, expect, it } from 'vitest';
import {
  cloneDisk,
  createDisk,
  findHoles,
  freeBlocks,
  isFree,
  occupyBlock,
  releaseBlock,
} from '../../src/core';

describe('Disco', () => {
  it('createDisk cria n blocos livres, com index igual à posição', () => {
    const disk = createDisk(8, 512);
    expect(disk.blockSize).toBe(512);
    expect(disk.blocks).toHaveLength(8);
    disk.blocks.forEach((b, i) => {
      expect(b).toEqual({ index: i, owner: null, next: null, isIndexBlock: false });
    });
  });

  it('createDisk rejeita tamanhos inválidos', () => {
    expect(() => createDisk(0, 512)).toThrow(RangeError);
    expect(() => createDisk(8, -1)).toThrow(RangeError);
    expect(() => createDisk(2.5, 512)).toThrow(RangeError);
  });

  it('occupyBlock marca o dono e recusa bloco já ocupado', () => {
    const disk = createDisk(4, 512);
    occupyBlock(disk, 2, 'A');
    expect(isFree(disk, 2)).toBe(false);
    expect(freeBlocks(disk)).toEqual([0, 1, 3]);
    expect(() => occupyBlock(disk, 2, 'B')).toThrow(/ocupado/);
  });

  it('releaseBlock zera dono, next, marca de índice e pointers', () => {
    const disk = createDisk(4, 512);
    Object.assign(disk.blocks[1], { owner: 'A', next: 3, isIndexBlock: true, pointers: [2] });
    releaseBlock(disk, 1);
    expect(disk.blocks[1]).toEqual({ index: 1, owner: null, next: null, isIndexBlock: false });
  });

  it('isFree rejeita índice fora do disco', () => {
    expect(() => isFree(createDisk(4, 512), 4)).toThrow(RangeError);
  });

  it('findHoles lista as sequências máximas de blocos livres', () => {
    const disk = createDisk(10, 512);
    for (const i of [0, 3, 4, 8]) occupyBlock(disk, i, 'X');
    expect(findHoles(disk)).toEqual([
      { start: 1, length: 2 },
      { start: 5, length: 3 },
      { start: 9, length: 1 },
    ]);
  });

  it('cloneDisk faz cópia profunda (inclusive pointers)', () => {
    const disk = createDisk(4, 512);
    Object.assign(disk.blocks[0], { owner: 'A', isIndexBlock: true, pointers: [1, 2] });
    const copy = cloneDisk(disk);
    copy.blocks[0].pointers!.push(3);
    copy.blocks[1].owner = 'Z';
    expect(disk.blocks[0].pointers).toEqual([1, 2]);
    expect(disk.blocks[1].owner).toBeNull();
  });
});
