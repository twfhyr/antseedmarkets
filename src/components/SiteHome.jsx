import React, { useCallback, useEffect } from 'react';
import { tabHref } from '../hooks/useTabRouter';

const DEPARTMENT_HREFS = {
  stake: tabHref('stake'),
  market: tabHref('market'),
  providers: tabHref('providers'),
  next: tabHref('next'),
};

function AntSymbol() {
  return (
    <g id="site-home-ant" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <ellipse cx="0" cy="0" rx="15" ry="9" />
      <ellipse cx="23" cy="-2" rx="6" ry="5" />
      <ellipse cx="37" cy="-4" rx="8" ry="7" />
      <path d="M17 0L8 15l-13 6M24 0l1 16 12 5M29-1l15 12 15-2M17-3L6-16l-12 2M24-4l5-16 14-3M31-5l15-13 11 2M40-8l9-15 10-3M44-5l15-4 9 3" fill="none" />
    </g>
  );
}

function SiteHomeScene({ onNavigate }) {
  const blockProps = (department, tab) => ({
    className: `site-home-block site-home-block--${department}`,
    'data-department': department,
    role: 'link',
    tabIndex: 0,
    onClick: () => onNavigate(tab),
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onNavigate(tab);
      }
    },
  });

  return (
    <div className="site-home-scene-wrap">
      <svg className="site-home-scene" viewBox="0 0 720 530" role="img" aria-labelledby="site-home-scene-title site-home-scene-desc">
        <title id="site-home-scene-title">Ants moving seeds across a growing network</title>
        <desc id="site-home-scene-desc">A group of ants carries glowing seeds between account, marketplace, provider and future blocks.</desc>
        <defs>
          <pattern id="site-home-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0v8" stroke="#273127" strokeWidth=".8" opacity=".18" /></pattern>
          <pattern id="site-home-grain" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#b7b99f" opacity=".35" /></pattern>
          <filter id="site-home-glow"><feGaussianBlur stdDeviation="7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <AntSymbol />
        </defs>
        <circle cx="365" cy="238" r="203" fill="#e6e5d7" />
        <circle cx="365" cy="238" r="203" fill="url(#site-home-grain)" />
        <path className="site-home-ground" d="M28 403L349 223l343 176-326 112z" />
        <path d="M28 403L349 223l343 176-326 112z" fill="url(#site-home-hatch)" />
        <g className="site-home-blocks" stroke="#29362b" strokeWidth="1.5">
          <g {...blockProps('account', 'stake')} aria-label="Open My Antseed">
            <path d="M105 335l154-88 161 82-152 89z" fill="#f7f2e7" /><path d="M105 335v48l163 83v-48z" fill="#c9d0bd" /><path d="M268 418l152-89v48l-152 89z" fill="#91a080" /><text x="145" y="331">MY ANTSEED</text>
          </g>
          <g {...blockProps('market', 'market')} aria-label="Open Marketplace">
            <path d="M323 280l130-75 136 69-128 76z" fill="#e9dfcc" /><path d="M323 280v42l138 70v-43z" fill="#c5ad8f" /><path d="M461 349l128-75v43l-128 75z" fill="#a98562" /><text x="465" y="309" textAnchor="middle">MARKETPLACE</text>
          </g>
          <g {...blockProps('providers', 'providers')} aria-label="Open Providers">
            <path d="M236 219l108-62 111 57-106 62z" fill="#d7dfc9" /><path d="M236 219v38l113 57v-38z" fill="#aab99d" /><path d="M349 276l106-62v38l-106 62z" fill="#718967" /><text x="279" y="216">PROVIDERS</text>
          </g>
          <g {...blockProps('future', 'next')} aria-label="Open Next">
            <path d="M477 391l73-42 77 39-73 44z" fill="#e1e5da" /><path d="M477 391v27l77 39v-27z" fill="#bac7b6" /><path d="M554 430l73-42v27l-73 42z" fill="#8d9e8b" /><text x="521" y="388">NEXT</text>
          </g>
        </g>
        <g className="site-home-seed site-home-seed--main" filter="url(#site-home-glow)" transform="translate(355 145) rotate(-25)"><path d="M-42 4C-35-41 42-58 68-16 53 34-12 48-42 4z" fill="#e7653f" stroke="#9f3825" strokeWidth="2" /><path d="M-37 1C-7-12 33-17 63-16M-27 10C3-1 32-8 56-8M-14 20C10 8 28 3 48 2" fill="none" stroke="#ffc09e" strokeWidth="1.5" /></g>
        <g className="site-home-seed site-home-seed--small" transform="translate(250 350) rotate(25)"><path d="M-25-12C-10-42 23-46 40-17 27 7-9 10-25-12z" fill="#ef8b55" stroke="#9f3825" /><path d="M-21-13l55-5M-13-6l39-6" stroke="#ffd0a8" /></g>
        <use href="#site-home-ant" className="site-home-ant site-home-ant--one" transform="translate(218 190) rotate(-20) scale(.72)" />
        <use href="#site-home-ant" className="site-home-ant site-home-ant--two" transform="translate(535 292) rotate(-25) scale(.78)" />
        <use href="#site-home-ant" className="site-home-ant site-home-ant--three" transform="translate(125 397) rotate(18) scale(.9)" />
        <use href="#site-home-ant" className="site-home-ant site-home-ant--four" transform="translate(563 437) rotate(180) scale(.63)" />
        <path className="site-home-route" d="M216 374C283 329 275 263 337 225M389 172C457 210 475 240 493 285M478 326C524 357 551 381 569 415" />
        <circle className="site-home-signal" cx="355" cy="145" r="7" /><circle className="site-home-signal site-home-signal--delay" cx="355" cy="145" r="17" />
      </svg>
      <div className="site-home-scene-caption"><span>FIELD NOTE 001</span><span>EVERYTHING CONNECTS</span></div>
    </div>
  );
}

function DepartmentCard({ number, tab, department, title, children, small, soon, onNavigate }) {
  return (
    <a
      className={`site-home-department site-home-department--${department}`}
      data-department={department}
      href={tabHref(tab)}
      onClick={(event) => { event.preventDefault(); onNavigate(tab); }}
    >
      <span className="site-home-number">{number}</span>
      {soon ? <span className="site-home-soon">{soon}</span> : <span className="site-home-arrow">↗</span>}
      <h3>{title}</h3>
      <p>{children}</p>
      <small>{small}</small>
    </a>
  );
}

export function SiteNext({ setActiveTab }) {
  const go = useCallback((tab) => setActiveTab(tab), [setActiveTab]);
  return (
    <section className="site-home site-next wrap" aria-labelledby="site-next-title">
      <p className="site-home-kicker">YOU FOUND THE UNFINISHED CORNER</p>
      <h1 id="site-next-title">What grows<br /><em>here next?</em></h1>
      <p className="site-home-lede">A place for possibilities. These are ideas to explore, not announced products or promised releases.</p>
      <div className="site-home-department-grid">
        <article className="site-home-department"><span className="site-home-number">01 / EXPLORING</span><h3>Useful little tools</h3><p>Account activity exports, clearer cost comparisons and tools that make the everyday work easier.</p></article>
        <article className="site-home-department"><span className="site-home-number">02 / EXPLORING</span><h3>DeFi, thoughtfully</h3><p>Ways to understand positions, liquidity and risk. No financial product or return is being offered here.</p></article>
        <article className="site-home-department"><span className="site-home-number">03 / EXPLORING</span><h3>Provider workspaces</h3><p>Better ways for independent providers to explain their services and help people get started.</p></article>
        <article className="site-home-department"><span className="site-home-number">04 / OPEN SPACE</span><h3>The unexpected</h3><p>Small experiments, community contributions and things we haven’t thought of yet.</p></article>
      </div>
      <button className="site-home-back" type="button" onClick={() => go('home')}>antseed markets ↖</button>
    </section>
  );
}

export default function SiteHome({ setActiveTab }) {
  useEffect(() => {
    const tokenMatch = /(?:^#|[#&?])token=([A-Za-z0-9_-]+)/.exec(window.location.hash);
    if (!tokenMatch) return;
    sessionStorage.setItem('ants.dashboard.token', tokenMatch[1]);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  const navigate = useCallback((tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setActiveTab]);

  return (
    <div className="site-home" id="top">
      <section className="site-home-hero" aria-labelledby="site-home-title">
        <div className="site-home-copy">
          <p className="site-home-kicker">A P2P AI SERVICES NETWORK</p>
          <h1 id="site-home-title">Small hands.<br /><em>Far-reaching roots.</em></h1>
          <p className="site-home-lede">Antseed is tended by many. Find your place in the network, then let the work grow.</p>
          <a className="site-home-scroll-cue" href="#departments"><span>01</span> Explore the ground <b>↓</b></a>
        </div>
        <SiteHomeScene onNavigate={navigate} />
      </section>

      <section className="site-home-departments" id="departments" aria-labelledby="site-home-departments-title">
        <div className="site-home-section-intro">
          <p className="site-home-kicker">CHOOSE YOUR GROUND</p>
          <h2 id="site-home-departments-title">There is more than one<br /><em>way into Antseed.</em></h2>
          <p>One network. Different ways to take part. Start where your work begins.</p>
        </div>
        <div className="site-home-department-grid">
          <DepartmentCard number="01" tab="stake" department="account" title="My Antseed" small="Open the account dashboard" onNavigate={navigate}>Your account, payments, staking and rewards.</DepartmentCard>
          <DepartmentCard number="02" tab="market" department="market" title="Marketplace" small="Enter the marketplace" onNavigate={navigate}>Explore lANTS positions and the people building on them.</DepartmentCard>
          <DepartmentCard number="03" tab="providers" department="providers" title="Providers" small="Profiles, announcements and optional conversation" onNavigate={navigate}>Find the services, providers and specialist agents in the network.</DepartmentCard>
          <DepartmentCard number="04" tab="next" department="future" title="More to come" small="Take a look at what could come next ↗" soon="IN THE MAKING" onNavigate={navigate}>New tools will grow from the work already happening here.</DepartmentCard>
        </div>
      </section>
    </div>
  );
}
