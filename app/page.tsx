'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchPublicJson,
  formatSignedNumber,
  getCloseDeltaSummary,
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

function getPrimarySideText(game: Record<string, any>, market: string, row: Record<string, any>): string {
  const preferredSide = getSharpCount(row) > 0 ? getPrimarySignalSide(row, 'sharp') : getPrimarySignalSide(row, 'picks');

  if (market === 'total') {
    const totalLine = row.totalLine ?? row.overValue ?? row.underValue ?? 'N/A';
    if (preferredSide === 'over') {
      return `Over ${totalLine}`;
    }
    if (preferredSide === 'under') {
      return `Under ${totalLine}`;
    }
    return `Total ${totalLine}`;
  }

  if (preferredSide === 'away') {
    return `${game.awayTeam ?? 'Away'} ${formatSignedNumber(row.awayValue)}`;
  }
  if (preferredSide === 'home') {
    return `${game.homeTeam ?? 'Home'} ${formatSignedNumber(row.homeValue)}`;
  }

  return `${game.awayTeam ?? 'Away'} ${formatSignedNumber(row.awayValue)} / ${game.homeTeam ?? 'Home'} ${formatSignedNumber(row.homeValue)}`;
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
  }, [marketRows, sportFilter, teamFilter, sortMode]);

  const activeRows = useMemo(
    () => filteredRows.filter(({ row }) => getSharpCount(row) > 0 || getPickCount(row) > 0),
    [filteredRows]
  );

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

          {activeRows.map(({ game, market, row }) => (
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
                {getAgreementLabel(row) ? <span className="pill current-board-pill current-board-pill-agreement">{getAgreementLabel(row)}</span> : <span className="subtle">-</span>}
              </div>
            </div>
          ))}

          {activeRows.length === 0 ? <div className="subtle">No board rows match the current filters with signal activity.</div> : null}
        </div>
      </section>
    </main>
  );
}
