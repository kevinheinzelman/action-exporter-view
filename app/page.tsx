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

type PickDetailRow = {
  analysisKey: string | null;
  evaluationKey: string | null;
  expertName: string | null;
  playText: string | null;
  recordWindow: string | null;
  recordWins: number | null;
  recordLosses: number | null;
  recordPushes: number | null;
  recordUnitsNet: number | null;
  recordRoi: number | null;
  classifiedSide: string | null;
};

const USE_LEGACY_CURRENT_BOARD = false;

const SPORT_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'NCAAB', value: 'Basketball:ncaab' },
  { label: 'NBA', value: 'Basketball:nba' },
  { label: 'NHL', value: 'Hockey:nhl' },
  { label: 'MLB', value: 'Baseball:mlb' }
];

const MARKET_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Spread', value: 'spread' },
  { label: 'Total', value: 'total' },
  { label: 'Moneyline', value: 'moneyline' }
];

const SORT_OPTIONS = [
  { label: 'Default / Current', value: 'default' },
  { label: 'Start Time', value: 'start_time' },
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

  if (row.pickIsTie) {
    return `${count} picks, (tied)`;
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
  return getSharpCount(row) + getPickCount(row);
}

function formatLineValue(value: unknown): string {
  if (typeof value !== 'number') {
    return '';
  }
  return value.toFixed(1).replace(/\.0$/, '.0');
}

function formatSignedLineValue(value: unknown): string {
  if (typeof value !== 'number') {
    return '';
  }
  const absolute = Math.abs(value).toFixed(1).replace(/\.0$/, '.0');
  if (value > 0) {
    return `+${absolute}`;
  }
  if (value < 0) {
    return `-${absolute}`;
  }
  return absolute;
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
    const displayValue = market === 'spread' ? formatSignedLineValue(row.awayValue) : formatSignedNumber(row.awayValue);
    return `${game.awayTeam ?? 'Away'} ${row.awayValue == null ? '' : displayValue}`.trim();
  }
  if (preferredSide === 'home') {
    const displayValue = market === 'spread' ? formatSignedLineValue(row.homeValue) : formatSignedNumber(row.homeValue);
    return `${game.homeTeam ?? 'Home'} ${row.homeValue == null ? '' : displayValue}`.trim();
  }

  const awayDisplayValue = market === 'spread' ? formatSignedLineValue(row.awayValue) : formatSignedNumber(row.awayValue);
  const homeDisplayValue = market === 'spread' ? formatSignedLineValue(row.homeValue) : formatSignedNumber(row.homeValue);
  const awayText = `${game.awayTeam ?? 'Away'} ${row.awayValue == null ? '' : awayDisplayValue}`.trim();
  const homeText = `${game.homeTeam ?? 'Home'} ${row.homeValue == null ? '' : homeDisplayValue}`.trim();
  return `${awayText} / ${homeText}`;
}

function getCountsText(row: Record<string, any>): string {
  return `🔥 ${getSharpCount(row)} sharps • 📊 ${getPickCount(row)} picks`;
}

function getHistoricalSupportText(row: Record<string, any>): string | null {
  const support = row.historicalSupport as
    | {
        angleLabel?: string | null;
        sampleSize?: number | null;
        winRate?: number | null;
        roi?: number | null;
      }
    | undefined;

  if (!support?.angleLabel || typeof support.sampleSize !== 'number') {
    return null;
  }

  const parts = [`${support.angleLabel} - ${support.sampleSize} plays`];
  if (typeof support.winRate === 'number') {
    parts.push(`${(support.winRate * 100).toFixed(1)}%`);
  }
  if (typeof support.roi === 'number') {
    parts.push(`ROI ${(support.roi * 100).toFixed(1)}%`);
  }
  return parts.join(' • ');
}

function getPublicContextText(row: Record<string, any>): string | null {
  const context = row.publicContext as
    | {
        side?: string | null;
        betsPct?: number | null;
        moneyPct?: number | null;
        moneyMinusBetsPct?: number | null;
      }
    | undefined;

  if (typeof context?.betsPct !== 'number' || typeof context.moneyPct !== 'number') {
    return null;
  }

  const delta =
    typeof context.moneyMinusBetsPct === 'number'
      ? `${context.moneyMinusBetsPct > 0 ? '+' : ''}${context.moneyMinusBetsPct.toFixed(0)}%`
      : 'N/A';

  return `${context.betsPct.toFixed(0)}% bets • ${context.moneyPct.toFixed(0)}% money • ${delta}`;
}

function getRecommendation(row: Record<string, any>): { signalScore?: number; recommendationTier?: string | null; recommendationReason?: string | null } | null {
  const recommendation = row.recommendation as
    | {
        signalScore?: number;
        recommendationTier?: string | null;
        recommendationReason?: string | null;
      }
    | undefined;
  return recommendation ?? null;
}

function getRecommendationLabel(row: Record<string, any>): string | null {
  const recommendation = getRecommendation(row);
  if (!recommendation?.recommendationTier) {
    return null;
  }
  return recommendation.recommendationTier;
}

function getSideLabel(game: Record<string, any>, market: string, row: Record<string, any>, side: string | null): string {
  if (!side) {
    return 'No side';
  }

  if (market === 'total') {
    const totalLine = row.totalLine ?? row.overValue ?? row.underValue;
    const lineText = totalLine == null ? '' : ` ${formatLineValue(Number(totalLine))}`;
    if (side === 'over') {
      return `Over${lineText}`;
    }
    if (side === 'under') {
      return `Under${lineText}`;
    }
    return 'Total';
  }

  if (side === 'away') {
    const displayValue = market === 'spread' ? formatSignedLineValue(row.awayValue) : formatSignedNumber(row.awayValue);
    return `${game.awayTeam ?? 'Away'}${row.awayValue == null ? '' : ` ${displayValue}`}`.trim();
  }

  if (side === 'home') {
    const displayValue = market === 'spread' ? formatSignedLineValue(row.homeValue) : formatSignedNumber(row.homeValue);
    return `${game.homeTeam ?? 'Home'}${row.homeValue == null ? '' : ` ${displayValue}`}`.trim();
  }

  return 'No side';
}

function isActionableSide(value: unknown): value is 'away' | 'home' | 'over' | 'under' {
  return value === 'away' || value === 'home' || value === 'over' || value === 'under';
}

function getActionableSide(row: Record<string, any>): 'away' | 'home' | 'over' | 'under' | null {
  if (row.hasSharpSignal && isActionableSide(row.sharpMajoritySide)) {
    return row.sharpMajoritySide;
  }
  if (row.hasPickSignal && isActionableSide(row.pickMajoritySide)) {
    return row.pickMajoritySide;
  }
  return null;
}

function getOppositeSide(market: string, side: string | null): 'away' | 'home' | 'over' | 'under' | null {
  if (market === 'total') {
    if (side === 'over') {
      return 'under';
    }
    if (side === 'under') {
      return 'over';
    }
    return null;
  }
  if (side === 'away') {
    return 'home';
  }
  if (side === 'home') {
    return 'away';
  }
  return null;
}

function getSideCount(row: Record<string, any>, signal: 'sharp' | 'pick', side: string | null): number {
  if (!side) {
    return 0;
  }
  if (signal === 'sharp') {
    if (side === 'away') return Number(row.awaySharpCount ?? 0);
    if (side === 'home') return Number(row.homeSharpCount ?? 0);
    if (side === 'over') return Number(row.overSharpCount ?? 0);
    if (side === 'under') return Number(row.underSharpCount ?? 0);
  } else {
    if (side === 'away') return Number(row.awayPickCount ?? 0);
    if (side === 'home') return Number(row.homePickCount ?? 0);
    if (side === 'over') return Number(row.overPickCount ?? 0);
    if (side === 'under') return Number(row.underPickCount ?? 0);
  }
  return 0;
}

function formatDiffLabel(diff: number): string {
  return `diff ${diff >= 0 ? '+' : ''}${diff}`;
}

function getDifferentialText(row: Record<string, any>, market: string): string {
  const side = getActionableSide(row);
  const opposite = getOppositeSide(market, side);
  const sharpDiff = getSideCount(row, 'sharp', side) - getSideCount(row, 'sharp', opposite);
  const pickDiff = getSideCount(row, 'pick', side) - getSideCount(row, 'pick', opposite);
  const parts: string[] = [];

  if (getSideCount(row, 'sharp', side) > 0) {
    parts.push(`Sharps ${sharpDiff >= 0 ? '+' : ''}${sharpDiff}`);
  }
  if (getSideCount(row, 'pick', side) > 0) {
    parts.push(`Picks ${pickDiff >= 0 ? '+' : ''}${pickDiff}`);
  }
  return parts.length ? parts.join(' • ') : 'No signal';
}

function getSignalCellData(
  game: Record<string, any>,
  market: string,
  row: Record<string, any>,
  signal: 'sharp' | 'pick'
): { sideLabel: string; countLabel: string; diffLabel: string } | null {
  const primarySide = getPrimarySignalSide(row, signal === 'sharp' ? 'sharp' : 'picks');
  const count = signal === 'sharp' ? getSharpCount(row) : getPickCount(row);
  if (!primarySide || count <= 0) {
    return null;
  }

  if (signal === 'pick' && row.pickIsTie) {
    return {
      sideLabel: 'Tied picks',
      countLabel: `${count} picks`,
      diffLabel: 'diff 0'
    };
  }

  const oppositeSide = getOppositeSide(market, primarySide);
  const diff = getSideCount(row, signal, primarySide) - getSideCount(row, signal, oppositeSide);
  return {
    sideLabel: getSideLabel(game, market, row, primarySide),
    countLabel: `${count} ${signal === 'sharp' ? 'sharps' : 'picks'}`,
    diffLabel: formatDiffLabel(diff)
  };
}

function getPublicCellData(
  game: Record<string, any>,
  market: string,
  row: Record<string, any>
): { sideLabel: string; detailLabel: string } | null {
  const context = row.publicContext as
    | {
        side?: string | null;
        betsPct?: number | null;
        moneyPct?: number | null;
        moneyMinusBetsPct?: number | null;
      }
    | undefined;

  if (!context || typeof context.betsPct !== 'number' || typeof context.moneyPct !== 'number') {
    return null;
  }

  const sideLabel = getSideLabel(game, market, row, typeof context.side === 'string' ? context.side : getActionableSide(row));
  const delta =
    typeof context.moneyMinusBetsPct === 'number'
      ? `${context.moneyMinusBetsPct > 0 ? '+' : ''}${context.moneyMinusBetsPct.toFixed(0)}%`
      : 'N/A';

  return {
    sideLabel,
    detailLabel: `${context.betsPct.toFixed(0)}% bets • ${context.moneyPct.toFixed(0)}% money • ${delta}`
  };
}

function getPickMajoritySide(row: Record<string, any>): 'away' | 'home' | 'over' | 'under' | null {
  if (!row.hasPickSignal || row.pickIsTie) {
    return null;
  }
  const side = getPrimarySignalSide(row, 'picks');
  return typeof side === 'string' ? side as 'away' | 'home' | 'over' | 'under' : null;
}

function formatExpertSnapshot(pick: PickDetailRow): string {
  const record =
    typeof pick.recordWins === 'number' && typeof pick.recordLosses === 'number'
      ? `${pick.recordWins}-${pick.recordLosses}${typeof pick.recordPushes === 'number' ? `-${pick.recordPushes}` : ''}`
      : null;
  const units = typeof pick.recordUnitsNet === 'number' ? `${pick.recordUnitsNet > 0 ? '+' : ''}${pick.recordUnitsNet.toFixed(1)}u` : null;
  const windowLabel = typeof pick.recordWindow === 'string' ? pick.recordWindow.replace(/_/g, ' ') : null;
  return [record, units, windowLabel].filter(Boolean).join(' • ') || 'No performance snapshot';
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

function getSortableStartTime(value: unknown): number {
  const timestamp = new Date(String(value ?? '')).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function buildFilteredRows(
  marketRows: BoardMarketRow[],
  sportFilter: string,
  marketFilter: string,
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

  if (marketFilter !== 'all') {
    rows = rows.filter(({ market }) => market === marketFilter);
  }

  if (sortMode === 'default' || sortMode === 'start_time') {
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
        if (sortMode === 'start_time') {
          const leftStart = getSortableStartTime(left.rows[0]?.game.startTimeUtc);
          const rightStart = getSortableStartTime(right.rows[0]?.game.startTimeUtc);
          if (leftStart !== rightStart) {
            return leftStart - rightStart;
          }
        }
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
  const [pickDetails, setPickDetails] = useState<PickDetailRow[]>([]);
  const [sportFilter, setSportFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [sortMode, setSortMode] = useState('start_time');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicJson('/data/current_board.json', {
      generatedAt: null,
      boardDate: null,
      games: [] as Array<Record<string, any>>
    }).then(setBoard);

    fetchPublicJson('/data/metadata.json', {
      generatedAt: null
    }).then(setMetadata);

    fetchPublicJson('/data/pick_rows.json', {
      rows: [] as PickDetailRow[]
    }).then((payload) => setPickDetails(payload.rows ?? []));
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

  const latestBoardPulledAt = useMemo(() => {
    let latestTimestamp = Number.NEGATIVE_INFINITY;
    let latestValue: string | null = null;

    for (const { row } of marketRows) {
      const pulledAt = typeof row.pulledAt === 'string' ? row.pulledAt : null;
      if (!pulledAt) {
        continue;
      }

      const timestamp = new Date(pulledAt).getTime();
      if (Number.isNaN(timestamp)) {
        continue;
      }

      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
        latestValue = pulledAt;
      }
    }

    return latestValue;
  }, [marketRows]);

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

  const topMoneyDelta = useMemo(
    () =>
      [...marketRows]
        .filter(({ row }) => {
          const context = row.publicContext as { moneyMinusBetsPct?: number | null } | undefined;
          return typeof context?.moneyMinusBetsPct === 'number' && context.moneyMinusBetsPct > 0;
        })
        .sort((left, right) => {
          const leftDelta = Number((left.row.publicContext as { moneyMinusBetsPct?: number | null } | undefined)?.moneyMinusBetsPct ?? Number.NEGATIVE_INFINITY);
          const rightDelta = Number((right.row.publicContext as { moneyMinusBetsPct?: number | null } | undefined)?.moneyMinusBetsPct ?? Number.NEGATIVE_INFINITY);
          if (rightDelta !== leftDelta) {
            return rightDelta - leftDelta;
          }
          return String(right.row.pulledAt ?? '').localeCompare(String(left.row.pulledAt ?? ''));
        })
        .slice(0, 5),
    [marketRows]
  );

  const filteredRows = useMemo(
    () => buildFilteredRows(marketRows, sportFilter, marketFilter, teamFilter, sortMode),
    [marketRows, sportFilter, marketFilter, teamFilter, sortMode]
  );

  const activeRows = useMemo(
    () => filteredRows.filter(({ row }) => getSharpCount(row) > 0 || getPickCount(row) > 0),
    [filteredRows]
  );

  const topBetKeys = useMemo(
    () => new Set(topBetsRightNow.map(({ game, market }) => `${String(game.gameId)}:${market}`)),
    [topBetsRightNow]
  );

  const pickDetailsByEvaluationKey = useMemo(() => {
    const grouped = new Map<string, PickDetailRow[]>();
    for (const pick of pickDetails) {
      if (!pick.evaluationKey) {
        continue;
      }
      const existing = grouped.get(pick.evaluationKey) ?? [];
      existing.push(pick);
      grouped.set(pick.evaluationKey, existing);
    }
    return grouped;
  }, [pickDetails]);

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
                <span>Board data updated</span>
                <strong>{formatTimestamp(latestBoardPulledAt ?? metadata.generatedAt)}</strong>
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

        <section className="cards current-board-summary-grid current-board-summary-grid-four">
          <article className="panel current-board-summary current-board-summary-lead">
            <div className="current-board-section-head current-board-top-bets-head">
              <div>
                <div className="current-board-section-kicker">Action shortlist</div>
                <h3>Top Bets Right Now</h3>
              </div>
              <p className="subtle current-board-top-bets-subtitle">
                Aligned board rows ranked by combined sharp and pick strength.
              </p>
            </div>

            <div className="summary-list">
              {topBetsRightNow.map(({ game, market, row }) => (
                <div className="summary-item current-board-top-bet-item" key={`top-bet:${String(game.gameId)}:${market}`}>
                  <div className="current-board-top-bet-main">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
                    <div className="current-board-summary-detail-row">
                      <span className="current-board-summary-market">{market}</span>
                      <span className="current-board-summary-detail">{getPrimarySideText(game, market, row)}</span>
                    </div>
                    <div className="subtle current-board-summary-time">{formatStartTime(String(game.startTimeUtc ?? ''))}</div>
                  </div>
                  <div className="current-board-top-bet-meta">
                    <div className="current-board-top-bet-counts">{getCountsText(row)}</div>
                    <div className="current-board-top-bet-badges">
                      <span className="pill current-board-pill current-board-pill-signal">{getSignalLabel(row)}</span>
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
                  <div className="subtle current-board-summary-detail">
                      {market} | {getPrimarySideText(game, market, row)}
                    </div>
                    <div className="subtle current-board-summary-time">{formatStartTime(String(game.startTimeUtc ?? ''))}</div>
                  </div>
                  <strong className="current-board-summary-count">{getSharpCount(row)} sharps</strong>
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

          <article className="panel current-board-summary">
            <div className="current-board-section-head current-board-summary-head">
              <div>
                <div className="current-board-section-kicker">Public money edge</div>
                <h3>Biggest Money &gt; Bets</h3>
              </div>
            </div>
            <div className="summary-list">
              {topMoneyDelta.map(({ game, market, row }) => (
                <div className="summary-item current-board-summary-item" key={`delta:${String(game.gameId)}:${market}`}>
                  <div className="current-board-summary-copy">
                    <strong className="current-board-summary-game" title={`${game.awayTeam ?? 'Away'} at ${game.homeTeam ?? 'Home'}`}>
                      {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                    </strong>
                    <div className="subtle current-board-summary-detail">
                      {market} | {getPrimarySideText(game, market, row)}
                    </div>
                    <div className="subtle current-board-summary-time">{getPublicContextText(row)}</div>
                  </div>
                  <strong className="current-board-summary-count">
                    {(() => {
                      const delta = (row.publicContext as { moneyMinusBetsPct?: number | null } | undefined)?.moneyMinusBetsPct;
                      return typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)}` : 'N/A';
                    })()}
                  </strong>
                </div>
              ))}
              {topMoneyDelta.length === 0 ? <div className="subtle">No positive money-over-bets deltas yet</div> : null}
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
              <label htmlFor="market-filter">Market</label>
              <select id="market-filter" value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
                {MARKET_OPTIONS.map((option) => (
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

        <section className="panel current-board-panel current-board-workspace">
          <div className="current-board-workspace-head">
            <div>
              <div className="current-board-section-kicker">Live market board</div>
              <h3>Board Watchlist</h3>
            </div>
            <p className="subtle current-board-workspace-note">
              Default rows keep sharps, picks, public, and history separate. Expand a market for the full board read and picker detail.
            </p>
          </div>

          <div className="current-board-table current-board-table-modern">
            <div className="current-board-table-head current-board-table-row current-board-table-row-modern">
              <div>Game</div>
              <div>Start</div>
              <div>Market</div>
              <div>Bet</div>
              <div>Sharps</div>
              <div>Picks</div>
              <div>Bet / Money</div>
              <div>Sharps &amp; Picks?</div>
              <div>Details</div>
            </div>

            {activeRows.map(({ game, market, row }) => {
              const rowKey = `${String(game.gameId)}:${market}`;
              const relatedPicks = row.evaluationKey ? pickDetailsByEvaluationKey.get(String(row.evaluationKey)) ?? [] : [];
              const pickMajoritySide = getPickMajoritySide(row);
              const pickMinoritySide = pickMajoritySide ? getOppositeSide(market, pickMajoritySide) : null;
              const majoritySidePicks = pickMajoritySide ? relatedPicks.filter((pick) => pick.classifiedSide === pickMajoritySide) : relatedPicks;
              const minoritySidePicks = pickMinoritySide ? relatedPicks.filter((pick) => pick.classifiedSide === pickMinoritySide) : [];
              const recommendation = getRecommendation(row);
              const sharpCell = getSignalCellData(game, market, row, 'sharp');
              const pickCell = getSignalCellData(game, market, row, 'pick');
              const publicCell = getPublicCellData(game, market, row);

              return (
                <div className="current-board-row-shell" key={rowKey}>
                  <div className="current-board-table-row current-board-data-row current-board-table-row-modern">
                    <div className="current-board-cell current-board-game-cell" data-label="Game">
                      <strong>
                        {topBetKeys.has(rowKey) ? <span className="current-board-game-flag" aria-hidden="true">&#128293;</span> : null}
                        {game.awayTeam ?? 'Away'} at {game.homeTeam ?? 'Home'}
                      </strong>
                      <span className="subtle">{String(game.leagueSlug ?? game.sport ?? '').toUpperCase()}</span>
                    </div>
                    <div className="current-board-cell current-board-start-cell" data-label="Start">
                      {formatStartTime(String(game.startTimeUtc ?? ''))}
                    </div>
                    <div className="current-board-cell current-board-market-cell" data-label="Market">{market}</div>
                    <div className="current-board-cell current-board-signal-cell" data-label="Bet">
                      <strong className="current-board-pick-text">{getPrimarySideText(game, market, row)}</strong>
                      <span className="subtle">{getSignalLabel(row)}</span>
                    </div>
                    <div className="current-board-cell current-board-signal-cell" data-label="Sharps">
                      {sharpCell ? (
                        <>
                          <strong className="current-board-pick-text">{sharpCell.countLabel}</strong>
                          <span className="subtle">{sharpCell.sideLabel}</span>
                        </>
                      ) : <span className="subtle">-</span>}
                    </div>
                    <div className="current-board-cell current-board-signal-cell" data-label="Picks">
                      {pickCell ? (
                        <>
                          <strong className="current-board-pick-text">{pickCell.countLabel}</strong>
                          <span className="subtle">{pickCell.sideLabel} • {pickCell.diffLabel}</span>
                        </>
                      ) : <span className="subtle">-</span>}
                    </div>
                    <div className="current-board-cell current-board-signal-cell current-board-public-cell" data-label="Bet / Money">
                      {publicCell ? (
                        <strong className="current-board-inline-stat">{publicCell.detailLabel}</strong>
                      ) : <span className="subtle">-</span>}
                    </div>
                    <div className="current-board-cell current-board-badge-cell" data-label="Sharps &amp; Picks?">
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
                    <div className="current-board-cell current-board-detail-toggle-cell" data-label="Details">
                      <button
                        type="button"
                        className="current-board-detail-toggle"
                        onClick={() => setExpandedRowKey((current) => current === rowKey ? null : rowKey)}
                      >
                        {expandedRowKey === rowKey ? 'Hide detail' : 'View detail'}
                      </button>
                    </div>
                  </div>

                  {expandedRowKey === rowKey ? (
                    <div className="current-board-expanded-panel">
                      <div className="current-board-expanded-grid">
                        <section className="current-board-expanded-card">
                          <div className="current-board-expanded-label">Board read</div>
                          <strong className="current-board-expanded-title">{getPrimarySideText(game, market, row)}</strong>
                          <div className="current-board-expanded-copy">
                            {recommendation?.recommendationReason ?? 'Live signal context only; no stronger recommendation yet.'}
                          </div>
                          <div className="current-board-expanded-copy">
                            {getHistoricalSupportText(row) ?? 'No matching historical support angle yet.'}
                          </div>
                          <div className="current-board-inline-badges">
                            <span className="pill current-board-pill current-board-pill-signal">{getSignalLabel(row)}</span>
                            {getSignalStrengthLabel(row) ? <span className="pill current-board-pill current-board-pill-strength">{getSignalStrengthLabel(row)}</span> : null}
                            {getAgreementLabel(row) ? (
                              <span className={`pill current-board-pill ${getAgreementLabel(row) === 'Conflict' ? 'current-board-pill-conflict' : 'current-board-pill-agreement'}`}>
                                {getAgreementLabel(row)}
                              </span>
                            ) : null}
                            {getRecommendationLabel(row) ? <span className="pill current-board-pill current-board-pill-recommendation">{getRecommendationLabel(row)}</span> : null}
                          </div>
                        </section>

                        <section className="current-board-expanded-card">
                          <div className="current-board-expanded-label">Signal detail</div>
                          <div className="current-board-expanded-metric"><span>Sharps</span><strong>{getSharpViewText(game, market, row)}</strong></div>
                          <div className="current-board-expanded-metric"><span>Picks</span><strong>{getPickViewText(game, market, row)}</strong></div>
                          <div className="current-board-expanded-metric"><span>Public</span><strong>{getPublicContextText(row) ?? '-'}</strong></div>
                          <div className="current-board-expanded-metric"><span>Edge</span><strong>{getDifferentialText(row, market) ?? '-'}</strong></div>
                        </section>

                        <section className="current-board-expanded-card current-board-expanded-card-picks">
                          <div className="current-board-expanded-label">
                            {pickMajoritySide ? `Pick majority side: ${getSideLabel(game, market, row, pickMajoritySide)}` : 'Picks on this market'}
                          </div>
                          {majoritySidePicks.length ? (
                            <div className="current-board-pick-list">
                              {majoritySidePicks.slice(0, 8).map((pick, index) => (
                                <div className="current-board-pick-item" key={`${rowKey}:maj:${pick.expertName ?? 'expert'}:${index}`}>
                                  <strong>{pick.expertName ?? 'Unnamed picker'}</strong>
                                  <span>{pick.playText ?? 'No pick text available.'}</span>
                                  <span className="subtle">{formatExpertSnapshot(pick)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="subtle">No picker detail available for the pick-majority side yet.</div>
                          )}
                        </section>

                        <section className="current-board-expanded-card current-board-expanded-card-picks">
                          <div className="current-board-expanded-label">
                            {pickMinoritySide ? `Minority pick side: ${getSideLabel(game, market, row, pickMinoritySide)}` : 'Minority-side picks'}
                          </div>
                          {minoritySidePicks.length ? (
                            <div className="current-board-pick-list">
                              {minoritySidePicks.slice(0, 8).map((pick, index) => (
                                <div className="current-board-pick-item" key={`${rowKey}:min:${pick.expertName ?? 'expert'}:${index}`}>
                                  <strong>{pick.expertName ?? 'Unnamed picker'}</strong>
                                  <span>{pick.playText ?? 'No pick text available.'}</span>
                                  <span className="subtle">{formatExpertSnapshot(pick)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="subtle">No minority-side pick detail on this market.</div>
                          )}
                        </section>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {activeRows.length === 0 ? <div className="subtle">No board rows match the current filters with signal activity.</div> : null}
          </div>
        </section>
      </section>
    </main>
  );
}

