import type { SimulationStep } from '../core';
import type { BlockMark } from './components/DiskGrid';

/**
 * Marca os blocos afetados pela operação do passo, a partir dos eventos gerados pelo
 * simulador: na vista "depois", os recém-alocados/liberados (animados); na vista "antes",
 * os que serão alocados/liberados.
 */
export function stepMarks(
  step: SimulationStep,
  moment: 'before' | 'after',
): Map<number, BlockMark> {
  const marks = new Map<number, BlockMark>();
  for (const e of step.events) {
    let mark: BlockMark | null = null;
    if (e.type === 'allocate') mark = moment === 'after' ? 'alloc' : 'will-alloc';
    if (e.type === 'remove') mark = moment === 'after' ? 'free' : 'will-free';
    if (mark) for (const b of e.blocks) marks.set(b, mark);
  }
  return marks;
}
