import React, { useCallback, useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { AlertCircle, Loader2 } from 'lucide-react';
import { checkNickname, fetchProfile, fetchUsedProviders, saveProfile } from '../api';
import { useI18n } from '../i18n/index.jsx';
import { providerHref } from '../hooks/useTabRouter';
import PageIntro from './PageIntro';

const NICK_MIN = 2;
const NICK_MAX = 24;
const BIO_MAX = 280;
const HOW_LABEL = {
  buyer: 'profile.usedBuyer',
  staker: 'profile.usedStaker',
  commented: 'profile.usedCommented',
};

function looksReady(value) {
  const trimmed = String(value || '').replace(/\s+/g, ' ').trim();
  const n = [...trimmed].length;
  return n >= NICK_MIN && n <= NICK_MAX && !/^0x[a-fA-F0-9]{40}$/.test(trimmed);
}

function resizeAvatar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('avatar-read'));
    };
    img.src = url;
  });
}

export default function Profile() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState(null);
  const [clearAvatar, setClearAvatar] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [used, setUsed] = useState(null);
  const [usedError, setUsedError] = useState(null);

  const reload = useCallback(() => {
    if (!address) {
      setProfile(null);
      return;
    }
    let live = true;
    fetchProfile(address)
      .then((row) => {
        if (!live) return;
        setProfile(row);
        setLoadError(null);
        if (row?.reserved && row.reservedNickname) {
          setNickname(row.reservedNickname);
        } else if (row?.exists) {
          setNickname(row.nickname || '');
        } else {
          setNickname('');
        }
        if (row?.exists) {
          setBio(row.bio || '');
          setAvatarPreview(row.avatarUrl || null);
        } else {
          setBio('');
          setAvatarPreview(null);
        }
        setAvatarDataUrl(null);
        setClearAvatar(false);
      })
      .catch((e) => {
        if (!live) return;
        setLoadError(e.message || t('profile.error'));
      });
    return () => { live = false; };
  }, [address, t]);

  useEffect(() => reload(), [reload]);

  useEffect(() => {
    if (!address) {
      setUsed(null);
      setUsedError(null);
      return undefined;
    }
    let live = true;
    fetchUsedProviders(address)
      .then((row) => {
        if (!live) return;
        setUsed(row.items || []);
        setUsedError(null);
      })
      .catch((e) => {
        if (!live) return;
        setUsedError(e.message || t('profile.error'));
        setUsed([]);
      });
    return () => { live = false; };
  }, [address, t]);

  const nicknameLocked = Boolean(profile?.nicknameLocked || profile?.reserved);

  useEffect(() => {
    if (nicknameLocked) {
      setAvailability({ available: true });
      return undefined;
    }
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
  }, [nickname, address, nicknameLocked]);

  const onPickAvatar = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeAvatar(file);
      setAvatarDataUrl(dataUrl);
      setAvatarPreview(dataUrl);
      setClearAvatar(false);
    } catch (e) {
      setSaveError(e.message === 'avatar-read' ? t('profile.avatarReadError') : (e.message || t('profile.error')));
    }
  }, [t]);

  const onSave = useCallback(async (event) => {
    event.preventDefault();
    if (!walletClient || !address || saving) return;
    const value = nickname.replace(/\s+/g, ' ').trim();
    if (!nicknameLocked && (!looksReady(value) || availability?.available === false)) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const message = `antseedmarkets profile: save @ ${Date.now()}`;
      const signature = await walletClient.signMessage({ account: address, message });
      const body = {
        address,
        nickname: value,
        bio,
        message,
        signature,
      };
      if (clearAvatar) body.clearAvatar = true;
      else if (avatarDataUrl) body.avatarDataUrl = avatarDataUrl;
      const row = await saveProfile(body);
      setProfile(row);
      setNickname(row.nickname || row.reservedNickname || value);
      setAvatarDataUrl(null);
      setClearAvatar(false);
      setAvatarPreview(row.avatarUrl || null);
      setSaved(true);
      window.dispatchEvent(new Event('antseed:profile'));
    } catch (e) {
      setSaveError(e?.shortMessage || e?.message || t('profile.error'));
    } finally {
      setSaving(false);
    }
  }, [walletClient, address, nickname, bio, availability, saving, clearAvatar, avatarDataUrl, t, nicknameLocked]);

  if (!isConnected) {
    return (
      <div className="profile-page">
        <PageIntro page="profile" description={t('profile.blurb')} />
        <p className="empty-state">{t('profile.connectPrompt')}</p>
      </div>
    );
  }

  const bioLeft = BIO_MAX - [...bio].length;
  const canSave = nicknameLocked
    ? Boolean(walletClient) && !saving
    : looksReady(nickname) && availability?.available !== false && !saving && walletClient;

  return (
    <div className="profile-page">
      <PageIntro page="profile" description={t('profile.blurb')} />

      {loadError && (
        <div className="provider-banner"><AlertCircle size={16} /> {loadError}</div>
      )}
      {!profile && !loadError && (
        <div className="empty-state"><Loader2 size={22} className="spin" /> {t('profile.loading')}</div>
      )}

      {profile && (
        <form className="design-section-card profile-form" onSubmit={onSave}>
          <h3>{t('profile.title')}</h3>
          <label className="profile-avatar">
            <span className="profile-avatar__frame">
              {avatarPreview ? <img src={avatarPreview} alt="" /> : <span>{(nickname || '?').slice(0, 1).toUpperCase()}</span>}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickAvatar} />
            <span>
              {t('profile.avatar')}
              <small>{t('profile.avatarHint')}</small>
            </span>
          </label>
          {avatarPreview && (
            <button
              type="button"
              className="v2-text-button"
              onClick={() => {
                setAvatarPreview(null);
                setAvatarDataUrl(null);
                setClearAvatar(true);
              }}
            >
              {t('profile.removePhoto')}
            </button>
          )}
          <label className="profile-field">
            <span>{t('profile.nickname')}</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value.slice(0, NICK_MAX)); setSaved(false); }}
              autoComplete="nickname"
              maxLength={nicknameLocked ? undefined : NICK_MAX}
              readOnly={nicknameLocked}
            />
            <small>{nicknameLocked ? t('profile.nicknameLocked') : t('profile.nicknameHint')}</small>
            {!nicknameLocked && availability?.available === true && <small className="profile-ok">{t('profile.nicknameAvailable')}</small>}
            {!nicknameLocked && availability?.available === false && availability.reason === 'taken' && (
              <small className="profile-err">{t('profile.nicknameTaken')}</small>
            )}
            {!nicknameLocked && availability?.available === false && availability.reason === 'reserved' && (
              <small className="profile-err">{t('profile.nicknameReserved')}</small>
            )}
          </label>
          <label className="profile-field">
            <span>{t('profile.bio')}</span>
            <textarea
              value={bio}
              onChange={(e) => {
                const next = e.target.value;
                if ([...next].length <= BIO_MAX) {
                  setBio(next);
                  setSaved(false);
                }
              }}
              rows={4}
              maxLength={BIO_MAX}
            />
            <small>{t('profile.bioHint', { n: String(Math.max(0, bioLeft)) })}</small>
          </label>
          {saveError && <p className="provider-compose__error">{saveError}</p>}
          <div className="profile-form__row">
            {saved && <p className="profile-ok">{t('profile.saved')}</p>}
            <button type="submit" className="v2-primary" disabled={!canSave}>
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          </div>
        </form>
      )}

      <section className="design-section-card">
        <h3>{t('profile.usedTitle')}</h3>
        <p className="profile-used-blurb">{t('profile.usedBlurb')}</p>
        {used == null && !usedError && (
          <div className="empty-state"><Loader2 size={22} className="spin" /> {t('profile.usedLoading')}</div>
        )}
        {usedError && (
          <div className="provider-banner"><AlertCircle size={16} /> {usedError}</div>
        )}
        {used && used.length === 0 && !usedError && (
          <p className="empty-state">{t('profile.usedEmpty')}</p>
        )}
        {used && used.length > 0 && (
          <ul className="profile-used">
            {used.map((item) => (
              <li key={item.agentId}>
                <div>
                  <strong>{item.name || t('stake.agent', { id: item.agentId })}</strong>
                  <span className="mono">#{item.agentId}</span>
                  <span className="provider-roles">
                    {(item.how || []).map((how) => (
                      <span key={how} className={`provider-feed__role${how === 'staker' ? ' is-staker' : ''}`}>
                        {t(HOW_LABEL[how] || how)}
                      </span>
                    ))}
                  </span>
                </div>
                <a
                  className="v2-primary"
                  href={providerHref(item.agentId, 'comments')}
                  onClick={(e) => {
                    e.preventDefault();
                    const url = providerHref(item.agentId, 'comments');
                    if (window.location.pathname !== url) {
                      window.history.pushState(null, '', url);
                    }
                    window.dispatchEvent(new Event('antseed:navigate'));
                  }}
                >
                  {t('profile.usedComment')}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
