'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson, formatPct } from '../../../lib/data';
import type { MlbGlossaryPayload } from '../../../lib/mlb';

const EMPTY_GLOSSARY: MlbGlossaryPayload = {
  generatedAt: null,
  rowCount: 0,
  rows: []
};

export default function MlbSignalsPage() {
  const [data, setData] = useState<MlbGlossaryPayload>(EMPTY_GLOSSARY);
  const [familyFilter, setFamilyFilter] = useState('all');
  const [dependencyFilter, setDependencyFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPublicJson('/data/mlb_signal_glossary.json', EMPTY_GLOSSARY).then(setData);
  }, []);

  const rows = data.rows ?? [];
  const families = useMemo(() => ['all', ...Array.from(new Set(rows.map((row) => row.signalFamily))).sort()], [rows]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (familyFilter !== 'all' && row.signalFamily !== familyFilter) return false;
        if (dependencyFilter === 'action_only' && !row.actionDependencyFlag) return false;
        if (dependencyFilter === 'non_action' && row.actionDependencyFlag) return false;
        if (search.trim()) {
          const haystack = `${row.humanReadableLabel} ${row.signalFamily} ${row.plainEnglishDescription}`.toLowerCase();
          if (!haystack.includes(search.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [dependencyFilter, familyFilter, rows, search]
  );

  return (
    <main className="page">
      <section className="hero">
        <h2>MLB Signal Glossary</h2>
        <p className="subtle">
          Plain-English signal key for the governed MLB signal system, with visibility into family, Action dependency, and historical sample/ROI.
        </p>
        <div className="metrics">
          <div className="metric">
            <label>Signals</label>
            <strong>{data.rowCount}</strong>
          </div>
          <div className="metric">
            <label>Visible</label>
            <strong>{filteredRows.length}</strong>
          </div>
          <div className="metric">
            <label>Generated</label>
            <strong>{data.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="controls">
          <div className="control">
            <label>Family</label>
            <select value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)}>
              {families.map((family) => (
                <option key={family} value={family}>
                  {family === 'all' ? 'All families' : titleize(family)}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>Dependency</label>
            <select value={dependencyFilter} onChange={(event) => setDependencyFilter(event.target.value)}>
              <option value="all">All signals</option>
              <option value="action_only">Action-dependent only</option>
              <option value="non_action">Non-Action only</option>
            </select>
          </div>

          <div className="control">
            <label>Search</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search label or description" />
          </div>
        </div>
      </section>

      <section className="panel table-wrap">
        <h3>Signal Key</h3>
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Family</th>
              <th>Meaning</th>
              <th>Dependency</th>
              <th>States</th>
              <th>Universes</th>
              <th>Sample</th>
              <th>ROI</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.signalId}>
                <td>
                  <strong>{row.humanReadableLabel}</strong>
                  <div className="subtle">{row.signalName}</div>
                </td>
                <td>{titleize(row.signalFamily)}</td>
                <td>{row.plainEnglishDescription}</td>
                <td>{row.actionDependencyFlag ? 'Action-limited' : 'Independent'}</td>
                <td>{row.governanceStates.join(', ') || 'N/A'}</td>
                <td>{row.universes.join(', ') || 'N/A'}</td>
                <td>{row.sampleSize}</td>
                <td>{typeof row.roi === 'number' ? formatPct(row.roi) : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredRows.length ? <p className="subtle">No glossary rows match the current filters.</p> : null}
      </section>
    </main>
  );
}

function titleize(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ');
}
