import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { actionTitle, runAntsAction } from '../../lib/ants/actions';
import { describeError, explorerTxUrl } from '../../lib/ants/format';
import { invalidateAll } from '../../lib/ants/data';
import { Button } from './ui';
import { useAntsApp } from './app-context';

const ActionsContext = createContext(null);

export function useAntsActions() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('Ants actions are not mounted');
  return value;
}

export function ActionsProvider({ children }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { api, overview } = useAntsApp();
  const [running, setRunning] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { ...toast, id }]);
    if (!toast.sticky) {
      window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 8000);
    }
  }, []);

  const start = useCallback(async (path, body) => {
    if (!isConnected || !walletClient || !address) throw new Error('Connect a wallet to sign.');
    if (running) throw new Error('Another action is still running.');
    setRunning(true);
    try {
      const result = await runAntsAction({
        path,
        body,
        walletClient,
        account: address,
        addresses: overview?.addresses || {},
        api,
        onStep: (label) => pushToast({ tone: 'success', title: label, sticky: false }),
      });
      pushToast({
        tone: 'success',
        title: `${actionTitle(path)} complete`,
        hash: result?.hash,
        sticky: false,
      });
      invalidateAll();
      return result;
    } catch (error) {
      const message = describeError(error);
      pushToast({ tone: 'danger', title: `${actionTitle(path)} failed`, body: message, sticky: true });
      throw error;
    } finally {
      setRunning(false);
    }
  }, [isConnected, walletClient, address, running, overview?.addresses, api, pushToast]);

  const value = useMemo(() => ({
    running,
    start,
    toasts,
    dismissToast: (id) => setToasts((list) => list.filter((item) => item.id !== id)),
    connected: Boolean(isConnected && address),
  }), [running, start, toasts, isConnected, address]);

  return (
    <ActionsContext.Provider value={value}>
      {children}
      <div className="ma-toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ma-toast ma-toast--${toast.tone}`}>
            <strong>{toast.title}</strong>
            {toast.body ? <p>{toast.body}</p> : null}
            {toast.hash ? (
              <p>
                <a href={explorerTxUrl(toast.hash)} target="_blank" rel="noreferrer">{toast.hash.slice(0, 10)}…</a>
              </p>
            ) : null}
            <button type="button" className="ma-link" onClick={() => value.dismissToast(toast.id)}>dismiss</button>
          </div>
        ))}
      </div>
    </ActionsContext.Provider>
  );
}

export function Confirm({ title, summary, children, confirmLabel = 'Confirm', danger, disabled, busy, error, onConfirm, onCancel }) {
  return (
    <div className={`ma-confirm ${danger ? 'ma-confirm--danger' : ''}`} role="dialog" aria-label={title}>
      <div className="ma-confirm__title">{title}</div>
      {summary?.length ? (
        <dl className="ma-facts">
          {summary.map(([label, value], index) => (
            <React.Fragment key={`${label}-${index}`}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      ) : null}
      {children}
      {error ? <div className="ma-error-text">{error}</div> : null}
      <div className="ma-confirm__actions">
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={disabled || busy}>
          {busy ? 'Sending…' : confirmLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}

export function ActionButton({
  label, title, summary, path, body, validate, disabled, disabledReason,
  variant = 'default', size, confirmLabel, confirmDisabled, children, onStarted,
}) {
  const actions = useAntsActions();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const blocked = !actions.connected || actions.running || disabled === true;
  const reason = !actions.connected
    ? 'Connect a wallet to sign.'
    : actions.running
      ? 'Another action is still running.'
      : (disabled ? disabledReason : undefined);

  const onClick = () => {
    const problem = validate?.() ?? null;
    setError(problem);
    setOpen(problem === null);
  };

  const onConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.start(path, body);
      setOpen(false);
      onStarted?.();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const btnVariant = variant === 'primary' ? 'primary' : variant === 'danger' ? 'danger' : 'outline';

  return (
    <div className="ma-action">
      <span title={reason}>
        <Button variant={btnVariant} size={size === 'sm' ? 'sm' : 'md'} onClick={onClick} disabled={blocked}>
          {label}
        </Button>
      </span>
      {error && !open ? <div className="ma-error-text">{error}</div> : null}
      {open ? (
        <Confirm
          title={title ?? label}
          summary={summary}
          confirmLabel={confirmLabel}
          danger={variant === 'danger'}
          disabled={confirmDisabled}
          busy={busy}
          error={error}
          onConfirm={() => { void onConfirm(); }}
          onCancel={() => { setOpen(false); setError(null); }}
        >
          {children}
        </Confirm>
      ) : null}
    </div>
  );
}
