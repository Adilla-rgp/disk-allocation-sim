/**
 * Catálogo dos cenários prontos, usado pela interface (seletor de cenário) e pela CLI
 * (`--scenario`).
 */
import { fairScenario } from './fair';
import { fragmentationScenario } from './fragmentation';
import type { ScenarioId, ScenarioPreset } from './types';

export type { ScenarioId, ScenarioPreset } from './types';
export { fairScenario, fragmentationScenario };

/** Todos os cenários prontos, na ordem em que aparecem no seletor. */
export const scenarios: readonly ScenarioPreset[] = [fairScenario, fragmentationScenario];

/**
 * Busca um cenário pronto pelo identificador.
 *
 * @param id Identificador do cenário (`fair` ou `fragmentation`).
 * @returns O cenário, ou `undefined` se não existir.
 */
export function findScenario(id: string): ScenarioPreset | undefined {
  return scenarios.find((s) => s.id === id);
}

/** Indica se `id` é o identificador de um cenário pronto. */
export function isScenarioId(id: string): id is ScenarioId {
  return findScenario(id) !== undefined;
}
