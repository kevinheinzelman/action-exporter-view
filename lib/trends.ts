export type TrendInsightDrilldown = {
  league: 'mlb' | 'nba' | 'nhl' | 'ncaab';
  market: 'spread' | 'moneyline' | 'total';
  marketSide: 'favorite' | 'underdog' | 'over' | 'under';
  startDate: string;
  endDate: string;
  sharpsBucket?: string | null;
  picksBucket?: string | null;
  moneyDeltaBucket?: string | null;
  angleCardId?: string | null;
};

export type TrendInsightRow = {
  insightId: string;
  league: 'mlb' | 'nba' | 'nhl' | 'ncaab';
  timeframeDays: 7 | 14 | 30;
  startDate?: string;
  endDate?: string;
  market: 'spread' | 'moneyline' | 'total';
  marketSide: 'favorite' | 'underdog' | 'over' | 'under';
  sharpsBucket?: string | null;
  picksBucket?: string | null;
  moneyDeltaBucket?: string | null;
  label: string;
  sampleSize: number;
  wins?: number;
  losses?: number;
  pushes?: number;
  winRate: number | null;
  roi?: number | null;
  summaryText: string;
  score: number;
  angleCardId?: string | null;
  drilldown?: TrendInsightDrilldown;
};
