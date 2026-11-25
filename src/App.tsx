import { useState } from 'react';
import { Logo } from './ui/components/Icon';
import { initialSetup, validateSetup, type SimSetup } from './ui/config';
import { CREDITS } from './ui/credits';
import { ComparisonPage } from './ui/pages/ComparisonPage';
import { ConfigPage } from './ui/pages/ConfigPage';
import { ExecutionPage } from './ui/pages/ExecutionPage';

/** Páginas da aplicação (navegação simples por estado, sem roteador). */
type Page = 'config' | 'execution' | 'comparison';

const PAGES: { id: Page; label: string }[] = [
  { id: 'config', label: '1 · Montar' },
  { id: 'execution', label: '2 · Executar' },
  { id: 'comparison', label: '3 · Comparar' },
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
          <Logo />
          <div>
            <h1>
              Blocos <em>&amp;</em> Arquivos
            </h1>
            <small>Um simulador de alocação contígua, encadeada e indexada</small>
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

      <footer className="footer">
        <span>
          Trabalho final de {CREDITS.course} · {CREDITS.institution}
          {CREDITS.team.length > 0 && <> · feito por {joinNames(CREDITS.team)}</>}
        </span>
        <span className="footer-tip">Dica: use ← → e espaço para navegar pelos passos.</span>
      </footer>
    </div>
  );
}

/** "Ana", "Ana e Bia", "Ana, Bia e Caio". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
