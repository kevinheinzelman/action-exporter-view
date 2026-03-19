export type AnalysisRow = {
  analysisKey: string;
  evaluationKey: string;
  date: string | null;
  startTimeUtc: string | null;
  league: string;
  awayTeam: string | null;
  homeTeam: string | null;
  market: 'spread' | 'moneyline' | 'total';
  side: 'away' | 'home' | 'over' | 'under';
  selection: string | null;
  line: number | null;
  sharpCount: number;
  pickCount: number;
  publicMoneyMinusBetsPct: number | null;
  hasSharpSignal: boolean;
  hasPickSignal: boolean;
  hasSharpPickAgreement: boolean;
  isSharpMajority: boolean;
  isPickMajority: boolean;
  outcome: 'win' | 'loss' | 'push' | 'void' | 'unknown';
  isLatestPregame: boolean;
  isLatestAvailable: boolean;
};

export type DecisionRow = AnalysisRow & {
  decisionSource: 'sharp' | 'picks';
  signalLabel: string;
};

export type AngleDefinition = {
  id: string;
  group: 'sharps' | 'picks' | 'combo' | 'public' | 'spread';
  label: string;
  market: 'all' | 'spread' | 'moneyline' | 'total';
  match: (row: DecisionRow) => boolean;
  description: string;
};

export const SUPPORTED_DECISION_LEAGUES = ['mlb', 'nba', 'nhl', 'ncaab'] as const;

const SHARP_THRESHOLDS = [2, 3, 4, 5, 6, 8, 10] as const;
const PICK_THRESHOLDS = [2, 3, 4, 5, 6, 8, 10] as const;
const AGREEMENT_THRESHOLDS = [2, 3, 4, 5] as const;
const PUBLIC_THRESHOLDS = [5, 10, 15] as const;

export const ANGLE_DEFINITIONS: AngleDefinition[] = [
  ...SHARP_THRESHOLDS.map((threshold) => ({
    id: `sharp-majority-${threshold}plus`,
    group: 'sharps' as const,
    label: `Sharp majority with ${threshold}+ sharps`,
    market: 'all' as const,
    description: `The actionable side has at least ${threshold} sharp signals.`,
    match: (row: DecisionRow) => row.decisionSource === 'sharp' && row.sharpCount >= threshold
  })),
  ...PICK_THRESHOLDS.map((threshold) => ({
    id: `pick-majority-${threshold}plus`,
    group: 'picks' as const,
    label: `Pick majority with ${threshold}+ picks`,
    market: 'all' as const,
    description: `The actionable side has at least ${threshold} picks behind it.`,
    match: (row: DecisionRow) => row.decisionSource === 'picks' && row.pickCount >= threshold
  })),
  ...AGREEMENT_THRESHOLDS.map((threshold) => ({
    id: `agreement-${threshold}-${threshold}`,
    group: 'combo' as const,
    label: `Sharps and picks agree with ${threshold}+ on both sides`,
    market: 'all' as const,
    description: `Sharps and picks point to the same side, with at least ${threshold} sharp signals and ${threshold} picks.`,
    match: (row: DecisionRow) => row.hasSharpPickAgreement && row.sharpCount >= threshold && row.pickCount >= threshold
  })),
  ...PUBLIC_THRESHOLDS.map((threshold) => ({
    id: `money-minus-bets-${threshold}`,
    group: 'public' as const,
    label: `Public money leads bets by ${threshold}+ points`,
    market: 'all' as const,
    description: `Money percentage is at least ${threshold} points higher than bet percentage on the selected side.`,
    match: (row: DecisionRow) => typeof row.publicMoneyMinusBetsPct === 'number' && row.publicMoneyMinusBetsPct >= threshold
  })),
  {
    id: 'spread-short-line',
    group: 'spread',
    label: 'Spread with a short line under 5',
    market: 'spread',
    description: 'Spread selection where the line is smaller than 5 points.',
    match: (row) => row.market === 'spread' && typeof row.line === 'number' && Math.abs(row.line) < 5
  },
  {
    id: 'spread-medium-line',
    group: 'spread',
    label: 'Spread with a line from 5 to 10',
    market: 'spread',
    description: 'Spread selection where the line falls between 5 and 10 points.',
    match: (row) => row.market === 'spread' && typeof row.line === 'number' && Math.abs(row.line) >= 5 && Math.abs(row.line) <= 10
  },
  {
    id: 'spread-big-line',
    group: 'spread',
    label: 'Spread with a line above 10',
    market: 'spread',
    description: 'Spread selection where the line is larger than 10 points.',
    match: (row) => row.market === 'spread' && typeof row.line === 'number' && Math.abs(row.line) > 10
  }
];

export function toDecisionRows(rows: AnalysisRow[]): DecisionRow[] {
  return rows
    .filter((row) => SUPPORTED_DECISION_LEAGUES.includes(row.league as (typeof SUPPORTED_DECISION_LEAGUES)[number]))
    .filter((row) => {
      if (row.hasSharpSignal) {
        return row.isSharpMajority;
      }
      if (row.hasPickSignal) {
        return row.isPickMajority;
      }
      return false;
    })
    .map((row) => ({
      ...row,
      decisionSource: row.hasSharpSignal ? 'sharp' : 'picks',
      signalLabel: row.hasSharpPickAgreement
        ? 'Sharp + Pick Agree'
        : row.hasSharpSignal && row.hasPickSignal
          ? 'Sharps + Picks'
          : row.hasSharpSignal
            ? 'Sharp Signal'
            : 'Pick Signal'
    }));
}

export function summarizeDecisionRows(rows: DecisionRow[]) {
  const wins = rows.filter((row) => row.outcome === 'win').length;
  const losses = rows.filter((row) => row.outcome === 'loss').length;
  const pushes = rows.filter((row) => row.outcome === 'push').length;
  return {
    selectionCount: rows.length,
    wins,
    losses,
    pushes,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null
  };
}

export function formatTimeframe(rows: Array<{ date: string | null }>): string {
  const dates = rows.map((row) => row.date).filter((value): value is string => Boolean(value)).sort();
  if (!dates.length) {
    return 'No dates available';
  }
  if (dates[0] === dates[dates.length - 1]) {
    return dates[0];
  }
  return `${dates[0]} to ${dates[dates.length - 1]}`;
}
