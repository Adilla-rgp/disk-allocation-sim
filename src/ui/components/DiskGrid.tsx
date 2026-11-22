import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { directoryFromEntries, type Allocator, type Block, type Snapshot } from '../../core';
import type { FileColors } from '../format';

/**
 * Marca visual de um bloco no passo atual:
 * - `alloc` / `free`: alocado / liberado pela operação (vista "depois", com animação);
 * - `will-alloc` / `will-free`: será alocado / liberado (vista "antes").
 */
export type BlockMark = 'alloc' | 'free' | 'will-alloc' | 'will-free';

interface DiskGridProps {
  snapshot: Snapshot;
  /** Técnica que gerou o snapshot; usada para seguir a cadeia/índice do arquivo em foco. */
  allocator: Allocator;
  colors: FileColors;
  /** Arquivo em foco (hover aqui, na tabela de diretório ou em outra grade). */
  hovered: string | null;
  onHover: (fileName: string | null) => void;
  marks?: Map<number, BlockMark>;
  /** Muda a cada passo/momento para reiniciar as animações. */
  animKey: string;
  /** Células menores e sem detalhes (página de comparação). */
  compact?: boolean;
}

/** Ponto central de uma célula, relativo à grade. */
interface Point {
  x: number;
  y: number;
}

/**
 * Grade do disco: um quadrado por bloco, com a cor do arquivo dono e o índice do bloco.
 *
 * Ao passar o mouse sobre um arquivo, seus blocos ficam em destaque com a ordem lógica.
 * Na encadeada, setas mostram a cadeia `next`; na indexada, setas saem do bloco de índice
 * (borda tracejada + "i") para cada bloco de dados. A ordem vem de `allocator.blocksOf`,
 * ou seja, do próprio core.
 */
export function DiskGrid({
  snapshot,
  allocator,
  colors,
  hovered,
  onHover,
  marks,
  animKey,
  compact = false,
}: DiskGridProps) {
  const markerId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centers, setCenters] = useState<Point[]>([]);

  /** Blocos do arquivo em foco, na ordem lógica da técnica. */
  const order = useMemo(() => {
    if (!hovered) return [];
    try {
      const disk = { blockSize: snapshot.blockSize, blocks: snapshot.blocks };
      return allocator.blocksOf(disk, directoryFromEntries(snapshot.directory), hovered);
    } catch {
      return []; // o arquivo não existe neste snapshot
    }
  }, [snapshot, allocator, hovered]);

  /** Setas a desenhar: cadeia (encadeada) ou índice -> dados (indexada). */
  const edges = useMemo((): [number, number][] => {
    if (order.length < 2) return [];
    if (allocator.name === 'linked') return order.slice(1).map((b, i) => [order[i], b]);
    if (allocator.name === 'indexed') return order.slice(1).map((b) => [order[0], b]);
    return [];
  }, [order, allocator.name]);

  /** Número exibido em cada bloco do arquivo em foco (posição na cadeia / no índice). */
  const badges = useMemo(() => {
    const map = new Map<number, string>();
    order.forEach((b, i) => {
      if (allocator.name === 'indexed') map.set(b, i === 0 ? 'i' : String(i));
      else map.set(b, String(i + 1));
    });
    return map;
  }, [order, allocator.name]);

  // Mede o centro de cada célula para posicionar as setas (refaz ao redimensionar).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const base = wrap.getBoundingClientRect();
      setCenters(
        cellRefs.current.map((el) => {
          const r = el?.getBoundingClientRect();
          return r
            ? { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }
            : { x: 0, y: 0 };
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [snapshot.blocks.length, compact]);

  const focus = new Set(order);

  return (
    <div
      ref={wrapRef}
      className={`disk-grid ${compact ? 'compact' : ''} ${hovered ? 'has-focus' : ''}`}
      onMouseLeave={() => onHover(null)}
    >
      {snapshot.blocks.map((block) => (
        <BlockCell
          key={`${animKey}-${block.index}`}
          cellRef={(el) => {
            cellRefs.current[block.index] = el;
          }}
          block={block}
          color={block.owner ? colors.get(block.owner) : undefined}
          mark={marks?.get(block.index)}
          focused={focus.has(block.index)}
          badge={badges.get(block.index)}
          compact={compact}
          showNext={allocator.name === 'linked'}
          onHover={onHover}
        />
      ))}
      {edges.length > 0 && centers.length > 0 && (
        <svg className="disk-arrows" aria-hidden>
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>
          {edges.map(([from, to]) => (
            <path
              key={`${from}-${to}`}
              d={arrowPath(
                centers[from],
                centers[to],
                compact ? 9 : 13,
                allocator.name === 'indexed',
              )}
              markerEnd={`url(#${markerId})`}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

/**
 * Caminho SVG de uma seta curva entre os centros de dois blocos, encurtada nas pontas
 * para não cobrir o conteúdo das células.
 */
function arrowPath(p: Point, q: Point, inset: number, fan: boolean): string {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  // No índice, todas as setas saem do mesmo bloco: a curvatura cresce com a distância
  // para abrir um leque em vez de sobrepor as setas.
  const bend = fan ? Math.min(90, dist * 0.32) : Math.min(26, dist * 0.22);
  const sx = p.x + ux * inset;
  const sy = p.y + uy * inset;
  const ex = q.x - ux * inset;
  const ey = q.y - uy * inset;
  const cx = (sx + ex) / 2 - uy * bend;
  const cy = (sy + ey) / 2 + ux * bend;
  return `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`;
}

interface BlockCellProps {
  /** Registra o elemento para medir a posição da célula (setas). */
  cellRef: (el: HTMLDivElement | null) => void;
  block: Block;
  color?: string;
  mark?: BlockMark;
  focused: boolean;
  badge?: string;
  compact: boolean;
  /** Mostra o ponteiro `next` (encadeada). */
  showNext: boolean;
  onHover: (fileName: string | null) => void;
}

/** Um bloco do disco. */
function BlockCell({
  cellRef,
  block,
  color,
  mark,
  focused,
  badge,
  compact,
  showNext,
  onHover,
}: BlockCellProps) {
  const classes = ['blk'];
  if (block.owner) classes.push(block.isIndexBlock ? 'index' : 'used');
  else classes.push('free');
  if (mark) classes.push(`mark-${mark}`);
  if (focused) classes.push('focused');

  return (
    <div
      ref={cellRef}
      className={classes.join(' ')}
      style={color ? ({ '--c': color } as CSSProperties) : undefined}
      title={describeBlock(block)}
      onMouseEnter={() => onHover(block.owner)}
    >
      <span className="blk-index">{block.index}</span>
      {block.owner && <span className="blk-owner">{block.owner.slice(0, 3)}</span>}
      {block.isIndexBlock && <span className="blk-i">i</span>}
      {!compact && showNext && block.owner && (
        <span className="blk-next">{block.next === null ? '⊥' : `→${block.next}`}</span>
      )}
      {badge && <span className="blk-badge">{badge}</span>}
    </div>
  );
}

/** Texto do tooltip de um bloco. */
function describeBlock(block: Block): string {
  if (!block.owner) return `Bloco ${block.index} · livre`;
  if (block.isIndexBlock) {
    return `Bloco ${block.index} · índice de ${block.owner} → ${(block.pointers ?? []).join(', ')}`;
  }
  const next = block.next === null ? '' : ` · próximo → ${block.next}`;
  return `Bloco ${block.index} · dados de ${block.owner}${next}`;
}

/** Legenda dos estilos de bloco. */
export function DiskLegend({ technique }: { technique: Allocator['name'] }) {
  return (
    <div className="legend">
      <span>
        <i className="lg lg-free" /> livre
      </span>
      <span>
        <i className="lg lg-used" /> dados
      </span>
      {technique === 'linked' && (
        <span>
          <i className="lg lg-used" /> →n ponteiro p/ o próximo · ⊥ fim da cadeia
        </span>
      )}
      {technique === 'indexed' && (
        <span>
          <i className="lg lg-index" /> bloco de índice
        </span>
      )}
      <span className="hint">Passe o mouse sobre um arquivo para ver sua ordem.</span>
    </div>
  );
}
