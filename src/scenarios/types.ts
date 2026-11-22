import type { Scenario } from '../core';

/** Identificador de cada cenário pronto. */
export type ScenarioId = 'fair' | 'fragmentation';

/** Cenário pronto, oferecido na interface e na CLI (`--scenario`). */
export interface ScenarioPreset extends Scenario {
  /** Identificador curto, usado na CLI e na URL de seleção. */
  id: ScenarioId;
}
