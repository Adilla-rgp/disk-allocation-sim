import { findHoles, type FileEntry, type Snapshot, type TechniqueName } from '../../core';
import { fmtBytes, type FileColors } from '../format';

interface DirectoryTableProps {
  snapshot: Snapshot;
  technique: TechniqueName;
  colors: FileColors;
  hovered: string | null;
  onHover: (fileName: string | null) => void;
}

/** Colunas de metadados de cada técnica (cabeçalho e valor). */
const COLUMNS: Record<TechniqueName, { label: string; value: (e: FileEntry) => number }[]> = {
  contiguous: [
    { label: 'Início', value: (e) => (e.technique === 'contiguous' ? e.start : NaN) },
    { label: 'Tamanho', value: (e) => e.length },
  ],
  linked: [
    { label: 'Início', value: (e) => (e.technique === 'linked' ? e.start : NaN) },
    { label: 'Fim', value: (e) => (e.technique === 'linked' ? e.end : NaN) },
    { label: 'Blocos', value: (e) => e.length },
  ],
  indexed: [
    { label: 'Índice', value: (e) => (e.technique === 'indexed' ? e.indexBlock : NaN) },
    { label: 'Dados', value: (e) => e.length },
  ],
};

/**
 * Diretório do snapshot atual, com as colunas de metadados da técnica
 * (start/length, start/end ou indexBlock), seguido da lista de buracos livres.
 */
export function DirectoryTable({
  snapshot,
  technique,
  colors,
  hovered,
  onHover,
}: DirectoryTableProps) {
  const columns = COLUMNS[technique];
  const holes = findHoles({ blockSize: snapshot.blockSize, blocks: snapshot.blocks });

  return (
    <div className="directory">
      <table className="data-table" onMouseLeave={() => onHover(null)}>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th className="num">Bytes</th>
            {columns.map((c) => (
              <th key={c.label} className="num">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snapshot.directory.length === 0 && (
            <tr>
              <td colSpan={2 + columns.length} className="hint">
                Diretório vazio.
              </td>
            </tr>
          )}
          {snapshot.directory.map((e) => (
            <tr
              key={e.name}
              className={hovered === e.name ? 'row-focus' : ''}
              onMouseEnter={() => onHover(e.name)}
            >
              <td>
                <span className="op-swatch" style={{ background: colors.get(e.name) }} />
                {e.name}
              </td>
              <td className="num">{fmtBytes(e.sizeInBytes)}</td>
              {columns.map((c) => (
                <td key={c.label} className="num mono">
                  {c.value(e)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="subhead">Buracos livres ({holes.length})</h3>
      {holes.length === 0 ? (
        <p className="hint">Disco cheio.</p>
      ) : (
        <ul className="holes">
          {holes.map((h) => (
            <li key={h.start}>
              <span className="mono">
                {h.start}
                {h.length > 1 ? `–${h.start + h.length - 1}` : ''}
              </span>
              <span className="hole-bar" style={{ width: `${Math.min(h.length * 6, 100)}%` }} />
              <span className="muted">
                {h.length} {h.length === 1 ? 'bloco' : 'blocos'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
