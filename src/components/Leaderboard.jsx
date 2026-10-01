import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { AlertCircle, Loader2 } from 'lucide-react';
import { fetchCommentLeaderboard } from '../api';
import { useI18n } from '../i18n/index.jsx';
import { tabHref } from '../hooks/useTabRouter';
import AuthorMark from './AuthorMark';
import '../directory.css';

function num(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString();
}

function formatUtc(ms) {
  return new Date(Number(ms)).toLocaleString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function Leaderboard() {
  const { t } = useI18n();
  const { address } = useAccount();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const you = address ? address.toLowerCase() : '';

  useEffect(() => {
    let live = true;
    fetchCommentLeaderboard()
      .then((row) => {
        if (!live) return;
        setData(row);
        setError(null);
      })
      .catch((e) => {
        if (!live) return;
        setError(e.message || 'Could not load the leaderboard.');
        setData(null);
      });
    return () => { live = false; };
  }, []);

  const rules = data?.rules;
  const items = data?.items || [];
  const deadlineAt = data?.deadlineAt;
  const prizeTop = data?.prizeTop ?? 10;
  const prizeLants = data?.prizeLants ?? 10;

  return (
    <div className="directory-page wrap">
      <section className="dir-hero">
        <div>
          <p className="v2-eyebrow"><span className="v2-dot" />{t('board.heroEyebrow')}</p>
          <h1>{t('board.heroTitle')}<br /><em>{t('board.heroEm')}</em></h1>
          <p className="dir-lead">{t('board.blurb')}</p>
          {deadlineAt != null && (
            <>
              <p className="dir-lead">{t('board.deadline', { when: formatUtc(deadlineAt) })}</p>
              <p className="dir-lead">{t('board.deadlineLocal', { when: new Date(deadlineAt).toLocaleString() })}</p>
            </>
          )}
        </div>
      </section>

      <div className="dir-prize">
        <p className="v2-eyebrow">{t('board.rulesEyebrow')}</p>
        <p>{t('board.prize', { n: String(prizeTop), lants: String(prizeLants) })}</p>
        <p>{data?.open === false ? t('board.closed') : t('board.open')}</p>
      </div>

      {rules && (
        <div className="dir-rules">
          <article className="dir-rule">
            <h3>{t('board.ruleCommentsTitle')}</h3>
            <p>{t('board.ruleCommentsBody', { n: String(rules.commentPoints) })}</p>
          </article>
          <article className="dir-rule">
            <h3>{t('board.ruleQualityTitle')}</h3>
            <p>{t('board.ruleQualityBody', {
              short: String(rules.qualityNoteMin),
              note: String(rules.qualityNotePoints),
              full: String(rules.qualityFullMin),
              fullPts: String(rules.qualityFullPoints),
            })}</p>
          </article>
          <article className="dir-rule">
            <h3>{t('board.ruleProvidersTitle')}</h3>
            <p>{t('board.ruleProvidersBody', { n: String(rules.providerPoints) })}</p>
          </article>
        </div>
      )}
      <p className="dir-note">{t('board.rulesNote')}</p>

      {error && (
        <div className="dir-empty"><AlertCircle size={18} /> {t('board.error')}</div>
      )}
      {!error && !data && (
        <div className="dir-empty"><Loader2 size={28} className="spin" /> {t('board.loading')}</div>
      )}
      {data && items.length === 0 && (
        <div className="dir-empty">
          {t('board.empty')}
          {' '}
          <a href={tabHref('providers')}>{t('nav.providers')}</a>
        </div>
      )}
      {items.length > 0 && (
        <div className="dir-board">
          <table className="dir-board-table">
            <thead>
              <tr>
                <th>{t('board.colRank')}</th>
                <th>{t('board.colWallet')}</th>
                <th>{t('board.colScore')}</th>
                <th>{t('board.colComments')}</th>
                <th>{t('board.colQuality')}</th>
                <th>{t('board.colProviders')}</th>
                <th>{t('board.colPrize')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const mine = you && row.author === you;
                return (
                  <tr key={row.author} className={`${row.prizeLants ? 'is-prize' : ''}${mine ? ' is-you' : ''}`}>
                    <td>{row.rank}</td>
                    <td>
                      <AuthorMark address={row.author} profile={row.profile} />
                      {mine ? <span className="dir-you">{t('board.you')}</span> : null}
                    </td>
                    <td>{num(row.score)}</td>
                    <td>{num(row.comments)}</td>
                    <td>{num(row.quality)}</td>
                    <td>{num(row.providers)}</td>
                    <td>{row.prizeLants ? t('board.prizeValue', { n: String(row.prizeLants) }) : t('board.prizeNone')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
