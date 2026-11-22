import { describe, expect, it } from 'vitest';
import {
  computeMetrics,
  ContiguousAllocator,
  createDirectory,
  createDisk,
  IndexedAllocator,
  LinkedAllocator,
  listEntries,
  runComparison,
  runScenario,
  type Allocator,
  type Scenario,
} from '../../src/core';
import { fairScenario, fragmentationScenario, scenarios } from '../../src/scenarios';

/** Métricas de um disco de 10 blocos de 100 bytes com um único arquivo. */
function metricsFor(alloc: Allocator, size: number, requested?: number) {
  const disk = createDisk(10, 100);
  const dir = createDirectory();
  if (!alloc.allocate(disk, dir, 'A', size).success) throw new Error('setup');
  const snapshot = {
    step: 0,
    moment: 'after' as const,
    blockSize: 100,
    blocks: disk.blocks,
    directory: listEntries(dir),
  };
  return computeMetrics(snapshot, alloc, 0, requested);
}

describe('Métricas de bytes e eficiência', () => {
  it('contígua: alocados = blocos × tamanho, sem overhead', () => {
    const m = metricsFor(new ContiguousAllocator(), 250);
    expect(m).toMatchObject({
      requestedBytes: 250,
      storedBytes: 250,
      allocatedBytes: 300,
      overheadBytes: 0,
    });
    expect(m.efficiencyPercent).toBeCloseTo((250 / 300) * 100);
  });

  it('encadeada: overhead total são os bytes de ponteiro', () => {
    // 200 bytes / 96 por bloco = 3 blocos, 3 ponteiros de 4 bytes
    const m = metricsFor(new LinkedAllocator({ pointerSize: 4 }), 200);
    expect(m).toMatchObject({ storedBytes: 200, allocatedBytes: 300, overheadBytes: 12 });
    expect(m.efficiencyPercent).toBeCloseTo((200 / 300) * 100);
  });

  it('indexada: overhead total inclui o bloco de índice inteiro', () => {
    const m = metricsFor(new IndexedAllocator(), 250);
    expect(m).toMatchObject({ storedBytes: 250, allocatedBytes: 400, overheadBytes: 100 });
    expect(m.efficiencyPercent).toBeCloseTo(62.5);
  });

  it('bytes solicitados podem ser informados à parte (pedidos que falharam)', () => {
    expect(metricsFor(new ContiguousAllocator(), 250, 900).requestedBytes).toBe(900);
  });
});

describe('Bytes solicitados no simulador', () => {
  const scenario: Scenario = {
    name: 'teste',
    description: '',
    diskSize: 8,
    blockSize: 100,
    operations: [
      { type: 'create', fileName: 'A', sizeInBytes: 250 },
      { type: 'create', fileName: 'A', sizeInBytes: 50 },
      { type: 'create', fileName: 'X', sizeInBytes: 0 },
      { type: 'create', fileName: 'B', sizeInBytes: 100 },
      { type: 'remove', fileName: 'A' },
      { type: 'create', fileName: 'C', sizeInBytes: 10_000 },
      { type: 'remove', fileName: 'Z' },
    ],
  };

  it('contam falhas por espaço, ignoram nome duplicado/tamanho inválido e saem na remoção', () => {
    const { steps, finalMetrics } = runScenario(scenario, new ContiguousAllocator());
    expect(steps.map((s) => s.metrics.requestedBytes)).toEqual([
      250, 250, 250, 350, 100, 10_100, 10_100,
    ]);
    expect(finalMetrics).toMatchObject({ requestedBytes: 10_100, storedBytes: 100 });
  });
});

describe('Cenários prontos', () => {
  it('catálogo tem ids únicos, nome e descrição', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['fair', 'fragmentation']);
    for (const s of scenarios) {
      expect(s.name).not.toBe('');
      expect(s.description).not.toBe('');
    }
  });

  it('fair: nenhuma técnica falha e tudo o que foi pedido é armazenado', () => {
    for (const r of runComparison(fairScenario)) {
      expect(r.finalMetrics.failures).toBe(0);
      expect(r.events.some((e) => e.type === 'error')).toBe(false);
      expect(r.finalMetrics.storedBytes).toBe(r.finalMetrics.requestedBytes);
    }
  });

  it('fair: as remoções espalham os blocos na encadeada (cadeia não consecutiva)', () => {
    const linked = runScenario(fairScenario, new LinkedAllocator());
    const scattered = linked.events
      .filter((e) => e.type === 'allocate')
      .some((e) => e.blocks.some((b, i) => i > 0 && b !== e.blocks[i - 1] + 1));
    expect(scattered).toBe(true);
  });

  it('fair: eficiência contígua ≥ encadeada ≥ indexada', () => {
    const [contiguous, linked, indexed] = runComparison(fairScenario).map(
      (r) => r.finalMetrics.efficiencyPercent,
    );
    expect(contiguous).toBeGreaterThanOrEqual(linked);
    expect(linked).toBeGreaterThanOrEqual(indexed);
    expect(contiguous).toBeGreaterThan(indexed);
  });

  it('fragmentation: a contígua armazena menos do que foi solicitado', () => {
    const [contiguous, linked] = runComparison(fragmentationScenario);
    expect(contiguous.finalMetrics).toMatchObject({ storedBytes: 8700, requestedBytes: 12_700 });
    expect(linked.finalMetrics).toMatchObject({ storedBytes: 12_700, requestedBytes: 12_700 });
  });
});
