'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchPublicJson,
  formatSignedNumber,
  getPrimaryPickCount,
  getPrimarySharpCount,
  getPrimarySignalSide
} from '../lib/data';

type BoardMarketRow = {
  game: Record<string, any>;
  market: string;
  row: Record<string, any>;
};

type BoardGameGroup = {
  gameKey: string;
  rows: BoardMarketRow[];
  strongestSharpCount: number;
  strongestPickCount: number;
};

const USE_LEGACY_CURRENT_BOARD = false;

const SPORT_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'NCAAB', value: 'Basketball:ncaab' },
  { label: 'NBA', value: 'Basketball:nba' },
  { label: 'NHL', value: 'Hockey:nhl' },
  { label: 'MLB', value: 'Baseball:mlb' }
];

const SORT_OPTIONS = [
  { label: 'Default / Current', value: 'default' },
  { label: 'Sharp Count Descending', value: 'sharp_desc' },
  { label: 'Pick Count Descending', value: 'pick_desc' }
];

const MARKET_ORDER: Record<string, number> = {
  spread: 0,
  total: 1,
  moneyline: 2
};

function getSharpCount(row: Record<string, any>): number {
  return getPrimarySharpCount(row);
}

function getPickCount(row: Record<string, any>): number {
  return getPrimaryPickCount(row);
}

function getSignalLabel(row: Record<string, any>): string {
  const sharpCount = getSharpCount(row);
  const pickCount = getPickCount(row);

  if (sharpCount > 0 && pickCount > 0) {
    return 'Sharps + Picks';
  }
  if (sharpCount > 0) {
    return 'Sharp Only';
  }
  if (pickCount > 0) {
    return 'Pick Majority';
  }
  return 'No Signal';
}

function getSignalStrengthLabel(row: Record<string, any>): string | null {
  const signalStrength = getSharpCount(row) * 2 + getPickCount(row);
  if (signalStrength >= 15) {
    return 'Strong Signal';
  }
  if (signalStrength >= 8) {
    return 'Lean';
  }
  return null;
}

function getAgreementLabel(row: Record<string, any>): string | null {
  const sharpCount = getSharpCount(row);
  const pickCount = getPickCount(row);
  if (sharpCount === 0 || pickCount === 0) {
    return null;
  }

  return getPrimarySignalSide(row, 'sharp') === getPrimarySignalSide(row, 'picks') ? 'Agree' : 'Conflict';
}

function getSharpViewText(game: Record<string, any>, market: string, row: Record<string, any>): string {
  const count = getSharpCount(row);
  if (count <= 0) {
    return '-';
  }

  const side = getPrimarySignalSide(row, 'sharp');
  if (market === 'total') {
    if (side === 'over') {
      return `${count} sharps, Over`;
    }
    if (side === 'under') {
      return `${count} sharps, Under`;
    }
    return `${count} sharps`;
  }

  if (side === 'away') {
    return `${count} sharps, ${game.awayTeam ?? 'Away'}`;
  }
  if (side === 'home') {
    return `${count} sharps, ${game.homeTeam ?? 'Home'}`;
  }
  return `${count} sharps`;
}

function getPickViewText(game: Record<string, any>, market: string, row: Record<string, any>): string {
  const count = getPickCount(row);
  if (count <= 0) {
    return '-';
  }

  const side = getPrimarySignalSide(row, 'picks');
  if (market === 'total') {
    if (side === 'over') {
      return `${count} picks, Over`;
    }
    if (side === 'under') {
      return `${count} picks, Under`;
    }
    return `${count} picks`;
  }

  if (side === 'away') {
    return `${count} picks, ${game.awayTeam ?? 'Away'}`;
  }
  if (side === 'home') {
    return `${count} picks, ${game.homeTeam ?? 'Home'}`;
  }
  return `${count} picks`;
}

function getTopBetScore(row: Record<string, any>): number {
  return getSharpCount(row) * 3 + getPickCount(row);
}

function formatLineValue(value: unknown): string {
  if (typeof value !== 'number') {
    return '';
  }
  return value.toFixed(1).replace(/\.0$/, '.0');
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/New_York'
  }).format(date);
}

function formatStartTime(value: string | null | undefined): string {
  if (!value) {
    return 'TBD';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
<<<<<<< HEAD
    timeZone: 'America/New_York'
  }).format(date);
}

function getPrimarySideText(game: Record<string, any>, market: string, row: Record<string, any>): string {
  const preferredSide = getSharpCount(row) > 0 ? getPrimarySignalSide(row, 'sharp') : getPrimarySignalSide(row, 'picks');

  if (market === 'total') {
    const totalLine = row.totalLine ?? row.overValue ?? row.underValue;
    if (preferredSide === 'over') {
      return totalLine == null ? 'Over' : `Over ${formatLineValue(Number(totalLine))}`;
    }
    if (preferredSide === 'under') {
      return totalLine == null ? 'Under' : `Under ${formatLineValue(Number(totalLine))}`;
    }
    return totalLine == null ? 'Total' : `Total ${formatLineValue(Number(totalLine))}`;
  }

  if (preferredSide === 'away') {
    const displayValue = market === 'spread' ? formatLineValue(Number(row.awayValue)) : formatSignedNumber(row.awayValue);
    return `${game.awayTeam ?? 'Away'} ${row.awayValue == null ? '' : displayValue}`.trim();
  }
  if (preferredSide === 'home') {
    const displayValue = market === 'spread' ? formatLineValue(Number(row.homeValue)) : formatSignedNumber(row.homeValue);
    return `${game.homeTeam ?? 'Home'} ${row.homeValue == null ? '' : displayValue}`.trim();
  }

  const awayDisplayValue = market === 'spread' ? formatLineValue(Number(row.awayValue)) : formatSignedNumber(row.awayValue);
  const homeDisplayValue = market === 'spread' ? formatLineValue(Number(row.homeValue)) : formatSignedNumber(row.homeValue);
  const awayText = `${game.awayTeam ?? 'Away'} ${row.awayValue == null ? '' : awayDisplayValue}`.trim();
  const homeText = `${game.homeTeam ?? 'Home'} ${row.homeValue == null ? '' : homeDisplayValue}`.trim();
  return `${awayText} / ${homeText}`;
}

function getCountsText(row: Record<string, any>): string {
  return `🔥 ${getSharpCount(row)} sharps • 📊 ${getPickCount(row)} picks`;
}

function getMarketSortValue(row: Record<string, any>, sortMode: string): [number, number, string] {
  const sharpCount = getSharpCount(row);
  const pickCount = getPickCount(row);

  if (sortMode === 'pick_desc') {
    return [pickCount, sharpCount, String(row.pulledAt ?? '')];
  }
  return [sharpCount, pickCount, String(row.pulledAt ?? '')];
}

function compareRows(left: BoardMarketRow, right: BoardMarketRow, sortMode: string): number {
  const [leftPrimary, leftSecondary, leftPulledAt] = getMarketSortValue(left.row, sortMode);
  const [rightPrimary, rightSecondary, rightPulledAt] = getMarketSortValue(right.row, sortMode);

  if (rightPrimary !== leftPrimary) {
    return rightPrimary - leftPrimary;
  }
  if (rightSecondary !== leftSecondary) {
    return rightSecondary - leftSecondary;
  }
  return rightPulledAt.localeCompare(leftPulledAt);
}

function buildFilteredRows(
  marketRows: BoardMarketRow[],
  sportFilter: string,
  teamFilter: string,
  sortMode: string
): BoardMarketRow[] {
  let rows = [...marketRows];

  if (sportFilter !== 'all') {
    rows = rows.filter(({ game }) => `${String(game.sport ?? '')}:${String(game.leagueSlug ?? '').toLowerCase()}` === sportFilter);
  }

  const normalizedTeamFilter = teamFilter.trim().toLowerCase();
  if (normalizedTeamFilter.length > 0) {
    rows = rows.filter(({ game }) => {
      const awayTeam = String(game.awayTeam ?? '').toLowerCase();
      const homeTeam = String(game.homeTeam ?? '').toLowerCase();
      return awayTeam.includes(normalizedTeamFilter) || homeTeam.includes(normalizedTeamFilter);
    });
  }

  if (sortMode === 'default') {
    const groups = new Map<string, BoardGameGroup>();

    for (const row of rows) {
      const gameKey = String(row.game.gameId ?? `${row.game.awayTeam}:${row.game.homeTeam}`);
      const sharpCount = getSharpCount(row.row);
      const pickCount = getPickCount(row.row);
      const existing = groups.get(gameKey);

      if (!existing) {
        groups.set(gameKey, {
          gameKey,
          rows: [row],
          strongestSharpCount: sharpCount,
          strongestPickCount: pickCount
        });
        continue;
      }

      existing.rows.push(row);
      existing.strongestSharpCount = Math.max(existing.strongestSharpCount, sharpCount);
      existing.strongestPickCount = Math.max(existing.strongestPickCount, pickCount);
    }

    return [...groups.values()]
      .sort((left, right) => {
        if (right.strongestSharpCount !== left.strongestSharpCount) {
          return right.strongestSharpCount - left.strongestSharpCount;
        }
        if (right.strongestPickCount !== left.strongestPickCount) {
          return right.strongestPickCount - left.strongestPickCount;
        }
        const rightPulledAt = String(right.rows[0]?.row.pulledAt ?? '');
        const leftPulledAt = String(left.rows[0]?.row.pulledAt ?? '');
        return rightPulledAt.localeCompare(leftPulledAt);
      })
      .flatMap((group) =>
        [...group.rows].sort((left, right) => {
          const marketDiff = (MARKET_ORDER[left.market] ?? 99) - (MARKET_ORDER[right.market] ?? 99);
          if (marketDiff !== 0) {
            return marketDiff;
          }
          return compareRows(left, right, 'sharp_desc');
        })
      );
  }

  rows.sort((left, right) => compareRows(left, right, sortMode));
  return rows;
}

function CurrentBoardLegacyTable({ rows }: { rows: BoardMarketRow[] }) {
  return (
    <section className="panel current-board-panel">
      <div className="current-board-table">
        <div className="current-board-table-head current-board-table-row">
          <div>Sport</div>
          <div>Game</div>
          <div>Market</div>
          <div>Pick</div>
          <div>Signal</div>
          <div>Sharps</div>
          <div>Picks</div>
          <div>Strength</div>
          <div>View</div>
        </div>

        {rows.map(({ game, market, row }) => (
          <div className="current-board-table-row current-board-data-row" key={`${String(game.gameId)}:${market}`}>
            <div className="current-board-cell current-board-sport-cell" data-label="Sport">{String(game.leagueSlug ?? game.sport ?? '').toUpperCase()}</div>
            <div className="current-board-cell current-board-game-cell" data-label="Game">
              <strong>{game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}</strong>
              <span className="subtle">{game.status ?? 'unknown'}</span>
            </div>
            <div className="current-board-cell current-board-market-cell" data-label="Market">{market}</div>
            <div className="current-board-cell current-board-pick-cell" data-label="Pick">
              <strong className="current-board-pick-text">{getPrimarySideText(game, market, row)}</strong>
            </div>
            <div className="current-board-cell current-board-badge-cell" data-label="Signal">
              <span className="pill current-board-pill current-board-pill-signal">{getSignalLabel(row)}</span>
            </div>
            <div className="current-board-cell" data-label="Sharps">{getSharpCount(row)}</div>
            <div className="current-board-cell" data-label="Picks">{getPickCount(row)}</div>
            <div className="current-board-cell current-board-badge-cell" data-label="Strength">
              {getSignalStrengthLabel(row) ? <span className="pill current-board-pill current-board-pill-strength">{getSignalStrengthLabel(row)}</span> : <span className="subtle">-</span>}
            </div>
            <div className="current-board-cell current-board-badge-cell" data-label="View">
              {getAgreementLabel(row) ? (
                <span
                  className={`pill current-board-pill ${
                    getAgreementLabel(row) === 'Conflict'
                      ? 'current-board-pill-conflict'
                      : 'current-board-pill-agreement'
                  }`}
                >
                  {getAgreementLabel(row)}
                </span>
              ) : <span className="subtle">-</span>}
            </div>
          </div>
        ))}

        {rows.length === 0 ? <div className="subtle">No board rows match the current filters with signal activity.</div> : null}
      </div>
    </section>
  );
}

export default function CurrentBoardPage() {
  const [board, setBoard] = useState<{
    generatedAt: string | null;
    boardDate: string | null;
    games: Array<Record<string, any>>;
  }>({
    generatedAt: null,
    boardDate: null,
    games: []
  });
  const [metadata, setMetadata] = useState<{ generatedAt: string | null }>({ generatedAt: null });
  const [sportFilter, setSportFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [sortMode, setSortMode] = useState('default');

  useEffect(() => {
    fetchPublicJson('/data/current_board.json', {
      generatedAt: null,
      boardDate: null,
      games: [] as Array<Record<string, any>>
    }).then(setBoard);

    fetchPublicJson('/data/metadata.json', {
      generatedAt: null
    }).then(setMetadata);
  }, []);

  const marketRows = useMemo<BoardMarketRow[]>(
    () =>
      board.games.flatMap((game) =>
        Object.entries((game.markets ?? {}) as Record<string, any>).map(([market, row]) => ({
          game,
          market,
          row
        }))
      ),
    [board.games]
  );

  const topBetsRightNow = useMemo(
    () =>
      [...marketRows]
        .filter(({ game, market, row }) => {
          const hasAlignedSignal = getSharpCount(row) > 0 && getPickCount(row) > 0 && getAgreementLabel(row) === 'Agree';
          if (!hasAlignedSignal) {
            return false;
          }
          return getPrimarySideText(game, market, row).trim().length > 0;
        })
        .sort((left, right) => {
          const scoreDiff = getTopBetScore(right.row) - getTopBetScore(left.row);
          if (scoreDiff !== 0) {
            return scoreDiff;
          }

          return String(right.row.pulledAt ?? '').localeCompare(String(left.row.pulledAt ?? ''));
        })
        .slice(0, 5),
    [marketRows]
  );

  const topSharpAction = useMemo(
    () =>
      [...marketRows]
        .filter(({ row }) => getSharpCount(row) > 0)
        .sort((left, right) => compareRows(left, right, 'sharp_desc'))
        .slice(0, 5),
    [marketRows]
  );

  const topPickAction = useMemo(
    () =>
      [...marketRows]
        .filter(({ row }) => getPickCount(row) > 0)
        .sort((left, right) => compareRows(left, right, 'pick_desc'))
        .slice(0, 5),
    [marketRows]
  );

  const filteredRows = useMemo(
    () => buildFilteredRows(marketRows, sportFilter, teamFilter, sortMode),
    [marketRows, sportFilter, teamFilter, sortMode]
  );

  const activeRows = useMemo(
    () => filteredRows.filter(({ row }) => getSharpCount(row) > 0 || getPickCount(row) > 0),
    [filteredRows]
  );

  if (USE_LEGACY_CURRENT_BOARD) {
    return (
      <main className="page current-board-page">
        <section className="hero current-board-hero">
          <div className="current-board-hero-copy">
            <div className="current-board-eyebrow">Legacy view</div>
            <h2>Current Board</h2>
            <p className="subtle">Fallback presentation for the previous board layout.</p>
          </div>
        </section>
        <CurrentBoardLegacyTable rows={activeRows} />
      </main>
    );
  }

  return (
    <main className="page current-board-page current-board-page-modern">
      <section className="current-board-stage">
        <section className="current-board-hero-panel">
          <div className="current-board-hero-surface">
            <div className="current-board-hero-copy">
              <div className="current-board-eyebrow">Current Board</div>
              <h2>Live market board for signal-driven bets</h2>
              <p className="current-board-hero-text">
                Review the strongest sharp and pick activity across the slate in a cleaner, faster board built for quick scanning.
              </p>
            </div>

            <div className="current-board-meta-strip">
              <div className="current-board-meta-chip">
                <span>Last updated</span>
                <strong>{formatTimestamp(metadata.generatedAt)}</strong>
              </div>
              <div className="current-board-meta-chip">
                <span>Games tracked</span>
                <strong>{board.games.length}</strong>
              </div>
              <div className="current-board-meta-chip">
                <span>Markets</span>
                <strong>{marketRows.length}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="current-board-top-bets-wrap">
          <article className="panel current-board-top-bets current-board-top-bets-focused">
            <div className="current-board-section-head current-board-top-bets-head">
              <div>
                <div className="current-board-section-kicker">Action shortlist</div>
                <h3>Top Bets Right Now</h3>
              </div>
              <p className="subtle current-board-top-bets-subtitle">
                Top signal-driven market rows right now, ranked by sharps first, then picks.
              </p>
            </div>

            <div className="summary-list">
              {topBetsRightNow.map(({ game, market, row }) => (
                <div className="summary-item current-board-top-bet-item" key={`top-bet:${String(game.gameId)}:${market}`}>
                  <div className="current-board-top-bet-main">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
=======
    timeZone: 'America/New_York'
  }).format(date);
}

function formatStartTime(value: string | null | undefined): string {
  if (!value) {
    return 'TBD';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/New_York'
  }).format(date);
}

function getPrimarySideText(game: Record<string, any>, market: string, row: Record<string, any>): string {
  const preferredSide = getSharpCount(row) > 0 ? getPrimarySignalSide(row, 'sharp') : getPrimarySignalSide(row, 'picks');

  if (market === 'total') {
    const totalLine = row.totalLine ?? row.overValue ?? row.underValue;
    if (preferredSide === 'over') {
      return totalLine == null ? 'Over' : `Over ${formatLineValue(Number(totalLine))}`;
    }
    if (preferredSide === 'under') {
      return totalLine == null ? 'Under' : `Under ${formatLineValue(Number(totalLine))}`;
    }
    return totalLine == null ? 'Total' : `Total ${formatLineValue(Number(totalLine))}`;
  }

  if (preferredSide === 'away') {
    const displayValue = market === 'spread' ? formatLineValue(Number(row.awayValue)) : formatSignedNumber(row.awayValue);
    return `${game.awayTeam ?? 'Away'} ${row.awayValue == null ? '' : displayValue}`.trim();
  }
  if (preferredSide === 'home') {
    const displayValue = market === 'spread' ? formatLineValue(Number(row.homeValue)) : formatSignedNumber(row.homeValue);
    return `${game.homeTeam ?? 'Home'} ${row.homeValue == null ? '' : displayValue}`.trim();
  }

  const awayDisplayValue = market === 'spread' ? formatLineValue(Number(row.awayValue)) : formatSignedNumber(row.awayValue);
  const homeDisplayValue = market === 'spread' ? formatLineValue(Number(row.homeValue)) : formatSignedNumber(row.homeValue);
  const awayText = `${game.awayTeam ?? 'Away'} ${row.awayValue == null ? '' : awayDisplayValue}`.trim();
  const homeText = `${game.homeTeam ?? 'Home'} ${row.homeValue == null ? '' : homeDisplayValue}`.trim();
  return `${awayText} / ${homeText}`;
}

function getCountsText(row: Record<string, any>): string {
  return `🔥 ${getSharpCount(row)} sharps • 📊 ${getPickCount(row)} picks`;
}

function getMarketSortValue(row: Record<string, any>, sortMode: string): [number, number, string] {
  const sharpCount = getSharpCount(row);
  const pickCount = getPickCount(row);

  if (sortMode === 'pick_desc') {
    return [pickCount, sharpCount, String(row.pulledAt ?? '')];
  }
  return [sharpCount, pickCount, String(row.pulledAt ?? '')];
}

function compareRows(left: BoardMarketRow, right: BoardMarketRow, sortMode: string): number {
  const [leftPrimary, leftSecondary, leftPulledAt] = getMarketSortValue(left.row, sortMode);
  const [rightPrimary, rightSecondary, rightPulledAt] = getMarketSortValue(right.row, sortMode);

  if (rightPrimary !== leftPrimary) {
    return rightPrimary - leftPrimary;
  }
  if (rightSecondary !== leftSecondary) {
    return rightSecondary - leftSecondary;
  }
  return rightPulledAt.localeCompare(leftPulledAt);
}

function buildFilteredRows(
  marketRows: BoardMarketRow[],
  sportFilter: string,
  teamFilter: string,
  sortMode: string
): BoardMarketRow[] {
  let rows = [...marketRows];

  if (sportFilter !== 'all') {
    rows = rows.filter(({ game }) => `${String(game.sport ?? '')}:${String(game.leagueSlug ?? '').toLowerCase()}` === sportFilter);
  }

  const normalizedTeamFilter = teamFilter.trim().toLowerCase();
  if (normalizedTeamFilter.length > 0) {
    rows = rows.filter(({ game }) => {
      const awayTeam = String(game.awayTeam ?? '').toLowerCase();
      const homeTeam = String(game.homeTeam ?? '').toLowerCase();
      return awayTeam.includes(normalizedTeamFilter) || homeTeam.includes(normalizedTeamFilter);
    });
  }

  if (sortMode === 'default') {
    const groups = new Map<string, BoardGameGroup>();

    for (const row of rows) {
      const gameKey = String(row.game.gameId ?? `${row.game.awayTeam}:${row.game.homeTeam}`);
      const sharpCount = getSharpCount(row.row);
      const pickCount = getPickCount(row.row);
      const existing = groups.get(gameKey);

      if (!existing) {
        groups.set(gameKey, {
          gameKey,
          rows: [row],
          strongestSharpCount: sharpCount,
          strongestPickCount: pickCount
        });
        continue;
      }

      existing.rows.push(row);
      existing.strongestSharpCount = Math.max(existing.strongestSharpCount, sharpCount);
      existing.strongestPickCount = Math.max(existing.strongestPickCount, pickCount);
    }

    return [...groups.values()]
      .sort((left, right) => {
        if (right.strongestSharpCount !== left.strongestSharpCount) {
          return right.strongestSharpCount - left.strongestSharpCount;
        }
        if (right.strongestPickCount !== left.strongestPickCount) {
          return right.strongestPickCount - left.strongestPickCount;
        }
        const rightPulledAt = String(right.rows[0]?.row.pulledAt ?? '');
        const leftPulledAt = String(left.rows[0]?.row.pulledAt ?? '');
        return rightPulledAt.localeCompare(leftPulledAt);
      })
      .flatMap((group) =>
        [...group.rows].sort((left, right) => {
          const marketDiff = (MARKET_ORDER[left.market] ?? 99) - (MARKET_ORDER[right.market] ?? 99);
          if (marketDiff !== 0) {
            return marketDiff;
          }
          return compareRows(left, right, 'sharp_desc');
        })
      );
  }

  rows.sort((left, right) => compareRows(left, right, sortMode));
  return rows;
}

function CurrentBoardLegacyTable({ rows }: { rows: BoardMarketRow[] }) {
  return (
    <section className="panel current-board-panel">
      <div className="current-board-table">
        <div className="current-board-table-head current-board-table-row">
          <div>Sport</div>
          <div>Game</div>
          <div>Market</div>
          <div>Pick</div>
          <div>Signal</div>
          <div>Sharps</div>
          <div>Picks</div>
          <div>Strength</div>
          <div>View</div>
        </div>

        {rows.map(({ game, market, row }) => (
          <div className="current-board-table-row current-board-data-row" key={`${String(game.gameId)}:${market}`}>
            <div className="current-board-cell current-board-sport-cell" data-label="Sport">{String(game.leagueSlug ?? game.sport ?? '').toUpperCase()}</div>
            <div className="current-board-cell current-board-game-cell" data-label="Game">
              <strong>{game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}</strong>
              <span className="subtle">{game.status ?? 'unknown'}</span>
            </div>
            <div className="current-board-cell current-board-market-cell" data-label="Market">{market}</div>
            <div className="current-board-cell current-board-pick-cell" data-label="Pick">
              <strong className="current-board-pick-text">{getPrimarySideText(game, market, row)}</strong>
            </div>
            <div className="current-board-cell current-board-badge-cell" data-label="Signal">
              <span className="pill current-board-pill current-board-pill-signal">{getSignalLabel(row)}</span>
            </div>
            <div className="current-board-cell" data-label="Sharps">{getSharpCount(row)}</div>
            <div className="current-board-cell" data-label="Picks">{getPickCount(row)}</div>
            <div className="current-board-cell current-board-badge-cell" data-label="Strength">
              {getSignalStrengthLabel(row) ? <span className="pill current-board-pill current-board-pill-strength">{getSignalStrengthLabel(row)}</span> : <span className="subtle">-</span>}
            </div>
            <div className="current-board-cell current-board-badge-cell" data-label="View">
              {getAgreementLabel(row) ? (
                <span
                  className={`pill current-board-pill ${
                    getAgreementLabel(row) === 'Conflict'
                      ? 'current-board-pill-conflict'
                      : 'current-board-pill-agreement'
                  }`}
                >
                  {getAgreementLabel(row)}
                </span>
              ) : <span className="subtle">-</span>}
            </div>
          </div>
        ))}

        {rows.length === 0 ? <div className="subtle">No board rows match the current filters with signal activity.</div> : null}
      </div>
    </section>
  );
}

export default function CurrentBoardPage() {
  const [board, setBoard] = useState<{
    generatedAt: string | null;
    boardDate: string | null;
    games: Array<Record<string, any>>;
  }>({
    generatedAt: null,
    boardDate: null,
    games: []
  });
  const [metadata, setMetadata] = useState<{ generatedAt: string | null }>({ generatedAt: null });
  const [sportFilter, setSportFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [sortMode, setSortMode] = useState('default');

  useEffect(() => {
    fetchPublicJson('/data/current_board.json', {
      generatedAt: null,
      boardDate: null,
      games: [] as Array<Record<string, any>>
    }).then(setBoard);

    fetchPublicJson('/data/metadata.json', {
      generatedAt: null
    }).then(setMetadata);
  }, []);

  const marketRows = useMemo<BoardMarketRow[]>(
    () =>
      board.games.flatMap((game) =>
        Object.entries((game.markets ?? {}) as Record<string, any>).map(([market, row]) => ({
          game,
          market,
          row
        }))
      ),
    [board.games]
  );

  const topBetsRightNow = useMemo(
    () =>
      [...marketRows]
        .filter(({ game, market, row }) => {
          const hasAlignedSignal = getSharpCount(row) > 0 && getPickCount(row) > 0 && getAgreementLabel(row) === 'Agree';
          if (!hasAlignedSignal) {
            return false;
          }
          return getPrimarySideText(game, market, row).trim().length > 0;
        })
        .sort((left, right) => {
          const scoreDiff = getTopBetScore(right.row) - getTopBetScore(left.row);
          if (scoreDiff !== 0) {
            return scoreDiff;
          }

          return String(right.row.pulledAt ?? '').localeCompare(String(left.row.pulledAt ?? ''));
        })
        .slice(0, 5),
    [marketRows]
  );

  const topSharpAction = useMemo(
    () =>
      [...marketRows]
        .filter(({ row }) => getSharpCount(row) > 0)
        .sort((left, right) => compareRows(left, right, 'sharp_desc'))
        .slice(0, 5),
    [marketRows]
  );

  const topPickAction = useMemo(
    () =>
      [...marketRows]
        .filter(({ row }) => getPickCount(row) > 0)
        .sort((left, right) => compareRows(left, right, 'pick_desc'))
        .slice(0, 5),
    [marketRows]
  );

  const filteredRows = useMemo(
    () => buildFilteredRows(marketRows, sportFilter, teamFilter, sortMode),
    [marketRows, sportFilter, teamFilter, sortMode]
  );

  const activeRows = useMemo(
    () => filteredRows.filter(({ row }) => getSharpCount(row) > 0 || getPickCount(row) > 0),
    [filteredRows]
  );

  if (USE_LEGACY_CURRENT_BOARD) {
    return (
      <main className="page current-board-page">
        <section className="hero current-board-hero">
          <div className="current-board-hero-copy">
            <div className="current-board-eyebrow">Legacy view</div>
            <h2>Current Board</h2>
            <p className="subtle">Fallback presentation for the previous board layout.</p>
          </div>
        </section>
        <CurrentBoardLegacyTable rows={activeRows} />
      </main>
    );
  }

  return (
    <main className="page current-board-page current-board-page-modern">
      <section className="current-board-stage">
        <section className="current-board-hero-panel">
          <div className="current-board-hero-surface">
            <div className="current-board-hero-copy">
              <div className="current-board-eyebrow">Current Board</div>
              <h2>Live market board for signal-driven bets</h2>
              <p className="current-board-hero-text">
                Review the strongest sharp and pick activity across the slate in a cleaner, faster board built for quick scanning.
              </p>
            </div>

            <div className="current-board-meta-strip">
              <div className="current-board-meta-chip">
                <span>Last updated</span>
                <strong>{formatTimestamp(metadata.generatedAt)}</strong>
              </div>
              <div className="current-board-meta-chip">
                <span>Games tracked</span>
                <strong>{board.games.length}</strong>
              </div>
              <div className="current-board-meta-chip">
                <span>Markets</span>
                <strong>{marketRows.length}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="current-board-top-bets-wrap">
          <article className="panel current-board-top-bets current-board-top-bets-focused">
            <div className="current-board-section-head current-board-top-bets-head">
              <div>
                <div className="current-board-section-kicker">Action shortlist</div>
                <h3>Top Bets Right Now</h3>
              </div>
              <p className="subtle current-board-top-bets-subtitle">
                Top signal-driven market rows right now, ranked by sharps first, then picks.
              </p>
            </div>

            <div className="summary-list">
              {topBetsRightNow.map(({ game, market, row }) => (
                <div className="summary-item current-board-top-bet-item" key={`top-bet:${String(game.gameId)}:${market}`}>
                  <div className="current-board-top-bet-main">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
>>>>>>> 56b8195 (Fix tournament tab + update data)
                  <div className="current-board-summary-detail-row">
                      <span className="current-board-summary-market">{market}</span>
                      <span className="current-board-summary-detail">{getPrimarySideText(game, market, row)}</span>
                    </div>
                    <div className="subtle current-board-summary-time">{formatStartTime(String(game.startTimeUtc ?? ''))}</div>
                  </div>
                  <div className="current-board-top-bet-meta">
<<<<<<< HEAD
                    <div className="current-board-top-bet-counts">{getCountsText(row)}</div>
                    <div className="current-board-top-bet-badges">
                      <span className="pill current-board-pill current-board-pill-signal">{getSignalLabel(row)}</span>
                      {getSignalStrengthLabel(row) ? <span className="pill current-board-pill current-board-pill-strength">{getSignalStrengthLabel(row)}</span> : null}
                      {getAgreementLabel(row) ? (
                        <span
                          className={`pill current-board-pill ${
                            getAgreementLabel(row) === 'Conflict'
                              ? 'current-board-pill-conflict'
                              : 'current-board-pill-agreement'
                          }`}
                        >
                          {getAgreementLabel(row)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {topBetsRightNow.length === 0 ? <div className="subtle">No signal-driven bets available right now.</div> : null}
            </div>
          </article>
        </section>

        <section className="cards two-up current-board-summary-grid">
          <article className="panel current-board-summary">
            <div className="current-board-section-head current-board-summary-head">
              <div>
                <div className="current-board-section-kicker">Signal volume</div>
                <h3>Most Sharp Action</h3>
              </div>
            </div>
            <div className="summary-list">
              {topSharpAction.map(({ game, market, row }) => (
                <div className="summary-item current-board-summary-item" key={`sharp:${String(game.gameId)}:${market}`}>
                  <div className="current-board-summary-copy">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
=======
                    <div className="current-board-top-bet-counts">{getCountsText(row)}</div>
                    <div className="current-board-top-bet-badges">
                      <span className="pill current-board-pill current-board-pill-signal">{getSignalLabel(row)}</span>
                      {getSignalStrengthLabel(row) ? <span className="pill current-board-pill current-board-pill-strength">{getSignalStrengthLabel(row)}</span> : null}
                      {getAgreementLabel(row) ? (
                        <span
                          className={`pill current-board-pill ${
                            getAgreementLabel(row) === 'Conflict'
                              ? 'current-board-pill-conflict'
                              : 'current-board-pill-agreement'
                          }`}
                        >
                          {getAgreementLabel(row)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {topBetsRightNow.length === 0 ? <div className="subtle">No signal-driven bets available right now.</div> : null}
            </div>
          </article>
        </section>

        <section className="cards two-up current-board-summary-grid">
          <article className="panel current-board-summary">
            <div className="current-board-section-head current-board-summary-head">
              <div>
                <div className="current-board-section-kicker">Signal volume</div>
                <h3>Most Sharp Action</h3>
              </div>
            </div>
            <div className="summary-list">
              {topSharpAction.map(({ game, market, row }) => (
                <div className="summary-item current-board-summary-item" key={`sharp:${String(game.gameId)}:${market}`}>
                  <div className="current-board-summary-copy">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
>>>>>>> 56b8195 (Fix tournament tab + update data)
                  <div className="subtle current-board-summary-detail">
                      {market} | {getPrimarySideText(game, market, row)}
                    </div>
                    <div className="subtle current-board-summary-time">{formatStartTime(String(game.startTimeUtc ?? ''))}</div>
                  </div>
                  <strong className="current-board-summary-count">{getSharpCount(row)} sharps</strong>
<<<<<<< HEAD
                </div>
              ))}
              {topSharpAction.length === 0 ? <div className="subtle">No sharp activity yet</div> : null}
            </div>
          </article>

          <article className="panel current-board-summary">
            <div className="current-board-section-head current-board-summary-head">
              <div>
                <div className="current-board-section-kicker">Consensus volume</div>
                <h3>Most Picks</h3>
              </div>
            </div>
            <div className="summary-list">
              {topPickAction.map(({ game, market, row }) => (
                <div className="summary-item current-board-summary-item" key={`pick:${String(game.gameId)}:${market}`}>
                  <div className="current-board-summary-copy">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
=======
                </div>
              ))}
              {topSharpAction.length === 0 ? <div className="subtle">No sharp activity yet</div> : null}
            </div>
          </article>

          <article className="panel current-board-summary">
            <div className="current-board-section-head current-board-summary-head">
              <div>
                <div className="current-board-section-kicker">Consensus volume</div>
                <h3>Most Picks</h3>
              </div>
            </div>
            <div className="summary-list">
              {topPickAction.map(({ game, market, row }) => (
                <div className="summary-item current-board-summary-item" key={`pick:${String(game.gameId)}:${market}`}>
                  <div className="current-board-summary-copy">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
>>>>>>> 56b8195 (Fix tournament tab + update data)
                  <div className="subtle current-board-summary-detail">
                      {market} | {getPrimarySideText(game, market, row)}
                    </div>
                    <div className="subtle current-board-summary-time">{formatStartTime(String(game.startTimeUtc ?? ''))}</div>
                  </div>
                  <strong className="current-board-summary-count">{getPickCount(row)} picks</strong>
                </div>
              ))}
              {topPickAction.length === 0 ? <div className="subtle">No pick activity yet</div> : null}
            </div>
          </article>
        </section>

        <section className="panel current-board-controls-panel current-board-controls-modern">
          <div className="current-board-controls-copy">
            <div className="current-board-section-kicker">Board tools</div>
            <h3>Filter The Board</h3>
          </div>
          <div className="controls current-board-controls-grid">
            <div className="control">
              <label htmlFor="sport-filter">Sport</label>
              <select id="sport-filter" value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
                {SPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="control">
              <label htmlFor="team-filter">Team</label>
              <input
                id="team-filter"
                type="text"
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                placeholder="Search team"
              />
            </div>

            <div className="control">
              <label htmlFor="sort-mode">Sort</label>
              <select id="sort-mode" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="panel current-board-panel current-board-workspace">
          <div className="current-board-workspace-head">
            <div>
              <div className="current-board-section-kicker">Live market board</div>
              <h3>Board Watchlist</h3>
            </div>
            <p className="subtle current-board-workspace-note">
              Compact market rows ranked for quick scanning across the full slate.
            </p>
          </div>

          <div className="current-board-table current-board-table-modern">
            <div className="current-board-table-head current-board-table-row current-board-table-row-modern">
              <div>Sport</div>
              <div>Game</div>
              <div>Start</div>
              <div>Market</div>
              <div>Bet</div>
              <div>Sharps</div>
              <div>Picks</div>
              <div>Strength</div>
              <div>Alignment</div>
            </div>

            {activeRows.map(({ game, market, row }) => (
              <div className="current-board-table-row current-board-data-row current-board-table-row-modern" key={`${String(game.gameId)}:${market}`}>
              <div className="current-board-cell current-board-sport-cell" data-label="Sport">{String(game.leagueSlug ?? game.sport ?? '').toUpperCase()}</div>
              <div className="current-board-cell current-board-game-cell" data-label="Game">
                <strong>{game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}</strong>
              </div>
              <div className="current-board-cell current-board-start-cell" data-label="Start">
                {formatStartTime(String(game.startTimeUtc ?? ''))}
              </div>
              <div className="current-board-cell current-board-market-cell" data-label="Market">{market}</div>
              <div className="current-board-cell current-board-pick-cell" data-label="Bet">
                <strong className="current-board-pick-text">{getPrimarySideText(game, market, row)}</strong>
              </div>
              <div className="current-board-cell current-board-detail-cell" data-label="Sharps">{getSharpViewText(game, market, row)}</div>
              <div className="current-board-cell current-board-detail-cell" data-label="Picks">{getPickViewText(game, market, row)}</div>
              <div className="current-board-cell current-board-badge-cell" data-label="Strength">
                  {getSignalStrengthLabel(row) ? <span className="pill current-board-pill current-board-pill-strength">{getSignalStrengthLabel(row)}</span> : <span className="subtle">-</span>}
                </div>
                <div className="current-board-cell current-board-badge-cell" data-label="Alignment">
                  {getAgreementLabel(row) ? (
                    <span
                      className={`pill current-board-pill ${
                        getAgreementLabel(row) === 'Conflict'
                          ? 'current-board-pill-conflict'
                          : 'current-board-pill-agreement'
                      }`}
                    >
                      {getAgreementLabel(row)}
                    </span>
                  ) : <span className="subtle">-</span>}
                </div>
              </div>
            ))}

            {activeRows.length === 0 ? <div className="subtle">No board rows match the current filters with signal activity.</div> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
