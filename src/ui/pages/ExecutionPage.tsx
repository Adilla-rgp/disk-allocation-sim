import type { SimSetup } from '../config';

/** Página ExecutionPage — a implementar. */
export function ExecutionPage({ setup }: { setup: SimSetup }) {
  return <p className="muted">Em construção ({setup.operations.length} operações).</p>;
}
