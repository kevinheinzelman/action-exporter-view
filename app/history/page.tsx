'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson, formatPct, formatSignedNumber } from '../../lib/data';
import { formatTimeframe, summarizeDecisionRows, toDecisionRows, type AnalysisRow, type DecisionRow, SUPPORTED_DECISION_LEAGUES } from '../../lib/decision';

type ActiveFilter = { kind: 'market' | 'signal'; value: string } | null;

export default function HistoryPage() {
  const [data, setData] = useState<{ generatedAt: string | null; rows: AnalysisRow[] }>({ generatedAt: null, rows: [] });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<'all' | (typeof SUPPORTED_DECISION_LEAGUES)[number]>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);

  useEffect(() => {
    fetchPublicJson('/data/analysis_rows.json', {
      generatedAt: null,
      rows: [] as AnalysisRow[]
    }).then((payload) => {
      setData(payload);
      const latestDefaultDate = getDefaultHistoryDate(payload.rows);
      setStartDate(latestDefaultDate);
      setEndDate(latestDefaultDate);
    });
  }, []);

  const decisionRows = useMemo(() => toDecisionRows(data.rows).filter((row) => row.isLatestAvailable && row.outcome !== 'unknown'), [data.rows]);
  const baseRows = useMemo(
    () =>
      decisionRows
        .filter((row) => row.date && row.date >= startDate && row.date <= endDate)
        .filter((row) => selectedLeague === 'all' || row.league === selectedLeague),
    [decisionRows, endDate, selectedLeague, startDate]
  );

  const filteredRows = useMemo(() => {
    if (!activeFilter) {
      return baseRows;
    }
    return baseRows.filter((row) => {
      if (activeFilter.kind === 'market') {
        return capitalize(row.market) === activeFilter.value;
      }
      return getSignalMixLabel(row) === activeFilter.value;
    });
  }, [activeFilter, baseRows]);

  const summary = summarizeDecisionRows(filteredRows);
  const timeframe = formatTimeframe(baseRows);
  const bySignal = buildBreakdown(baseRows, (row) => getSignalMixLabel(row));
  const byMarket = buildBreakdown(baseRows, (row) => capitalize(row.market));

  return (
    <main className="page">
      <section className="hero">
        <h2>History</h2>
        <p className="subtle">
          Board replay for actionable selections. Each row below is one market-side selection from a historical board, and win/loss means whether that selected side covered, won, or cashed.
        </p>
        <div className="metrics">
          <div className="metric">
            <label>Timeframe</label>
            <strong>{timeframe}</strong>
          </div>
          <div className="metric">
            <label>League</label>
            <strong>{selectedLeague === 'all' ? 'All leagues' : selectedLeague.toUpperCase()}</strong>
          </div>
          <div className="metric">
            <label>Selections</label>
            <strong>{summary.selectionCount}</strong>
          </div>
          <div className="metric">
            <label>Generated</label>
            <strong>{data.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="controls history-controls">
          <div className="control">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="control">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>

        <div className="history-league-filters">
          {(['all', ...SUPPORTED_DECISION_LEAGUES] as const).map((league) => (
            <button
              key={league}
              type="button"
              className={`history-chip ${selectedLeague === league ? 'history-chip-active analysis-chip-active' : ''}`}
              onClick={() => setSelectedLeague(league)}
            >
              {league === 'all' ? 'All leagues' : league.toUpperCase()}
            </button>
          ))}
          {activeFilter ? (
            <button type="button" className="history-chip history-chip-active analysis-chip-active" onClick={() => setActiveFilter(null)}>
              Clear table filter
            </button>
          ) : null}
        </div>
      </section>

      <section className="cards history-summary-grid">
        <article className="panel">
          <h3>Replay summary</h3>
          <p className="subtle">These metrics describe the selected board rows below, not both sides of each market.</p>
          <div className="metrics">
            <div className="metric">
              <label>Wins</label>
              <strong>{summary.wins}</strong>
            </div>
            <div className="metric">
              <label>Losses</label>
              <strong>{summary.losses}</strong>
            </div>
            <div className="metric">
              <label>Pushes</label>
              <strong>{summary.pushes}</strong>
            </div>
            <div className="metric">
              <label>Win Rate</label>
              <strong>{formatPct(summary.winRate)}</strong>
            </div>
          </div>
        </article>

        <article className="panel table-wrap">
          <h3>Signal mix</h3>
          <p className="subtle">Click a row to focus the replay table on that kind of board read.</p>
          <table>
            <thead>
              <tr>
                <th>Board read</th>
                <th>Selections</th>
                <th>Win %</th>
              </tr>
            </thead>
            <tbody>
              {bySignal.map((row) => (
                <tr
                  key={row.label}
                  className={activeFilter?.kind === 'signal' && activeFilter.value === row.label ? 'history-row-active history-row-filtered' : ''}
                  onClick={() => setActiveFilter({ kind: 'signal', value: row.label })}
                >
                  <td>{row.label}</td>
                  <td>{row.sampleSize}</td>
                  <td>{formatPct(row.winRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel table-wrap">
          <h3>Market mix</h3>
          <p className="subtle">Click a market to filter the replay table below.</p>
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>Selections</th>
                <th>Win %</th>
              </tr>
            </thead>
            <tbody>
              {byMarket.map((row) => (
                <tr
                  key={row.label}
                  className={activeFilter?.kind === 'market' && activeFilter.value === row.label ? 'history-row-active history-row-filtered' : ''}
                  onClick={() => setActiveFilter({ kind: 'market', value: row.label })}
                >
                  <td>{row.label}</td>
                  <td>{row.sampleSize}</td>
                  <td>{formatPct(row.winRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="panel table-wrap">
        <h3>Board replay table</h3>
        <p className="subtle">
          Each row shows the selected side, plus what sharps and picks were doing on that same market at the time.
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Matchup</th>
              <th>Market</th>
              <th>Board side</th>
              <th>Sharps</th>
              <th>Picks</th>
              <th>Signal mix</th>
              <th>Money - Bets</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.analysisKey}>
                <td>{row.date ?? 'N/A'}</td>
                <td>
                  <strong>{row.awayTeam ?? 'Away'} at {row.homeTeam ?? 'Home'}</strong>
                  <div className="subtle">{row.league.toUpperCase()}</div>
                </td>
                <td>{capitalize(row.market)}</td>
                <td>{row.selection ?? capitalize(row.side)}</td>
                <td>{getHistorySharpText(row)}</td>
                <td>{getHistoryPickText(row)}</td>
                <td>{getSignalMixLabel(row)}</td>
                <td>{row.publicMoneyMinusBetsPct === null ? 'N/A' : formatSignedNumber(row.publicMoneyMinusBetsPct)}</td>
                <td>{capitalize(row.outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredRows.length ? <p className="subtle">No board replay selections match the current filters.</p> : null}
      </section>
    </main>
  );
}

function getDefaultHistoryDate(rows: AnalysisRow[]): string {
  const dated = toDecisionRows(rows)
    .filter((row) => row.isLatestAvailable && row.outcome !== 'unknown' && row.date)
    .map((row) => String(row.date))
    .sort();
  if (!dated.length) {
    return '';
  }

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const priorDates = dated.filter((value) => value < today);
  return priorDates.at(-1) ?? dated.at(-1) ?? '';
}

function buildBreakdown(rows: DecisionRow[], getLabel: (row: DecisionRow) => string) {
  const grouped = new Map<string, DecisionRow[]>();
  rows.forEach((row) => {
    const label = getLabel(row);
    const existing = grouped.get(label) ?? [];
    existing.push(row);
    grouped.set(label, existing);
  });

  return Array.from(grouped.entries())
    .map(([label, matchingRows]) => {
      const summary = summarizeDecisionRows(matchingRows);
      return {
        label,
        sampleSize: summary.selectionCount,
        winRate: summary.winRate
      };
    })
    .sort((left, right) => right.sampleSize - left.sampleSize || left.label.localeCompare(right.label));
}

function getSignalMixLabel(row: DecisionRow): string {
  if (row.hasSharpPickAgreement) {
    return 'Sharps and picks agree';
  }
  if (row.hasSharpSignal && row.hasPickSignal) {
    return 'Sharps and picks disagree';
  }
  if (row.hasSharpSignal) {
    return 'Sharp-only board side';
  }
  return 'Pick-majority board side';
}

function getHistorySharpText(row: DecisionRow): string {
  if (!row.hasSharpSignal) {
    return '-';
  }
  return `${row.sharpCount} on ${row.isSharpMajority ? (row.selection ?? capitalize(row.side)) : 'other side'}`;
}

function getHistoryPickText(row: DecisionRow): string {
  if (!row.hasPickSignal) {
    return '-';
  }
  return `${row.pickCount} on ${row.isPickMajority ? (row.selection ?? capitalize(row.side)) : 'other side'}`;
}

function capitalize(value: string): string {
  return value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
