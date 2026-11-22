import { describe, expect, it } from 'vitest';
import {
  ContiguousAllocator,
  createAllocator,
  createDirectory,
  createDisk,
  IndexedAllocator,
  LinkedAllocator,
  runComparison,
  runScenario,
  takeSnapshot,
  TECHNIQUES,
  type Scenario,
} from '../../src/core';
import { defaultScenario } from '../../src/scenarios/default';

const small: Scenario = {
  name: 'pequeno',
  description: '',
  diskSize: 8,
  blockSize: 100,
  operations: [
    { type: 'create', fileName: 'A', sizeInBytes: 250 },
    { type: 'create', fileName: 'B', sizeInBytes: 100 },
    { type: 'remove', fileName: 'A' },
    { type: 'remove', fileName: 'Z' },
    { type: 'create', fileName: 'C', sizeInBytes: 10_000 },
  ],
};

describe('Simulador', () => {
  describe('snapshots', () => {
    it('takeSnapshot é uma cópia profunda, independente do disco vivo', () => {
      const disk = createDisk(8, 100);
      const dir = createDirectory();
      const alloc = new IndexedAllocator();
      alloc.allocate(disk, dir, 'A', 250);
      const s = takeSnapshot(disk, dir, 1, 'after');
      alloc.remove(disk, dir, 'A');
      disk.blocks[5].owner = 'X';
      expect(s.blocks[0]).toMatchObject({ owner: 'A', isIndexBlock: true, pointers: [1, 2, 3] });
      expect(s.blocks[5].owner).toBeNull();
      expect(s.directory.map((e) => e.name)).toEqual(['A']);
    });

    it('cada passo tem snapshots antes/depois distintos e sem referências compartilhadas', () => {
      const { steps } = runScenario(small, new ContiguousAllocator());
      expect(steps[0].before.blocks.every((b) => b.owner === null)).toBe(true);
      expect(steps[0].after.blocks.slice(0, 3).every((b) => b.owner === 'A')).toBe(true);
      expect(steps[1].before).toMatchObject({ step: 2, moment: 'before' });
      expect(steps[1].before.blocks).toEqual(steps[0].after.blocks);
      expect(steps[1].before.blocks).not.toBe(steps[0].after.blocks);
      steps[0].after.blocks[0].owner = 'mexido';
      expect(steps[1].before.blocks[0].owner).toBe('A');
    });

    it('um passo que falha tem o mesmo disco antes e depois', () => {
      const { steps } = runScenario(small, new ContiguousAllocator());
      expect(steps[4].result.success).toBe(false);
      expect(steps[4].after.blocks).toEqual(steps[4].before.blocks);
    });
  });

  describe('eventos', () => {
    it('gera mensagens em português para alocação e remoção', () => {
      const { events } = runScenario(small, new ContiguousAllocator());
      expect(events[0]).toMatchObject({
        step: 1,
        type: 'allocate',
        fileName: 'A',
        blocks: [0, 1, 2],
      });
      expect(events[0].message).toBe('A alocado nos blocos 0, 1, 2');
      expect(events[2].message).toBe('A removido; blocos 0, 1, 2 liberados');
    });

    it('indica o bloco de índice na indexada', () => {
      const { events } = runScenario(small, new IndexedAllocator());
      expect(events[0].message).toBe('A alocado nos blocos 0, 1, 2, 3 (índice no bloco 0)');
    });

    it('remover arquivo inexistente vira evento de erro, sem lançar e sem contar como falha', () => {
      const { steps } = runScenario(small, new LinkedAllocator());
      expect(steps[3].result).toMatchObject({ success: false, reason: 'not-found' });
      expect(steps[3].events[0]).toMatchObject({ type: 'error', fileName: 'Z' });
      expect(steps[3].events[0].message).toContain('não existe');
      expect(steps[3].metrics.failures).toBe(0);
    });

    it('falhas são acumuladas nas métricas de cada passo', () => {
      const { steps, finalMetrics } = runScenario(small, new LinkedAllocator());
      expect(steps.map((s) => s.metrics.failures)).toEqual([0, 0, 0, 0, 1]);
      expect(steps[4].events[0].message).toBe(
        'C falhou (espaço insuficiente): precisa de 105 blocos; 6 blocos livres, maior buraco = 3',
      );
      expect(finalMetrics.failures).toBe(1);
    });
  });

  describe('cenário padrão', () => {
    it('só a contígua falha em F, por fragmentação externa', () => {
      const results = runComparison(defaultScenario);
      expect(results.map((r) => r.technique)).toEqual(TECHNIQUES);
      for (const r of results) {
        const failures = r.events.filter((e) => e.type === 'fail');
        if (r.technique === 'contiguous') {
          expect(failures).toHaveLength(1);
          expect(failures[0]).toMatchObject({ fileName: 'F', reason: 'external-fragmentation' });
          expect(failures[0].message).toBe(
            'F falhou (fragmentação externa): precisa de 8 blocos; 14 blocos livres, maior buraco = 7',
          );
        } else {
          expect(failures).toEqual([]);
          expect(r.finalSnapshot.directory.map((e) => e.name)).toContain('F');
        }
        expect(r.events.some((e) => e.type === 'error')).toBe(false);
      }
    });

    it.each(TECHNIQUES)('com a política random, %s é determinística', (technique) => {
      const options = { freeBlockPolicy: 'random' as const, seed: 2026 };
      const a = runScenario(defaultScenario, createAllocator(technique, options));
      const b = runScenario(defaultScenario, createAllocator(technique, options));
      expect(a.finalSnapshot).toEqual(b.finalSnapshot);
      expect(a.events).toEqual(b.events);
    });
  });
});
