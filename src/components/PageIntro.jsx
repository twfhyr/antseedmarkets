import React from 'react';

const INTRO = {
  portfolio: {
    eyebrow: 'PORTFOLIO / YOUR ACTIVITY, IN ONE PLACE',
    title: 'Your stake.',
    em: 'Your story.',
    stamp: '02',
  },
  rewards: {
    eyebrow: 'REWARDS / PARTICIPATION, RECOGNISED',
    title: 'Small contributions.',
    em: 'Something to show.',
    stamp: '03',
  },
  providers: {
    eyebrow: 'PROVIDERS / THE PEOPLE BEHIND THE POSSIBILITIES',
    title: 'Find your kind of',
    em: 'intelligence.',
    stamp: '04',
  },
};

export default function PageIntro({ page, description }) {
  const copy = INTRO[page] || INTRO.portfolio;
  return (
    <section className="design-page-hero">
      <div>
        <p className="v2-eyebrow"><span className="v2-dot" />{copy.eyebrow}</p>
        <h1>{copy.title}<br /><em>{copy.em}</em></h1>
        <p className="design-page-description">{description}</p>
      </div>
      <div className="design-page-stamp" aria-hidden="true"><span>FIELD NOTES</span><strong>{copy.stamp}</strong><span>{page.toUpperCase()} / ANTSEED MARKETS</span></div>
    </section>
  );
}
