import React, { useCallback, useEffect, useState } from 'react';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { checkNickname, fetchProfile, saveProfile } from '../api';
import { useI18n } from '../i18n/index.jsx';

const NICK_MIN = 2;
const NICK_MAX = 24;

function looksReady(value) {
  const trimmed = String(value || '').replace(/\s+/g, ' ').trim();
  const n = [...trimmed].length;
  return n >= NICK_MIN && n <= NICK_MAX && !/^0x[a-fA-F0-9]{40}$/.test(trimmed);
}

export default function NicknameGate() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const [needed, setNeeded] = useState(false);
  const [nickname, setNickname] = useState('');
  const [availability, setAvailability] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setNeeded(false);
    setNickname('');
    setAvailability(null);
    setError(null);
    if (!isConnected || !address) return undefined;
    fetchProfile(address)
      .then((row) => {
        if (!live) return;
        setNeeded(row?.exists !== true);
      })
      .catch(() => {
        if (!live) return;
        setNeeded(false);
      });
    return () => { live = false; };
  }, [address, isConnected]);

  useEffect(() => {
    if (!needed) return undefined;
    const value = nickname.replace(/\s+/g, ' ').trim();
    if (!looksReady(value)) {
      setAvailability(null);
      return undefined;
    }
    let live = true;
    const timer = setTimeout(() => {
      checkNickname(value, address)
        .then((row) => {
          if (!live) return;
          setAvailability(row);
        })
        .catch(() => {
          if (!live) return;
          setAvailability(null);
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [nickname, needed, address]);

  const onSave = useCallback(async (event) => {
    event.preventDefault();
    if (!walletClient || !address || saving) return;
    const value = nickname.replace(/\s+/g, ' ').trim();
    if (!looksReady(value) || availability?.available === false) return;
    setSaving(true);
    setError(null);
    try {
      const message = `antseedmarkets profile: save @ ${Date.now()}`;
      const signature = await walletClient.signMessage({ account: address, message });
      await saveProfile({ address, nickname: value, bio: '', message, signature });
      setNeeded(false);
      window.dispatchEvent(new Event('antseed:profile'));
    } catch (e) {
      setError(e?.shortMessage || e?.message || t('profile.error'));
    } finally {
      setSaving(false);
    }
  }, [walletClient, address, nickname, availability, saving, t]);

  if (!needed) return null;

  const canSave = looksReady(nickname) && availability?.available !== false && !saving && walletClient;

  return (
    <div className="modal-overlay nickname-gate" role="dialog" aria-modal="true" aria-labelledby="nickname-gate-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="nickname-gate-title">{t('profile.gateTitle')}</h2>
        </div>
        <form className="modal-body" onSubmit={onSave}>
          <p className="modal-desc">{t('profile.gateBody')}</p>
          <label className="profile-field">
            <span>{t('profile.nickname')}</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, NICK_MAX))}
              autoComplete="nickname"
              autoFocus
              maxLength={NICK_MAX}
            />
            <small>{t('profile.nicknameHint')}</small>
            {availability?.available === true && <small className="profile-ok">{t('profile.nicknameAvailable')}</small>}
            {availability?.available === false && availability.reason === 'taken' && (
              <small className="profile-err">{t('profile.nicknameTaken')}</small>
            )}
          </label>
          {error && <p className="provider-compose__error">{error}</p>}
          <div className="nickname-gate__row">
            <button type="button" className="v2-text-button" onClick={() => disconnect()}>
              {t('profile.gateDisconnect')}
            </button>
            <button type="submit" className="v2-primary" disabled={!canSave}>
              {saving ? t('profile.saving') : t('profile.gateSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
