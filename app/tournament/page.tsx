'use client';

import { useEffect, useState } from 'react';
import { fetchPublicJson, formatPct } from '../../lib/data';

export default function TournamentPage() {
  const [data, setData] = useState<{
    generatedAt: string | null;
    overall: Array<Record<string, any>>;
    byRound: Array<Record<string, any>>;
    byMarket: Array<Record<string, any>>;
  }>({
    generatedAt: null,
    overall: [],
    byRound: [],
    byMarket: []
  });

  useEffect(() => {
    fetchPublicJson('/data/ncaa_tournament_summary.json', {
      generatedAt: null,
      overall: [] as Array<Record<string, any>>,
      byRound: [] as Array<Record<string, any>>,
      byMarket: [] as Array<Record<string, any>>
    }).then(setData);
  }, []);

  const topRows = data.overall
    .filter((row) => row.signalType === 'sharp' || row.signalType === 'picks' || row.signalType === 'agreement')
    .filter((row) => row.sport === 'all' && row.market === 'all');

  return (
    <main className="page">
      <section className="hero">
        <h2>NCAA Tournament</h2>
        <p className="subtle">What seems to matter in tournament games, using the same simple signal groups.</p>
        <div className="metrics">
          <div className="metric">
            <label>Signal Groups</label>
            <strong>{topRows.length}</strong>
          </div>
          <div className="metric">
            <label>Generated</label>
            <strong>{data.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel table-wrap">
        <h3>Sharps vs Picks</h3>
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Sample</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Pushes</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {topRows.map((row) => (
              <tr key={String(row.cohortKey)}>
                <td>{row.cohortLabel}</td>
                <td>{row.sampleSize}</td>
                <td className="good">{row.wins}</td>
                <td className="bad">{row.losses}</td>
                <td>{row.pushes}</td>
                <td>{formatPct(row.winPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel table-wrap">
        <h3>By Round</h3>
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>Signal</th>
              <th>Market</th>
              <th>Sample</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {data.byRound.flatMap((entry) =>
              (entry.cohorts as Array<Record<string, any>>)
                .filter((row) => row.signalType === 'sharp' || row.signalType === 'picks' || row.signalType === 'agreement')
                .filter((row) => row.sport === 'all' && row.market !== 'all')
                .map((row) => (
                  <tr key={`${String(entry.round)}:${String(row.cohortKey)}`}>
                    <td>{entry.round}</td>
                    <td>{row.cohortLabel}</td>
                    <td>{row.market}</td>
                    <td>{row.sampleSize}</td>
                    <td>{formatPct(row.winPct)}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </section>

      <section className="panel table-wrap">
        <h3>By Market</h3>
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Signal</th>
              <th>Sample</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {data.byMarket.flatMap((entry) =>
              (entry.cohorts as Array<Record<string, any>>)
                .filter((row) => row.signalType === 'sharp' || row.signalType === 'picks' || row.signalType === 'agreement')
                .filter((row) => row.sport === 'all' && row.market !== 'all')
                .map((row) => (
                  <tr key={`${String(entry.market)}:${String(row.cohortKey)}`}>
                    <td>{entry.market}</td>
                    <td>{row.cohortLabel}</td>
                    <td>{row.sampleSize}</td>
                    <td>{formatPct(row.winPct)}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
