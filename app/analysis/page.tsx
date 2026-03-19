'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson, formatPct, formatSignedNumber } from '../../lib/data';
import {
  formatTimeframe,
  summarizeDecisionRows,
  toDecisionRows,
  type AnalysisRow,
  type DecisionRow
} from '../../lib/decision';

type MarketFilter = 'all' | 'spread' | 'moneyline' | 'total';
type SideFilter = 'all' | 'favorite' | 'underdog' | 'over' | 'under';
type AngleGroup = 'all' | 'sharps' | 'picks' | 'combo' | 'public' | 'spread';

type AnalysisAngleCard = {
  id: string;
  group: Exclude<AngleGroup, 'all'>;
  label: string;
  description: string;
  match: (row: DecisionRow) => boolean;
};

type AngleStats = {
  sampleSize: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number | null;
  roi: number | null;
};

const GROUP_ORDER: Array<{ id: Exclude<AngleGroup, 'all'>; label: string }> = [
  { id: 'sharps', label: 'Sharps' },
  { id: 'picks', label: 'Picks' },
  { id: 'public', label: 'Public money divergence' },
  { id: 'spread', label: 'Spread size' }
];

const EMPTY_DATA = { generatedAt: null, rows: [] as AnalysisRow[] };

export default function AnalysisPage() {
  const [data, setData] = useState<{ generatedAt: string | null; rows: AnalysisRow[] }>(EMPTY_DATA);
  const [league, setLeague] = useState('all');
  const [market, setMarket] = useState<MarketFilter>('all');
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAngleId, setSelectedAngleId] = useState<string>('all');

  useEffect(() => {
    fetchPublicJson('/data/analysis_rows.json', EMPTY_DATA).then((payload) => {
      setData(payload);
      const decisionRows = toDecisionRows(payload.rows).filter((row) => row.isLatestAvailable && row.outcome !== 'unknown');
      const dates = decisionRows
        .map((row) => row.date)
        .filter((value): value is string => Boolean(value))
        .sort();

      setStartDate(dates[0] ?? '');
      setEndDate(dates[dates.length - 1] ?? '');
    });
  }, []);

  const decisionRows = useMemo(
    () => toDecisionRows(data.rows).filter((row) => row.isLatestAvailable && row.outcome !== 'unknown'),
    [data.rows]
  );

  const leagues = useMemo(
    () => ['all', ...Array.from(new Set(decisionRows.map((row) => row.league))).sort()],
    [decisionRows]
  );

  const filteredRows = useMemo(
    () =>
      decisionRows.filter((row) => {
        if (league !== 'all' && row.league !== league) {
          return false;
        }
        if (startDate && row.date && row.date < startDate) {
          return false;
        }
        if (endDate && row.date && row.date > endDate) {
          return false;
        }
        if (market !== 'all' && row.market !== market) {
          return false;
        }
        if (sideFilter !== 'all' && getMarketSideClass(row) !== sideFilter) {
          return false;
        }
        return true;
      }),
    [decisionRows, endDate, league, market, sideFilter, startDate]
  );

  const visibleAngles = useMemo(
    () => buildVisibleAngles(market),
    [market]
  );

  const angleStats = useMemo(() => {
    const stats = new Map<string, AngleStats>();
    for (const angle of visibleAngles) {
      stats.set(angle.id, buildAngleStats(filteredRows.filter((row) => angle.match(row))));
    }
    return stats;
  }, [filteredRows, visibleAngles]);

  const selectedAngle = useMemo(
    () => visibleAngles.find((angle) => angle.id === selectedAngleId) ?? null,
    [selectedAngleId, visibleAngles]
  );

  const selectedRows = useMemo(
    () => (selectedAngle ? filteredRows.filter((row) => selectedAngle.match(row)) : filteredRows),
    [filteredRows, selectedAngle]
  );

  const summary = summarizeDecisionRows(selectedRows);
  const timeframe = formatTimeframe(filteredRows);
  const sideOptions = getSideOptions(market);

  useEffect(() => {
    if (selectedAngleId === 'all') {
      return;
    }
    if (!visibleAngles.some((angle) => angle.id === selectedAngleId)) {
      setSelectedAngleId('all');
    }
  }, [selectedAngleId, visibleAngles]);

  return (
    <main className="page">
      <section className="hero">
        <h2>Analysis</h2>
        <p className="subtle">
          Historical research built from actionable board selections. Each result reflects the selected side for a market, not both sides of the market.
        </p>
        <div className="metrics">
          <div className="metric">
            <label>Timeframe</label>
            <strong>{timeframe}</strong>
          </div>
          <div className="metric">
            <label>Selections</label>
            <strong>{summary.selectionCount}</strong>
          </div>
          <div className="metric">
            <label>Win rate</label>
            <strong>{formatPct(summary.winRate)}</strong>
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
            <label>League</label>
            <select value={league} onChange={(event) => setLeague(event.target.value)}>
              {leagues.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All leagues' : value.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>Market</label>
            <select
              value={market}
              onChange={(event) => {
                const nextMarket = event.target.value as MarketFilter;
                setMarket(nextMarket);
                setSideFilter('all');
                setSelectedAngleId('all');
              }}
            >
              <option value="all">All markets</option>
              <option value="spread">Spread</option>
              <option value="moneyline">Moneyline</option>
              <option value="total">Total</option>
            </select>
          </div>

          <div className="control">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>

          <div className="control">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>

        {market !== 'all' ? (
          <div className="history-league-filters analysis-group-filters">
            {sideOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`history-chip ${sideFilter === option ? 'history-chip-active analysis-chip-active' : ''}`}
                onClick={() => {
                  setSideFilter(option);
                  setSelectedAngleId('all');
                }}
              >
                {option === 'all' ? 'All' : capitalize(option)}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="cards analysis-layout">
        <article className="panel">
          <div className="analysis-panel-head">
            <div>
              <h3>Angle families</h3>
              <p className="subtle">
                Pick an angle to inspect what has historically worked in the selected league, market, side, and timeframe.
              </p>
            </div>
            <button
              type="button"
              className={`history-chip ${selectedAngleId === 'all' ? 'history-chip-active analysis-chip-active' : ''}`}
              onClick={() => setSelectedAngleId('all')}
            >
              All
            </button>
          </div>

          <div className="analysis-angle-group-list">
            {GROUP_ORDER.map(({ id, label }) => {
              const groupAngles = visibleAngles.filter((angle) => angle.group === id);
              if (!groupAngles.length) {
                return null;
              }

              return (
                <section key={id} className="analysis-angle-section">
                  <div className="analysis-angle-section-head">
                    <h4>{label}</h4>
                  </div>
                  <div className="analysis-angle-grid">
                    {groupAngles.map((angle) => {
                      const stats = angleStats.get(angle.id) ?? EMPTY_STATS;
                      const active = selectedAngleId === angle.id;

                      return (
                        <button
                          key={angle.id}
                          type="button"
                          className={`analysis-angle-card ${active ? 'analysis-angle-card-active' : ''}`}
                          onClick={() => setSelectedAngleId(angle.id)}
                        >
                          <div className="analysis-angle-group">{label}</div>
                          <strong>{angle.label}</strong>
                          <div className="subtle">{angle.description}</div>
                          <div className="analysis-angle-metrics">
                            <span>{stats.sampleSize} plays</span>
                            <span>{formatPct(stats.winRate)} win rate</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <h3>{selectedAngle ? 'Selected angle' : 'Current view'}</h3>
          <p className="subtle">
            {selectedAngle
              ? selectedAngle.description
              : 'Showing all actionable selections for the current date range, league, market, and side filters.'}
          </p>
          <div className="metrics">
            <div className="metric">
              <label>Selections</label>
              <strong>{summary.selectionCount}</strong>
            </div>
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
              <label>Win rate</label>
              <strong>{formatPct(summary.winRate)}</strong>
            </div>
            <div className="metric">
              <label>ROI</label>
              <strong>{formatPct(buildAngleStats(selectedRows).roi)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="panel table-wrap">
        <h3>Underlying selections</h3>
        <p className="subtle">
          Click an angle above to focus these historical board-selected rows. The table stays synced to the selected timeframe, league, market, and side.
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>League</th>
              <th>Matchup</th>
              <th>Market</th>
              <th>Side</th>
              <th>Selection</th>
              <th>Sharps</th>
              <th>Picks</th>
              <th>Money - Bets</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {selectedRows.map((row) => (
              <tr key={row.analysisKey}>
                <td>{row.date ?? 'N/A'}</td>
                <td>{row.league.toUpperCase()}</td>
                <td>{row.awayTeam ?? 'Away'} at {row.homeTeam ?? 'Home'}</td>
                <td>{capitalize(row.market)}</td>
                <td>{capitalize(getMarketSideClass(row) ?? 'unclassified')}</td>
                <td>{row.selection ?? capitalize(row.side)}</td>
                <td>{row.sharpCount}</td>
                <td>{row.pickCount}</td>
                <td>{row.publicMoneyMinusBetsPct === null ? 'N/A' : `${formatSignedNumber(row.publicMoneyMinusBetsPct)}%`}</td>
                <td>{capitalize(row.outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!selectedRows.length ? <p className="subtle">No historical selections match the current filters.</p> : null}
      </section>
    </main>
  );
}

const EMPTY_STATS: AngleStats = {
  sampleSize: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  winRate: null,
  roi: null
};

function getSideOptions(market: MarketFilter): SideFilter[] {
  if (market === 'total') {
    return ['all', 'over', 'under'];
  }
  if (market === 'spread' || market === 'moneyline') {
    return ['all', 'favorite', 'underdog'];
  }
  return ['all'];
}

function buildVisibleAngles(market: MarketFilter): AnalysisAngleCard[] {
  const angles: AnalysisAngleCard[] = [
    {
      id: 'sharps-1-3',
      group: 'sharps',
      label: 'Sharp majority with 1-3 sharps',
      description: 'Board-selected side with a sharp majority in the 1 to 3 range.',
      match: (row) => row.sharpCount >= 1 && row.sharpCount <= 3
    },
    {
      id: 'sharps-4-5',
      group: 'sharps',
      label: 'Sharp majority with 4-5 sharps',
      description: 'Board-selected side with a sharp majority in the 4 to 5 range.',
      match: (row) => row.sharpCount >= 4 && row.sharpCount <= 5
    },
    {
      id: 'sharps-6-7',
      group: 'sharps',
      label: 'Sharp majority with 6-7 sharps',
      description: 'Board-selected side with a sharp majority in the 6 to 7 range.',
      match: (row) => row.sharpCount >= 6 && row.sharpCount <= 7
    },
    {
      id: 'sharps-8-11',
      group: 'sharps',
      label: 'Sharp majority with 8-11 sharps',
      description: 'Board-selected side with a sharp majority in the 8 to 11 range.',
      match: (row) => row.sharpCount >= 8 && row.sharpCount <= 11
    },
    {
      id: 'sharps-12-plus',
      group: 'sharps',
      label: 'Sharp majority with 12+ sharps',
      description: 'Board-selected side with a sharp majority of 12 or more.',
      match: (row) => row.sharpCount >= 12
    },
    {
      id: 'picks-1-3',
      group: 'picks',
      label: 'Pick majority with 1-3 picks',
      description: 'Board-selected side with a pick majority in the 1 to 3 range.',
      match: (row) => row.pickCount >= 1 && row.pickCount <= 3
    },
    {
      id: 'picks-4-5',
      group: 'picks',
      label: 'Pick majority with 4-5 picks',
      description: 'Board-selected side with a pick majority in the 4 to 5 range.',
      match: (row) => row.pickCount >= 4 && row.pickCount <= 5
    },
    {
      id: 'picks-6-7',
      group: 'picks',
      label: 'Pick majority with 6-7 picks',
      description: 'Board-selected side with a pick majority in the 6 to 7 range.',
      match: (row) => row.pickCount >= 6 && row.pickCount <= 7
    },
    {
      id: 'picks-8-11',
      group: 'picks',
      label: 'Pick majority with 8-11 picks',
      description: 'Board-selected side with a pick majority in the 8 to 11 range.',
      match: (row) => row.pickCount >= 8 && row.pickCount <= 11
    },
    {
      id: 'picks-12-plus',
      group: 'picks',
      label: 'Pick majority with 12+ picks',
      description: 'Board-selected side with a pick majority of 12 or more.',
      match: (row) => row.pickCount >= 12
    },
    {
      id: 'money-0-5',
      group: 'public',
      label: 'Money minus bets from 0 to <5',
      description: 'Money percentage is modestly above bet percentage on the board-selected side.',
      match: (row) =>
        typeof row.publicMoneyMinusBetsPct === 'number' &&
        row.publicMoneyMinusBetsPct >= 0 &&
        row.publicMoneyMinusBetsPct < 5
    },
    {
      id: 'money-5-10',
      group: 'public',
      label: 'Money minus bets from 5 to <10',
      description: 'Money percentage is 5 to under 10 points above bet percentage on the board-selected side.',
      match: (row) =>
        typeof row.publicMoneyMinusBetsPct === 'number' &&
        row.publicMoneyMinusBetsPct >= 5 &&
        row.publicMoneyMinusBetsPct < 10
    },
    {
      id: 'money-10-15',
      group: 'public',
      label: 'Money minus bets from 10 to <15',
      description: 'Money percentage is 10 to under 15 points above bet percentage on the board-selected side.',
      match: (row) =>
        typeof row.publicMoneyMinusBetsPct === 'number' &&
        row.publicMoneyMinusBetsPct >= 10 &&
        row.publicMoneyMinusBetsPct < 15
    },
    {
      id: 'money-15-plus',
      group: 'public',
      label: 'Money minus bets at 15+',
      description: 'Money percentage is at least 15 points above bet percentage on the board-selected side.',
      match: (row) => typeof row.publicMoneyMinusBetsPct === 'number' && row.publicMoneyMinusBetsPct >= 15
    }
  ];

  if (market === 'spread' || market === 'all') {
    angles.push(
      {
        id: 'spread-lt5',
        group: 'spread',
        label: 'Spread size under 5',
        description: 'Spread selections where the line is smaller than 5 points.',
        match: (row) => row.market === 'spread' && typeof row.line === 'number' && Math.abs(row.line) < 5
      },
      {
        id: 'spread-5-10',
        group: 'spread',
        label: 'Spread size from 5 to 10',
        description: 'Spread selections where the line falls between 5 and 10 points.',
        match: (row) => row.market === 'spread' && typeof row.line === 'number' && Math.abs(row.line) >= 5 && Math.abs(row.line) <= 10
      },
      {
        id: 'spread-10-plus',
        group: 'spread',
        label: 'Spread size at 10+',
        description: 'Spread selections where the line is larger than 10 points.',
        match: (row) => row.market === 'spread' && typeof row.line === 'number' && Math.abs(row.line) > 10
      }
    );
  }

  return angles;
}

function getMarketSideClass(row: DecisionRow): SideFilter | null {
  if (row.market === 'total') {
    return row.side === 'over' || row.side === 'under' ? row.side : null;
  }

  if ((row.market === 'spread' || row.market === 'moneyline') && typeof row.line === 'number') {
    if (row.line < 0) {
      return 'favorite';
    }
    if (row.line > 0) {
      return 'underdog';
    }
  }

  return null;
}

function buildAngleStats(rows: DecisionRow[]): AngleStats {
  const wins = rows.filter((row) => row.outcome === 'win').length;
  const losses = rows.filter((row) => row.outcome === 'loss').length;
  const pushes = rows.filter((row) => row.outcome === 'push').length;

  return {
    sampleSize: rows.length,
    wins,
    losses,
    pushes,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    roi: computeMoneylineRoi(rows)
  };
}

function computeMoneylineRoi(rows: DecisionRow[]): number | null {
  let unitsRisked = 0;
  let unitsReturned = 0;
  let gradedCount = 0;

  for (const row of rows) {
    if (row.market !== 'moneyline' || typeof row.line !== 'number') {
      continue;
    }
    if (row.outcome !== 'win' && row.outcome !== 'loss' && row.outcome !== 'push') {
      continue;
    }

    gradedCount += 1;
    unitsRisked += 1;

    if (row.outcome === 'win') {
      unitsReturned += americanOddsProfit(row.line);
    } else if (row.outcome === 'loss') {
      unitsReturned -= 1;
    }
  }

  if (gradedCount === 0 || unitsRisked === 0) {
    return null;
  }

  return unitsReturned / unitsRisked;
}

function americanOddsProfit(odds: number): number {
  if (odds > 0) {
    return odds / 100;
  }
  if (odds < 0) {
    return 100 / Math.abs(odds);
  }
  return 0;
}

function capitalize(value: string): string {
  return value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
