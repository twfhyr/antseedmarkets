# Chat implementation

This document describes the antseedmarkets Chat surface added at `/chat` and how it reaches AntSeed sellers from the browser.

## User flow

1. The home department grid has a Chat card.
2. The primary nav has a Chat tab.
3. `/chat` opens a single room UI styled after the AntBeacon chat page.
4. The page loads seller candidates from the relay.
5. The user chooses a seller, writes a message, and sends it through the AntSeed Web SDK.
6. The selected seller receives the request as an OpenAI-compatible chat completion request.

The frontend does not rewrite or enrich the prompt. The user's message is sent unchanged in the `messages` array.

## Files

| File | Role |
| --- | --- |
| `src/components/Chat.jsx` | Chat UI, conversation state, seller loading, SDK connect/send flow |
| `src/chat.css` | Chat page styling |
| `src/App.jsx` | Renders the Chat component when the active tab is `chat` |
| `src/hooks/useTabRouter.js` | Adds `/chat` to SPA routing |
| `src/lib/nav.js` | Adds Chat to the primary nav |
| `src/i18n/en.js` | Adds the `nav.chat` label |
| `src/components/SiteHome.jsx` | Adds the homepage Chat block and department card |
| `src/main.jsx` | Imports `chat.css` |
| `package.json` and `package-lock.json` | Add `@antseed/web-sdk` |

## Frontend transport

`Chat.jsx` imports `AntseedWebClient` from `@antseed/web-sdk`.

The client is created with:

- `relayUrl`: `/relay`
- `model`: `VITE_ANTSEED_CHAT_MODEL`, default `gpt-5.5`
- `provider`: `VITE_ANTSEED_CHAT_PROVIDER`, default `duggy`

The browser asks `/relay/sellers` for available sellers. The relay returns DHT peers plus configured static sellers. The UI flattens both lists into one seller picker.

When the user sends a message, the page connects to the selected seller through the SDK and calls the chat completions API through that seller. The payload follows the OpenAI chat shape:

- `model`
- `provider`
- `messages`
- `temperature`
- `max_tokens`

The message list is built only from the local conversation state. There is no system prompt injection in this frontend.

## Relay

The public site uses same-origin relay paths so the browser does not call an external relay host directly.

- Public base: `/relay`
- Local relay: `127.0.0.1:8917`
- Health check: `/relay/healthz`
- Seller list: `/relay/sellers`
- WebRTC bridge: `/relay/bridge/<peerId>`

The relay is an AntSeed relay app from `/root/tian/antseed/apps/relay`. It provides the first handshake path for browser WebRTC connections and then bridges to seller peers.

On this host it is managed outside this repo:

- systemd unit: `/etc/systemd/system/antseed-web-relay.service`
- service name: `antseed-web-relay.service`
- nginx site: `/etc/nginx/sites-enabled/antseedmarkets-com`
- nginx location: `/relay/`

The nginx location strips `/relay/` before proxying to `http://127.0.0.1:8917/` and preserves WebSocket upgrades.

## Runtime configuration

The frontend can be adjusted at build time with Vite env vars:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_ANTSEED_RELAY_URL` | `/relay` | Relay base URL used by the browser |
| `VITE_ANTSEED_CHAT_MODEL` | `gpt-5.5` | Chat completion model sent to sellers |
| `VITE_ANTSEED_CHAT_PROVIDER` | `duggy` | Provider hint sent to sellers |

The relay service is configured through systemd environment variables in the unit file. The static seller list lives there, not in the frontend bundle.

## Failure behavior

- If `/relay/sellers` fails, the page shows the error in the status panel and keeps the message box disabled until a seller is available.
- If connecting to a seller fails, the page resets the active connection and reports the error inline.
- If a send fails, the failed user message remains visible and the assistant reply is not fabricated.
- Clearing the conversation only clears local browser state.

## Verification

Commands used for this deployment:

```sh
pnpm --filter=@antseed/relay run build
systemctl is-active antseed-web-relay.service
curl -sS -i https://antseedmarkets.com/relay/healthz
curl -sS https://antseedmarkets.com/relay/sellers
/root/tian/antseedmarkets/scripts/deploy.sh
```

Live checks after deployment:

- `https://antseedmarkets.com/chat` returned 200.
- The browser rendered the Chat page, primary nav Chat tab, and seller picker.
- `https://antseedmarkets.com/relay/healthz` returned `ok`.
- `https://antseedmarkets.com/relay/sellers` returned configured static sellers.

A live chat completion was not sent during verification because that would create real seller usage.
