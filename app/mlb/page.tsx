'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson } from '../../lib/data';
import type { MlbDailyLeanRow, MlbDailyLeansPayload, MlbLeansStatusPayload } from '../../lib/mlb';
import { formatAmericanOdds, formatMarketTypeLabel } from '../../lib/mlb';

const EMPTY_DAILY: MlbDailyLeansPayload = {
  generatedAt: null,
  requestedDate: null,
  rowCount: 0,
  countsByLane: {},
  countsByConfidenceTier: {},
  countsBySupportProfile: {},
  rows: []
};

const EMPTY_STATUS: MlbLeansStatusPayload = {
  generatedAt: null,
  boardDate: null,
  lastLeanUpdateAt: null,
  currentBoardRowCount: 0,
  countsByLane: {},
  countsByConfidenceTier: {},
  countsBySupportProfile: {},
  historyRowCount: 0,
  settledHistoryRowCount: 0,
  pendingHistoryRowCount: 0,
  note: null
};

type CompositeContext = {
  headline: string;
  detail: string;
};

type DisplaySignal = {
  canonicalSignalKey: string;
  family: 'market' | 'weather' | 'pitcher' | 'bullpen' | 'team_context' | 'game_environment';
  tier: 'PRIMARY' | 'SUPPORTING';
  label: string;
  explanation: string;
  summaryText: string;
  components?: string[];
  details?: Array<{ label: string; explanation: string }>;
  sourceDimension?: 'action' | 'baseball' | 'market' | null;
};

export default function MlbDailyLeansPage() {
  const [data, setData] = useState<MlbDailyLeansPayload>(EMPTY_DAILY);
  const [status, setStatus] = useState<MlbLeansStatusPayload>(EMPTY_STATUS);
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');

  useEffect(() => {
    fetchPublicJson('/data/mlb_daily_leans.json', EMPTY_DAILY).then(setData);
    fetchPublicJson('/data/mlb_leans_status.json', EMPTY_STATUS).then(setStatus);
  }, []);

  const rows = data.rows ?? [];
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const displayConfidence = row.displayConfidenceTier ?? row.confidenceTier;
        if (confidenceFilter !== 'all' && displayConfidence !== confidenceFilter) return false;
        if (marketFilter !== 'all' && row.marketType !== marketFilter) return false;
        return true;
      }),
    [confidenceFilter, marketFilter, rows]
  );

  const coreRows = filteredRows.filter((row) => row.leanLane === 'core');
  const exploratoryRows = filteredRows.filter((row) => row.leanLane === 'exploratory');
  const confidenceOptions = ['all', ...unique(rows.map((row) => row.displayConfidenceTier ?? row.confidenceTier))];
  const marketOptions = ['all', ...unique(rows.map((row) => row.marketType))];
  const marketBreakdown = buildMarketBreakdown(filteredRows);
  const driverBreakdown = buildDriverBreakdown(filteredRows);
  const featuredRow = filteredRows[0] ?? null;

  return (
    <main className="page">
      <section className="hero mlb-hero mlb-hero-compact">
        <div className="mlb-hero-copy">
          <div className="mlb-lean-kicker">MLB board</div>
          <h2>Daily Leans</h2>
          <p className="subtle">
            Core is the sharper board. Exploratory keeps thinner but still governed ideas visible without pretending they carry the same trust.
          </p>
        </div>

        <div className="metrics">
          <div className="metric">
            <label>Board Date</label>
            <strong>{data.requestedDate ?? status.boardDate ?? 'N/A'}</strong>
          </div>
          <div className="metric">
            <label>Core</label>
            <strong>{status.countsByLane.core ?? 0}</strong>
          </div>
          <div className="metric">
            <label>Exploratory</label>
            <strong>{status.countsByLane.exploratory ?? 0}</strong>
          </div>
          <div className="metric">
            <label>Last Refresh</label>
            <strong>{formatDateTime(data.generatedAt ?? status.lastLeanUpdateAt)}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="controls">
          <div className="control">
            <label>Confidence</label>
            <select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)}>
              {confidenceOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All confidence' : titleize(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>Market</label>
            <select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
              {marketOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All markets' : formatMarketTypeLabel(option)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="cards two-up">
        <article className="panel">
          <h3>Board Shape</h3>
          <div className="summary-list">
            {marketBreakdown.map((item) => (
              <div className="summary-item" key={item.label}>
                <strong>{item.label}</strong>
                <span className="subtle">{item.detail}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3>What's Driving It</h3>
          <div className="summary-list">
            {featuredRow ? (
              <div className="summary-item">
                <strong>Top confidence right now: {buildBetDisplay(featuredRow)}</strong>
                <span className="subtle">{buildReadableExplanation(featuredRow)}</span>
              </div>
            ) : null}
            {driverBreakdown.map((item) => (
              <div className="summary-item" key={item.label}>
                <strong>{item.label}</strong>
                <span className="subtle">{item.detail}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <LeanSection
        title="Core Leans"
        subtitle="Stronger, more trusted daily plays."
        rows={coreRows}
      />

      <LeanSection
        title="Exploratory Leans"
        subtitle="Lower-threshold ideas still worth tracking, but less trusted than core."
        rows={exploratoryRows}
      />
    </main>
  );
}

function LeanSection({
  title,
  subtitle,
  rows
}: {
  title: string;
  subtitle: string;
  rows: MlbDailyLeanRow[];
}) {
  return (
    <section className="panel">
      <div className="analysis-panel-head">
        <div>
          <h3>{title}</h3>
          <p className="subtle">{subtitle}</p>
        </div>
      </div>

      <div className="mlb-lean-grid">
        {rows.map((row) => {
          const displaySignals = buildDisplaySignals(row);
          const familyCount = new Set(displaySignals.map((signal) => signal.family)).size;
          const signalCount = countRenderedSignals(displaySignals);
          const context = describeCompositeContext(row);
          const maturityLabel = getMarketMaturityLabel(row);
          const marketState = row.marketState ?? { state: 'neutral', label: 'No market movement yet', reason: 'No meaningful aligned market signal is visible yet.' };
          const displayConfidence = row.displayConfidenceTier ?? row.confidenceTier;
          const baseballFactorLabel = getVisibleBaseballFactorLabel(displaySignals);
          const startTime = formatStartTimeEastern(row.scheduledStartTime);

          return (
            <article className="mlb-lean-card mlb-lean-card-emphasis" key={`${row.gameId}:${row.marketType}:${row.marketSide}`}>
              <div className="mlb-lean-card-head">
                <div>
                  <div className="mlb-lean-kicker">
                    {row.awayTeam ?? 'Away'} at {row.homeTeam ?? 'Home'}
                  </div>
                  <h4>Bet: {buildBetDisplay(row)}</h4>
                  <div className="subtle">
                    {formatMarketTypeLabel(row.marketType)}
                    {startTime ? ` • ${startTime} ET` : ''}
                  </div>
                </div>
                <div className="mlb-lean-badges">
                  <span className="pill mlb-pill mlb-pill-confidence">{titleize(displayConfidence)}</span>
                  {maturityLabel ? <span className={`pill mlb-pill ${maturityLabel.className}`}>{maturityLabel.label}</span> : null}
                </div>
              </div>

              <p className="mlb-lean-explainer">{buildReadableExplanation(row)}</p>

              <div className="mlb-pill-row">
                <span className={`pill mlb-pill ${hasVisibleActionReason(displaySignals) ? 'mlb-pill-positive' : 'mlb-pill-neutral'}`}>
                  {hasVisibleActionReason(displaySignals) ? 'Action signals present' : 'No Action signal yet'}
                </span>
                {baseballFactorLabel ? <span className="pill mlb-pill mlb-pill-positive">{baseballFactorLabel}</span> : null}
                <span className={`pill mlb-pill ${marketStateClassName(marketState.state)}`}>
                  {marketState.label}
                </span>
              </div>

              <div className="mlb-lean-metrics">
                <div className="metric">
                  <label>Context</label>
                  <strong>{context.headline}</strong>
                  <div className="subtle">{context.detail}</div>
                </div>
                <div className="metric">
                  <label>Support</label>
                  <strong>
                    {familyCount} families / {signalCount} signals
                  </strong>
                  <div className="subtle">{buildSignalSummaryLine(row, displaySignals)}</div>
                </div>
              </div>

              <div className="mlb-signal-block">
                <strong>Why it's here</strong>
                <div className="mlb-signal-chip-wrap">
                  {displaySignals.map((signal) => (
                    <span
                      className={`mlb-signal-chip mlb-signal-chip-${signal.tier === 'PRIMARY' ? 'primary' : 'supportive'}`}
                      key={signal.canonicalSignalKey}
                    >
                      <span className="mlb-signal-chip-icon">{iconForFamily(signal.family, signal.label)}</span>
                      <span>{signal.label}</span>
                    </span>
                  ))}
                </div>
                <div className="summary-list">
                  {displaySignals.map((signal) => (
                    <div className="summary-item" key={`${signal.canonicalSignalKey}:detail`}>
                      <strong>{signal.label}</strong>
                      {Array.isArray(signal.details) && signal.details.length ? (
                        <div className="subtle">
                          {signal.details.map((detail) => (
                            <div key={`${signal.canonicalSignalKey}:${detail.label}`}>• {detail.label}: {detail.explanation}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="subtle">• {signal.explanation}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mlb-lean-footer">
                {row.driverSummary ? <span className="subtle">{row.driverSummary}</span> : null}
                <span className="subtle">{marketState.reason}</span>
              </div>
            </article>
          );
        })}
      </div>

      {!rows.length ? <p className="subtle">No plays match the current filters in this lane.</p> : null}
    </section>
  );
}

function buildBetDisplay(row: MlbDailyLeanRow): string {
  if (row.marketType === 'total') {
    return `${row.selectionLabel}${typeof row.currentLine === 'number' ? ` ${trimLine(row.currentLine)}` : ''}${row.currentOdds != null ? ` (${formatAmericanOdds(row.currentOdds)})` : ''}`;
  }
  if (row.marketType === 'moneyline') {
    return `${row.selectionLabel}${row.currentOdds != null ? ` (${formatAmericanOdds(row.currentOdds)})` : ''}`;
  }
  if (row.marketType === 'run_line') {
    return `${row.selectionLabel}${typeof row.currentLine === 'number' ? ` ${trimSignedLine(row.currentLine)}` : ''}${row.currentOdds != null ? ` (${formatAmericanOdds(row.currentOdds)})` : ''}`;
  }
  return row.selectionLabel;
}

function buildReadableExplanation(row: MlbDailyLeanRow): string {
  if (row.signalSummaryLine) {
    return row.signalSummaryLine;
  }
  const signals = buildDisplaySignals(row).slice(0, 3).map((signal) => signal.explanation.replace(/\.$/, ''));
  if (!signals.length) {
    return `${buildSelectionAnchor(row)} stays on the board because the strongest governed evidence still points the same way.`;
  }
  return `${signals.join(' ')}.`;
}

function describeCompositeContext(row: MlbDailyLeanRow): CompositeContext {
  const evidence = row.historicalEvidenceSummary;
  if (evidence?.available && evidence.headline) {
    return {
      headline: evidence.headline,
      detail:
        evidence.detail ??
        'Historical signal evaluation drives this context. Live tracked performance is shown on the Performance page instead.'
    };
  }
  return {
    headline: 'Historical signal base is limited for this lean',
    detail: 'This context uses governed historical signal evaluation only. Live tracked performance is intentionally excluded here.'
  };
}

function buildDisplaySignals(row: MlbDailyLeanRow): DisplaySignal[] {
  return Array.isArray(row.triggeredSignals) ? row.triggeredSignals : [];
}

function buildSignalSummaryLine(row: MlbDailyLeanRow, displaySignals: DisplaySignal[]): string {
  if (row.signalSummaryLine) {
    return row.signalSummaryLine;
  }
  const familyCount = new Set(displaySignals.map((signal) => signal.family)).size;
  return `${familyCount} families / ${countRenderedSignals(displaySignals)} signals`;
}

function buildSelectionAnchor(row: MlbDailyLeanRow): string {
  if (row.marketType === 'moneyline') return `${row.selectionLabel} moneyline`;
  if (row.marketType === 'run_line') return `${row.selectionLabel} run line`;
  return `${row.selectionLabel}${typeof row.currentLine === 'number' ? ` ${trimLine(row.currentLine)}` : ''}`;
}

function hasVisibleActionReason(signals: DisplaySignal[]): boolean {
  return signals.some(
    (signal) =>
      signal.sourceDimension === 'action' ||
      (signal.canonicalSignalKey === 'market_bundle' && Array.isArray(signal.components) && signal.components.some((component) => component.startsWith('action_')))
  );
}

function marketStateClassName(state: 'confirmed' | 'neutral' | 'contradictory'): string {
  if (state === 'confirmed') return 'mlb-pill-positive';
  if (state === 'contradictory') return 'mlb-pill-negative';
  return 'mlb-pill-neutral';
}

function getMarketMaturityLabel(row: MlbDailyLeanRow): { label: string; className: string } | null {
  if (row.scheduledStartTime) {
    const scheduledStart = new Date(row.scheduledStartTime);
    if (!Number.isNaN(scheduledStart.getTime())) {
      const minutesUntilStart = Math.round((scheduledStart.getTime() - Date.now()) / 60000);
      if (minutesUntilStart <= 0) {
        return null;
      }
      if (minutesUntilStart <= 60) {
        return { label: 'Starting Soon', className: 'mlb-pill-maturity-stable' };
      }
      if (minutesUntilStart <= 300) {
        return { label: 'Developing Market', className: 'mlb-pill-maturity-developing' };
      }
      return { label: 'Early Look', className: 'mlb-pill-maturity-early' };
    }
  }
  if (!row.maturityLabel) {
    return null;
  }
  if (row.maturityLabel === 'Early Look') {
    return { label: row.maturityLabel, className: 'mlb-pill-maturity-early' };
  }
  if (row.maturityLabel === 'Starting Soon' || row.maturityLabel === 'Market Confirmed') {
    return { label: row.maturityLabel, className: 'mlb-pill-maturity-stable' };
  }
  return { label: row.maturityLabel, className: 'mlb-pill-maturity-developing' };
}

function countRenderedSignals(signals: DisplaySignal[]): number {
  return signals.reduce((sum, signal) => sum + (Array.isArray(signal.details) && signal.details.length ? signal.details.length : 1), 0);
}

function getVisibleBaseballFactorLabel(signals: DisplaySignal[]): string | null {
  const nonMarket = signals.find((signal) => signal.family !== 'market');
  if (!nonMarket) {
    return null;
  }
  if (nonMarket.family === 'weather') return 'Wind signal present';
  if (nonMarket.family === 'bullpen') return 'Bullpen edge present';
  if (nonMarket.family === 'pitcher') return 'Pitcher edge present';
  if (nonMarket.family === 'game_environment') return 'Environment edge present';
  if (nonMarket.family === 'team_context') return 'Team context present';
  return null;
}

function formatStartTimeEastern(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function buildMarketBreakdown(rows: MlbDailyLeanRow[]) {
  const counts = countByKey(rows, (row) => row.marketType);
  const totalRows = rows.length || 1;
  return ['moneyline', 'total', 'run_line'].map((marketType) => ({
    label: `${formatMarketTypeLabel(marketType)}: ${counts[marketType] ?? 0}`,
    detail: `${formatPctNumber((counts[marketType] ?? 0) / totalRows)} of the current board`
  }));
}

function buildDriverBreakdown(rows: MlbDailyLeanRow[]) {
  const familyGroups: Record<string, number> = {
    sharpDriven: 0,
    weatherDriven: 0,
    baseballDriven: 0,
    marketDriven: 0
  };

  rows.forEach((row) => {
    const signals = buildDisplaySignals(row);
    if (signals.some((signal) => signal.sourceDimension === 'action' || signal.label.toLowerCase().includes('sharp'))) {
      familyGroups.sharpDriven += 1;
    }
    if (signals.some((signal) => signal.family === 'weather')) {
      familyGroups.weatherDriven += 1;
    }
    if (signals.some((signal) => ['pitcher', 'bullpen', 'team_context', 'game_environment'].includes(signal.family))) {
      familyGroups.baseballDriven += 1;
    }
    if (signals.some((signal) => signal.family === 'market')) {
      familyGroups.marketDriven += 1;
    }
  });

  const totalsHeavy = (countByKey(rows, (row) => row.marketType).total ?? 0) > rows.length / 2;
  const items = [
    { label: `Sharp-driven leans: ${familyGroups.sharpDriven}`, detail: 'Rows where sharp or Action-style support is part of the thesis.' },
    { label: `Weather / wind leans: ${familyGroups.weatherDriven}`, detail: 'Rows with visible weather or wind support.' },
    { label: `Pitching / bullpen leans: ${familyGroups.baseballDriven}`, detail: 'Rows with baseball context beyond pure market behavior.' },
    { label: `Market-driven leans: ${familyGroups.marketDriven}`, detail: 'Rows where market movement or structure is part of the thesis.' }
  ];
  if (totalsHeavy) {
    items.unshift({
      label: 'Board cluster: totals-heavy',
      detail: "Today's board is leaning more toward totals than sides."
    });
  }
  return items.slice(0, 4);
}

function countByKey(rows: MlbDailyLeanRow[], getKey: (row: MlbDailyLeanRow) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    const key = getKey(row) || 'unknown';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function titleize(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ');
}

function trimLine(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '.0');
}

function trimSignedLine(value: number): string {
  const formatted = trimLine(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function formatPctNumber(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  }).format(date);
}

function iconForFamily(family: string, label: string): string {
  const lowerFamily = family.toLowerCase();
  const lowerLabel = label.toLowerCase();
  if (lowerFamily.includes('market')) {
    if (lowerLabel.includes('action')) return '🔪';
    if (lowerLabel.includes('sharp')) return '🔪';
    if (lowerLabel.includes('steam')) return '💨';
    if (lowerLabel.includes('reverse')) return '📉';
    if (lowerLabel.includes('pick')) return '👥';
    return '💸';
  }
  if (lowerFamily.includes('weather')) return '🌬';
  if (lowerFamily.includes('pitcher')) return '🎯';
  if (lowerFamily.includes('bullpen')) return '⚾';
  if (lowerFamily.includes('team_context')) return '🧩';
  if (lowerFamily.includes('game_environment')) return '🌡️';
  return '•';
}

