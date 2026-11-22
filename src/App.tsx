import { useState } from 'react';
import { initialSetup, validateSetup, type SimSetup } from './ui/config';
import { ComparisonPage } from './ui/pages/ComparisonPage';
import { ConfigPage } from './ui/pages/ConfigPage';
import { ExecutionPage } from './ui/pages/ExecutionPage';

/** Páginas da aplicação (navegação simples por estado, sem roteador). */
type Page = 'config' | 'execution' | 'comparison';

const PAGES: { id: Page; label: string }[] = [
  { id: 'config', label: 'Configuração' },
  { id: 'execution', label: 'Execução' },
  { id: 'comparison', label: 'Comparação' },
];

/**
 * Raiz da aplicação. Guarda a configuração do formulário (para não perdê-la ao trocar de
 * página) e a página atual. A interface apenas consome o core (`src/core`); nenhuma regra
 * de alocação é implementada aqui.
 */
export default function App() {
  const [setup, setSetup] = useState<SimSetup>(initialSetup);
  const [page, setPage] = useState<Page>('config');
  const valid = validateSetup(setup).length === 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo" aria-hidden>
            ▦
          </div>
          <div>
            Simulador de Alocação de Arquivos
            <small>Contígua · Encadeada · Indexada — Sistemas Operacionais I</small>
          </div>
        </div>
        <nav className="tabs">
          {PAGES.map((p) => (
            <button
              key={p.id}
              className={`tab ${page === p.id ? 'active' : ''}`}
              disabled={p.id !== 'config' && !valid}
              onClick={() => setPage(p.id)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </header>

      {page === 'config' && (
        <ConfigPage
          setup={setup}
          onChange={setSetup}
          onRun={() => setPage('execution')}
          onCompare={() => setPage('comparison')}
        />
      )}
      {page === 'execution' && <ExecutionPage setup={setup} />}
      {page === 'comparison' && <ComparisonPage setup={setup} />}
    </div>
  );
}
