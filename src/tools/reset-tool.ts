/**
 * reset-tool — Profile reset (initialize new profile)
 */

import { join } from 'node:path';
import type { Profile } from '../types.js';
import { DATA_FILES } from '../utils/constants.js';
import { createProfile, saveProfile } from '../core/profile.js';

// ─── Public API ───

/**
 * Reset the profile by creating a fresh one and saving it to dataDir.
 * Returns the new profile.
 */
export async function resetProfile(dataDir: string): Promise<Profile> {
  const profile = createProfile();
  await saveProfile(dataDir, profile);
  return profile;
}
