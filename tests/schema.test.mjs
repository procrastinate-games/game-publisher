import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../scripts/schema.mjs';

const draft = {
  schemaVersion: 1,
  slug: 'game-template',
  status: 'draft',
  title: 'Your game title',
  shortDescription: 'A short invitation to play.',
  description: 'Describe the player, goal, and main challenge.',
  primaryCategory: 'Casual',
  categories: ['Casual'],
  dimension: '2D',
  controls: ['Describe keyboard controls.', 'Describe touch controls.'],
  languages: 'English',
  saveNote: 'Describe what is saved locally.',
  coverAlt: 'Describe the game cover.',
  accent: 'lime',
  startQuery: '',
  featured: false,
  showSource: false,
  supportedDevices: ['desktop', 'mobile'],
};

test('new template repositories stay drafts until the owner fills their slug', () => {
  assert.equal(validateManifest(draft, 'new-game').status, 'draft');
  assert.throws(() => validateManifest({ ...draft, status: 'published' }, 'new-game'), /slug/);
  assert.equal(validateManifest({ ...draft, slug: 'new-game', status: 'published' }, 'new-game').slug, 'new-game');
});

test('invalid metadata and address overrides cannot enter the catalog', () => {
  for (const patch of [{ schemaVersion: 2 }, { status: 'ready' }, { title: '' }, { categories: [] }, { dimension: '4D' }, { accent: 'blue' }, { featured: 'true' }, { startQuery: '//other.example' }]) {
    assert.throws(() => validateManifest({ ...draft, ...patch }));
  }
});

test('device declarations accept supported targets and reject invalid lists', () => {
  for (const supportedDevices of [['desktop'], ['desktop', 'mobile']]) assert.doesNotThrow(() => validateManifest({ ...draft, supportedDevices }));
  for (const supportedDevices of [[], ['console'], ['desktop', 'desktop'], 'desktop']) assert.throws(() => validateManifest({ ...draft, supportedDevices }), /supportedDevices/);
});

test('legacy manifests without supportedDevices stay valid', () => {
  const { supportedDevices, ...legacy } = draft;
  assert.doesNotThrow(() => validateManifest(legacy));
});
