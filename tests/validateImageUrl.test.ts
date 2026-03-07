import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageUrl } from '../lib/_validate';

test('validateImageUrl blocks localhost and non-https', () => {
  assert.equal(validateImageUrl('http://example.com/a.jpg'), 'Only HTTPS image URLs are allowed');
  assert.equal(validateImageUrl('https://localhost/a.jpg'), 'Image URL points to a blocked address');
});

test('validateImageUrl accepts https public host', () => {
  assert.equal(validateImageUrl('https://images.example.com/card.jpg'), null);
});
