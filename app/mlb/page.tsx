'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPublicJson } from '../../lib/data';
import type { MlbDailyLeanRow, MlbDailyLeansPayload, MlbLeansStatusPayload } from '../../lib/mlb';
import { formatLeanScore } from '../../lib/mlb';

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

export default function MlbDailyLeansPage() {
  const [data, setData] = useState<MlbDailyLeansPayload>(EMPTY_DAILY);
  const [status, setStatus] = useState<MlbLeansStatusPayload>(EMPTY_STATUS);
  const [laneFilter, setLaneFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [supportProfileFilter, setSupportProfileFilter] = useState('all');

  useEffect(() => {
    fetchPublicJson('/data/mlb_daily_leans.json', EMPTY_DAILY).then(setData);
    fetchPublicJson('/data/mlb_leans_status.json', EMPTY_STATUS).then(setStatus);
  }, []);

  const rows = data.rows ?? [];
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (laneFilter !== 'all' && row.leanLane !== laneFilter) return false;
        if (confidenceFilter !== 'all' && row.confidenceTier !== confidenceFilter) return false;
        if (marketFilter !== 'all' && row.marketType !== marketFilter) return false;
        if (supportProfileFilter !== 'all' && row.supportProfile !== supportProfileFilter) return false;
        return true;
      }),
    [confidenceFilter, laneFilter, marketFilter, rows, supportProfileFilter]
  );

  const laneOptions = useMemo(() => ['all', ...unique(rows.map((row) => row.leanLane))], [rows]);
  const confidenceOptions = useMemo(() => ['all', ...unique(rows.map((row) => row.confidenceTier))], [rows]);
  const marketOptions = useMemo(() => ['all', ...unique(rows.map((row) => row.marketType))], [rows]);
  const supportProfileOptions = useMemo(() => ['all', ...unique(rows.map((row) => row.supportProfile))], [rows]);

  return (
    <main className="page">
      <section className="hero">
        <h2>MLB Daily Leans</h2>
        <p className="subtle">
          Governed daily board with visible Core and Exploratory lanes, support-family transparency, and no hidden confidence model.
        </p>
        <div className="metrics">
          <div className="metric">
            <label>Board Date</label>
            <strong>{data.requestedDate ?? status.boardDate ?? 'N/A'}</strong>
          </div>
          <div className="metric">
            <label>Total Rows</label>
            <strong>{data.rowCount}</strong>
          </div>
          <div className="metric">
            <label>Core / Exploratory</label>
            <strong>{`${status.countsByLane.core ?? 0} / ${status.countsByLane.exploratory ?? 0}`}</strong>
          </div>
          <div className="metric">
            <label>Last Refresh</label>
            <strong>{formatDateTime(status.lastLeanUpdateAt ?? data.generatedAt)}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="controls">
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
        <article className="panel">
          <h3>Board Snapshot</h3>
          <div className="summary-list">
            {Object.entries(status.countsByConfidenceTier).map(([key, value]) => (
              <div className="summary-item" key={key}>
                <strong>{titleize(key)}</strong>
                <span className="subtle">{value} rows</span>
              </div>
            ))}
            {status.note ? <div className="subtle">{status.note}</div> : null}
          </div>
        </article>

        <article className="panel">
          <h3>Support Mix</h3>
          <div className="summary-list">
            {Object.entries(status.countsBySupportProfile).map(([key, value]) => (
              <div className="summary-item" key={key}>
                <strong>{titleize(key.replace(/_/g, ' '))}</strong>
                <span className="subtle">{value} rows</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="analysis-panel-head">
          <div>
            <h3>Daily Board</h3>
            <p className="subtle">
              {filteredRows.length} visible rows. Each card keeps lane, confidence, lead family, and top supporting signals visible.
            </p>
          </div>
        </div>

        <div className="mlb-lean-grid">
          {filteredRows.map((row) => (
            <article className="mlb-lean-card" key={`${row.gameId}:${row.marketType}:${row.marketSide}`}>
              <div className="mlb-lean-card-head">
                <div>
                  <div className="mlb-lean-kicker">{titleize(row.leanLane)} lane</div>
                  <h4>{row.awayTeam ?? 'Away'} at {row.homeTeam ?? 'Home'}</h4>
                </div>
                <div className="mlb-lean-badges">
                  <span className={`pill mlb-pill mlb-pill-lane-${row.leanLane}`}>{titleize(row.leanLane)}</span>
                  <span className="pill mlb-pill mlb-pill-confidence">{titleize(row.confidenceTier)}</span>
                </div>
              </div>

              <div className="mlb-lean-selection">
                <strong>{titleize(row.marketType.replace('_', ' '))}</strong>
                <span>{row.selectionLabel}</span>
              </div>

              <div className="mlb-lean-metrics">
                <div className="metric">
                  <label>Lean Score</label>
                  <strong>{formatLeanScore(row.leanScore)}</strong>
                </div>
                <div className="metric">
                  <label>Ranks</label>
                  <strong>#{row.leanRankForDay} overall / #{row.leanRankWithinLane} in lane</strong>
                </div>
                <div className="metric">
                  <label>Support Profile</label>
                  <strong>{titleize(row.supportProfile.replace(/_/g, ' '))}</strong>
                </div>
                <div className="metric">
                  <label>Lead Family</label>
                  <strong>{titleize(row.leadSupportFamily)}</strong>
                </div>
              </div>

              <p className="subtle">{row.explanationText}</p>

              <div className="mlb-pill-row">
                <span className="pill mlb-pill">{row.signalCount} signals</span>
                <span className="pill mlb-pill">{row.supportingFamilyCount} families</span>
                <span className="pill mlb-pill">{row.hasActionSupportFlag ? 'Action support' : 'No Action'}</span>
                <span className="pill mlb-pill">{row.hasBaseballSupportFlag ? 'Baseball support' : 'No baseball support'}</span>
                <span className="pill mlb-pill">{row.hasMarketSupportFlag ? 'Market support' : 'No market support'}</span>
              </div>

              <div className="mlb-signal-list">
                <div>
                  <strong>Top signals</strong>
                  <ul>
                    {row.topSupportingSignals.slice(0, 4).map((signal, index) => (
                      <li key={`${row.gameId}:top:${index}`}>
                        {String(signal.label ?? 'signal')} · {titleize(String(signal.family ?? 'unknown').replace(/_/g, ' '))}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Families</strong>
                  <ul>
                    {row.supportingFamilies.map((family) => (
                      <li key={`${row.gameId}:family:${family}`}>{titleize(family)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!filteredRows.length ? <p className="subtle">No MLB leans match the current filters.</p> : null}
      </section>
    </main>
  );
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
