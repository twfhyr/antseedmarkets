import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2 } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import '../share.css';

export function absoluteShareUrl(path) {
  if (!path) return typeof window === 'undefined' ? '' : window.location.href;
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return String(path);
  }
}

export function xShareHref(url, title) {
  const text = title ? `${title}\n${url}` : url;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function telegramShareHref(url, title) {
  const href = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
  return title ? `${href}&text=${encodeURIComponent(title)}` : href;
}

function placeMenu(btn, size = { width: 196, height: 168 }) {
  const gap = 6;
  const margin = 8;
  const width = Math.min(size.width || 196, window.innerWidth - margin * 2);
  const height = Math.min(size.height || 168, window.innerHeight - margin * 2);
  let top = btn.bottom + gap;
  if (top + height > window.innerHeight - margin) {
    top = btn.top - height - gap;
  }
  top = Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin));
  let left = btn.right - width;
  left = Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin));
  return {
    top: Math.round(top),
    left: Math.round(left),
    maxHeight: Math.round(window.innerHeight - margin * 2),
  };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ShareMenu({ path, title, className, iconOnly = false }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, maxHeight: 320 });
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const btnRef = useRef(null);
  const openRef = useRef(false);

  const url = absoluteShareUrl(path);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !listRef.current || !btnRef.current) return undefined;
    const menu = listRef.current.getBoundingClientRect();
    const btn = btnRef.current.getBoundingClientRect();
    const next = placeMenu(btn, { width: menu.width, height: menu.height });
    if (next.top !== coords.top || next.left !== coords.left || next.maxHeight !== coords.maxHeight) {
      setCoords(next);
    }
    return undefined;
  }, [open, coords, copied]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (rootRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onClose = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [open]);

  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (openRef.current) {
      setOpen(false);
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setCoords(placeMenu(rect));
    setCopied(null);
    setOpen(true);
  };

  const copy = async (kind) => {
    const text = kind === 'discord' && title ? `${title}\n${url}` : url;
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(kind);
    window.setTimeout(() => {
      setCopied(null);
      setOpen(false);
    }, 1400);
  };

  const menu = open && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="share-menu__list"
        role="menu"
        ref={listRef}
        style={{ top: coords.top, left: coords.left, maxHeight: coords.maxHeight }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <a
          role="menuitem"
          href={xShareHref(url, title)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          {t('share.x')}
        </a>
        <a
          role="menuitem"
          href={telegramShareHref(url, title)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          {t('share.telegram')}
        </a>
        <button type="button" role="menuitem" onClick={() => copy('discord')}>
          {copied === 'discord' ? t('share.copiedDiscord') : t('share.discord')}
        </button>
        <button type="button" role="menuitem" onClick={() => copy('link')}>
          {copied === 'link' ? t('share.copied') : t('share.copy')}
        </button>
      </div>,
      document.body,
    )
    : null;

  return (
    <div
      className={`share-menu${iconOnly ? ' share-menu--icon' : ''}${className ? ` ${className}` : ''}`}
      ref={rootRef}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="share-menu__btn"
        ref={btnRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('share.label')}
        onClick={toggle}
      >
        <Share2 size={14} aria-hidden="true" />
        <span>{t('share.label')}</span>
      </button>
      {menu}
    </div>
  );
}
