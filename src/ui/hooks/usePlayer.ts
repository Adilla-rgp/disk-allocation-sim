import { useCallback, useEffect, useState } from 'react';

/** Velocidades oferecidas no player (multiplicador sobre {@link BASE_INTERVAL_MS}). */
export const SPEEDS = [0.5, 1, 2, 4] as const;

/** Intervalo entre passos na velocidade 1×, em milissegundos. */
const BASE_INTERVAL_MS = 1400;

/** Estado e controles do player de passos. */
export interface Player {
  /** Passo atual, de 0 a `total - 1`. */
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  /** Mostra o disco antes ou depois da operação do passo atual. */
  moment: 'before' | 'after';
  first: () => void;
  prev: () => void;
  next: () => void;
  last: () => void;
  /** Alterna play/pause; no último passo, recomeça do início. */
  toggle: () => void;
  /** Volta ao primeiro passo e começa a tocar. */
  restart: () => void;
  goTo: (index: number) => void;
  setSpeed: (speed: number) => void;
  setMoment: (moment: 'before' | 'after') => void;
}

/**
 * Controla a navegação por `total` passos: passo atual, play/pause com velocidade e o
 * toggle antes/depois. Não sabe nada de alocação; é reaproveitado pela execução e pela
 * comparação (onde um único player move as três técnicas juntas).
 *
 * @param total Quantidade de passos.
 */
export function usePlayer(total: number): Player {
  const [rawIndex, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [moment, setMoment] = useState<'before' | 'after'>('after');

  const lastIndex = Math.max(total - 1, 0);
  const index = Math.min(rawIndex, lastIndex);

  // Avança um passo a cada intervalo enquanto estiver tocando; para no último.
  useEffect(() => {
    if (!playing) return;
    if (index >= lastIndex) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex(index + 1), BASE_INTERVAL_MS / speed);
    return () => clearTimeout(timer);
  }, [playing, index, lastIndex, speed]);

  const clamp = useCallback((i: number) => Math.max(0, Math.min(i, lastIndex)), [lastIndex]);
  const goTo = useCallback((i: number) => setIndex(clamp(i)), [clamp]);
  /** Move relativo ao índice mais recente (cliques rápidos não usam um índice antigo). */
  const step = (delta: number) => setIndex((i) => clamp(Math.min(i, lastIndex) + delta));

  return {
    index,
    total,
    playing,
    speed,
    moment,
    first: () => goTo(0),
    prev: () => step(-1),
    next: () => step(1),
    last: () => goTo(lastIndex),
    toggle: () => {
      if (!playing && index >= lastIndex) setIndex(0);
      setPlaying(!playing);
    },
    restart: () => {
      setIndex(0);
      setPlaying(true);
    },
    goTo,
    setSpeed,
    setMoment,
  };
}
