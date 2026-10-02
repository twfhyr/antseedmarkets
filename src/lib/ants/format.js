export function groupThousands(digits) {
  return String(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function toBigInt(value) {
  if (value == null || value === '') return null;
  try { return BigInt(value); } catch { return null; }
}

export function formatUnits(value, decimals, digits = 2) {
  const parsed = typeof value === 'bigint' ? value : toBigInt(value);
  if (parsed === null) return '—';
  const negative = parsed < 0n;
  const abs = negative ? -parsed : parsed;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;
  let fractionText = '';
  if (digits > 0 && decimals > 0) {
    fractionText = fraction.toString().padStart(decimals, '0').slice(0, digits).replace(/0+$/, '');
  }
  if (abs > 0n && whole === 0n && fractionText === '') {
    const floor = digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`;
    return `${negative ? '-' : ''}<${floor}`;
  }
  return `${negative ? '-' : ''}${groupThousands(whole.toString())}${fractionText ? `.${fractionText}` : ''}`;
}

export function formatAnts(value, digits = 2) { return formatUnits(value, 18, digits); }
export function formatUsdc(value, digits = 2) { return formatUnits(value, 6, digits); }
export function formatEth(value, digits = 4) { return formatUnits(value, 18, digits); }

export function formatUsdcCompact(value) {
  const parsed = toBigInt(value);
  if (parsed === null) return '—';
  const n = Number(parsed) / 1e6;
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatInt(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? groupThousands(Math.trunc(value).toString()) : '—';
  const parsed = typeof value === 'bigint' ? value : toBigInt(value);
  if (parsed === null) return '—';
  const negative = parsed < 0n;
  return `${negative ? '-' : ''}${groupThousands((negative ? -parsed : parsed).toString())}`;
}

export function formatBps(bps) {
  if (bps == null || !Number.isFinite(bps)) return '—';
  return `${(bps / 100).toFixed(2)}%`;
}

export function isZero(value) {
  const parsed = toBigInt(value);
  return parsed === null || parsed === 0n;
}

export function cmpBig(a, b) {
  const x = toBigInt(a) ?? 0n;
  const y = toBigInt(b) ?? 0n;
  return x < y ? -1 : x > y ? 1 : 0;
}

export function sumBig(values) {
  return values.reduce((sum, v) => sum + (toBigInt(v) ?? 0n), 0n).toString();
}

export function shortAddress(address) {
  if (!address || address.length <= 13) return address || '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUtc(unixSeconds) {
  if (!Number.isFinite(unixSeconds)) return '—';
  return `${new Date(unixSeconds * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function formatUtcDate(unixSeconds) {
  if (!Number.isFinite(unixSeconds)) return '—';
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export function formatLocalTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour12: false });
}

export function epochStartAt(epoch, genesis, epochDuration) {
  return genesis + epoch * epochDuration;
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => n.toString().padStart(2, '0');
  return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatEpochLength(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds % 86400 === 0) return `${seconds / 86400} days`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hours`;
  return `${formatInt(seconds)} s`;
}

export function formatShare(value, denominator) {
  if (value == null || !Number.isFinite(value) || !denominator) return '—';
  return `${((value * 100) / denominator).toFixed(2)}%`;
}

export function explorerTxUrl(hash) {
  return hash ? `https://basescan.org/tx/${hash}` : null;
}

export function explorerAddressUrl(address) {
  return address ? `https://basescan.org/address/${address}` : null;
}

export function isPositiveDecimal(value) {
  const raw = String(value || '').trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) return false;
  return /[1-9]/.test(raw);
}

export function isPositiveInt(value) {
  return /^\d+$/.test(String(value || '').trim()) && Number(value) > 0;
}

export function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
}

export function parseUnits(text, decimals = 18) {
  const raw = String(text || '').trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const [whole, frac = ''] = raw.split('.');
  if (frac.length > decimals) return null;
  try {
    return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(`${frac}${'0'.repeat(decimals)}`.slice(0, decimals));
  } catch {
    return null;
  }
}

export function describeError(err) {
  return err?.shortMessage || err?.message || String(err);
}
