'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson, formatPct } from '../../../lib/data';
import type { MlbPerformanceRow, MlbPerformanceRowsPayload } from '../../../lib/mlb';
import { buildBreakdown, filterRowsByDate, formatAmericanOdds, formatMarketTypeLabel, formatUnits, summarizePerformanceRows } from '../../../lib/mlb';

const EMPTY_ROWS: MlbPerformanceRowsPayload = {
  generatedAt: null,
  trackingStartDate: null,
  rowCount: 0,
  settledRowCount: 0,
  rows: []
};

const WINDOW_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '180', label: 'Last 6 months' },
  { value: 'custom', label: 'Custom' }
];

export default function MlbPerformancePage() {
  const [data, setData] = useState<MlbPerformanceRowsPayload>(EMPTY_ROWS);
  const [windowMode, setWindowMode] = useState('yesterday');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leanTypeFilter, setLeanTypeFilter] = useState('core');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');

  useEffect(() => {
    fetchPublicJson('/data/mlb_leans_performance_rows.json', EMPTY_ROWS).then((payload) => {
      setData(payload);
      const trackingStart = payload.trackingStartDate ?? '2026-03-28';
      const latestDate = payload.rows.map((row) => row.requestedDate).filter(Boolean).sort().at(-1) ?? trackingStart;
      const yesterday = shiftDate(latestDate, -1);
      setStartDate(yesterday < trackingStart ? trackingStart : yesterday);
      setEndDate(yesterday < trackingStart ? trackingStart : yesterday);
    });
  }, []);

  const trackingStartDate = data.trackingStartDate ?? '2026-03-28';
  const activeRows = useMemo(() => data.rows.filter((row) => row.requestedDate >= trackingStartDate), [data.rows, trackingStartDate]);
  const settledRows = useMemo(() => activeRows.filter((row) => row.result !== null), [activeRows]);
  const latestDate = useMemo(() => activeRows.map((row) => row.requestedDate).filter(Boolean).sort().at(-1) ?? trackingStartDate, [activeRows, trackingStartDate]);

  useEffect(() => {
    if (!latestDate || windowMode === 'custom') return;
    const next = getWindowRange(windowMode, latestDate, trackingStartDate);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
  }, [latestDate, trackingStartDate, windowMode]);

  const windowedRows = useMemo(() => filterRowsByDate(settledRows, startDate, endDate), [endDate, settledRows, startDate]);
  const filteredRows = useMemo(
    () =>
      windowedRows.filter((row) => {
        if (leanTypeFilter !== 'all' && (row.leanLane ?? 'unknown') !== leanTypeFilter) return false;
        if (confidenceFilter !== 'all' && row.confidenceTier !== confidenceFilter) return false;
        if (marketFilter !== 'all' && row.marketType !== marketFilter) return false;
        return true;
      }),
    [confidenceFilter, leanTypeFilter, marketFilter, windowedRows]
  );

  const summary = useMemo(() => summarizePerformanceRows(filteredRows), [filteredRows]);
  const byLeanType = useMemo(() => buildBreakdown(filteredRows, (row) => row.leanLane ?? 'unknown'), [filteredRows]);
  const byMarket = useMemo(() => buildBreakdown(filteredRows, (row) => describeMarketBucket(row)), [filteredRows]);
  const cumulativeTrend = useMemo(() => buildCumulativeUnitsTrend(filteredRows), [filteredRows]);

  const leanTypeOptions = useMemo(() => ['all', ...unique(activeRows.map((row) => row.leanLane ?? 'unknown'))], [activeRows]);
  const confidenceOptions = useMemo(() => ['all', ...unique(activeRows.map((row) => row.confidenceTier))], [activeRows]);
  const marketOptions = useMemo(() => ['all', ...unique(activeRows.map((row) => row.marketType))], [activeRows]);

  return (
    <main className="page">
      <section className="hero mlb-hero mlb-hero-tight">
        <div className="mlb-hero-copy">
          <div className="mlb-lean-kicker">MLB tracking</div>
          <h2>Performance</h2>
          <p className="subtle">
            Active tracking begins on {trackingStartDate}. Units assume 1 unit risked per bet, with odds-adjusted returns on priced settled bets only.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="controls">
          <div className="control">
            <label>Window</label>
            <select value={windowMode} onChange={(event) => setWindowMode(event.target.value)}>
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              min={trackingStartDate}
              onChange={(event) => {
                setWindowMode('custom');
                setStartDate(event.target.value);
              }}
            />
          </div>

          <div className="control">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              min={trackingStartDate}
              onChange={(event) => {
                setWindowMode('custom');
                setEndDate(event.target.value);
              }}
            />
          </div>

          <div className="control">
            <label>Lean Type</label>
            <select value={leanTypeFilter} onChange={(event) => setLeanTypeFilter(event.target.value)}>
              {leanTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All lean types' : titleize(option)}
                </option>
              ))}
            </select>
          </div>

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
          <h3>Filtered Summary</h3>
          <div className="metrics">
            <div className="metric">
              <label>Bets</label>
              <strong>{summary.bets}</strong>
            </div>
            <div className="metric">
              <label>Wins</label>
              <strong>{summary.wins}</strong>
            </div>
            <div className="metric">
              <label>Losses</label>
              <strong>{summary.losses}</strong>
            </div>
            <div className="metric">
              <label>Pushes</label>
              <strong>{summary.pushes}</strong>
            </div>
            <div className="metric">
              <label>Win %</label>
              <strong>{formatPct(summary.winPct)}</strong>
            </div>
            <div className="metric">
              <label>Units</label>
              <strong>{formatUnits(summary.units)}</strong>
            </div>
            <div className="metric">
              <label>ROI</label>
              <strong>{formatPct(summary.roi)}</strong>
            </div>
          </div>
          <p className="subtle">Units assume 1 unit risked per bet. Odds-adjusted returns use only priced settled bets, while record totals still reflect every graded result.</p>
        </article>

        <article className="panel">
          <h3>Units Over Time</h3>
          <TrendChart points={cumulativeTrend} />
        </article>
      </section>

      <section className="cards two-up">
        <article className="panel table-wrap">
          <h3>By Lean Type</h3>
          <BreakdownTable rows={byLeanType} />
        </article>

        <article className="panel table-wrap">
          <h3>By Market</h3>
          <BreakdownTable rows={byMarket} />
        </article>
      </section>

      <section className="panel table-wrap">
        <h3>Graded Lean Rows</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Matchup</th>
              <th>Lean Type</th>
              <th>Confidence</th>
              <th>Market</th>
              <th>Bet</th>
              <th>Price / Line</th>
              <th>Result</th>
              <th>Units</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={`${row.requestedDate}:${row.canonicalGameId}:${row.marketType}:${row.selectionKey}`}>
                <td>{row.requestedDate}</td>
                <td><strong>{row.matchup}</strong></td>
                <td>{titleize(row.leanLane ?? 'unknown')}</td>
                <td>{titleize(row.confidenceTier)}</td>
                <td>{describeMarketBucket(row)}</td>
                <td>{buildBetLabel(row)}</td>
                <td>{buildPriceLineLabel(row)}</td>
                <td>{titleize(row.result ?? 'pending')}</td>
                <td>{formatUnits(row.realizedRoi ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredRows.length ? <p className="subtle">No graded MLB rows match the current filters and active tracking window.</p> : null}
      </section>
    </main>
  );
}

function TrendChart({ points }: { points: Array<{ requestedDate: string; units: number }> }) {
  if (!points.length) {
    return <p className="subtle">No priced settled rows in the current filter window.</p>;
  }

  const width = 640;
  const height = 180;
  const padding = 20;
  const values = points.map((point) => point.units);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const range = maxValue - minValue || 1;
  const xStep = points.length === 1 ? 0 : (width - padding * 2) / (points.length - 1);
  const polyline = points
    .map((point, index) => {
      const x = padding + xStep * index;
      const y = height - padding - ((point.units - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
  const zeroY = height - padding - ((0 - minValue) / range) * (height - padding * 2);

  return (
    <div className="mlb-trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="mlb-trend-chart-svg" role="img" aria-label="Cumulative units over time">
        <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} className="mlb-trend-axis" />
        <polyline points={polyline} fill="none" className="mlb-trend-line" />
      </svg>
      <div className="mlb-trend-foot">
        <span>{points[0]?.requestedDate}</span>
        <strong>{formatUnits(points.at(-1)?.units ?? null)} cumulative</strong>
        <span>{points.at(-1)?.requestedDate}</span>
      </div>
    </div>
  );
}

function BreakdownTable({
  rows
}: {
  rows: Array<{ key: string; bets: number; pricedBets: number; wins: number; losses: number; pushes: number; winPct: number | null; units: number | null; roi: number | null }>;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>Bucket</th>
          <th>Bets</th>
          <th>Priced</th>
          <th>Wins</th>
          <th>Losses</th>
          <th>Pushes</th>
          <th>Win %</th>
          <th>Units</th>
          <th>ROI</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>{titleize(row.key.replace(/_/g, ' '))}</td>
            <td>{row.bets}</td>
            <td>{row.pricedBets}</td>
            <td>{row.wins}</td>
            <td>{row.losses}</td>
            <td>{row.pushes}</td>
            <td>{formatPct(row.winPct)}</td>
            <td>{formatUnits(row.units)}</td>
            <td>{formatPct(row.roi)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildCumulativeUnitsTrend(rows: MlbPerformanceRow[]) {
  const byDate = new Map<string, number>();
  rows.forEach((row) => {
    if (typeof row.realizedRoi !== 'number') return;
    byDate.set(row.requestedDate, (byDate.get(row.requestedDate) ?? 0) + row.realizedRoi);
  });
  let cumulative = 0;
  return Array.from(byDate.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([requestedDate, units]) => {
      cumulative += units;
      return {
        requestedDate,
        units: Number(cumulative.toFixed(4))
      };
    });
}

function getWindowRange(mode: string, latestDate: string, trackingStartDate: string) {
  if (mode === 'all') {
    return { startDate: trackingStartDate, endDate: latestDate };
  }
  if (mode === 'yesterday') {
    const yesterday = shiftDate(latestDate, -1);
    const safeDate = yesterday < trackingStartDate ? trackingStartDate : yesterday;
    return { startDate: safeDate, endDate: safeDate };
  }
  const days = Number(mode);
  if (!Number.isFinite(days) || days <= 0) {
    return { startDate: trackingStartDate, endDate: latestDate };
  }
  const startDate = shiftDate(latestDate, -(days - 1));
  return { startDate: startDate < trackingStartDate ? trackingStartDate : startDate, endDate: latestDate };
}

function shiftDate(dateString: string, deltaDays: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function describeMarketBucket(row: MlbPerformanceRow): string {
  if (row.marketType === 'total') {
    return row.selection.toLowerCase().startsWith('under') ? 'Total — Under' : 'Total — Over';
  }
  if (row.marketType === 'moneyline') {
    if (typeof row.currentOdds === 'number') {
      return row.currentOdds < 0 ? 'Moneyline — Favorite' : 'Moneyline — Underdog';
    }
    return 'Moneyline';
  }
  if (row.marketType === 'run_line') {
    return row.selectionKey === 'home' ? 'Run Line — Home' : row.selectionKey === 'away' ? 'Run Line — Away' : 'Run Line';
  }
  return formatMarketTypeLabel(row.marketType);
}

function buildBetLabel(row: MlbPerformanceRow): string {
  if (row.marketType === 'total') {
    return typeof row.currentLine === 'number' ? `${row.selection} ${trimLine(row.currentLine)}` : row.selection;
  }
  if (row.marketType === 'moneyline') {
    return `${row.selection}${typeof row.currentOdds === 'number' ? ` ${formatAmericanOdds(row.currentOdds)}` : ''}`;
  }
  if (row.marketType === 'run_line') {
    return typeof row.currentLine === 'number' ? `${row.selection} ${trimSignedLine(row.currentLine)}` : row.selection;
  }
  return row.selection;
}

function buildPriceLineLabel(row: MlbPerformanceRow): string {
  if (row.marketType === 'moneyline') {
    return typeof row.currentOdds === 'number' ? formatAmericanOdds(row.currentOdds) : 'N/A';
  }
  if (row.marketType === 'total') {
    const pieces = [];
    if (typeof row.currentLine === 'number') pieces.push(trimLine(row.currentLine));
    if (typeof row.currentOdds === 'number') pieces.push(formatAmericanOdds(row.currentOdds));
    return pieces.length ? pieces.join(' @ ') : 'N/A';
  }
  if (row.marketType === 'run_line') {
    const pieces = [];
    if (typeof row.currentLine === 'number') pieces.push(trimSignedLine(row.currentLine));
    if (typeof row.currentOdds === 'number') pieces.push(formatAmericanOdds(row.currentOdds));
    return pieces.length ? pieces.join(' @ ') : 'N/A';
  }
  return 'N/A';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => compareKnownOrder(left, right) || left.localeCompare(right));
}

function compareKnownOrder(left: string, right: string): number {
  const order = ['core', 'exploratory', 'unknown'];
  const leftIndex = order.indexOf(left);
  const rightIndex = order.indexOf(right);
  if (leftIndex === -1 && rightIndex === -1) return 0;
  return normalizeOrder(leftIndex) - normalizeOrder(rightIndex);
}

function normalizeOrder(value: number) {
  return value === -1 ? Number.MAX_SAFE_INTEGER : value;
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
