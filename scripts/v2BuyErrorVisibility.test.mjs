import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const stake = fs.readFileSync(path.join(root, 'src/components/StakeANTS.jsx'), 'utf8');

const v2CardMatch = stake.match(/function LantsV2Card\([\s\S]*?\n}\n\nfunction LantsStatsPanel/);
assert.ok(v2CardMatch, 'LantsV2Card should exist');
const v2Card = v2CardMatch[0];

assert.match(v2Card, /buyState\?\.message && buyState\.phase !== 'error'/, 'V2 buy cards should keep non-error buy progress visible beside the button');
assert.doesNotMatch(v2Card, /v2-position-button__message--error/, 'V2 buy errors should not render inline beside the button');
assert.match(v2Card, /v2-position-button__message/, 'V2 buy progress message should use a visible scoped class');
