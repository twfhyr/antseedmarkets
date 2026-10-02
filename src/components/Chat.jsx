import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wallet } from 'ethers';
import { AntseedWebClient } from '@antseed/web-sdk';

const WEBRTC_CAPABILITY = 'transport.webrtc.v1';
const DEFAULT_RELAY_URL = import.meta.env.VITE_ANTSEED_RELAY_URL || `${window.location.origin}/relay`;
const DEFAULT_MODEL = import.meta.env.VITE_ANTSEED_CHAT_MODEL || 'gpt-5.5';
const DEFAULT_PROVIDER = import.meta.env.VITE_ANTSEED_CHAT_PROVIDER || 'duggy';
const PRIVATE_KEY_STORAGE = 'antseedmarkets.chat.privateKey';
const RELAY_STORAGE = 'antseedmarkets.chat.relayUrl';
const THREADS_STORAGE = 'antseedmarkets.chat.threads';
const ACTIVE_THREAD_STORAGE = 'antseedmarkets.chat.activeThreadId';

const STARTERS = [
  {
    title: 'Shape an idea',
    detail: 'Turn a rough thought into a practical plan.',
    prompt: 'Help me turn a rough idea into a clear, practical plan.',
  },
  {
    title: 'Compare options',
    detail: 'Look at tradeoffs before choosing a direction.',
    prompt: 'Compare the strongest options for this decision and call out the tradeoffs.',
  },
  {
    title: 'Build with AntSeed',
    detail: 'Ask about routing work through the network.',
    prompt: 'Explain how I could use AntSeed services for this task.',
  },
];

function makeThread(messages = []) {
  const id = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    title: 'A fresh start',
    createdAt: Date.now(),
    messages,
  };
}

function loadThreads() {
  try {
    const parsed = JSON.parse(localStorage.getItem(THREADS_STORAGE) || '[]');
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // Ignore stale local data and start clean.
  }
  return [makeThread()];
}

function titleFromMessage(content) {
  const text = String(content || '').trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, 48) : 'A fresh start';
}

function ensurePrivateKey() {
  const existing = localStorage.getItem(PRIVATE_KEY_STORAGE);
  if (existing) return existing;
  const key = Wallet.createRandom().privateKey;
  localStorage.setItem(PRIVATE_KEY_STORAGE, key);
  return key;
}

function supportsWebrtc(seller) {
  return Array.isArray(seller?.capabilities) && seller.capabilities.includes(WEBRTC_CAPABILITY);
}

function sellerName(seller) {
  return seller?.displayName || seller?.name || `seller ${String(seller?.peerId || '').slice(0, 8)}`;
}

function flattenServices(seller) {
  const services = [];
  for (const provider of seller?.providers || []) {
    for (const service of provider?.services || []) {
      if (service && !services.includes(service)) services.push(service);
    }
  }
  return services;
}

function decodeBody(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  return new TextDecoder().decode(body);
}

function IntroArt() {
  return (
    <svg viewBox="0 0 260 145" role="img" aria-label="Antseed chat room">
      <defs>
        <pattern id="chat-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <path d="M0 0v5" stroke="currentColor" opacity=".15" />
        </pattern>
      </defs>
      <ellipse cx="128" cy="123" rx="99" ry="10" fill="currentColor" opacity=".04" />
      <path d="M35 91l87-47 94 48-88 48z" fill="var(--chat-art-light)" stroke="currentColor" />
      <path d="M35 91v14l93 48v-13z" fill="var(--chat-art-mid)" stroke="currentColor" />
      <path d="M128 140l88-48v14l-88 47z" fill="var(--chat-art-dark)" stroke="currentColor" />
      <path d="M104 74V38l39-23 43 22v37l-41 24z" fill="var(--chat-art-mid)" stroke="currentColor" />
      <path d="M104 38l41 22 41-23-43-22z" fill="var(--chat-art-light)" stroke="currentColor" />
      <path d="M145 60l41-23v37l-41 24z" fill="var(--chat-art-dark)" stroke="currentColor" />
      <path d="M107 40l36 20v35l-36-21z" fill="url(#chat-hatch)" />
      <g transform="translate(146 23) rotate(-25)">
        <path d="M-19 0c6-26 37-29 47-9-5 25-34 33-47 9z" fill="var(--chat-orange)" />
        <path d="M-15 0L25-8M-10 6l30-8" stroke="#ffd2af" fill="none" />
      </g>
      <g transform="translate(75 89) scale(.6)" fill="currentColor" stroke="currentColor" strokeWidth="2">
        <ellipse rx="11" ry="7" />
        <ellipse cx="18" cy="-2" rx="5" ry="4" />
        <circle cx="29" cy="-4" r="6" />
        <path d="M10 0l-8 13-9 3M17-2l4 15 9 3M23-3l15 10 7-2M10-3L3-16l-8-2M18-4l4-14 9-3M31-8l8-12 9 1" fill="none" />
      </g>
      <path d="M190 48h32M213 76h18" stroke="currentColor" opacity=".3" />
      <circle cx="224" cy="48" r="2" fill="var(--chat-orange)" />
    </svg>
  );
}

export default function Chat({ setActiveTab }) {
  const [relayUrl, setRelayUrl] = useState(() => localStorage.getItem(RELAY_STORAGE) || DEFAULT_RELAY_URL);
  const [threads, setThreads] = useState(loadThreads);
  const [activeThreadId, setActiveThreadId] = useState(() => localStorage.getItem(ACTIVE_THREAD_STORAGE) || null);
  const [input, setInput] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [sellers, setSellers] = useState([]);
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [status, setStatus] = useState('Ready to connect');
  const [connectionState, setConnectionState] = useState('Not connected');
  const [busy, setBusy] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');

  const clientRef = useRef(null);
  const sessionRef = useRef(null);
  const scrollRef = useRef(null);
  const autoLoadRef = useRef(false);

  const activeThread = useMemo(() => {
    return threads.find((thread) => thread.id === activeThreadId) || threads[0] || makeThread();
  }, [activeThreadId, threads]);

  const selectedSeller = useMemo(() => {
    return sellers.find((seller) => seller.peerId === selectedPeerId) || null;
  }, [selectedPeerId, sellers]);

  const sellerServices = useMemo(() => flattenServices(selectedSeller), [selectedSeller]);

  useEffect(() => {
    localStorage.setItem(THREADS_STORAGE, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    if (activeThread?.id) localStorage.setItem(ACTIVE_THREAD_STORAGE, activeThread.id);
  }, [activeThread?.id]);

  useEffect(() => {
    localStorage.setItem(RELAY_STORAGE, relayUrl);
  }, [relayUrl]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeThread?.messages]);

  useEffect(() => {
    return () => {
      sessionRef.current?.close?.();
      clientRef.current?.close?.();
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateThread = useCallback((threadId, updater) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? updater(thread) : thread
    )));
  }, []);

  const newConversation = useCallback(() => {
    const thread = makeThread();
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    setInput('');
    setSidebarOpen(false);
  }, []);

  const clearConversations = useCallback(() => {
    const thread = makeThread();
    setThreads([thread]);
    setActiveThreadId(thread.id);
    setInput('');
  }, []);

  const exportConversation = useCallback(async () => {
    const lines = activeThread.messages.map((message) => `${message.role.toUpperCase()}\n${message.content}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(lines || 'Empty conversation');
      setToast('Conversation copied');
    } catch {
      setToast('Copy failed');
    }
  }, [activeThread]);

  const ensureClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    const key = ensurePrivateKey();
    const client = await AntseedWebClient.create({
      relayUrl: relayUrl.trim(),
      privateKey: key,
      requestTimeoutMs: 120000,
      onError: (error) => setStatus(`Network error: ${error.message}`),
      onPersistenceError: (error) => setStatus(`Storage error: ${error.message}`),
      connection: {
        onConnectionInfo: (info) => setConnectionState(`Connected, ${info.path}`),
      },
    });
    clientRef.current = client;
    return client;
  }, [relayUrl]);

  const resetConnection = useCallback(async () => {
    sessionRef.current?.close?.();
    sessionRef.current = null;
    await clientRef.current?.close?.();
    clientRef.current = null;
    setConnectionState('Not connected');
  }, []);

  const loadSellers = useCallback(async () => {
    setBusy(true);
    setStatus('Finding sellers through the relay');
    try {
      await resetConnection();
      const client = await ensureClient();
      const found = await client.sellers();
      const ranked = [...found]
        .filter((seller) => seller.publicAddress)
        .sort((a, b) => Number(supportsWebrtc(b)) - Number(supportsWebrtc(a)));
      setSellers(ranked);
      const preferred = ranked.find(supportsWebrtc) || ranked[0];
      setSelectedPeerId(preferred?.peerId || '');
      if (preferred) {
        const services = flattenServices(preferred);
        if (services[0]) setModel((current) => current || services[0]);
      }
      setStatus(`${ranked.length} reachable seller${ranked.length === 1 ? '' : 's'} found`);
    } catch (error) {
      setStatus(`Relay failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }, [ensureClient, resetConnection]);

  useEffect(() => {
    if (autoLoadRef.current) return;
    autoLoadRef.current = true;
    void loadSellers();
  }, [loadSellers]);

  const connectSelected = useCallback(async () => {
    if (!selectedSeller) {
      setShowServices(true);
      return null;
    }
    setBusy(true);
    setStatus(`Connecting to ${sellerName(selectedSeller)}`);
    try {
      const client = await ensureClient();
      sessionRef.current?.close?.();
      sessionRef.current = await client.connect(selectedSeller, selectedSeller);
      setConnectionState(`Connected to ${sellerName(selectedSeller)}`);
      setStatus('Ready to chat');
      return sessionRef.current;
    } catch (error) {
      setConnectionState('Not connected');
      setStatus(`Connect failed: ${error.message}`);
      return null;
    } finally {
      setBusy(false);
    }
  }, [ensureClient, selectedSeller]);

  const parseSseChunk = useCallback((text, append) => {
    const events = text.split('\n\n');
    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? '';
          if (delta) append(delta);
        } catch {
          append(`${data}\n`);
        }
      }
    }
  }, []);

  const sendMessage = useCallback(async (event) => {
    event?.preventDefault?.();
    const content = input.trim();
    if (!content || busy) return;
    const threadId = activeThread.id;
    const previousMessages = activeThread.messages;
    const nextUserMessage = { role: 'user', content };
    const assistantMessage = { role: 'assistant', content: '' };
    const requestMessages = [...previousMessages, nextUserMessage]
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }));

    updateThread(threadId, (thread) => ({
      ...thread,
      title: thread.messages.length ? thread.title : titleFromMessage(content),
      messages: [...thread.messages, nextUserMessage, assistantMessage],
    }));
    setInput('');
    setBusy(true);

    const appendAssistant = (delta) => {
      updateThread(threadId, (thread) => {
        const messages = [...thread.messages];
        const last = messages[messages.length - 1];
        if (last?.role === 'assistant') {
          messages[messages.length - 1] = { ...last, content: `${last.content}${delta}` };
        }
        return { ...thread, messages };
      });
    };

    try {
      let session = sessionRef.current;
      if (!session) session = await connectSelected();
      if (!session) throw new Error('Choose a WebRTC seller before sending.');

      const decoder = new TextDecoder();
      let buffer = '';
      const response = await session.request(
        {
          path: '/v1/chat/completions',
          ...(provider.trim() ? { provider: provider.trim() } : {}),
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            model: model.trim() || DEFAULT_MODEL,
            stream: true,
            messages: requestMessages,
          }),
        },
        {
          onChunk: (data, done) => {
            buffer += decoder.decode(data, { stream: !done });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            parseSseChunk(parts.join('\n\n'), appendAssistant);
            if (done && buffer) {
              parseSseChunk(`${buffer}\n\n`, appendAssistant);
              buffer = '';
            }
          },
        },
      );

      if (response.status >= 400) {
        appendAssistant(`HTTP ${response.status}: ${decodeBody(response.body)}`);
      } else if (!decodeBody(response.body) && !activeThread.messages.length) {
        setStatus('Response complete');
      } else {
        const bodyText = decodeBody(response.body);
        if (bodyText) appendAssistant(bodyText);
      }
    } catch (error) {
      appendAssistant(`Request failed: ${error.message}`);
      setStatus(`Request failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }, [activeThread, busy, connectSelected, input, model, parseSseChunk, provider, updateThread]);

  const selectSeller = useCallback(async (seller) => {
    setSelectedPeerId(seller.peerId);
    const services = flattenServices(seller);
    if (services[0]) setModel(services[0]);
    setShowServices(false);
    sessionRef.current?.close?.();
    sessionRef.current = null;
    setConnectionState('Not connected');
  }, []);

  const onKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(event);
    }
  }, [sendMessage]);

  return (
    <section className="chat-page" aria-labelledby="chat-title">
      <aside className={`chat-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="chat-side-heading">
          <span className="chat-eyebrow">YOUR WORKSPACE</span>
          <button className="chat-icon-button chat-mobile-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close conversations">×</button>
        </div>
        <button className="chat-new" type="button" onClick={newConversation}>
          <span>New conversation</span>
          <span>＋</span>
        </button>
        <div className="chat-history-heading">
          <span>CONVERSATIONS</span>
          <span>{String(threads.length).padStart(2, '0')}</span>
        </div>
        <div className="chat-history" aria-label="Conversations">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={thread.id === activeThread.id ? 'is-active' : ''}
              onClick={() => { setActiveThreadId(thread.id); setSidebarOpen(false); }}
            >
              <span>{thread.title}</span>
            </button>
          ))}
        </div>
        <div className="chat-side-bottom">
          <div className="chat-tiny-seed" aria-hidden="true">✳</div>
          <h3>Different minds.<br /><em>Shared possibilities.</em></h3>
          <p>A live room for AntSeed sellers reached through the browser WebRTC SDK.</p>
          <div className="chat-side-footer">
            <span>WEBRTC RELAY</span>
            <button type="button" onClick={clearConversations}>Clear</button>
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-top">
          <div className="chat-breadcrumb">
            <button className="chat-icon-button chat-mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">☰</button>
            <span className="chat-eyebrow">THE CONVERSATION ROOM</span>
            <span className="chat-divider">/</span>
            <span>{activeThread.title}</span>
          </div>
          <div className="chat-top-actions">
            <button type="button" onClick={() => setActiveTab('home')}>Home</button>
            <button type="button" onClick={exportConversation}>Export ↗</button>
          </div>
        </div>

        <div className="chat-scroll" ref={scrollRef}>
          {activeThread.messages.length === 0 ? (
            <section className="chat-welcome">
              <div className="chat-intro-art" aria-hidden="true"><IntroArt /></div>
              <p className="chat-eyebrow chat-welcome-kicker">SMALL QUESTIONS. NEW POSSIBILITIES.</p>
              <h1 id="chat-title">What’s on<br /><em>your mind?</em></h1>
              <p className="chat-welcome-copy">A question, a half formed idea, a thing you cannot quite solve.<br />Start a conversation through AntSeed and see where it takes you.</p>
              <div className="chat-starters">
                {STARTERS.map((starter) => (
                  <button key={starter.title} type="button" onClick={() => setInput(starter.prompt)}>
                    <span>↗</span>
                    <strong>{starter.title}</strong>
                    <small>{starter.detail}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="chat-messages">
              {activeThread.messages.map((message, index) => (
                <article key={`${message.role}-${index}`} className={`chat-message chat-message--${message.role}`}>
                  <div className="chat-message-author">
                    <b>{message.role === 'user' ? 'Y' : 'A'}</b>
                    <span>{message.role === 'user' ? 'You' : 'AntSeed'}</span>
                  </div>
                  <div className="chat-message-body">{message.content || (busy && index === activeThread.messages.length - 1 ? 'Thinking…' : '')}</div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="chat-composer-region">
          <div className="chat-connection-row">
            <button className="chat-service-select" type="button" onClick={() => setShowServices(true)}>
              <span className="chat-service-dot" />
              <strong>{selectedSeller ? sellerName(selectedSeller) : 'Choose a service'}</strong>
              <span>⌄</span>
            </button>
            <span className="chat-connection-state">{connectionState}</span>
          </div>
          <form className="chat-composer" onSubmit={sendMessage}>
            <label className="chat-sr-only" htmlFor="chat-message-input">Your message</label>
            <textarea
              id="chat-message-input"
              rows="2"
              placeholder="Plant a thought…"
              maxLength={12000}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="chat-composer-actions">
              <div className="chat-composer-tools">
                <button className="chat-icon-button" type="button" onClick={() => setShowServices(true)} aria-label="Connection settings">＋</button>
                <span>Enter to send <span>Shift + Enter for a new line</span></span>
              </div>
              <button className="chat-send" type="submit" disabled={busy || !input.trim()} aria-label="Send message">↑</button>
            </div>
          </form>
          <p className="chat-composer-note"><span>LIVE SDK</span> Messages are sent unchanged to /v1/chat/completions through the selected seller.</p>
        </div>
      </main>

      {showServices && (
        <div className="chat-dialog-backdrop" role="presentation" onMouseDown={() => setShowServices(false)}>
          <div className="chat-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-services-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="chat-dialog-top">
              <span className="chat-eyebrow">FIND YOUR KIND OF INTELLIGENCE</span>
              <button className="chat-icon-button" type="button" onClick={() => setShowServices(false)} aria-label="Close services">×</button>
            </div>
            <h2 id="chat-services-title">Pick a starting point.</h2>
            <p>Browser chat uses @antseed/web-sdk. The relay lists sellers, then WebRTC carries the request to the seller.</p>
            <div className="chat-setup-grid">
              <label>
                Relay URL
                <input value={relayUrl} onChange={(event) => setRelayUrl(event.target.value)} />
              </label>
              <label>
                Provider header
                <input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Optional" />
              </label>
              <label>
                Model
                <input value={model} onChange={(event) => setModel(event.target.value)} list="chat-models" />
                <datalist id="chat-models">
                  {sellerServices.map((service) => <option key={service} value={service} />)}
                </datalist>
              </label>
              <button type="button" className="chat-load-sellers" onClick={loadSellers} disabled={busy}>Refresh sellers</button>
            </div>
            <div className="chat-service-options">
              {sellers.length === 0 ? (
                <p className="chat-empty-service">{status}</p>
              ) : sellers.map((seller, index) => {
                const services = flattenServices(seller).slice(0, 3);
                return (
                  <button key={seller.peerId} type="button" onClick={() => selectSeller(seller)}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{sellerName(seller)}</strong>
                      <small>{supportsWebrtc(seller) ? 'WebRTC ready' : 'Listed by relay'}{services.length ? `, ${services.join(', ')}` : ''}</small>
                    </div>
                    <b>↗</b>
                  </button>
                );
              })}
            </div>
            <p className="chat-dialog-foot">{status}</p>
          </div>
        </div>
      )}
      <div className={`chat-toast ${toast ? 'is-showing' : ''}`} role="status">{toast}</div>
    </section>
  );
}
