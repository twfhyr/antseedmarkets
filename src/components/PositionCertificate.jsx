import React from 'react';

/** Editorial rendering of the same position data used by the existing NFT art. */
export default function PositionCertificate({ id, amount, price, value, start, end, provider, state }) {
  return (
    <div className="position-certificate" role="group" aria-label={`Locked ANTS position #${id}: ${amount} ANTS, ${start} to ${end}`}>
      <div className="position-certificate__top"><span>lANTS / #{id}</span><span className="position-certificate__state">{state || 'Locked position'}</span></div>
      <div className="position-certificate__body">
        <div className="position-certificate__seal" aria-hidden="true">
          <svg viewBox="0 0 100 80"><ellipse cx="50" cy="40" rx="38" ry="25" transform="rotate(-28 50 40)" /><path d="M16 58Q43 16 84 22M20 60Q45 28 85 27M26 63Q51 39 84 33M34 65Q55 48 79 43" /></svg>
          <span>A STAKE IN THE NETWORK</span>
        </div>
        <span className="position-certificate__label">Locked principal</span>
        <div className="position-certificate__amount">{amount}<small>ANTS</small></div>
        <p className="position-certificate__provider">{provider || 'Provider pool'}</p>
        <div className="position-certificate__dates"><div><span>Starts</span><strong>{start}</strong></div><span aria-hidden="true">→</span><div><span>Unlocks</span><strong>{end}</strong></div></div>
      </div>
      <div className="position-certificate__footer"><div><span>Asking price</span><strong>{value}</strong></div><div><span>Per ANTS</span><strong>{price}</strong></div></div>
    </div>
  );
}
