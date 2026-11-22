import type { SimSetup } from '../config';

/** Página ComparisonPage — a implementar. */
export function ComparisonPage({ setup }: { setup: SimSetup }) {
  return <p className="muted">Em construção ({setup.operations.length} operações).</p>;
}
