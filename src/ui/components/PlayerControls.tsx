import { useEffect, type ReactNode } from 'react';
import { SPEEDS, type Player } from '../hooks/usePlayer';
import { Icon } from './Icon';

interface PlayerControlsProps {
  player: Player;
  /** Descrição da operação do passo atual (ex.: "criar A (2400 bytes)"). */
  caption?: ReactNode;
}

/**
 * Player de passos: início, anterior, play/pause, próximo, reiniciar, velocidade e o
 * indicador "passo i / n". Atalhos: ← e → mudam de passo, espaço toca/pausa.
 */
export function PlayerControls({ player, caption }: PlayerControlsProps) {
  const { index, total, playing } = player;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft') player.prev();
      else if (e.key === 'ArrowRight') player.next();
      else if (e.key === ' ') {
        e.preventDefault();
        player.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  return (
    <div className="player card">
      <div className="player-buttons">
        <button
          className="btn btn-icon"
          title="Início"
          aria-label="Início"
          disabled={index === 0}
          onClick={player.first}
        >
          <Icon name="first" size={16} />
        </button>
        <button
          className="btn btn-icon"
          title="Passo anterior (←)"
          aria-label="Passo anterior"
          disabled={index === 0}
          onClick={player.prev}
        >
          <Icon name="prev" size={16} />
        </button>
        <button
          className="btn btn-primary btn-icon btn-play"
          title="Play/pause (espaço)"
          aria-label={playing ? 'Pausar' : 'Tocar'}
          onClick={player.toggle}
        >
          <Icon name={playing ? 'pause' : 'play'} size={20} />
        </button>
        <button
          className="btn btn-icon"
          title="Próximo passo (→)"
          aria-label="Próximo passo"
          disabled={index >= total - 1}
          onClick={player.next}
        >
          <Icon name="next" size={16} />
        </button>
        <button
          className="btn btn-icon"
          title="Reiniciar"
          aria-label="Reiniciar"
          onClick={player.restart}
        >
          <Icon name="restart" size={17} />
        </button>
      </div>

      <div className="player-status">
        <span className="player-step">
          Passo <strong>{index + 1}</strong> / {total}
        </span>
        {caption && <span className="player-caption">{caption}</span>}
      </div>

      <progress className="player-progress" value={index + 1} max={total} />

      <label className="player-speed">
        <span className="hint">Velocidade</span>
        <select
          className="input"
          value={player.speed}
          onChange={(e) => player.setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {String(s).replace('.', ',')}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Toggle "antes / depois" da operação do passo atual. */
export function MomentToggle({ player }: { player: Player }) {
  return (
    <div className="segmented moment-toggle" role="radiogroup" aria-label="Momento do passo">
      {(['before', 'after'] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={player.moment === m}
          className={player.moment === m ? 'active' : ''}
          onClick={() => player.setMoment(m)}
        >
          {m === 'before' ? 'Antes' : 'Depois'}
        </button>
      ))}
    </div>
  );
}
