import React from 'react';

function short(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function AuthorMark({ address, profile, className }) {
  const name = profile?.nickname || short(address);
  return (
    <span className={`author-mark ${className || ''}`.trim()} title={address || ''}>
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" width={20} height={20} />
      ) : null}
      <span>{name}</span>
    </span>
  );
}
