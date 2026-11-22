import type { TechniqueName } from '../../core';

/** Posição x da célula `i` no rascunho (8 células de 9 px com 2 px de espaço). */
const x = (i: number) => 1 + i * 11;

/**
 * Rascunho em miniatura de cada técnica, usado nos cartões de escolha da ConfigPage:
 * - contígua: um arquivo em blocos lado a lado;
 * - encadeada: blocos espalhados ligados por arcos;
 * - indexada: um bloco de índice tracejado apontando para os blocos de dados.
 */
export function TechniqueSketch({ technique }: { technique: TechniqueName }) {
  const used: Record<TechniqueName, number[]> = {
    contiguous: [1, 2, 3, 4],
    linked: [0, 3, 4, 7],
    indexed: [2, 5, 7],
  };
  const filled = new Set(used[technique]);
  const index = technique === 'indexed' ? 0 : null;

  return (
    <svg className="mini-disk" width="90" height="30" viewBox="0 0 90 30" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={x(i)}
          y={17}
          width={9}
          height={9}
          rx={2}
          fill={filled.has(i) ? 'var(--accent)' : 'none'}
          stroke={i === index ? 'var(--accent)' : filled.has(i) ? 'none' : 'var(--border)'}
          strokeDasharray={i === index ? '2 1.5' : undefined}
          strokeWidth={1.2}
        />
      ))}
      {technique === 'linked' &&
        [
          [0, 3],
          [3, 4],
          [4, 7],
        ].map(([a, b]) => <Arc key={a} from={a} to={b} />)}
      {technique === 'indexed' && used.indexed.map((b) => <Arc key={b} from={0} to={b} />)}
    </svg>
  );
}

/** Arco por cima das células `from` -> `to`. */
function Arc({ from, to }: { from: number; to: number }) {
  const sx = x(from) + 4.5;
  const ex = x(to) + 4.5;
  const height = 4 + (to - from) * 1.6;
  return (
    <path
      d={`M${sx},15 Q${(sx + ex) / 2},${15 - height * 1.6} ${ex},15`}
      fill="none"
      stroke="var(--accent-2)"
      strokeWidth={1.2}
      strokeLinecap="round"
    />
  );
}
