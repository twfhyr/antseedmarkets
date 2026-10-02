import React, { useEffect, useState } from 'react';
import { describeError, formatAnts, formatBps } from '../../lib/ants/format';
import { useAntsApp } from './app-context';
import { useAntsActions, Confirm } from './ActionButton';
import { Button } from './ui';

export function WithdrawAction({ positionIds, size, autoOpen = false, onStarted, onCancel }) {
  const { api } = useAntsApp();
  const actions = useAntsActions();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setPreview(null);
    setPreviewError(null);
    setAccepted(false);
    try {
      setPreview(await api.withdrawPreview(positionIds));
    } catch (err) {
      setPreviewError(describeError(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  const onOpen = () => {
    setOpen(true);
    setError(null);
    void loadPreview();
  };

  const disabled = !actions.connected || actions.running || positionIds.length === 0;

  useEffect(() => {
    if (autoOpen && !disabled) onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConfirm = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await actions.start('/api/positions/withdraw', {
        positionIds,
        acceptSlashing: preview.earlyExit && accepted,
        maxSlashedAmount: preview.totalSlashed,
      });
      setOpen(false);
      onStarted?.();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const reason = !actions.connected
    ? 'Connect a wallet to sign.'
    : actions.running
      ? 'Another action is still running.'
      : (positionIds.length === 0 ? 'Select at least one position.' : undefined);
  const canConfirm = preview !== null && (!preview.earlyExit || accepted);

  return (
    <div className="ma-action">
      {open && autoOpen ? null : (
        <span title={reason}>
          <Button variant="outline" size={size === 'sm' ? 'sm' : 'md'} onClick={onOpen} disabled={disabled}>Withdraw</Button>
        </span>
      )}
      {open ? (
        <Confirm
          title={`Withdraw ${positionIds.length} position${positionIds.length === 1 ? '' : 's'}`}
          confirmLabel={preview?.earlyExit ? 'Withdraw and burn slashed principal' : 'Withdraw'}
          danger={preview?.earlyExit === true}
          disabled={!canConfirm}
          busy={busy}
          error={error}
          onConfirm={() => { void onConfirm(); }}
          onCancel={() => { setOpen(false); onCancel?.(); }}
        >
          {loadingPreview ? <div className="ma-muted small">Computing slashing preview…</div> : null}
          {previewError ? (
            <div>
              <div className="ma-error-text">{previewError}</div>
              <div className="mt"><Button variant="outline" size="sm" onClick={() => void loadPreview()}>Retry preview</Button></div>
            </div>
          ) : null}
          {preview ? (
            <div className="ma-stack">
              <div className="ma-table-wrap">
                <table className="ma-table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th className="num">Amount</th>
                      <th className="num">Slash</th>
                      <th className="num">Burned</th>
                      <th className="num">Returned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.positions.map((p) => (
                      <tr key={p.id}>
                        <td className="mono">#{p.id}</td>
                        <td className="num">{formatAnts(p.amount, 4)}</td>
                        <td className={`num ${p.slashBps > 0 ? 'danger' : ''}`}>{formatBps(p.slashBps)}</td>
                        <td className={`num ${p.slashBps > 0 ? 'danger' : ''}`}>{formatAnts(p.slashedAmount, 4)}</td>
                        <td className="num">{formatAnts(p.returnedAmount, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td />
                      <td />
                      <td className={`num ${preview.earlyExit ? 'danger' : ''}`}>{formatAnts(preview.totalSlashed, 4)}</td>
                      <td className="num">{formatAnts(preview.totalReturned, 4)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {preview.earlyExit ? (
                <label className="ma-check danger">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                  <span>I accept burning <span className="mono">{formatAnts(preview.totalSlashed, 4)}</span> ANTS of principal (early exit).</span>
                </label>
              ) : (
                <div className="ma-hint">No early-exit slashing applies. Pending rewards are settled with the withdrawal.</div>
              )}
            </div>
          ) : null}
        </Confirm>
      ) : null}
    </div>
  );
}
