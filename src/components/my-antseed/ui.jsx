import React, { useEffect, useState } from 'react';
import { formatUtcDate, epochStartAt, explorerAddressUrl, explorerTxUrl, shortAddress } from '../../lib/ants/format';
import { useEpochInfo } from './app-context';

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}

export function Button({ variant = 'outline', size = 'md', children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`ma-btn ma-btn--${variant} ma-btn--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function Pill({ tone = 'muted', children, title }) {
  return <span className={`ma-pill ma-pill--${tone}`} title={title}>{children}</span>;
}

export function Panel({ title, actions, children, className = '', tone }) {
  return (
    <section className={`ma-panel ${tone ? `ma-panel--${tone}` : ''} ${className}`.trim()}>
      {(title || actions) ? (
        <header className="ma-panel__head">
          {title ? <h3>{title}</h3> : <span />}
          {actions ? <div className="ma-panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="ma-panel__body">{children}</div>
    </section>
  );
}

export function Tiles({ children }) {
  return <div className="ma-tiles">{children}</div>;
}

export function StatTile({ label, value, unit, sub, loading }) {
  return (
    <div className="ma-tile">
      <div className="ma-tile__label">{label}</div>
      <div className="ma-tile__value">
        {loading ? '…' : value}
        {unit && !loading ? <span className="ma-unit">{unit}</span> : null}
      </div>
      {sub ? <div className="ma-tile__sub">{sub}</div> : null}
    </div>
  );
}

export function Alert({ tone = 'info', title, children }) {
  return (
    <div className={`ma-alert ma-alert--${tone}`}>
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}

export function ErrorBox({ error, onRetry, title }) {
  return (
    <div className="ma-error">
      {title ? <strong>{title}</strong> : null}
      <p>{error}</p>
      {onRetry ? <button type="button" className="ma-link" onClick={onRetry}>retry</button> : null}
    </div>
  );
}

export function Skeleton({ rows = 4 }) {
  return (
    <div className="ma-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <div key={i} />)}
    </div>
  );
}

export function Facts({ items }) {
  return (
    <dl className="ma-facts">
      {items.map(([label, value], index) => (
        <React.Fragment key={`${label}-${index}`}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function Details({ summary, children, className = '' }) {
  return (
    <details className={`ma-details ${className}`.trim()}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}

export function Field({ label, hint, width, children }) {
  return (
    <label className={`ma-field ${width ? `ma-field--${width}` : ''}`.trim()}>
      {label ? <span className="ma-field__label">{label}</span> : null}
      {children}
      {hint ? <span className="ma-field__hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ label, hint, width, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} width={width}>
      <input className={`ma-input ${className}`.trim()} {...props} />
    </Field>
  );
}

export function Select({ children, className = '', ...props }) {
  return <select className={`ma-select ${className}`.trim()} {...props}>{children}</select>;
}

export function LockSlider({ label = 'Lock', value, min = 1, max = 1, onChange, disabled }) {
  const lo = Math.max(1, min);
  const hi = Math.max(lo, max);
  return (
    <Field label={`${label} ${value} epochs`} width="lg">
      <input
        type="range"
        min={lo}
        max={hi}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function AddressLink({ value, short = true, copy }) {
  if (!value) return '—';
  const href = explorerAddressUrl(value);
  const text = short ? shortAddress(value) : value;
  return (
    <span className="ma-addr">
      {href ? <a href={href} target="_blank" rel="noreferrer" className="mono">{text}</a> : <span className="mono">{text}</span>}
      {copy ? (
        <button
          type="button"
          className="ma-link"
          onClick={() => navigator.clipboard?.writeText(value)}
        >
          copy
        </button>
      ) : null}
    </span>
  );
}

export function TxLink({ hash }) {
  if (!hash) return null;
  const href = explorerTxUrl(hash);
  return href ? <a href={href} target="_blank" rel="noreferrer" className="mono">{shortAddress(hash)}</a> : <span className="mono">{shortAddress(hash)}</span>;
}

export function EpochCell({ epoch, genesis, epochDuration, dateOnly = false }) {
  const info = useEpochInfo();
  if (epoch === null || epoch === undefined || epoch === '') return '—';
  const n = Number(epoch);
  if (!Number.isFinite(n)) return '—';
  const g = genesis ?? info?.genesis;
  const d = epochDuration ?? info?.epochDuration;
  const date = g && d ? formatUtcDate(epochStartAt(n, g, d)) : null;
  if (dateOnly) return <span className="mono">{date ?? '—'}</span>;
  return (
    <span className="ma-epoch" title={date ?? undefined}>
      <span className="mono">{n}</span>
      {date ? <span className="ma-muted"> {date}</span> : null}
    </span>
  );
}

export function Table({ columns, rows, rowKey, loading, empty, onRowClick, rowClass, isSelected, renderDetail }) {
  if (loading) return <Skeleton rows={4} />;
  if (!rows.length) return <div className="ma-empty">{empty || 'None yet.'}</div>;
  return (
    <div className="ma-table-wrap">
      <table className="ma-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`${col.align === 'right' ? 'num' : ''} ${col.className || ''}`} title={col.title}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const detail = renderDetail?.(row);
            return (
              <React.Fragment key={key}>
                <tr
                  className={`${rowClass?.(row) || ''} ${isSelected?.(row) ? 'is-selected' : ''} ${onRowClick ? 'is-clickable' : ''}`.trim()}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`${col.align === 'right' ? 'num' : ''} ${col.mono ? 'mono' : ''} ${col.className || ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
                {detail ? (
                  <tr className="ma-table__detail">
                    <td colSpan={columns.length}>{detail}</td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
