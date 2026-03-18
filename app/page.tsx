'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchPublicJson,
  formatSignedNumber,
  getCloseDeltaSummary,
  getPrimaryPickCount,
  getPrimarySharpCount,
  getPrimarySignalSide,
  getPublicSummary
} from '../lib/data';

type BoardMarketRow = {
  game: Record<string, any>;
  market: string;
  row: Record<string, any>;
};

type BoardGameGroup = {
  gameId: string;
  game: Record<string, any>;
  rows: BoardMarketRow[];
};

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

function getCountsText(row: Record<string, any>): string {
  return `${getSharpCount(row)} sharps | ${getPickCount(row)} picks`;
}

function getPrimarySideText(game: Record<string, any>, market: string, row: Record<string, any>): string {
  const preferredSide = getSharpCount(row) > 0 ? getPrimarySignalSide(row, 'sharp') : getPrimarySignalSide(row, 'picks');

  if (market === 'total') {
    const totalLine = row.totalLine ?? row.overValue ?? row.underValue ?? 'N/A';
    if (preferredSide === 'over') {
      return `Pick: Over ${totalLine}`;
    }
    if (preferredSide === 'under') {
      return `Pick: Under ${totalLine}`;
    }
    return `Pick: Total ${totalLine}`;
  }

  if (preferredSide === 'away') {
    return `Pick: ${game.awayTeam ?? 'Away'} ${formatSignedNumber(row.awayValue)}`;
  }
  if (preferredSide === 'home') {
    return `Pick: ${game.homeTeam ?? 'Home'} ${formatSignedNumber(row.homeValue)}`;
  }

  return `Pick: ${game.awayTeam ?? 'Away'} ${formatSignedNumber(row.awayValue)} / ${game.homeTeam ?? 'Home'} ${formatSignedNumber(row.homeValue)}`;
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

function compareGroups(left: BoardGameGroup, right: BoardGameGroup, sortMode: string): number {
  const leftTopRow = [...left.rows].sort((a, b) => compareRows(a, b, sortMode))[0];
  const rightTopRow = [...right.rows].sort((a, b) => compareRows(a, b, sortMode))[0];

  if (!leftTopRow || !rightTopRow) {
    return 0;
  }

  return compareRows(leftTopRow, rightTopRow, sortMode);
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
  const [sortMode, setSortMode] = useState('sharp_desc');

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

  const filteredRows = useMemo(() => {
    let rows = [...marketRows];

    if (sportFilter !== 'all') {
      rows = rows.filter(({ game }) => `${String(game.sport ?? '')}:${String(game.leagueSlug ?? '').toLowerCase()}` === sportFilter);
    }

    rows.sort((left, right) => compareRows(left, right, sortMode));
    return rows;
  }, [marketRows, sportFilter, sortMode]);

  const groupedGames = useMemo<BoardGameGroup[]>(() => {
    const groups = new Map<string, BoardGameGroup>();

    for (const row of filteredRows) {
      const gameId = String(row.game.gameId ?? `${row.game.awayTeam}:${row.game.homeTeam}`);
      if (!groups.has(gameId)) {
        groups.set(gameId, {
          gameId,
          game: row.game,
          rows: []
        });
      }
      groups.get(gameId)?.rows.push(row);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((left, right) => {
          const orderDiff = (MARKET_ORDER[left.market] ?? 99) - (MARKET_ORDER[right.market] ?? 99);
          if (orderDiff !== 0) {
            return orderDiff;
          }
          return compareRows(left, right, sortMode);
        })
      }))
      .sort((left, right) => compareGroups(left, right, sortMode));
  }, [filteredRows, sortMode]);

  return (
    <main className="page current-board-page">
      <section className="hero current-board-hero">
        <div className="current-board-hero-copy">
          <div className="current-board-eyebrow">Live board</div>
          <h2>Current Board</h2>
          <p className="subtle">What looks interesting right now, based on the latest available rows for today&apos;s board.</p>
        </div>
        <div className="metrics current-board-metrics">
          <div className="metric current-board-metric">
            <label>Last Updated</label>
            <strong>{metadata.generatedAt ?? 'N/A'}</strong>
          </div>
          <div className="metric current-board-metric">
            <label>Games Tracked</label>
            <strong>{board.games.length}</strong>
          </div>
          <div className="metric current-board-metric">
            <label>Markets</label>
            <strong>{marketRows.length}</strong>
          </div>
        </div>
      </section>

      <section className="cards two-up">
        <article className="panel current-board-summary">
          <h3>Most Sharp Action</h3>
          <div className="summary-list">
            {topSharpAction.map(({ game, market, row }) => (
              <div className="summary-item current-board-summary-item" key={`sharp:${String(game.gameId)}:${market}`}>
                <div className="current-board-summary-copy">
                  <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                    {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                  </strong>
                  <div className="subtle current-board-summary-detail">
                    {market} | {getPrimarySideText(game, market, row)}
                  </div>
                </div>
                <strong className="current-board-summary-count">{getSharpCount(row)} sharps</strong>
              </div>
            ))}
            {topSharpAction.length === 0 ? <div className="subtle">No sharp activity yet</div> : null}
          </div>
        </article>

        <article className="panel current-board-summary">
          <h3>Most Picks</h3>
          <div className="summary-list">
            {topPickAction.map(({ game, market, row }) => (
              <div className="summary-item current-board-summary-item" key={`pick:${String(game.gameId)}:${market}`}>
                <div className="current-board-summary-copy">
                  <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                    {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                  </strong>
                  <div className="subtle current-board-summary-detail">
                    {market} | {getPrimarySideText(game, market, row)}
                  </div>
                </div>
                <strong className="current-board-summary-count">{getPickCount(row)} picks</strong>
              </div>
            ))}
            {topPickAction.length === 0 ? <div className="subtle">No pick activity yet</div> : null}
          </div>
        </article>
      </section>

      <section className="panel current-board-controls-panel">
        <div className="controls">
          <div className="control">
            <label htmlFor="sport-filter">Sport</label>
            <select id="sport-filter" value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
              {SPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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

      <section className="panel current-board-panel">
        <div className="current-board-groups">
          {groupedGames.map((group) => (
            <article key={group.gameId} className="current-board-game">
              <div className="current-board-game-header">
                <strong className="current-board-game-title">{group.game.awayTeam ?? 'Away'} at {group.game.homeTeam ?? 'Home'}</strong>
                <div className="subtle current-board-game-meta">{String(group.game.leagueSlug ?? '').toUpperCase()} | {group.game.status ?? 'unknown'} | {board.boardDate ?? 'N/A'}</div>
              </div>

              <div className="current-board-market-list">
                {group.rows.map(({ market, row }) => (
                  <div key={`${group.gameId}:${market}`} className="current-board-market-row">
                    <div className="current-board-market-top">
                      <div className="current-board-market-badges">
                        <strong className="current-board-market-name">{market}</strong>
                        <span className="pill current-board-pill current-board-pill-signal">{getSignalLabel(row)}</span>
                        {getSignalStrengthLabel(row) ? <span className="pill current-board-pill current-board-pill-strength">{getSignalStrengthLabel(row)}</span> : null}
                        {getAgreementLabel(row) ? <span className="pill current-board-pill current-board-pill-agreement">{getAgreementLabel(row)}</span> : null}
                      </div>
                      <span className="subtle current-board-close-delta">{getCloseDeltaSummary(row)}</span>
                    </div>

                    <div className="current-board-primary-side">
                      {getPrimarySideText(group.game, market, row)}
                    </div>

                    <div className="current-board-market-bottom">
                      <span className="current-board-counts">{getCountsText(row)}</span>
                      <span className="subtle current-board-public">{getPublicSummary(row)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}

          {groupedGames.length === 0 ? <div className="subtle">No board rows match the current sport filter.</div> : null}
        </div>
      </section>
    </main>
  );
}
