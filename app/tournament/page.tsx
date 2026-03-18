'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson, formatPct } from '../../lib/data';

type EvaluationRow = Record<string, any>;

type AggregateRow = {
  key: string;
  label: string;
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number | null;
};

function getSignalType(row: EvaluationRow): string {
  if (row.hasSharpSignal && row.hasPickSignal && row.sharpPickAgree) {
    return 'Sharps + Picks';
  }
  if (row.hasSharpSignal && row.hasPickSignal && !row.sharpPickAgree) {
    return 'Conflict';
  }
  if (row.hasSharpSignal && !row.hasPickSignal) {
    return 'Sharp Only';
  }
  if (!row.hasSharpSignal && row.hasPickSignal) {
    return 'Pick Majority';
  }
  return 'No Signal';
}

function getPrimarySide(row: EvaluationRow): string | null {
  if (row.hasSharpSignal) {
    return row.sharpMajoritySide ?? null;
  }
  if (row.hasPickSignal) {
    return row.pickMajoritySide ?? null;
  }
  return null;
}

function getOutcome(row: EvaluationRow): string | null {
  const primarySide = getPrimarySide(row);
  if (primarySide === 'away') {
    return row.awayResult ?? null;
  }
  if (primarySide === 'home') {
    return row.homeResult ?? null;
  }
  if (primarySide === 'over') {
    return row.overResult ?? null;
  }
  if (primarySide === 'under') {
    return row.underResult ?? null;
  }
  return null;
}

function isScoredOutcome(outcome: string | null): outcome is 'win' | 'loss' | 'push' {
  return outcome === 'win' || outcome === 'loss' || outcome === 'push';
}

function isBettable(row: EvaluationRow): boolean {
  return Boolean(row.hasSharpSignal || row.hasPickSignal);
}

function isCompleted(row: EvaluationRow): boolean {
  return row.status === 'complete' || Boolean(row.gradedAt);
}

function buildAggregateRows(rows: EvaluationRow[], getKey: (row: EvaluationRow) => string | null): AggregateRow[] {
  const groups = new Map<string, AggregateRow>();

  for (const row of rows) {
    const key = getKey(row);
    const outcome = getOutcome(row);
    if (!key) {
      continue;
    }
    if (!isScoredOutcome(outcome)) {
      continue;
    }

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: key,
        bets: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        winRate: null
      });
    }

    const aggregate = groups.get(key)!;
    aggregate.bets += 1;

    if (outcome === 'win') {
      aggregate.wins += 1;
    } else if (outcome === 'loss') {
      aggregate.losses += 1;
    } else if (outcome === 'push') {
      aggregate.pushes += 1;
    }
  }

  return [...groups.values()]
    .map((aggregate) => {
      const decisions = aggregate.wins + aggregate.losses;
      return {
        ...aggregate,
        winRate: decisions > 0 ? aggregate.wins / decisions : null
      };
    })
    .sort((left, right) => {
      if (right.bets !== left.bets) {
        return right.bets - left.bets;
      }
      return left.label.localeCompare(right.label);
    });
}

function formatMatchup(row: EvaluationRow): string {
  return `${row.awayTeam ?? 'Away'} vs ${row.homeTeam ?? 'Home'}`;
}

function getSortTimestamp(row: EvaluationRow): string {
  return String(row.gradedAt ?? row.startTimeUtc ?? row.gameDate ?? row.pulledAt ?? '');
}

function getRoundLabel(row: EvaluationRow): string {
  const round = String(row.tournamentRound ?? '').trim();
  return round.length > 0 ? round : 'Unknown Round';
}

function compareLatestRows(left: EvaluationRow, right: EvaluationRow): number {
  const gradedAtDiff = String(right.gradedAt ?? '').localeCompare(String(left.gradedAt ?? ''));
  if (gradedAtDiff !== 0) {
    return gradedAtDiff;
  }

  const pulledAtDiff = String(right.pulledAt ?? '').localeCompare(String(left.pulledAt ?? ''));
  if (pulledAtDiff !== 0) {
    return pulledAtDiff;
  }

  return Number(right.runId ?? 0) - Number(left.runId ?? 0);
}

export default function TournamentPage() {
  const [data, setData] = useState<{
    generatedAt: string | null;
    rows: EvaluationRow[];
  }>({
    generatedAt: null,
    rows: []
  });

  useEffect(() => {
    fetchPublicJson('/data/evaluation_rows.json', {
      generatedAt: null,
      rows: [] as EvaluationRow[]
    }).then(setData);
  }, []);

  const tournamentRows = useMemo(
    () => data.rows.filter((row) => row.isNcaaTournament === true),
    [data.rows]
  );

  const lastYearRows = useMemo(
    () =>
      tournamentRows.filter(
        (row) =>
          row.tournamentSeason === 2025 &&
          isCompleted(row) &&
          isBettable(row) &&
          getPrimarySide(row) !== null &&
          isScoredOutcome(getOutcome(row))
      ),
    [tournamentRows]
  );

  const lastYearSignalRows = useMemo(
    () => lastYearRows.filter((row) => getSignalType(row) !== 'No Signal'),
    [lastYearRows]
  );

  const thisYearRows = useMemo(
    () => {
      // evaluation_rows.json contains historical snapshots across multiple runs, so 2026
      // tournament results must be deduped to the latest resolved row per gameId+market.
      const candidates = tournamentRows.filter(
        (row) =>
          row.leagueSlug === 'ncaab' &&
          row.isNcaaTournament === true &&
          row.tournamentSeason === 2026 &&
          isCompleted(row) &&
          getPrimarySide(row) !== null &&
          isScoredOutcome(getOutcome(row))
      );

      const deduped = new Map<string, EvaluationRow>();

      for (const row of candidates) {
        const key = `${String(row.gameId ?? '')}:${String(row.market ?? '')}`;
        const existing = deduped.get(key);
        if (!existing || compareLatestRows(row, existing) < 0) {
          deduped.set(key, row);
        }
      }

      return [...deduped.values()].sort((left, right) => compareLatestRows(left, right));
    },
    [tournamentRows]
  );

  const bySignalType = useMemo(
    () => buildAggregateRows(lastYearSignalRows, (row) => getSignalType(row)),
    [lastYearSignalRows]
  );

  const byRound = useMemo(
    () => buildAggregateRows(lastYearRows, (row) => getRoundLabel(row)),
    [lastYearRows]
  );

  const byMarket = useMemo(
    () => buildAggregateRows(lastYearRows, (row) => (row.market ? String(row.market) : null)),
    [lastYearRows]
  );

  return (
    <main className="page">
      <section className="hero">
        <h2>NCAA Tournament</h2>
        <p className="subtle">Last year shows historical tournament learnings. This year updates as tournament games complete.</p>
        <div className="metrics">
          <div className="metric">
            <label>2025 Bettable Rows</label>
            <strong>{lastYearRows.length}</strong>
          </div>
          <div className="metric">
            <label>2026 Completed Rows</label>
            <strong>{thisYearRows.length}</strong>
          </div>
          <div className="metric">
            <label>Generated</label>
            <strong>{data.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel table-wrap">
        <h3>Last Year by Signal Type (2025)</h3>
        <table>
          <thead>
            <tr>
              <th>Signal Type</th>
              <th>Bets</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Pushes</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {bySignalType.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.bets}</td>
                <td className="good">{row.wins}</td>
                <td className="bad">{row.losses}</td>
                <td>{row.pushes}</td>
                <td>{formatPct(row.winRate)}</td>
              </tr>
            ))}
            {bySignalType.length === 0 ? (
              <tr>
                <td colSpan={6} className="subtle">No completed 2025 tournament rows were found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel table-wrap">
        <h3>Last Year by Round</h3>
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>Bets</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Pushes</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {byRound.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.bets}</td>
                <td className="good">{row.wins}</td>
                <td className="bad">{row.losses}</td>
                <td>{row.pushes}</td>
                <td>{formatPct(row.winRate)}</td>
              </tr>
            ))}
            {byRound.length === 0 ? (
              <tr>
                <td colSpan={6} className="subtle">No completed 2025 tournament rows were found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel table-wrap">
        <h3>Last Year by Market</h3>
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Bets</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Pushes</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {byMarket.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.bets}</td>
                <td className="good">{row.wins}</td>
                <td className="bad">{row.losses}</td>
                <td>{row.pushes}</td>
                <td>{formatPct(row.winRate)}</td>
              </tr>
            ))}
            {byMarket.length === 0 ? (
              <tr>
                <td colSpan={6} className="subtle">No completed 2025 tournament rows were found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel table-wrap">
        <h3>2026 Tournament Results</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Round</th>
              <th>Matchup</th>
              <th>Market</th>
              <th>Signal Type</th>
              <th>Primary Side</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {thisYearRows.map((row) => (
              <tr key={String(row.evaluationKey)}>
                <td>{row.gameDate ?? 'N/A'}</td>
                <td>{getRoundLabel(row)}</td>
                <td>{formatMatchup(row)}</td>
                <td>{row.market ?? 'N/A'}</td>
                <td>{getSignalType(row)}</td>
                <td>{getPrimarySide(row) ?? 'N/A'}</td>
                <td>{getOutcome(row) ?? 'N/A'}</td>
              </tr>
            ))}
            {thisYearRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="subtle">No completed 2026 tournament rows are available yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
