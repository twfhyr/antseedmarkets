const BASE = '/api/ants';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, init) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, init);
  } catch (error) {
    throw new ApiError(`Network error: ${error.message || String(error)}`, 0);
  }
  let envelope = null;
  try {
    envelope = await response.json();
  } catch {
    envelope = null;
  }
  if (!envelope || typeof envelope !== 'object') throw new ApiError(`HTTP ${response.status}`, response.status);
  if (!envelope.ok) throw new ApiError(envelope.error || `HTTP ${response.status}`, response.status);
  return envelope.data;
}

function withAddress(path, address) {
  if (!address) return path;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}address=${encodeURIComponent(address)}`;
}

export function createAntsApi(address) {
  const get = (path) => request(withAddress(path, address));
  const post = (path, body) => request(withAddress(path, address), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return {
    config: () => get('/config'),
    overview: () => get('/overview'),
    positions: () => get('/positions'),
    rewards: () => get('/rewards'),
    pools: () => get('/pools'),
    pool: (agentId) => get(`/pools/${agentId}`),
    usage: (epochs = 8) => get(`/usage?epochs=${epochs}`),
    emissions: () => get('/emissions'),
    verification: (seller) => get(`/verification${seller ? `?seller=${encodeURIComponent(seller)}` : ''}`),
    proofStatus: (proofId) => get(`/verification/proofs/${encodeURIComponent(proofId)}`),
    seller: () => get('/seller'),
    withdrawPreview: (positionIds) => post('/positions/withdraw/preview', { positionIds }),
  };
}
