'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson, formatNumber, formatSignedNumber } from '../../lib/data';

type KenPomModelRow = {
  date: string | null;
  matchupIndex: number;
  team_a: string;
  team_b: string;
  team_a_projected_score: number;
  team_b_projected_score: number;
  projected_spread: number;
  projected_total: number;
};

type BoardMarket = Record<string, any>;

type BoardGame = {
  gameId: string | number;
  leagueSlug?: string | null;
  awayTeam?: string | null;
  homeTeam?: string | null;
  markets?: {
    spread?: BoardMarket | null;
    total?: BoardMarket | null;
  } | null;
};

type SortKey = 'projected_spread' | 'projected_total' | 'spread_edge' | 'total_edge';
type SortDirection = 'asc' | 'desc';

type JoinedKenPomRow = KenPomModelRow & {
  matchup: string;
  marketSpread: number | null;
  marketTotal: number | null;
  spreadRecommendation: string;
  spreadEdge: number | null;
  totalRecommendation: string;
  totalEdge: number | null;
  normalizedTeamA: string;
  normalizedTeamB: string;
  attemptedMatchupKey: string;
  boardMatchFound: boolean;
  likelyBoardMatch: string | null;
  matchedLineSource: 'current_board' | null;
};

const EMPTY_KENPOM = {
  generatedAt: null,
  rows: [] as KenPomModelRow[]
};

const EMPTY_BOARD = {
  generatedAt: null,
  games: [] as BoardGame[]
};

const SPREAD_EDGE_THRESHOLD = 2;
const TOTAL_EDGE_THRESHOLD = 4;

export default function KenPomPage() {
  const [kenPomData, setKenPomData] = useState<{ generatedAt: string | null; rows: KenPomModelRow[] }>(EMPTY_KENPOM);
  const [boardData, setBoardData] = useState<{ generatedAt: string | null; games: BoardGame[] }>(EMPTY_BOARD);
  const [sortKey, setSortKey] = useState<SortKey>('spread_edge');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchPublicJson('/data/kenpom_model_rows.json', EMPTY_KENPOM).then(setKenPomData);
    fetchPublicJson('/data/current_board.json', EMPTY_BOARD).then(setBoardData);
  }, []);

  const rows = useMemo<JoinedKenPomRow[]>(() => {
    const boardIndex = new Map<string, BoardGame>();
    const boardDebugKeys: Array<{ key: string; awayTeam: string; homeTeam: string }> = [];
    for (const game of boardData.games) {
      const key = getMatchupKey(game.awayTeam, game.homeTeam);
      if (key && !boardIndex.has(key)) {
        boardIndex.set(key, game);
      }
      if (key) {
        boardDebugKeys.push({
          key,
          awayTeam: String(game.awayTeam ?? ''),
          homeTeam: String(game.homeTeam ?? '')
        });
      }
    }

    return kenPomData.rows.map((row) => {
      const matchup = `${row.team_a} vs ${row.team_b}`;
      const normalizedTeamA = normalizeTeamName(row.team_a);
      const normalizedTeamB = normalizeTeamName(row.team_b);
      const attemptedMatchupKey = getMatchupKey(row.team_a, row.team_b);
      const boardGame = boardIndex.get(attemptedMatchupKey);
      const likelyBoardMatch = boardGame ? null : findLikelyBoardMatch(normalizedTeamA, normalizedTeamB, boardDebugKeys);
      const teamASide = getTeamSideForGame(boardGame, row.team_a);
      const spreadMarket = boardGame?.markets?.spread ?? null;
      const totalMarket = boardGame?.markets?.total ?? null;
      const marketSpread = spreadMarket && teamASide ? getTeamSpreadLine(spreadMarket, teamASide) : null;
      const marketImpliedMargin = marketSpread === null ? null : -marketSpread;
      const marketTotal = getTotalLine(totalMarket);
      const spreadDelta = marketImpliedMargin === null ? null : row.projected_spread - marketImpliedMargin;
      const totalDelta = marketTotal === null ? null : row.projected_total - marketTotal;
      const spreadRecommendation = getSpreadRecommendation(row, spreadDelta);
      const totalRecommendation = getTotalRecommendation(totalDelta);

      return {
        ...row,
        matchup,
        marketSpread,
        marketTotal,
        spreadRecommendation,
        spreadEdge: getDisplayEdge(spreadDelta, spreadRecommendation === 'No play'),
        totalRecommendation,
        totalEdge: getDisplayEdge(totalDelta, totalRecommendation === 'No play'),
        normalizedTeamA,
        normalizedTeamB,
        attemptedMatchupKey,
        boardMatchFound: Boolean(boardGame),
        likelyBoardMatch,
        matchedLineSource: boardGame ? 'current_board' : null
      };
    });
  }, [boardData.games, kenPomData.rows]);

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = getSortMetric(left, sortKey);
      const rightValue = getSortMetric(right, sortKey);
      if (leftValue !== rightValue) {
        return (leftValue - rightValue) * direction;
      }
      return left.matchup.localeCompare(right.matchup);
    });
  }, [rows, sortDirection, sortKey]);

  const matchedRows = useMemo(() => rows.filter((row) => row.matchedLineSource === 'current_board').length, [rows]);

  return (
    <main className="page">
      <section className="hero">
        <h2>KenPom Model Board</h2>
        <p className="subtle">
          This board mirrors the KenPom workbook output and joins in current market lines when a matchup match is found. Spread values are shown from the <strong>team_a</strong> perspective, and spread versus total recommendations are shown independently.
        </p>
        <div className="metrics">
          <div className="metric">
            <label>Model Rows</label>
            <strong>{rows.length}</strong>
          </div>
          <div className="metric">
            <label>Matched Market Lines</label>
            <strong>{matchedRows}</strong>
          </div>
          <div className="metric">
            <label>KenPom Generated</label>
            <strong>{kenPomData.generatedAt ?? 'N/A'}</strong>
          </div>
          <div className="metric">
            <label>Board Generated</label>
            <strong>{boardData.generatedAt ?? 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="panel table-wrap">
        <div className="kenpom-table-head">
          <div>
            <h3>Matchup Table</h3>
            <p className="subtle">
              If no matching board line is found, market and edge stay blank and the recommendation stays <strong>No play</strong>.
            </p>
          </div>
        </div>

        <table className="kenpom-table">
          <thead>
            <tr>
              <th>Matchup</th>
              <th>Team A</th>
              <th>Team B</th>
              <th>Team A Score</th>
              <th>Team B Score</th>
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
              <tr key={`${row.matchupIndex}:${row.team_a}:${row.team_b}`}>
                <td>
                  <strong>{row.matchup}</strong>
                  {!row.boardMatchFound ? (
                    <div className="subtle">
                      no board match · a=`{row.normalizedTeamA}` · b=`{row.normalizedTeamB}` · key=`{row.attemptedMatchupKey}`
                      {row.likelyBoardMatch ? ` · likely=${row.likelyBoardMatch}` : ''}
                    </div>
                  ) : null}
                </td>
                <td>{row.team_a}</td>
                <td>{row.team_b}</td>
                <td>{formatScore(row.team_a_projected_score)}</td>
                <td>{formatScore(row.team_b_projected_score)}</td>
                <td>{formatSignedNumber(row.projected_spread)}</td>
                <td>{formatNumber(row.projected_total)}</td>
                <td>{row.marketSpread === null ? '' : formatSignedNumber(row.marketSpread)}</td>
                <td>{row.marketTotal === null ? '' : formatNumber(row.marketTotal)}</td>
                <td>
                  <span className={`pill ${row.spreadRecommendation === 'No play' ? '' : 'kenpom-recommendation-pill'}`}>
                    {row.spreadRecommendation}
                  </span>
                </td>
                <td className={getEdgeClassName(row.spreadEdge)}>{row.spreadEdge === null ? '' : formatSignedNumber(row.spreadEdge)}</td>
                <td>
                  <span className={`pill ${row.totalRecommendation === 'No play' ? '' : 'kenpom-recommendation-pill'}`}>
                    {row.totalRecommendation}
                  </span>
                </td>
                <td className={getEdgeClassName(row.totalEdge)}>{row.totalEdge === null ? '' : formatSignedNumber(row.totalEdge)}</td>
              </tr>
            ))}
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="subtle">
                  No KenPom model rows were found. Export `kenpom_model_rows.json` and reload this page.
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
  setSortDirection('desc');
}

function getSpreadRecommendation(row: KenPomModelRow, spreadDelta: number | null): string {
  if (spreadDelta === null) {
    return 'No play';
  }
  if (spreadDelta >= SPREAD_EDGE_THRESHOLD) {
    return row.team_a;
  }
  if (spreadDelta <= -SPREAD_EDGE_THRESHOLD) {
    return row.team_b;
  }
  return 'No play';
}

function getTotalRecommendation(totalDelta: number | null): string {
  if (totalDelta === null) {
    return 'No play';
  }
  if (totalDelta >= TOTAL_EDGE_THRESHOLD) {
    return 'Over';
  }
  if (totalDelta <= -TOTAL_EDGE_THRESHOLD) {
    return 'Under';
  }
  return 'No play';
}

function getDisplayEdge(delta: number | null, isNoPlay: boolean): number | null {
  if (delta === null) {
    return null;
  }
  return isNoPlay ? -Math.abs(delta) : Math.abs(delta);
}

function getSortMetric(row: JoinedKenPomRow, sortKey: SortKey): number {
  if (sortKey === 'projected_spread') {
    return row.projected_spread;
  }
  if (sortKey === 'projected_total') {
    return row.projected_total;
  }
  if (sortKey === 'spread_edge') {
    return row.spreadEdge === null ? Number.NEGATIVE_INFINITY : row.spreadEdge;
  }
  return row.totalEdge === null ? Number.NEGATIVE_INFINITY : row.totalEdge;
}

function getMatchupKey(teamA: string | null | undefined, teamB: string | null | undefined): string {
  const normalizedA = normalizeTeamName(teamA);
  const normalizedB = normalizeTeamName(teamB);
  if (!normalizedA || !normalizedB) {
    return '';
  }
  return [normalizedA, normalizedB].sort().join('|');
}

function getTeamSideForGame(game: BoardGame | undefined, teamName: string): 'away' | 'home' | null {
  if (!game) {
    return null;
  }
  const normalizedTeam = normalizeTeamName(teamName);
  if (normalizeTeamName(game.awayTeam) === normalizedTeam) {
    return 'away';
  }
  if (normalizeTeamName(game.homeTeam) === normalizedTeam) {
    return 'home';
  }
  return null;
}

function normalizeTeamName(value: string | null | undefined): string {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[().,/-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return TEAM_NAME_ALIASES[normalized] ?? normalized;
}

const TEAM_NAME_ALIASES: Record<string, string> = {
  smu: 'southern methodist',
  'southern methodist': 'southern methodist',
  'prairie view a m': 'prairie view',
  'prairie view a and m': 'prairie view',
  'prairie view': 'prairie view',
  'nc state': 'nc state',
  'n c state': 'nc state',
  'north carolina state': 'nc state',
  'miami oh': 'miami ohio',
  'miami ohio': 'miami ohio',
  'miami ohioh': 'miami ohio',
  'miami o h': 'miami ohio',
  'miami oh ': 'miami ohio',
  'saint louis': 'saint louis',
  'st louis': 'saint louis',
  'saint marys': 'saint marys',
  'st marys': 'saint marys',
  'michigan st': 'michigan state',
  'michigan state': 'michigan state',
  'unc wilmington': 'unc wilmington',
  'north carolina wilmington': 'unc wilmington',
  'st johns': 'saint johns',
  'saint johns': 'saint johns'
};

function findLikelyBoardMatch(
  normalizedTeamA: string,
  normalizedTeamB: string,
  boardKeys: Array<{ key: string; awayTeam: string; homeTeam: string }>
): string | null {
  let bestMatch: { label: string; score: number } | null = null;

  for (const board of boardKeys) {
    const score = scoreNearMatch(normalizedTeamA, normalizedTeamB, board.key);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        label: `${board.awayTeam} vs ${board.homeTeam} [${board.key}]`,
        score
      };
    }
  }

  return bestMatch && bestMatch.score > 0 ? bestMatch.label : null;
}

function scoreNearMatch(normalizedTeamA: string, normalizedTeamB: string, boardKey: string): number {
  const boardTeams = boardKey.split('|');
  const kenPomTeams = [normalizedTeamA, normalizedTeamB];
  let score = 0;

  for (const team of kenPomTeams) {
    for (const boardTeam of boardTeams) {
      if (team === boardTeam) {
        score += 10;
      } else if (team.includes(boardTeam) || boardTeam.includes(team)) {
        score += 4;
      } else {
        const overlap = sharedTokenCount(team, boardTeam);
        score += overlap;
      }
    }
  }

  return score;
}

function sharedTokenCount(left: string, right: string): number {
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  let count = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      count += 1;
    }
  }
  return count;
}

function getTeamSpreadLine(row: BoardMarket, side: 'away' | 'home'): number | null {
  const value = side === 'away' ? row.awayValue : row.homeValue;
  return typeof value === 'number' ? value : null;
}

function getTotalLine(row: BoardMarket | null): number | null {
  if (!row) {
    return null;
  }
  return typeof row.totalLine === 'number' ? row.totalLine : typeof row.totalCurrentLine === 'number' ? row.totalCurrentLine : null;
}

function formatScore(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

function getEdgeClassName(edge: number | null): string {
  if (edge === null) {
    return '';
  }
  return edge >= 0 ? 'good' : 'bad';
}
