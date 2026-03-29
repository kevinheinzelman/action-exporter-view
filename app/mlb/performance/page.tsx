'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson, formatPct } from '../../../lib/data';
import type { MlbPerformanceRow, MlbPerformanceRowsPayload } from '../../../lib/mlb';
import { buildBreakdown, filterRowsByDate, formatUnits, getPresetStartDate, summarizePerformanceRows } from '../../../lib/mlb';

const EMPTY_ROWS: MlbPerformanceRowsPayload = {
  generatedAt: null,
  rowCount: 0,
  settledRowCount: 0,
  rows: []
};

const WINDOW_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '180', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' }
];

export default function MlbPerformancePage() {
  const [data, setData] = useState<MlbPerformanceRowsPayload>(EMPTY_ROWS);
  const [windowMode, setWindowMode] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [laneFilter, setLaneFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [supportProfileFilter, setSupportProfileFilter] = useState('all');

  useEffect(() => {
    fetchPublicJson('/data/mlb_leans_performance_rows.json', EMPTY_ROWS).then((payload) => {
      setData(payload);
      const latestDate = payload.rows.map((row) => row.requestedDate).filter(Boolean).sort().at(-1) ?? '';
      setEndDate(latestDate);
      setStartDate(latestDate ? getPresetStartDate(latestDate, 30) : '');
    });
  }, []);

  const settledRows = useMemo(() => data.rows.filter((row) => row.result !== null), [data.rows]);
  const latestDate = useMemo(() => settledRows.map((row) => row.requestedDate).filter(Boolean).sort().at(-1) ?? '', [settledRows]);

  useEffect(() => {
    if (!latestDate || windowMode === 'custom') return;
    setEndDate(latestDate);
    setStartDate(windowMode === 'all' ? '' : getPresetStartDate(latestDate, Number(windowMode)));
  }, [latestDate, windowMode]);

  const windowedRows = useMemo(() => filterRowsByDate(settledRows, startDate, endDate), [endDate, settledRows, startDate]);
  const filteredRows = useMemo(
    () =>
      windowedRows.filter((row) => {
        if (laneFilter !== 'all' && (row.leanLane ?? 'unknown') !== laneFilter) return false;
        if (confidenceFilter !== 'all' && row.confidenceTier !== confidenceFilter) return false;
        if (marketFilter !== 'all' && row.marketType !== marketFilter) return false;
        if (supportProfileFilter !== 'all' && (row.supportProfile ?? 'unknown') !== supportProfileFilter) return false;
        return true;
      }),
    [confidenceFilter, laneFilter, marketFilter, supportProfileFilter, windowedRows]
  );

  const summary = useMemo(() => summarizePerformanceRows(filteredRows), [filteredRows]);
  const byLane = useMemo(() => buildBreakdown(filteredRows, (row) => (row.leanLane ?? 'unknown') as string), [filteredRows]);
  const byConfidence = useMemo(() => buildBreakdown(filteredRows, (row) => row.confidenceTier), [filteredRows]);
  const byMarket = useMemo(() => buildBreakdown(filteredRows, (row) => row.marketType), [filteredRows]);
  const bySupport = useMemo(() => buildBreakdown(filteredRows, (row) => (row.supportProfile ?? 'unknown') as string), [filteredRows]);
  const supportProfileCards = useMemo(() => buildSupportProfileCards(filteredRows), [filteredRows]);

  const laneOptions = useMemo(() => ['all', ...unique(data.rows.map((row) => row.leanLane ?? 'unknown'))], [data.rows]);
  const confidenceOptions = useMemo(() => ['all', ...unique(data.rows.map((row) => row.confidenceTier))], [data.rows]);
  const marketOptions = useMemo(() => ['all', ...unique(data.rows.map((row) => row.marketType))], [data.rows]);
  const supportProfileOptions = useMemo(
    () => ['all', ...unique(data.rows.map((row) => row.supportProfile ?? 'unknown'))],
    [data.rows]
  );

  return (
    <main className="page">
      <section className="hero">
        <h2>MLB Performance</h2>
        <p className="subtle">
          Real graded MLB lean history with manually selectable windows. Pending plays stay out of ROI summaries until results settle.
        </p>
        <div className="metrics">
          <div className="metric">
            <label>Settled Rows</label>
            <strong>{data.settledRowCount}</strong>
          </div>
          <div className="metric">
            <label>Visible Bets</label>
            <strong>{summary.bets}</strong>
          </div>
          <div className="metric">
            <label>Win Rate</label>
            <strong>{formatPct(summary.winPct)}</strong>
          </div>
          <div className="metric">
            <label>Units / ROI</label>
            <strong>{`${formatUnits(summary.units)} / ${formatPct(summary.roi)}`}</strong>
          </div>
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
            <input type="date" value={startDate} onChange={(event) => {
              setWindowMode('custom');
              setStartDate(event.target.value);
            }} />
          </div>

          <div className="control">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(event) => {
              setWindowMode('custom');
              setEndDate(event.target.value);
            }} />
          </div>

          <div className="control">
            <label>Lane</label>
            <select value={laneFilter} onChange={(event) => setLaneFilter(event.target.value)}>
              {laneOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All lanes' : titleize(option)}
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
                  {option === 'all' ? 'All markets' : titleize(option.replace('_', ' '))}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>Support Profile</label>
            <select value={supportProfileFilter} onChange={(event) => setSupportProfileFilter(event.target.value)}>
              {supportProfileOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All profiles' : titleize(option.replace(/_/g, ' '))}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="cards two-up">
        <article className="panel table-wrap">
          <h3>By Lane</h3>
          <BreakdownTable rows={byLane} />
        </article>

        <article className="panel table-wrap">
          <h3>By Confidence</h3>
          <BreakdownTable rows={byConfidence} />
        </article>

        <article className="panel table-wrap">
          <h3>By Market</h3>
          <BreakdownTable rows={byMarket} />
        </article>

        <article className="panel table-wrap">
          <h3>By Support Profile</h3>
          <BreakdownTable rows={bySupport} />
        </article>
      </section>

      <section className="panel">
        <div className="analysis-panel-head">
          <div>
            <h3>Support Profile Comparison</h3>
            <p className="subtle">
              This section uses the same window, date, lane, confidence, market, and support-profile filters as the rest of the page.
            </p>
          </div>
        </div>

        <div className="mlb-lean-grid">
          {supportProfileCards.map((card) => (
            <article className="mlb-lean-card" key={card.profile}>
              <div className="mlb-lean-card-head">
                <div>
                  <div className="mlb-lean-kicker">Support profile</div>
                  <h4>{titleize(card.profile.replace(/_/g, ' '))}</h4>
                </div>
                <div className="mlb-lean-badges">
                  <span className="pill mlb-pill">{card.summary.bets} bets</span>
                  <span className="pill mlb-pill">{formatPct(card.summary.roi)} ROI</span>
                </div>
              </div>

              <div className="mlb-lean-metrics">
                <div className="metric">
                  <label>Wins-Losses-Pushes</label>
                  <strong>{`${card.summary.wins}-${card.summary.losses}-${card.summary.pushes}`}</strong>
                </div>
                <div className="metric">
                  <label>Win Rate</label>
                  <strong>{formatPct(card.summary.winPct)}</strong>
                </div>
                <div className="metric">
                  <label>Units</label>
                  <strong>{formatUnits(card.summary.units)}</strong>
                </div>
                <div className="metric">
                  <label>Lead Confidence</label>
                  <strong>{titleize(card.topConfidenceTier)}</strong>
                </div>
              </div>

              <div className="mlb-pill-row">
                {card.confidenceBreakdown.map((item) => (
                  <span className="pill mlb-pill" key={`${card.profile}:${item.key}`}>
                    {titleize(item.key)} {item.count}
                  </span>
                ))}
              </div>

              <div className="mlb-signal-list">
                <div>
                  <strong>Lane split</strong>
                  <ul>
                    {card.laneBreakdown.map((item) => (
                      <li key={`${card.profile}:lane:${item.key}`}>
                        {titleize(item.key)}: {item.count} bets, {formatPct(item.roi)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Quick read</strong>
                  <ul>
                    <li>{card.summary.roi !== null && card.summary.roi > 0 ? 'Positive ROI in current slice' : 'Negative or flat ROI in current slice'}</li>
                    <li>{card.hasCoreRows ? 'Includes core rows' : 'No core rows in current slice'}</li>
                    <li>{card.hasExploratoryRows ? 'Includes exploratory rows' : 'No exploratory rows in current slice'}</li>
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!supportProfileCards.length ? <p className="subtle">No support-profile rows match the current filters.</p> : null}
      </section>

      <section className="panel table-wrap">
        <h3>Graded Lean Rows</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Matchup</th>
              <th>Lane</th>
              <th>Confidence</th>
              <th>Market</th>
              <th>Support</th>
              <th>Result</th>
              <th>ROI</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={`${row.requestedDate}:${row.canonicalGameId}:${row.marketType}:${row.selectionKey}`}>
                <td>{row.requestedDate}</td>
                <td>
                  <strong>{row.matchup}</strong>
                  <div className="subtle">{row.selection}</div>
                </td>
                <td>{titleize(row.leanLane ?? 'unknown')}</td>
                <td>{titleize(row.confidenceTier)}</td>
                <td>{titleize(row.marketType.replace('_', ' '))}</td>
                <td>{titleize((row.supportProfile ?? 'unknown').replace(/_/g, ' '))}</td>
                <td>{titleize(row.result ?? 'pending')}</td>
                <td>{typeof row.realizedRoi === 'number' ? formatPct(row.realizedRoi) : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredRows.length ? <p className="subtle">No graded MLB lean rows match the current filters.</p> : null}
      </section>
    </main>
  );
}

function BreakdownTable({ rows }: { rows: Array<{ key: string; bets: number; wins: number; losses: number; pushes: number; winPct: number | null; units: number; roi: number | null }> }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Bucket</th>
          <th>Bets</th>
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

function buildSupportProfileCards(rows: MlbPerformanceRow[]) {
  const grouped = new Map<string, MlbPerformanceRow[]>();

  rows.forEach((row) => {
    const profile = row.supportProfile ?? 'unknown';
    const bucket = grouped.get(profile) ?? [];
    bucket.push(row);
    grouped.set(profile, bucket);
  });

  return Array.from(grouped.entries())
    .map(([profile, profileRows]) => {
      const summary = summarizePerformanceRows(profileRows);
      const laneBreakdown = buildBreakdown(profileRows, (row) => (row.leanLane ?? 'unknown') as string).map((item) => ({
        key: item.key,
        count: item.bets,
        roi: item.roi
      }));
      const confidenceCounts = new Map<string, number>();
      profileRows.forEach((row) => {
        const key = row.confidenceTier ?? 'unknown';
        confidenceCounts.set(key, (confidenceCounts.get(key) ?? 0) + 1);
      });
      const confidenceBreakdown = Array.from(confidenceCounts.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));

      return {
        profile,
        summary,
        laneBreakdown,
        confidenceBreakdown,
        topConfidenceTier: confidenceBreakdown[0]?.key ?? 'unknown',
        hasCoreRows: profileRows.some((row) => row.leanLane === 'core'),
        hasExploratoryRows: profileRows.some((row) => row.leanLane === 'exploratory')
      };
    })
    .sort((left, right) => right.summary.bets - left.summary.bets || left.profile.localeCompare(right.profile));
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
