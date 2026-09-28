import React from 'react';

export default function PageIntro({ page, description }) {
  const rewards = page === 'rewards';
  return (
    <section className="design-page-hero">
      <div>
        <p className="v2-eyebrow"><span className="v2-dot" />{rewards ? 'REWARDS / PARTICIPATION, RECOGNISED' : 'PORTFOLIO / YOUR ACTIVITY, IN ONE PLACE'}</p>
        <h1>{rewards ? 'Small contributions.' : 'Your stake.'}<br /><em>{rewards ? 'Something to show.' : 'Your story.'}</em></h1>
        <p className="design-page-description">{description}</p>
      </div>
      <div className="design-page-stamp" aria-hidden="true"><span>FIELD NOTES</span><strong>{rewards ? '03' : '02'}</strong><span>{page.toUpperCase()} / ANTSEED MARKETS</span></div>
    </section>
  );
}
