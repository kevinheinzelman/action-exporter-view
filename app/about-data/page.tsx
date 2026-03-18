'use client';

import { useEffect, useState } from 'react';
import { fetchPublicJson, formatPct } from '../../lib/data';

export default function AboutDataPage() {
  const [data, setData] = useState<{
    generatedAt: string | null;
    sports: Array<Record<string, any>>;
    byMarket: Array<Record<string, any>>;
  }>({
    generatedAt: null,
    sports: [],
    byMarket: []
  });

  useEffect(() => {
    fetchPublicJson('/data/metadata.json', {
      generatedAt: null,
      sports: [] as Array<Record<string, any>>,
      byMarket: [] as Array<Record<string, any>>
    }).then(setData);
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <h2>About The Data</h2>
        <p className="subtle">Coverage, freshness, and grading/closing-line completeness from the exported datasets.</p>
        <div className="metrics">
          <div className="metric">
            <label>Generated</label>
            <strong>{data.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Loaded Date Range By Sport</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sport</th>
                <th>Earliest</th>
                <th>Latest</th>
                <th>Rows</th>
              </tr>
            </thead>
            <tbody>
              {data.sports.map((row) => (
                <tr key={String(row.sport)}>
                  <td>{row.sport}</td>
                  <td>{row.earliestLoadedDate ?? 'N/A'}</td>
                  <td>{row.latestLoadedDate ?? 'N/A'}</td>
                  <td>{row.rowCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Coverage By Market</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>Rows</th>
                <th>Graded %</th>
                <th>Closing Line %</th>
              </tr>
            </thead>
            <tbody>
              {data.byMarket.map((row) => (
                <tr key={String(row.market)}>
                  <td>{row.market}</td>
                  <td>{row.rowCount}</td>
                  <td>{formatPct(row.gradedPercent)}</td>
                  <td>{formatPct(row.closingLinePercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
