'use client';

import { useEffect, useState } from 'react';
import { fetchPublicJson } from '../../lib/data';

export default function GamesPage() {
  const [data, setData] = useState<{
    generatedAt: string | null;
    rowCount: number;
    latestPregameRows: Array<Record<string, any>>;
  }>({
    generatedAt: null,
    rowCount: 0,
    latestPregameRows: []
  });

  useEffect(() => {
    fetchPublicJson('/data/evaluation_rows.json', {
      generatedAt: null,
      rowCount: 0,
      latestPregameRows: [] as Array<Record<string, any>>
    }).then(setData);
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <h2>All Games</h2>
        <p className="subtle">Latest pregame rows are shown by default to keep one row per game market.</p>
        <div className="metrics">
          <div className="metric">
            <label>Rows</label>
            <strong>{data.latestPregameRows.length}</strong>
          </div>
          <div className="metric">
            <label>Total Exported Rows</label>
            <strong>{data.rowCount}</strong>
          </div>
        </div>
      </section>

      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>League</th>
              <th>Game</th>
              <th>Market</th>
              <th>Sharp</th>
              <th>Picks</th>
              <th>Result</th>
              <th>Pulled</th>
            </tr>
          </thead>
          <tbody>
            {data.latestPregameRows.map((row) => (
              <tr key={String(row.evaluationKey)}>
                <td>{row.gameDate ?? 'N/A'}</td>
                <td>{String(row.leagueSlug ?? '').toUpperCase()}</td>
                <td>{row.awayTeam ?? 'Away'} at {row.homeTeam ?? 'Home'}</td>
                <td>{row.market}</td>
                <td>{row.sharpMajoritySide ?? 'none'}</td>
                <td>{row.pickMajoritySide ?? 'none'}</td>
                <td>
                  {row.market === 'total'
                    ? `${row.overResult ?? 'unknown'} / ${row.underResult ?? 'unknown'}`
                    : `${row.awayResult ?? 'unknown'} / ${row.homeResult ?? 'unknown'}`}
                </td>
                <td>{row.pulledAt ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
