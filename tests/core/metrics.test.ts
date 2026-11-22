import { describe, expect, it } from 'vitest';
import {
  computeMetrics,
  ContiguousAllocator,
  countFailures,
  createDirectory,
  createDisk,
  IndexedAllocator,
  LinkedAllocator,
  listEntries,
  type Allocator,
  type Directory,
  type Disk,
  type SimulationEvent,
  type Snapshot,
} from '../../src/core';

function snap(disk: Disk, dir: Directory): Snapshot {
  return {
    step: 0,
    moment: 'after',
    blockSize: disk.blockSize,
    blocks: disk.blocks,
    directory: listEntries(dir),
  };
}

/** Disco de 10 blocos de 100 bytes com os arquivos dados, alocados pela técnica. */
function setup(alloc: Allocator, files: [string, number][]) {
  const disk = createDisk(10, 100);
  const dir = createDirectory();
  for (const [name, size] of files) {
    if (!alloc.allocate(disk, dir, name, size).success) throw new Error(`setup: ${name}`);
  }
  return { disk, dir };
}

describe('Métricas', () => {
  it('disco vazio: nada ocupado, um único buraco do tamanho do disco', () => {
    const alloc = new ContiguousAllocator();
    expect(computeMetrics(snap(createDisk(10, 100), createDirectory()), alloc)).toEqual({
      totalBlocks: 10,
      usedBlocks: 0,
      freeBlocks: 10,
      occupancyPercent: 0,
      overheadBlocks: 0,
      pointerOverheadBytes: 0,
      internalFragmentationBytes: 0,
      requestedBytes: 0,
      storedBytes: 0,
      allocatedBytes: 0,
      efficiencyPercent: 0,
      overheadBytes: 0,
      holeCount: 1,
      largestHole: 10,
      failures: 0,
      avgSequentialAccessCost: 0,
      avgRandomAccessCost: 0,
    });
  });

  it('contígua: ocupação, fragmentação interna e acesso 1', () => {
    const alloc = new ContiguousAllocator();
    const { disk, dir } = setup(alloc, [
      ['A', 250],
      ['B', 100],
    ]);
    expect(computeMetrics(snap(disk, dir), alloc)).toMatchObject({
      usedBlocks: 4,
      freeBlocks: 6,
      occupancyPercent: 40,
      overheadBlocks: 0,
      pointerOverheadBytes: 0,
      internalFragmentationBytes: 50,
      avgSequentialAccessCost: 1,
      avgRandomAccessCost: 1,
    });
  });

  it('encadeada: bytes de overhead de ponteiro e acesso aleatório (n + 1) / 2', () => {
    const alloc = new LinkedAllocator({ pointerSize: 4 });
    // 200 bytes / 96 por bloco = 3 blocos; capacidade 288 -> 88 bytes desperdiçados
    const { disk, dir } = setup(alloc, [['A', 200]]);
    expect(computeMetrics(snap(disk, dir), alloc)).toMatchObject({
      usedBlocks: 3,
      overheadBlocks: 0,
      pointerOverheadBytes: 12,
      internalFragmentationBytes: 88,
      avgSequentialAccessCost: 1,
      avgRandomAccessCost: 2,
    });
  });

  it('indexada: blocos de índice contam como ocupados e como overhead', () => {
    const alloc = new IndexedAllocator();
    const { disk, dir } = setup(alloc, [['A', 250]]);
    const m = computeMetrics(snap(disk, dir), alloc);
    expect(m).toMatchObject({
      usedBlocks: 4,
      occupancyPercent: 40,
      overheadBlocks: 1,
      pointerOverheadBytes: 0,
      internalFragmentationBytes: 50,
      avgRandomAccessCost: 2,
    });
    expect(m.avgSequentialAccessCost).toBeCloseTo(4 / 3);
  });

  it('conta buracos e o maior buraco; disco cheio tem maior buraco 0', () => {
    const alloc = new ContiguousAllocator();
    const { disk, dir } = setup(alloc, [
      ['A', 100],
      ['B', 200],
      ['C', 100],
      ['D', 300],
    ]);
    alloc.remove(disk, dir, 'B');
    expect(computeMetrics(snap(disk, dir), alloc)).toMatchObject({ holeCount: 2, largestHole: 3 });

    const full = setup(alloc, [['X', 1000]]);
    expect(computeMetrics(snap(full.disk, full.dir), alloc)).toMatchObject({
      holeCount: 0,
      largestHole: 0,
      occupancyPercent: 100,
    });
  });

  it('countFailures conta apenas eventos do tipo fail e computeMetrics repassa o total', () => {
    const base = { step: 0, fileName: 'A', blocks: [], message: '' };
    const events: SimulationEvent[] = [
      { ...base, type: 'allocate' },
      { ...base, type: 'fail', reason: 'insufficient-space' },
      { ...base, type: 'error' },
      { ...base, type: 'fail', reason: 'external-fragmentation' },
    ];
    expect(countFailures(events)).toBe(2);
    const alloc = new ContiguousAllocator();
    expect(computeMetrics(snap(createDisk(4, 100), createDirectory()), alloc, 2).failures).toBe(2);
  });

  it('não altera o snapshot', () => {
    const alloc = new IndexedAllocator();
    const { disk, dir } = setup(alloc, [['A', 250]]);
    const s = snap(disk, dir);
    const copy = structuredClone(s);
    computeMetrics(s, alloc);
    expect(s).toEqual(copy);
  });
});
