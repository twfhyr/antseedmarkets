import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  fetchDiscovery,
  fetchDiscoveryAccess,
  postDiscovery,
  postDiscoveryVote,
} from '../api';
import { useI18n } from '../i18n/index.jsx';
import { providerHref } from '../hooks/useTabRouter';
import AuthorMark from './AuthorMark';
import '../directory.css';

const PITCH_MIN = 20;
const PITCH_MAX = 1000;

function usdPerM(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

async function signDiscovery(walletClient, account, action) {
  const message = `antseedmarkets discovery: ${action} @ ${Date.now()}`;
  const signature = await walletClient.signMessage({ account, message });
  return { message, signature };
}

function ServiceTable({ services, t }) {
  if (!services || services.length === 0) {
    return <p className="discovery-muted">{t('discovery.noServices')}</p>;
  }
  return (
    <div className="discovery-services">
      <table>
        <thead>
          <tr>
            <th>{t('discovery.services')}</th>
            <th>{t('discovery.priceIn')}</th>
            <th>{t('discovery.priceOut')}</th>
            <th>{t('discovery.priceCached')}</th>
          </tr>
        </thead>
        <tbody>
          {services.map((svc) => (
            <tr key={svc.name}>
              <td>{svc.name || '—'}</td>
              <td>{usdPerM(svc.pricing?.inputUsdPerMillion)}</td>
              <td>{usdPerM(svc.pricing?.outputUsdPerMillion)}</td>
              <td>{usdPerM(svc.pricing?.cachedInputUsdPerMillion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="discovery-muted">{t('discovery.priceUnit')}</p>
    </div>
  );
}

function PitchCard({ item, t, threshold, access, address, onVote, voting, voteError, onOpen }) {
  const total = item.votes?.total || 0;
  const mine = new Set(item.myVotes || []);
  const isOwner = access?.owned?.some((p) => String(p.agentId) === String(item.agentId));
  const canBuyer = Boolean(access?.isBuyer) && !mine.has('buyer') && !isOwner;
  const canStaker = Boolean(access?.isStaker) && !mine.has('staker') && !isOwner;
  return (
    <article className={`discovery-card${item.featured ? ' is-featured' : ''}`}>
      <header>
        <div>
          <p className="v2-eyebrow">AGENT / #{item.agentId}</p>
          <h2>{item.name || t('stake.agent', { id: item.agentId })}</h2>
          <AuthorMark address={item.author} profile={item.profile} />
        </div>
        <div className="discovery-votes">
          <strong>{t('discovery.votesNeed', { have: String(total), need: String(threshold) })}</strong>
          {item.featured
            ? <span className="discovery-badge">{t('discovery.featured')}</span>
            : <span>{t('discovery.threshold', { n: String(total), need: String(threshold) })}</span>}
        </div>
      </header>
      <p className="discovery-pitch">{item.pitch}</p>
      <ServiceTable services={item.services} t={t} />
      <footer>
        <a
          className="v2-text-button"
          href={providerHref(item.agentId)}
          onClick={(e) => {
            e.preventDefault();
            onOpen(item.agentId);
          }}
        >
          {t('discovery.openProvider')}
        </a>
        <div className="discovery-vote-row">
          {!address && <p>{t('discovery.connectVote')}</p>}
          {address && !access?.isBuyer && !access?.isStaker && !isOwner && (
            <p>{t('discovery.needRole')}</p>
          )}
          {isOwner && <p>{t('discovery.ownVote')}</p>}
          <button
            type="button"
            className="v2-primary"
            disabled={!canBuyer || voting}
            onClick={() => onVote(item.id, 'buyer')}
          >
            {mine.has('buyer') ? t('discovery.votedBuyer') : t('discovery.voteBuyer')}
          </button>
          <button
            type="button"
            className="v2-primary"
            disabled={!canStaker || voting}
            onClick={() => onVote(item.id, 'staker')}
          >
            {mine.has('staker') ? t('discovery.votedStaker') : t('discovery.voteStaker')}
          </button>
        </div>
      </footer>
      {voteError && voteError.id === item.id && (
        <p className="provider-compose__error">{voteError.message}</p>
      )}
    </article>
  );
}

export default function Discovery() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [items, setItems] = useState(null);
  const [threshold, setThreshold] = useState(10);
  const [access, setAccess] = useState(null);
  const [error, setError] = useState(null);
  const [agentId, setAgentId] = useState('');
  const [pitch, setPitch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);

  const load = useCallback(() => {
    let live = true;
    fetchDiscovery(address)
      .then((row) => {
        if (!live) return;
        setItems(row.items || []);
        setThreshold(row.threshold || 10);
        setError(null);
      })
      .catch((e) => {
        if (!live) return;
        setError(e.message || t('discovery.error'));
        setItems([]);
      });
    return () => { live = false; };
  }, [address, t]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    if (!isConnected || !address) {
      setAccess(null);
      return undefined;
    }
    let live = true;
    fetchDiscoveryAccess(address)
      .then((row) => {
        if (!live) return;
        setAccess(row);
      })
      .catch(() => {
        if (!live) return;
        setAccess(null);
      });
    return () => { live = false; };
  }, [address, isConnected]);

  const owned = access?.owned || [];
  useEffect(() => {
    if (!owned.length) return;
    if (agentId && owned.some((p) => p.agentId === agentId)) return;
    setAgentId(owned[0].agentId);
  }, [owned, agentId]);

  useEffect(() => {
    const listing = (items || []).find((it) => String(it.agentId) === String(agentId));
    if (listing) setPitch(listing.pitch);
  }, [agentId, items]);

  const selectedOwned = owned.find((p) => p.agentId === agentId);
  const existing = (items || []).find((it) => String(it.agentId) === String(agentId));
  const previewServices = selectedOwned?.services || existing?.services || [];
  const pitchLeft = PITCH_MAX - [...pitch].length;
  const pitchReady = [...pitch.trim()].length >= PITCH_MIN && [...pitch.trim()].length <= PITCH_MAX;

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!walletClient || !address || !agentId || !pitchReady || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const signed = await signDiscovery(walletClient, address, `submit ${agentId}`);
      const row = await postDiscovery({ address, agentId, pitch: pitch.trim(), ...signed });
      setItems((prev) => {
        const rest = (prev || []).filter((it) => it.id !== row.id);
        return [row, ...rest];
      });
    } catch (e) {
      setSaveError(e?.shortMessage || e?.message || t('discovery.error'));
    } finally {
      setSaving(false);
    }
  };

  const onVote = async (listingId, role) => {
    if (!walletClient || !address || voting) return;
    setVoting(true);
    setVoteError(null);
    try {
      const signed = await signDiscovery(walletClient, address, `vote ${listingId} ${role}`);
      const row = await postDiscoveryVote(listingId, { address, role, ...signed });
      setItems((prev) => (prev || []).map((it) => (it.id === row.id ? row : it)));
    } catch (e) {
      setVoteError({ id: listingId, message: e?.shortMessage || e?.message || t('discovery.error') });
    } finally {
      setVoting(false);
    }
  };

  const openProvider = (id) => {
    const url = providerHref(id);
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
    window.dispatchEvent(new Event('antseed:navigate'));
  };

  const sorted = useMemo(() => items || [], [items]);

  return (
    <div className="directory-page wrap discovery-page">
      <section className="dir-hero">
        <div>
          <p className="v2-eyebrow"><span className="v2-dot" />{t('discovery.heroEyebrow')}</p>
          <h1>{t('discovery.heroTitle')}<br /><em>{t('discovery.heroEm')}</em></h1>
          <p className="dir-lead">{t('discovery.blurb')}</p>
        </div>
      </section>

      <section className="design-section-card discovery-submit">
        <h3>{owned.length ? t('discovery.submit') : t('discovery.needOwner')}</h3>
        <p className="discovery-muted">{t('discovery.submitHint')}</p>
        {owned.length > 0 && (
          <form onSubmit={onSubmit}>
            <label className="profile-field">
              <span>{t('discovery.selectProvider')}</span>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {owned.map((p) => (
                  <option key={p.agentId} value={p.agentId}>
                    {p.name || t('stake.agent', { id: p.agentId })}
                  </option>
                ))}
              </select>
            </label>
            <ServiceTable services={previewServices} t={t} />
            <label className="profile-field">
              <span>{t('discovery.pitch')}</span>
              <textarea
                value={pitch}
                onChange={(e) => {
                  const next = e.target.value;
                  if ([...next].length <= PITCH_MAX) setPitch(next);
                }}
                rows={5}
                maxLength={PITCH_MAX}
                placeholder={t('discovery.pitchPlaceholder')}
              />
              <small>{t('discovery.pitchHint', { n: String(Math.max(0, pitchLeft)) })}</small>
            </label>
            {saveError && <p className="provider-compose__error">{saveError}</p>}
            <button type="submit" className="v2-primary" disabled={!pitchReady || saving || !walletClient}>
              {saving ? t('discovery.submitting') : (selectedOwned?.listingId ? t('discovery.update') : t('discovery.submit'))}
            </button>
          </form>
        )}
      </section>

      {error && (
        <div className="dir-empty"><AlertCircle size={18} /> {error}</div>
      )}
      {items == null && !error && (
        <div className="dir-empty"><Loader2 size={28} className="spin" /> {t('discovery.loading')}</div>
      )}
      {items && items.length === 0 && !error && (
        <div className="dir-empty">{t('discovery.empty')}</div>
      )}
      {sorted.length > 0 && (
        <div className="discovery-list">
          {sorted.map((item) => (
            <PitchCard
              key={item.id}
              item={item}
              t={t}
              threshold={threshold}
              access={access}
              address={address}
              onVote={onVote}
              voting={voting}
              voteError={voteError}
              onOpen={openProvider}
            />
          ))}
        </div>
      )}
    </div>
  );
}
