export type MlbDailyLeanRow = {
  requestedDate: string;
  gameId: string;
  gameDate: string | null;
  marketType: string;
  marketSide: string;
  selectionLabel: string;
  homeTeam: string | null;
  awayTeam: string | null;
  leanLane: 'core' | 'exploratory';
  leanScore: number;
  leanRankForDay: number;
  leanRankWithinLane: number;
  confidenceTier: string;
  signalCount: number;
  supportingFamilyCount: number;
  supportProfile: string;
  leadSupportFamily: string;
  actionDominantFlag: boolean;
  universeUsed: string;
  hasActionSupportFlag: boolean;
  hasBaseballSupportFlag: boolean;
  hasMarketSupportFlag: boolean;
  baseballSupportScore: number;
  marketSupportScore: number;
  actionSupportScore: number;
  contrarianOrConflictFlag: boolean;
  explanationText: string;
  topSupportingSignals: Array<Record<string, unknown>>;
  triggeredSignals: Array<Record<string, unknown>>;
  supportingFamilies: string[];
  updatedAt: string;
};

export type MlbDailyLeansPayload = {
  generatedAt: string | null;
  requestedDate: string | null;
  rowCount: number;
  countsByLane: Record<string, number>;
  countsByConfidenceTier: Record<string, number>;
  countsBySupportProfile: Record<string, number>;
  rows: MlbDailyLeanRow[];
};

export type MlbGlossaryRow = {
  signalId: string;
  signalFamily: string;
  signalName: string;
  humanReadableLabel: string;
  plainEnglishDescription: string;
  actionDependencyFlag: boolean;
  universes: string[];
  governanceStates: string[];
  sampleSize: number;
  roi: number | null;
  notes: string | null;
};

export type MlbGlossaryPayload = {
  generatedAt: string | null;
  rowCount: number;
  rows: MlbGlossaryRow[];
};

export type MlbPerformanceRow = {
  requestedDate: string;
  boardDate: string;
  gameDate: string | null;
  canonicalGameId: string;
  matchup: string;
  marketType: string;
  selection: string;
  selectionKey: string;
  confidenceTier: string;
  leanLane: string | null;
  supportProfile: string | null;
  leadSupportFamily: string | null;
  actionDominantFlag: boolean | null;
  hasActionCoverage: boolean;
  hasBaseballSupport: boolean | null;
  hasMarketSupport: boolean | null;
  baseballSupportScore: number | null;
  marketSupportScore: number | null;
  actionSupportScore: number | null;
  leanScore: number | null;
  signalCount: number | null;
  supportingFamilyCount: number | null;
  result: 'win' | 'loss' | 'push' | null;
  realizedRoi: number | null;
  currentOdds: number | null;
  currentLine: number | null;
  explanationText: string | null;
};

export type MlbPerformanceRowsPayload = {
  generatedAt: string | null;
  rowCount: number;
  settledRowCount: number;
  rows: MlbPerformanceRow[];
};

export type MlbLeansStatusPayload = {
  generatedAt: string | null;
  boardDate: string | null;
  lastLeanUpdateAt: string | null;
  currentBoardRowCount: number;
  countsByLane: Record<string, number>;
  countsByConfidenceTier: Record<string, number>;
  countsBySupportProfile: Record<string, number>;
  historyRowCount: number;
  settledHistoryRowCount: number;
  pendingHistoryRowCount: number;
  note: string | null;
};

export type MlbPerformanceWindowSummary = {
  windowKey: string;
  dateRange: { start: string | null; end: string | null };
  overall: {
    bets: number;
    wins: number;
    losses: number;
    pushes: number;
    winPct: number | null;
    units: number | null;
    roi: number | null;
  };
  byLane: Array<Record<string, unknown>>;
  byConfidenceTier: Array<Record<string, unknown>>;
  byMarketType: Array<Record<string, unknown>>;
  bySupportProfile: Array<Record<string, unknown>>;
};

export type MlbPerformanceSummaryPayload = {
  generatedAt: string | null;
  settledRowCount: number;
  windows: MlbPerformanceWindowSummary[];
};

export function formatLeanScore(value: number | null | undefined): string {
  return typeof value === 'number' ? value.toFixed(2).replace(/\.00$/, '') : 'N/A';
}

export function formatUnits(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return 'N/A';
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}u`;
}

export function summarizePerformanceRows(rows: MlbPerformanceRow[]) {
  const wins = rows.filter((row) => row.result === 'win').length;
  const losses = rows.filter((row) => row.result === 'loss').length;
  const pushes = rows.filter((row) => row.result === 'push').length;
  const units = rows.reduce((sum, row) => sum + (row.realizedRoi ?? 0), 0);
  const graded = wins + losses;
  return {
    bets: rows.length,
    wins,
    losses,
    pushes,
    winPct: graded ? wins / graded : null,
    units,
    roi: rows.length ? units / rows.length : null
  };
}

export function buildBreakdown<T extends string>(rows: MlbPerformanceRow[], getKey: (row: MlbPerformanceRow) => T) {
  const grouped = new Map<T, MlbPerformanceRow[]>();
  rows.forEach((row) => {
    const key = getKey(row);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  });
  return Array.from(grouped.entries())
    .map(([key, bucketRows]) => ({
      key,
      ...summarizePerformanceRows(bucketRows)
    }))
    .sort((left, right) => right.bets - left.bets || String(left.key).localeCompare(String(right.key)));
}

export function filterRowsByDate(rows: MlbPerformanceRow[], startDate: string, endDate: string) {
  return rows.filter((row) => {
    if (startDate && row.requestedDate < startDate) {
      return false;
    }
    if (endDate && row.requestedDate > endDate) {
      return false;
    }
    return true;
  });
}

export function getPresetStartDate(endDate: string, days: number): string {
  const date = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return endDate;
  }
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString().slice(0, 10);
}
