export async function fetchPublicJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function formatPct(value: unknown): string {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'N/A';
}

export function formatNumber(value: unknown): string {
  return typeof value === 'number' ? value.toFixed(2).replace(/\.00$/, '') : 'N/A';
}

export function formatSignedNumber(value: unknown): string {
  if (typeof value !== 'number') {
    return 'N/A';
  }
  if (value > 0) {
    return `+${formatNumber(value)}`;
  }
  return formatNumber(value);
}

export function getSignalLabel(row: Record<string, any>): string {
  if (row.hasSharpPickAgreement) {
    return 'Sharp + Pick Agree';
  }
  if (row.hasSharpSignal) {
    return 'Sharp Lean';
  }
  if (row.hasPickSignal) {
    return 'Pick Lean';
  }
  return 'No Clear Signal';
}

export function getDisplayValue(row: Record<string, any>): string {
  if (row.market === 'total') {
    return `Total ${row.totalLine ?? 'N/A'}`;
  }
  return `${row.awayTeam ?? 'Away'} ${formatSignedNumber(row.awayValue)} / ${row.homeTeam ?? 'Home'} ${formatSignedNumber(row.homeValue)}`;
}

export function getSharpSummary(row: Record<string, any>): string {
  if (row.market === 'total') {
    const side = row.sharpMajoritySide ?? 'none';
    const count = Math.max(Number(row.overSharpCount ?? 0), Number(row.underSharpCount ?? 0));
    return side === 'none' || count === 0 ? 'None' : `${side} (${count})`;
  }
  const side = row.sharpMajoritySide ?? 'none';
  const count = Math.max(Number(row.awaySharpCount ?? 0), Number(row.homeSharpCount ?? 0));
  return side === 'none' || count === 0 ? 'None' : `${side} (${count})`;
}

export function getPickSummary(row: Record<string, any>): string {
  if (row.market === 'total') {
    const side = row.pickMajoritySide ?? 'none';
    const count = Math.max(Number(row.overPickCount ?? 0), Number(row.underPickCount ?? 0));
    return side === 'none' || count === 0 ? 'None' : `${side} (${count})`;
  }
  const side = row.pickMajoritySide ?? 'none';
  const count = Math.max(Number(row.awayPickCount ?? 0), Number(row.homePickCount ?? 0));
  return side === 'none' || count === 0 ? 'None' : `${side} (${count})`;
}

export function getPublicSummary(row: Record<string, any>): string {
  if (row.market === 'total') {
    const side = row.sharpMajoritySide ?? row.pickMajoritySide;
    if (side === 'over') {
      return `Over ${formatPct((row.overPublicBetsPct ?? null) !== null ? Number(row.overPublicBetsPct) / 100 : null)}`;
    }
    if (side === 'under') {
      return `Under ${formatPct((row.underPublicBetsPct ?? null) !== null ? Number(row.underPublicBetsPct) / 100 : null)}`;
    }
    return 'N/A';
  }
  const side = row.sharpMajoritySide ?? row.pickMajoritySide;
  if (side === 'away') {
    return `${row.awayTeam ?? 'Away'} ${formatPct((row.awayPublicBetsPct ?? null) !== null ? Number(row.awayPublicBetsPct) / 100 : null)}`;
  }
  if (side === 'home') {
    return `${row.homeTeam ?? 'Home'} ${formatPct((row.homePublicBetsPct ?? null) !== null ? Number(row.homePublicBetsPct) / 100 : null)}`;
  }
  return 'N/A';
}

export function getCloseDeltaSummary(row: Record<string, any>): string {
  if (row.market === 'total') {
    return formatSignedNumber(row.totalCloseDelta);
  }
  if (row.sharpMajoritySide === 'away' || row.pickMajoritySide === 'away') {
    return formatSignedNumber(row.awayCloseDelta);
  }
  if (row.sharpMajoritySide === 'home' || row.pickMajoritySide === 'home') {
    return formatSignedNumber(row.homeCloseDelta);
  }
  return formatSignedNumber(row.awayCloseDelta ?? row.homeCloseDelta ?? null);
}

export function getPrimarySharpCount(row: Record<string, any>): number {
  if (row.market === 'total') {
    return Math.max(Number(row.overSharpCount ?? 0), Number(row.underSharpCount ?? 0));
  }
  return Math.max(Number(row.awaySharpCount ?? 0), Number(row.homeSharpCount ?? 0));
}

export function getPrimaryPickCount(row: Record<string, any>): number {
  if (row.market === 'total') {
    return Math.max(Number(row.overPickCount ?? 0), Number(row.underPickCount ?? 0));
  }
  return Math.max(Number(row.awayPickCount ?? 0), Number(row.homePickCount ?? 0));
}

export function getPrimarySignalSide(row: Record<string, any>, signalType: 'sharp' | 'picks'): string {
  if (signalType === 'sharp') {
    return row.sharpMajoritySide ?? 'none';
  }
  return row.pickMajoritySide ?? 'none';
}
