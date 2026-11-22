import { useEffect, useRef } from 'react';
import type { SimulationEvent } from '../../core';
import { EVENT_LABELS } from '../format';

interface EventLogProps {
  events: SimulationEvent[];
  /** Passo atual (numerado a partir de 1, como em `SimulationEvent.step`). */
  currentStep: number;
  /** Clique em um evento: pula para o passo dele. */
  onSelect: (step: number) => void;
}

/**
 * Linha do tempo de eventos, no estilo da timeline do SOPlay: um chip colorido por tipo
 * (alocado, removido, falha, erro). Eventos de passos futuros ficam esmaecidos e o passo
 * atual fica em destaque e sempre visível.
 */
export function EventLog({ events, currentStep, onSelect }: EventLogProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // Rola só a lista (não a página) para manter o evento atual à vista.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('.current');
    if (!list || !item) return;
    const box = list.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) {
      list.scrollTop += r.top - box.top - box.height / 2 + r.height / 2;
    }
  }, [currentStep]);

  return (
    <ol ref={listRef} className="timeline">
      {events.map((e, i) => {
        const state = e.step === currentStep ? 'current' : e.step > currentStep ? 'future' : 'past';
        return (
          <li key={i} className={`tl-item ${state}`}>
            <button onClick={() => onSelect(e.step)} title={`Ir para o passo ${e.step}`}>
              <span className="tl-step">{e.step}</span>
              <span className="tl-body">
                <span className={`chip chip-${e.type}`}>{EVENT_LABELS[e.type]}</span>
                <span className="tl-msg">{e.message}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
