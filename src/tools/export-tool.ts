/**
 * export-tool — Profile export as JSON
 */

import type { Profile } from '../types.js';

// ─── Public API ───

/**
 * Export a profile as a formatted JSON string.
 */
export function exportProfile(profile: Profile): string {
  return JSON.stringify(profile, null, 2);
}
