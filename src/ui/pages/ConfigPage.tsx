import type { FitStrategy, FreeBlockPolicy, Operation, TechniqueName } from '../../core';
import { scenarios, type ScenarioPreset } from '../../scenarios';
import { LIMITS, TECHNIQUE_LABELS, validateSetup, type SimConfig, type SimSetup } from '../config';
import { fileColors } from '../format';

interface ConfigPageProps {
  setup: SimSetup;
  onChange: (setup: SimSetup) => void;
  /** Abre a página de execução passo a passo. */
  onRun: () => void;
  /** Abre a página de comparação das três técnicas. */
  onCompare: () => void;
}

const TECHNIQUES: TechniqueName[] = ['contiguous', 'linked', 'indexed'];
const STRATEGIES: FitStrategy[] = ['first-fit', 'best-fit', 'worst-fit'];
const POLICIES: { value: FreeBlockPolicy; label: string }[] = [
  { value: 'first-free', label: 'first-free (menor índice)' },
  { value: 'random', label: 'random (sorteio com semente)' },
];

/**
 * Página de configuração: Painel de Controle (técnica e parâmetros do disco) e Painel de
 * Operações (cenário pronto ou roteiro editável).
 */
export function ConfigPage({ setup, onChange, onRun, onCompare }: ConfigPageProps) {
  const errors = validateSetup(setup);
  const valid = errors.length === 0;

  return (
    <div>
      <div className="config-page">
        <ControlPanel config={setup.config} onChange={(config) => onChange({ ...setup, config })} />
        <OperationsPanel setup={setup} onChange={onChange} />
      </div>

      {!valid && (
        <ul className="errors" style={{ marginTop: 14 }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button className="btn" disabled={!valid} onClick={onCompare}>
          ⚖ Comparar técnicas
        </button>
        <button className="btn btn-primary" disabled={!valid} onClick={onRun}>
          ▶ Executar
        </button>
      </div>
    </div>
  );
}

/** Campo numérico controlado; um campo vazio vira `NaN` e é apontado pela validação. */
function NumberField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        className="input"
        type="number"
        min={props.min}
        max={props.max}
        disabled={props.disabled}
        value={Number.isNaN(props.value) ? '' : props.value}
        onChange={(e) => props.onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      />
      {props.hint && <small className="hint">{props.hint}</small>}
    </label>
  );
}

/** Painel de Controle: técnica, estratégia/política, semente e dimensões do disco. */
function ControlPanel({
  config,
  onChange,
}: {
  config: SimConfig;
  onChange: (c: SimConfig) => void;
}) {
  const set = <K extends keyof SimConfig>(key: K, value: SimConfig[K]) =>
    onChange({ ...config, [key]: value });
  const usesPointers = config.technique !== 'contiguous';

  return (
    <section className="card">
      <h2 className="card-title">
        <span className="dot" /> Painel de Controle
      </h2>
      <div className="control-grid">
        <div className="field full">
          <span>Técnica (modo execução)</span>
          <div className="segmented" role="radiogroup">
            {TECHNIQUES.map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={config.technique === t}
                className={config.technique === t ? 'active' : ''}
                onClick={() => set('technique', t)}
              >
                {TECHNIQUE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <label className="field full">
          <span>Estratégia da contígua</span>
          <select
            className="input"
            value={config.strategy}
            onChange={(e) => set('strategy', e.target.value as FitStrategy)}
          >
            {STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Política de blocos livres</span>
          <select
            className="input"
            value={config.freeBlockPolicy}
            onChange={(e) => set('freeBlockPolicy', e.target.value as FreeBlockPolicy)}
          >
            {POLICIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <NumberField
          label="Semente (seed)"
          value={config.seed}
          disabled={config.freeBlockPolicy !== 'random'}
          onChange={(v) => set('seed', v)}
        />
        <p className="hint full" style={{ margin: 0 }}>
          A estratégia vale para a contígua; política e semente, para encadeada e indexada. Na
          comparação, cada técnica usa o que lhe diz respeito.
        </p>

        <div className="section-label">Disco</div>
        <NumberField
          label="Nº de blocos"
          value={config.diskSize}
          min={1}
          max={LIMITS.maxDiskSize}
          onChange={(v) => set('diskSize', v)}
        />
        <NumberField
          label="Tamanho do bloco (bytes)"
          value={config.blockSize}
          min={1}
          onChange={(v) => set('blockSize', v)}
        />
        <NumberField
          label="Tamanho do ponteiro (bytes)"
          value={config.pointerSize}
          min={1}
          hint={usesPointers ? undefined : 'Não usado pela contígua.'}
          onChange={(v) => set('pointerSize', v)}
        />
      </div>
    </section>
  );
}

/** Painel de Operações: seletor de cenário pronto + roteiro editável. */
function OperationsPanel({
  setup,
  onChange,
}: {
  setup: SimSetup;
  onChange: (s: SimSetup) => void;
}) {
  const { operations } = setup;
  const colors = fileColors(operations);
  const createdNames = [
    ...new Set(operations.filter((o) => o.type === 'create').map((o) => o.fileName)),
  ];

  /** Carrega um cenário pronto: roteiro e dimensões do disco. */
  const loadPreset = (preset: ScenarioPreset) =>
    onChange({
      scenarioId: preset.id,
      operations: preset.operations.map((op) => ({ ...op })),
      config: { ...setup.config, diskSize: preset.diskSize, blockSize: preset.blockSize },
    });

  /** Qualquer edição no roteiro o transforma em cenário personalizado. */
  const setOps = (ops: Operation[]) =>
    onChange({ ...setup, operations: ops, scenarioId: 'custom' });

  const updateOp = (i: number, op: Operation) =>
    setOps(operations.map((o, j) => (j === i ? op : o)));

  const changeType = (i: number, type: Operation['type']) => {
    const { fileName } = operations[i];
    updateOp(i, type === 'create' ? { type, fileName, sizeInBytes: 1000 } : { type, fileName });
  };

  /** Sugere a próxima letra livre como nome de arquivo. */
  const nextName = () => {
    for (let c = 65; c <= 90; c++) {
      const name = String.fromCharCode(c);
      if (!createdNames.includes(name)) return name;
    }
    return `F${operations.length + 1}`;
  };

  return (
    <section className="card">
      <h2 className="card-title">
        <span className="dot" /> Painel de Operações
      </h2>

      <div className="scenario-picker">
        {scenarios.map((s) => (
          <button
            key={s.id}
            className={`scenario-option ${setup.scenarioId === s.id ? 'active' : ''}`}
            onClick={() => loadPreset(s)}
          >
            <strong>{s.name}</strong>
            <span className="hint">{s.description}</span>
          </button>
        ))}
      </div>
      {setup.scenarioId === 'custom' && (
        <p className="hint" style={{ marginTop: -6 }}>
          Roteiro personalizado (editado a partir de um cenário).
        </p>
      )}

      <div className="ops-scroll">
        <table className="ops-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Operação</th>
              <th>Arquivo</th>
              <th>Tamanho (bytes)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {operations.map((op, i) => (
              <tr key={i}>
                <td className="op-index">{i + 1}</td>
                <td style={{ width: 130 }}>
                  <select
                    className="input"
                    value={op.type}
                    onChange={(e) => changeType(i, e.target.value as Operation['type'])}
                  >
                    <option value="create">criar</option>
                    <option value="remove">remover</option>
                  </select>
                </td>
                <td>
                  <span className="op-swatch" style={{ background: colors.get(op.fileName) }} />
                  <input
                    className="input"
                    style={{ width: 'calc(100% - 16px)' }}
                    value={op.fileName}
                    list={op.type === 'remove' ? 'created-files' : undefined}
                    onChange={(e) => updateOp(i, { ...op, fileName: e.target.value })}
                  />
                </td>
                <td style={{ width: 170 }}>
                  {op.type === 'create' ? (
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={Number.isNaN(op.sizeInBytes) ? '' : op.sizeInBytes}
                      onChange={(e) =>
                        updateOp(i, {
                          ...op,
                          sizeInBytes: e.target.value === '' ? NaN : Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <span className="hint">—</span>
                  )}
                </td>
                <td style={{ width: 44 }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    title="Remover linha"
                    aria-label={`Remover operação ${i + 1}`}
                    onClick={() => setOps(operations.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="created-files">
        {createdNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="ops-footer">
        <button
          className="btn"
          onClick={() =>
            setOps([...operations, { type: 'create', fileName: nextName(), sizeInBytes: 1000 }])
          }
        >
          + Criar arquivo
        </button>
        <button
          className="btn"
          disabled={createdNames.length === 0}
          onClick={() =>
            setOps([...operations, { type: 'remove', fileName: createdNames[0] ?? '' }])
          }
        >
          + Remover arquivo
        </button>
      </div>
    </section>
  );
}
