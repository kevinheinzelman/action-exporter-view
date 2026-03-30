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

type MarketMaturity = 'early' | 'developing' | 'stable';

type DisplaySignal = {
  key: string;
  signalKey: string;
  icon: string;
  text: string;
  summary: string;
  strength: 'primary' | 'supportive' | 'cautious';
};

export default function MlbDailyLeansPage() {
  const [data, setData] = useState<MlbDailyLeansPayload>(EMPTY_DAILY);
  const [status, setStatus] = useState<MlbLeansStatusPayload>(EMPTY_STATUS);
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPublicJson('/data/mlb_daily_leans.json', EMPTY_DAILY).then(setData);
    fetchPublicJson('/data/mlb_leans_status.json', EMPTY_STATUS).then(setStatus);
  }, []);

  const rows = data.rows ?? [];
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (confidenceFilter !== 'all' && row.confidenceTier !== confidenceFilter) return false;
        if (marketFilter !== 'all' && row.marketType !== marketFilter) return false;
        return true;
      }),
    [confidenceFilter, marketFilter, rows]
  );

  const coreRows = filteredRows.filter((row) => row.leanLane === 'core');
  const exploratoryRows = filteredRows.filter((row) => row.leanLane === 'exploratory');
  const confidenceOptions = ['all', ...unique(rows.map((row) => row.confidenceTier))];
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
        expandedKeys={expandedKeys}
        onToggle={(key) => setExpandedKeys((current) => ({ ...current, [key]: !current[key] }))}
      />

      <LeanSection
        title="Exploratory Leans"
        subtitle="Lower-threshold ideas still worth tracking, but less trusted than core."
        rows={exploratoryRows}
        expandedKeys={expandedKeys}
        onToggle={(key) => setExpandedKeys((current) => ({ ...current, [key]: !current[key] }))}
      />
    </main>
  );
}

function LeanSection({
  title,
  subtitle,
  rows,
  expandedKeys,
  onToggle
}: {
  title: string;
  subtitle: string;
  rows: MlbDailyLeanRow[];
  expandedKeys: Record<string, boolean>;
  onToggle: (key: string) => void;
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
          const key = `${row.gameId}:${row.marketType}:${row.marketSide}`;
          const expanded = Boolean(expandedKeys[key]);
          const displaySignals = buildDisplaySignals(row);
          const visibleSignals = expanded ? displaySignals : displaySignals.slice(0, 4);
          const hiddenCount = Math.max(0, displaySignals.length - visibleSignals.length);
          const context = describeCompositeContext(row);
          const maturity = getMarketMaturity(row);
          const maturityLabel = getMarketMaturityLabel(maturity);

          return (
            <article className="mlb-lean-card mlb-lean-card-emphasis" key={key}>
              <div className="mlb-lean-card-head">
                <div>
                  <div className="mlb-lean-kicker">
                    {row.awayTeam ?? 'Away'} at {row.homeTeam ?? 'Home'}
                  </div>
                  <h4>Bet: {buildBetDisplay(row)}</h4>
                  <div className="subtle">{formatMarketTypeLabel(row.marketType)}</div>
                </div>
                <div className="mlb-lean-badges">
                  <span className="pill mlb-pill mlb-pill-confidence">{titleize(row.confidenceTier)}</span>
                  <span className={`pill mlb-pill ${maturityLabel.className}`}>{maturityLabel.label}</span>
                </div>
              </div>

              <p className="mlb-lean-explainer">{buildReadableExplanation(row)}</p>

              <div className="mlb-pill-row">
                <span className={`pill mlb-pill ${row.hasActionSupportFlag ? 'mlb-pill-positive' : 'mlb-pill-negative'}`}>
                  {row.hasActionSupportFlag ? 'Action on board' : 'No Action support'}
                </span>
                <span className={`pill mlb-pill ${row.hasBaseballSupportFlag ? 'mlb-pill-positive' : 'mlb-pill-negative'}`}>
                  {row.hasBaseballSupportFlag ? 'Baseball context present' : 'No baseball confirmation'}
                </span>
                <span className={`pill mlb-pill ${row.hasMarketSupportFlag ? 'mlb-pill-positive' : 'mlb-pill-negative'}`}>
                  {row.hasMarketSupportFlag ? 'Market context present' : 'No market confirmation'}
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
                    {row.signalCount} signals across {row.supportingFamilyCount} families
                  </strong>
                  <div className="subtle">{summarizeSupport(row)}</div>
                </div>
              </div>

              <div className="mlb-signal-block">
                <strong>Why it's here</strong>
                <div className="mlb-signal-chip-wrap">
                  {visibleSignals.map((signal) => (
                    <span className={`mlb-signal-chip mlb-signal-chip-${signal.strength}`} key={signal.key}>
                      <span className="mlb-signal-chip-icon">{signal.icon}</span>
                      <span>{signal.text}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mlb-lean-footer">
                <span className="subtle">{hiddenCount > 0 ? `${hiddenCount} more signals available` : 'All support signals shown'}</span>
                <button type="button" className="current-board-detail-toggle" onClick={() => onToggle(key)}>
                  {expanded ? 'Show fewer signals' : hiddenCount > 0 ? 'Show all signals' : 'Signal detail'}
                </button>
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
  const signals = buildDisplaySignals(row).slice(0, 2).map((signal) => signal.summary.replace(/\.$/, ''));
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
  const deduped = new Map<string, DisplaySignal>();
  row.triggeredSignals.forEach((signal, index) => {
    const mapped = mapSignalToDisplay(signal, row, index);
    if (!mapped) {
      return;
    }
    if (!deduped.has(mapped.signalKey)) {
      deduped.set(mapped.signalKey, mapped);
    }
  });
  return Array.from(deduped.values());
}

function mapSignalToDisplay(signal: Record<string, unknown>, row: MlbDailyLeanRow, index: number): DisplaySignal | null {
  const label = String(signal.label ?? signal.signal_name ?? 'signal');
  const family = String(signal.family ?? 'other').toLowerCase();
  const lowerLabel = label.toLowerCase();
  const maturity = getMarketMaturity(row);
  const selection = buildSelectionAnchor(row);
  const marketLabel = formatMarketTypeLabel(row.marketType);
  const teamOnly = row.selectionLabel;
  const icon = iconForFamily(family, label);
  const sharpCount = typeof row.sharpCount === 'number' ? row.sharpCount : null;
  const pickCount = typeof row.pickCount === 'number' ? row.pickCount : null;
  const publicBets = formatPercentValue(row.publicBetsPct);
  const publicMoney = formatPercentValue(row.publicMoneyPct);
  const lineMove = describeLineMovement(row);

  let signalKey = `${family}:${label}`;
  let text = titleize(label.replace(/_/g, ' '));
  let summary = `${titleize(label.replace(/_/g, ' '))} supports ${selection}.`;
  let strength: DisplaySignal['strength'] = 'supportive';

  if (lowerLabel.includes('reverse line')) {
    signalKey = `reverse_line:${row.marketType}:${row.marketSide}`;
    if (maturity === 'early' && isWeakMovement(row)) {
      return null;
    }
    text = `${marketLabel} reverse line movement toward ${teamOnly}${lineMove ? ` (${lineMove})` : ''}`;
    summary =
      maturity === 'early'
        ? `${marketLabel} movement is starting to lean toward ${selection}, but it is still early.`
        : `${marketLabel} reverse line movement is backing ${selection}${lineMove ? ` after moving ${lineMove}` : ''}.`;
    strength = maturity === 'stable' ? 'primary' : 'supportive';
  } else if (lowerLabel.includes('sharp on side') || lowerLabel.includes('sharp present') || family.includes('sharp')) {
    signalKey = `sharp_support:${row.marketType}:${row.marketSide}`;
    text = `Sharp support on ${selection}${sharpCount != null ? ` (${sharpCount} sharps)` : ''}`;
    summary =
      sharpCount != null && sharpCount > 0
        ? `${sharpCount} sharp signals align on ${selection}.`
        : `Sharp activity still points toward ${selection}.`;
    strength = sharpCount != null && sharpCount >= 3 ? 'primary' : 'supportive';
  } else if (lowerLabel.includes('majority pick') || lowerLabel.includes('pick count') || family.includes('pick')) {
    signalKey = `pick_support:${row.marketType}:${row.marketSide}`;
    text = `Picks aligned on ${selection}${pickCount != null ? ` (${pickCount} picks)` : ''}`;
    summary =
      pickCount != null && pickCount > 0
        ? `${pickCount} tracked picks line up with ${selection}.`
        : `Pick activity is leaning the same way as ${selection}.`;
    strength = maturity === 'stable' ? 'supportive' : 'cautious';
  } else if (lowerLabel.includes('public money')) {
    signalKey = `public_money:${row.marketType}:${row.marketSide}`;
    if (maturity === 'early' && isLowVolumePublicSignal(row)) {
      return null;
    }
    text = `Public money stayed light on ${teamOnly}${publicBets || publicMoney ? ` (${publicBets ?? '?'} bets / ${publicMoney ?? '?'} money)` : ''}`;
    summary =
      maturity === 'early'
        ? `Public money is still light on ${selection}, but the market is still developing.`
        : `Public money remains light on ${selection}${publicBets || publicMoney ? ` at ${publicBets ?? '?'} bets and ${publicMoney ?? '?'} money` : ''}.`;
    strength = maturity === 'stable' ? 'supportive' : 'cautious';
  } else if (lowerLabel.includes('public bets')) {
    signalKey = `public_bets:${row.marketType}:${row.marketSide}`;
    if (maturity === 'early' && isLowVolumePublicSignal(row)) {
      return null;
    }
    text = `Public betting stayed light on ${teamOnly}${publicBets || publicMoney ? ` (${publicBets ?? '?'} bets / ${publicMoney ?? '?'} money)` : ''}`;
    summary =
      maturity === 'early'
        ? `Public betting is still light on ${selection}, but the market is still developing.`
        : `Public betting remains light on ${selection}${publicBets || publicMoney ? ` at ${publicBets ?? '?'} bets and ${publicMoney ?? '?'} money` : ''}.`;
    strength = maturity === 'stable' ? 'supportive' : 'cautious';
  } else if (family.includes('alignment')) {
    signalKey = `alignment:${row.marketType}:${row.marketSide}`;
    text = `Sharps and picks aligned on ${selection}`;
    summary = `Sharp and pick signals are pointing the same way on ${selection}.`;
    strength = 'primary';
  } else if (family.includes('wind')) {
    signalKey = `wind:${row.marketType}:${row.marketSide}`;
    text = `Wind setup supports ${selection}`;
    summary = `Wind conditions support ${selection}.`;
    strength = 'primary';
  } else if (family.includes('weather')) {
    signalKey = `weather:${row.marketType}:${row.marketSide}`;
    text = `Weather setup supports ${selection}`;
    summary = `Weather conditions support ${selection}.`;
    strength = 'supportive';
  } else if (family.includes('bullpen')) {
    signalKey = `bullpen:${row.marketType}:${row.marketSide}`;
    text = `Bullpen context supports ${selection}`;
    summary = `Bullpen context points toward ${selection}.`;
    strength = 'supportive';
  } else if (family.includes('pitcher')) {
    signalKey = `pitcher:${row.marketType}:${row.marketSide}`;
    text = `Starting-pitcher context supports ${selection}`;
    summary = `Starting-pitcher context points toward ${selection}.`;
    strength = 'supportive';
  } else if (family.includes('market')) {
    signalKey = `market:${row.marketType}:${row.marketSide}:${label}`;
    text = `Market setup supports ${selection}${lineMove ? ` (${lineMove})` : ''}`;
    summary =
      maturity === 'early'
        ? `The market is leaning toward ${selection}, but the signal is still early.`
        : `Market structure still supports ${selection}.`;
    strength = maturity === 'stable' ? 'supportive' : 'cautious';
  }

  return {
    key: `${row.gameId}:${row.marketType}:${index}:${signalKey}`,
    signalKey,
    icon,
    text,
    summary,
    strength
  };
}

function summarizeSupport(row: MlbDailyLeanRow): string {
  const pieces: string[] = [];
  if (row.hasActionSupportFlag) pieces.push('Action');
  if (row.hasBaseballSupportFlag) pieces.push('baseball');
  if (row.hasMarketSupportFlag) pieces.push('market');
  if (!pieces.length) return 'No secondary support flags present';
  return `${pieces.join(' + ')} support`;
}

function buildSelectionAnchor(row: MlbDailyLeanRow): string {
  if (row.marketType === 'moneyline') return `${row.selectionLabel} moneyline`;
  if (row.marketType === 'run_line') return `${row.selectionLabel} run line`;
  return `${row.selectionLabel}${typeof row.currentLine === 'number' ? ` ${trimLine(row.currentLine)}` : ''}`;
}

function getMarketMaturity(row: MlbDailyLeanRow): MarketMaturity {
  const minutes = row.minutesBeforeStart;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return 'developing';
  }
  if (minutes > 360) {
    return 'early';
  }
  if (minutes >= 120) {
    return 'developing';
  }
  return 'stable';
}

function getMarketMaturityLabel(maturity: MarketMaturity): { label: string; className: string } {
  if (maturity === 'early') {
    return { label: 'Early Look', className: 'mlb-pill-maturity-early' };
  }
  if (maturity === 'stable') {
    return { label: 'Market Confirmed', className: 'mlb-pill-maturity-stable' };
  }
  return { label: 'Developing Market', className: 'mlb-pill-maturity-developing' };
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
    const signals = row.triggeredSignals.map((signal) => String(signal.family ?? '').toLowerCase());
    if (signals.some((family) => family.includes('sharp') || family.includes('sentiment') || family.includes('pick') || family.includes('alignment'))) {
      familyGroups.sharpDriven += 1;
    }
    if (signals.some((family) => family.includes('weather') || family.includes('wind'))) {
      familyGroups.weatherDriven += 1;
    }
    if (signals.some((family) => family.includes('pitcher') || family.includes('bullpen') || family.includes('baseball'))) {
      familyGroups.baseballDriven += 1;
    }
    if (signals.some((family) => family.includes('market'))) {
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

function formatPercentValue(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value)}%`;
}

function describeLineMovement(row: MlbDailyLeanRow): string | null {
  if (row.marketType === 'moneyline') {
    if (typeof row.openingPriceAmerican === 'number' && typeof row.currentOdds === 'number') {
      return `opened ${formatAmericanOdds(row.openingPriceAmerican)} to ${formatAmericanOdds(row.currentOdds)}`;
    }
    if (typeof row.openingPriceAmerican === 'number' && typeof row.priceAmerican === 'number') {
      return `opened ${formatAmericanOdds(row.openingPriceAmerican)} to ${formatAmericanOdds(row.priceAmerican)}`;
    }
    return null;
  }
  if (typeof row.openingLineValue === 'number' && typeof row.currentLine === 'number') {
    return `opened ${trimLine(row.openingLineValue)} to ${trimLine(row.currentLine)}`;
  }
  if (typeof row.openingLineValue === 'number' && typeof row.lineValue === 'number') {
    return `opened ${trimLine(row.openingLineValue)} to ${trimLine(row.lineValue)}`;
  }
  return null;
}

function isLowVolumePublicSignal(row: MlbDailyLeanRow): boolean {
  const bets = row.publicBetsPct;
  const money = row.publicMoneyPct;
  return (typeof bets === 'number' && bets < 40) || (typeof money === 'number' && money < 30);
}

function isWeakMovement(row: MlbDailyLeanRow): boolean {
  if (row.marketType === 'moneyline') {
    return typeof row.priceDelta === 'number' ? Math.abs(row.priceDelta) < 10 : true;
  }
  return typeof row.lineDelta === 'number' ? Math.abs(row.lineDelta) < 0.5 : true;
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
  if (lowerFamily.includes('sharp')) return '🔪';
  if (lowerFamily.includes('pick')) return '👥';
  if (lowerFamily.includes('sentiment')) return '💸';
  if (lowerFamily.includes('alignment')) return '🤝';
  if (lowerFamily.includes('wind')) return '🌬';
  if (lowerFamily.includes('weather')) return '⛅';
  if (lowerFamily.includes('bullpen') || lowerFamily.includes('pitcher') || lowerLabel.includes('bullpen') || lowerLabel.includes('starter')) return '⚾';
  if (lowerFamily.includes('market')) return '📉';
  return '•';
}

