import assert from 'node:assert/strict';
import { validateImageUrl } from '../lib/_validate';

export function runValidateImageUrlTests(): void {
  assert.equal(validateImageUrl('http://example.com/a.jpg'), 'Only HTTPS image URLs are allowed');
  assert.equal(validateImageUrl('https://localhost/a.jpg'), 'Image URL points to a blocked address');
  assert.equal(validateImageUrl('https://images.example.com/card.jpg'), null);
}
