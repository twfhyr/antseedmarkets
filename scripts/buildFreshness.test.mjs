import assert from 'node:assert/strict';
import { shouldReloadForBuildId } from '../src/hooks/useBuildFreshness.js';

assert.equal(shouldReloadForBuildId('prod-new', 'prod-old', false), true);
assert.equal(shouldReloadForBuildId('prod-same', 'prod-same', false), false);
assert.equal(shouldReloadForBuildId('', 'prod-old', false), false);
assert.equal(shouldReloadForBuildId('build-from-last-build', 'dev-current', true), false);
