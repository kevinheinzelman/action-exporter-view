'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchPublicJson,
  getCloseDeltaSummary,
  getDisplayValue,
  getPickSummary,
  getPrimaryPickCount,
  getPrimarySharpCount,
  getPrimarySignalSide,
  getPublicSummary,
  getSharpSummary,
} from '../lib/data';

type BoardMarketRow = {
  game: Record<string, any>;
  market: string;
  row: Record<string, any>;
};

function getPrimarySharpCountForRow(row: Record<string, any>): number {
  return getPrimarySharpCount(row);
}

function getPrimaryPickCountForRow(row: Record<string, any>): number {
  return getPrimaryPickCount(row);
}

function getInterestLabel(row: Record<string, any>): string | null {
  const sharpCount = getPrimarySharpCountForRow(row);
  const pickCount = getPrimaryPickCountForRow(row);

  if (sharpCount > 0 && pickCount > 0) {
    return 'Sharps + Picks';
  }
  if (sharpCount > 0) {
    return 'Sharp Action';
  }
  if (pickCount > 0) {
    return 'Pick Majority';
  }
  return null;
}

function getCountsSummary(row: Record<string, any>): string {
  const sharpCount = getPrimarySharpCountForRow(row);
  const pickCount = getPrimaryPickCountForRow(row);
  const parts: string[] = [];

  if (sharpCount > 0) {
    parts.push(`${sharpCount} sharps`);
  }
  if (pickCount > 0) {
    parts.push(`${pickCount} picks`);
  }

  return parts.join(' | ');
}

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

  const [sportFilter, setSportFilter] = useState('all');
  const [sortMode, setSortMode] = useState('default');

  useEffect(() => {
    fetchPublicJson('/data/current_board.json', {
      generatedAt: null,
      boardDate: null,
      games: [] as Array<Record<string, any>>
    }).then(setBoard);
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
        .filter(({ row }) => getPrimarySharpCountForRow(row) > 0)
        .sort((left, right) => {
          const countDiff = getPrimarySharpCountForRow(right.row) - getPrimarySharpCountForRow(left.row);
          if (countDiff !== 0) {
            return countDiff;
          }
          return String(right.row.pulledAt ?? '').localeCompare(String(left.row.pulledAt ?? ''));
        })
        .slice(0, 5),
    [marketRows]
  );

  const topPickAction = useMemo(
    () =>
      [...marketRows]
        .filter(({ row }) => getPrimaryPickCountForRow(row) > 0)
        .sort((left, right) => {
          const countDiff = getPrimaryPickCountForRow(right.row) - getPrimaryPickCountForRow(left.row);
          if (countDiff !== 0) {
            return countDiff;
          }
          return String(right.row.pulledAt ?? '').localeCompare(String(left.row.pulledAt ?? ''));
        })
        .slice(0, 5),
    [marketRows]
  );

  const filteredRows = useMemo(() => {
    let rows = [...marketRows];

    if (sportFilter !== 'all') {
      rows = rows.filter(({ game }) => `${String(game.sport ?? '')}:${String(game.leagueSlug ?? '').toLowerCase()}` === sportFilter);
    }

    if (sortMode === 'sharp_desc') {
      rows.sort((left, right) => {
        const countDiff = getPrimarySharpCountForRow(right.row) - getPrimarySharpCountForRow(left.row);
        if (countDiff !== 0) {
          return countDiff;
        }
        return String(right.row.pulledAt ?? '').localeCompare(String(left.row.pulledAt ?? ''));
      });
    } else if (sortMode === 'pick_desc') {
      rows.sort((left, right) => {
        const countDiff = getPrimaryPickCountForRow(right.row) - getPrimaryPickCountForRow(left.row);
        if (countDiff !== 0) {
          return countDiff;
        }
        return String(right.row.pulledAt ?? '').localeCompare(String(left.row.pulledAt ?? ''));
      });
    }

    return rows;
  }, [marketRows, sportFilter, sortMode]);

  return (
    <main className="page">
      <section className="hero">
        <h2>Current Board</h2>
        <p className="subtle">What looks interesting right now, based on the latest available rows for today&apos;s board.</p>
        <div className="metrics">
          <div className="metric">
            <label>Board Date</label>
            <strong>{board.boardDate ?? 'N/A'}</strong>
          </div>
          <div className="metric">
            <label>Markets</label>
            <strong>{marketRows.length}</strong>
          </div>
          <div className="metric">
            <label>Generated</label>
            <strong>{board.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="cards two-up">
        <article className="panel">
          <h3>Most Sharp Action</h3>
          <div className="summary-list">
            {topSharpAction.map(({ game, market, row }) => (
              <div
                className="summary-item"
                key={`sharp:${String(game.gameId)}:${market}`}
                style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}
                  >
                    {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                  </strong>
                  <div className="subtle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {market} | {getPrimarySignalSide(row, 'sharp')}
                  </div>
                </div>
                <strong style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>🔥 {getPrimarySharpCountForRow(row)} sharps</strong>
              </div>
            ))}
            {topSharpAction.length === 0 ? <div className="subtle">No sharp activity yet</div> : null}
          </div>
        </article>

        <article className="panel">
          <h3>Most Picks</h3>
          <div className="summary-list">
            {topPickAction.map(({ game, market, row }) => (
              <div
                className="summary-item"
                key={`pick:${String(game.gameId)}:${market}`}
                style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}
                  >
                    {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                  </strong>
                  <div className="subtle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {market} | {getPrimarySignalSide(row, 'picks')}
                  </div>
                </div>
                <strong style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>📊 {getPrimaryPickCountForRow(row)} picks</strong>
              </div>
            ))}
            {topPickAction.length === 0 ? <div className="subtle">No pick activity yet</div> : null}
          </div>
        </article>
      </section>

      <section className="panel">
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

      <section className="panel table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Market</th>
              <th>Current Value</th>
              <th>Signal</th>
              <th>Sharps</th>
              <th>Picks</th>
              <th>Public %</th>
              <th>Close Delta</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ game, market, row }) => (
              <tr key={`${String(game.gameId)}:${market}`}>
                <td>
                  <strong>{game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}</strong>
                  <div className="subtle">{String(game.leagueSlug ?? '').toUpperCase()} | {game.status ?? 'unknown'}</div>
                </td>
                <td>{market}</td>
                <td>{getDisplayValue(row)}</td>
                <td>
                  {getInterestLabel(row) ? <span className="pill">{getInterestLabel(row)}</span> : null}
                  {!getInterestLabel(row) ? <span className="subtle">No clear signal</span> : null}
                </td>
                <td>
                  <div>{getSharpSummary(row)}</div>
                  {getPrimarySharpCountForRow(row) > 0 ? <div className="subtle">{getPrimarySharpCountForRow(row)} sharps</div> : null}
                </td>
                <td>
                  <div>{getPickSummary(row)}</div>
                  {getPrimaryPickCountForRow(row) > 0 ? <div className="subtle">{getPrimaryPickCountForRow(row)} picks</div> : null}
                </td>
                <td>{getPublicSummary(row)}</td>
                <td>{getCloseDeltaSummary(row)}</td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="subtle">No board rows match the current sport filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="cards mobile-only">
        {filteredRows.map(({ game, market, row }) => (
          <article className="card" key={`${String(game.gameId)}:${market}`}>
            <div className="subtle">{String(game.leagueSlug ?? '').toUpperCase()} | {market}</div>
            <h3>{game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}</h3>
            <div>
              {getInterestLabel(row) ? <span className="pill">{getInterestLabel(row)}</span> : null}
              {!getInterestLabel(row) ? <span className="subtle">No clear signal</span> : null}
            </div>
            <p className="subtle">{getDisplayValue(row)}</p>
            {getCountsSummary(row) ? <p className="subtle" style={{ marginTop: '-4px' }}>{getCountsSummary(row)}</p> : null}
            <div className="compact-grid">
              <div><label>Sharps</label><strong>{getSharpSummary(row)}</strong></div>
              <div><label>Picks</label><strong>{getPickSummary(row)}</strong></div>
              <div><label>Public %</label><strong>{getPublicSummary(row)}</strong></div>
              <div><label>Close Delta</label><strong>{getCloseDeltaSummary(row)}</strong></div>
            </div>
          </article>
        ))}
        {filteredRows.length === 0 ? (
          <article className="card">
            <p className="subtle">No board rows match the current sport filter.</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
