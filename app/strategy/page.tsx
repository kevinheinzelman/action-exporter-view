'use client';

import { useEffect, useState } from 'react';
import { fetchPublicJson, formatPct } from '../../lib/data';

export default function StrategyPage() {
  const [data, setData] = useState<{
    generatedAt: string | null;
    cohorts: Array<Record<string, any>>;
  }>({
    generatedAt: null,
    cohorts: []
  });

  useEffect(() => {
    fetchPublicJson('/data/strategy_performance.json', {
      generatedAt: null,
      cohorts: [] as Array<Record<string, any>>
    }).then(setData);
  }, []);

  const importantCohorts = data.cohorts.filter((cohort) =>
    cohort.signalType === 'sharp' || cohort.signalType === 'picks' || cohort.signalType === 'agreement'
  );

  const summaryRows = ['sharp', 'picks', 'agreement']
    .map((signalType) => {
      const matches = importantCohorts.filter((cohort) => cohort.signalType === signalType && cohort.sport === 'all' && cohort.market === 'all');
      return matches[0];
    })
    .filter(Boolean);

  const marketRows = importantCohorts.filter((cohort) => cohort.sport === 'all' && cohort.market !== 'all');

  return (
    <main className="page">
      <section className="hero">
        <h2>Strategy Performance</h2>
        <p className="subtle">Historically, what has worked across the simplest signal groups.</p>
        <div className="metrics">
          <div className="metric">
            <label>Basis</label>
            <strong>Latest Pregame</strong>
          </div>
          <div className="metric">
            <label>Primary Cohorts</label>
            <strong>{summaryRows.length}</strong>
          </div>
          <div className="metric">
            <label>Generated</label>
            <strong>{data.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel table-wrap">
        <h3>Simple Scoreboard</h3>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Sample</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Pushes</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((cohort) => (
              <tr key={String(cohort.cohortKey)}>
                <td>{cohort.cohortLabel}</td>
                <td>{cohort.sampleSize}</td>
                <td className="good">{cohort.wins}</td>
                <td className="bad">{cohort.losses}</td>
                <td>{cohort.pushes}</td>
                <td>{formatPct(cohort.winPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel table-wrap">
        <h3>By Market</h3>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Market</th>
              <th>Sample</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Pushes</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {marketRows.map((cohort) => (
              <tr key={String(cohort.cohortKey)}>
                <td>{cohort.cohortLabel}</td>
                <td>{cohort.market}</td>
                <td>{cohort.sampleSize}</td>
                <td className="good">{cohort.wins}</td>
                <td className="bad">{cohort.losses}</td>
                <td>{cohort.pushes}</td>
                <td>{formatPct(cohort.winPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
