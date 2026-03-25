'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { fetchPublicJson, formatNumber, formatSignedNumber } from '../../lib/data';

type KenPomBoardRow = {
  gameId: string;
  gameDate: string | null;
  startTimeUtc: string | null;
  status: string | null;
  awayTeam: string;
  homeTeam: string;
  leagueSlug: string | null;
  spreadMarketAway: number | null;
  spreadMarketHome: number | null;
  totalMarketLine: number | null;
  spreadMarketPulledAt: string | null;
  totalMarketPulledAt: string | null;
  awayProjectedScore: number | null;
  homeProjectedScore: number | null;
  projectedSpread: number | null;
  projectedTotal: number | null;
  spreadRecommendation: string | null;
  totalRecommendation: string | null;
  spreadEdge: number | null;
  totalEdge: number | null;
  awayKenPomRank: number | null;
  homeKenPomRank: number | null;
};

type SortKey = 'game_time' | 'projected_spread' | 'projected_total' | 'spread_edge' | 'total_edge';
type SortDirection = 'asc' | 'desc';

const EMPTY_KENPOM_BOARD = {
  generatedAt: null,
  rows: [] as KenPomBoardRow[]
};

export default function KenPomPage() {
  const [kenPomBoard, setKenPomBoard] = useState<{ generatedAt: string | null; rows: KenPomBoardRow[] }>(EMPTY_KENPOM_BOARD);
  const [sortKey, setSortKey] = useState<SortKey>('game_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    fetchPublicJson('/data/kenpom_board.json', EMPTY_KENPOM_BOARD).then(setKenPomBoard);
  }, []);

  const availableDates = useMemo(() => {
    return Array.from(new Set(kenPomBoard.rows.map((row) => row.gameDate).filter((value): value is string => Boolean(value)))).sort();
  }, [kenPomBoard.rows]);

  useEffect(() => {
    if (!availableDates.length) {
      setSelectedDate('');
      return;
    }

    const todayEt = getTodayEtDateString();
    if (!selectedDate || !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates.includes(todayEt) ? todayEt : availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const filteredRows = useMemo(() => {
    if (!selectedDate) {
      return kenPomBoard.rows;
    }
    return kenPomBoard.rows.filter((row) => row.gameDate === selectedDate);
  }, [kenPomBoard.rows, selectedDate]);

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filteredRows].sort((left, right) => {
      const leftValue = getSortMetric(left, sortKey);
      const rightValue = getSortMetric(right, sortKey);
      if (leftValue !== rightValue) {
        return (leftValue - rightValue) * direction;
      }
      return `${left.awayTeam} vs ${left.homeTeam}`.localeCompare(`${right.awayTeam} vs ${right.homeTeam}`);
    });
  }, [filteredRows, sortDirection, sortKey]);

  return (
    <main className="page">
      <section className="hero">
        <h2>KenPom Model Board</h2>
        <p className="subtle">
          This board uses a single canonical KenPom export dataset keyed by game. Market lines and KenPom projections are joined in the export layer, so this page renders one row per game without UI-side fuzzy matching.
        </p>
        <div className="metrics">
          <div className="metric">
            <label>Visible Rows</label>
            <strong>{sortedRows.length}</strong>
          </div>
          <div className="metric">
            <label>Available Dates</label>
            <strong>{availableDates.length}</strong>
          </div>
          <div className="metric">
            <label>Generated</label>
            <strong>{kenPomBoard.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>Select Date:</label>
        <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
          {availableDates.map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>
      </section>

      <section className="panel table-wrap">
        <div className="kenpom-table-head">
          <div>
            <h3>Matchup Table</h3>
            <p className="subtle">
              Rows come directly from <strong>kenpom_board.json</strong>. If a KenPom projection or market line is unavailable, the row still renders and the affected fields stay blank.
            </p>
          </div>
        </div>

        <table className="kenpom-table">
          <thead>
            <tr>
              <th>Matchup</th>
              <th>Game Time (ET)</th>
              <th>Away</th>
              <th>Home</th>
              <th>Away Projected Score</th>
              <th>Home Projected Score</th>
              <th>
                <SortButton
                  label="Projected Spread"
                  sortKey="projected_spread"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onClick={() => handleSortChange('projected_spread', sortKey, setSortKey, setSortDirection)}
                />
              </th>
              <th>
                <SortButton
                  label="Projected Total"
                  sortKey="projected_total"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onClick={() => handleSortChange('projected_total', sortKey, setSortKey, setSortDirection)}
                />
              </th>
              <th>Market Spread</th>
              <th>Market Total</th>
              <th>Spread Recommendation</th>
              <th>
                <SortButton
                  label="Spread Edge"
                  sortKey="spread_edge"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onClick={() => handleSortChange('spread_edge', sortKey, setSortKey, setSortDirection)}
                />
              </th>
              <th>Total Recommendation</th>
              <th>
                <SortButton
                  label="Total Edge"
                  sortKey="total_edge"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onClick={() => handleSortChange('total_edge', sortKey, setSortKey, setSortDirection)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.gameId}>
                <td>
                  <strong>{row.awayTeam} vs {row.homeTeam}</strong>
                </td>
                <td>{formatEtTime(row.startTimeUtc)}</td>
                <td>{row.awayTeam}</td>
                <td>{row.homeTeam}</td>
                <td>{formatScore(row.awayProjectedScore)}</td>
                <td>{formatScore(row.homeProjectedScore)}</td>
                <td>{formatNullableSigned(row.projectedSpread)}</td>
                <td>{formatNullableNumber(row.projectedTotal)}</td>
                <td>{formatNullableSigned(row.spreadMarketAway)}</td>
                <td>{formatNullableNumber(row.totalMarketLine)}</td>
                <td>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                    style={getEdgeBubbleStyle(row.spreadEdge)}
                  >
                    {getSpreadRecommendationDisplay(row)}
                  </span>
                </td>
                <td>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                    style={getEdgeBubbleStyle(row.spreadEdge)}
                  >
                    {formatNullableSigned(row.spreadEdge)}
                  </span>
                </td>
                <td>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                    style={getEdgeBubbleStyle(row.totalEdge)}
                  >
                    {getTotalRecommendationDisplay(row)}
                  </span>
                </td>
                <td>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                    style={getEdgeBubbleStyle(row.totalEdge)}
                  >
                    {formatNullableSigned(row.totalEdge)}
                  </span>
                </td>
              </tr>
            ))}
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={14} className="subtle">
                  No KenPom board rows were found for the selected date.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  onClick
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onClick: () => void;
}) {
  const active = sortKey === activeKey;
  return (
    <button type="button" className={`table-sort-button ${active ? 'table-sort-button-active' : ''}`} onClick={onClick}>
      {label}
      <span>{active ? (direction === 'desc' ? '↓' : '↑') : '↕'}</span>
    </button>
  );
}

function handleSortChange(
  key: SortKey,
  currentKey: SortKey,
  setSortKey: (value: SortKey) => void,
  setSortDirection: (value: SortDirection | ((value: SortDirection) => SortDirection)) => void
) {
  if (currentKey === key) {
    setSortDirection((currentDirection) => (currentDirection === 'desc' ? 'asc' : 'desc'));
    return;
  }
  setSortKey(key);
  setSortDirection(key === 'game_time' ? 'asc' : 'desc');
}

function getSortMetric(row: KenPomBoardRow, sortKey: SortKey): number {
  if (sortKey === 'game_time') {
    return getStartTimeSortValue(row.startTimeUtc);
  }
  if (sortKey === 'projected_spread') {
    return row.projectedSpread ?? Number.NEGATIVE_INFINITY;
  }
  if (sortKey === 'projected_total') {
    return row.projectedTotal ?? Number.NEGATIVE_INFINITY;
  }
  if (sortKey === 'spread_edge') {
    return row.spreadEdge ?? Number.NEGATIVE_INFINITY;
  }
  return row.totalEdge ?? Number.NEGATIVE_INFINITY;
}

function formatScore(value: number | null): string {
  if (typeof value !== 'number') {
    return '';
  }
  return value.toFixed(1).replace(/\.0$/, '');
}

function formatEtTime(value: string | null | undefined): string {
  const timestamp = getStartTimeSortValue(value);
  if (!Number.isFinite(timestamp)) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  }).format(new Date(timestamp));
}

function getStartTimeSortValue(value: string | null | undefined): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function formatNullableSigned(value: number | null): string {
  return typeof value === 'number' ? formatSignedNumber(value) : '—';
}

function formatNullableNumber(value: number | null): string {
  return typeof value === 'number' ? formatNumber(value) : '';
}

function getSpreadRecommendationDisplay(row: KenPomBoardRow): string {
  if (typeof row.spreadEdge !== 'number' || row.spreadEdge < 1) {
    return 'No play';
  }
  return row.spreadRecommendation ?? 'No play';
}

function getTotalRecommendationDisplay(row: KenPomBoardRow): string {
  if (typeof row.totalEdge !== 'number' || row.totalEdge < 1) {
    return 'No play';
  }
  if (typeof row.projectedTotal !== 'number' || typeof row.totalMarketLine !== 'number') {
    return 'No play';
  }
  if (row.projectedTotal > row.totalMarketLine) {
    return 'Over';
  }
  if (row.projectedTotal < row.totalMarketLine) {
    return 'Under';
  }
  return 'No play';
}

function getEdgeBubbleStyle(edge: number | null): CSSProperties {
  if (typeof edge !== 'number') {
    return {
      backgroundColor: '#f1f5f9',
      color: '#475569'
    };
  }

  if (edge < 1) {
    return {
      backgroundColor: '#fee2e2',
      color: '#991b1b'
    };
  }
  if (edge < 4) {
    return {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    };
  }
  return {
    backgroundColor: '#dcfce7',
    color: '#166534'
  };
}

function getTodayEtDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}


