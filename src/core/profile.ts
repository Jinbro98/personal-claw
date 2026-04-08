/**
 * profile — Profile CRUD, load / save, dimension helpers
 */

import { join } from 'node:path';
import type {
  DimensionName,
  DimensionMap,
  DimensionValue,
  Profile,
  PhaseType,
  ProfileStats,
  BanditState,
  PhaseState,
  TopicAwareProfile,
} from '../types.js';
import { PROFILE_VERSION, DATA_FILES, DIMENSIONS } from '../utils/constants.js';
import { readJson, writeJson } from '../utils/file-io.js';

// ─── Default builders ───

/** Build a DimensionMap with every dimension set to its default value */
function defaultDimensions(): DimensionMap {
  const now = new Date().toISOString();
  const map = {} as DimensionMap;
  for (const dim of DIMENSIONS) {
    map[dim.name] = {
      value: dim.default_value,
      confidence: 0,
      last_updated: now,
    };
  }
  return map;
}

/** Empty bandit state (populated lazily when phase transitions to 'bandit') */
function defaultBanditState(): BanditState {
  const state = {} as BanditState;
  for (const dim of DIMENSIONS) {
    state[dim.name] = {};
  }
  return state;
}

/** Default phase state */
function defaultPhaseState(): PhaseState {
  return {
    current: 'pattern',
    total_messages: 0,
    total_sessions: 0,
    dimensions_above_threshold: 0,
    transition_history: [],
  };
}

/** Default statistics */
function defaultStatistics(): ProfileStats {
  return {
    total_sessions: 0,
    total_messages: 0,
    positive_signals: 0,
    negative_signals: 0,
    explicit_directives: 0,
    last_active: new Date().toISOString(),
  };
}

// ─── Public API ───

/**
 * Create a brand-new Profile with sensible defaults.
 */
export function createProfile(): Profile {
  const now = new Date().toISOString();
  return {
    version: PROFILE_VERSION,
    phase: 'pattern' as PhaseType,
    created_at: now,
    updated_at: now,
    dimensions: defaultDimensions(),
    bandit_arms: defaultBanditState(),
    phase_state: defaultPhaseState(),
    statistics: defaultStatistics(),
  };
}

/**
 * Load profile from `dataDir`. If the file is missing a new profile is
 * created (and saved) before being returned.
 */
export async function loadProfile(dataDir: string): Promise<Profile> {
  const filePath = join(dataDir, DATA_FILES.profile);
  const existing = await readJson<Profile>(filePath);

  if (existing) {
    return existing;
  }

  const profile = createProfile();
  await saveProfile(dataDir, profile);
  return profile;
}

/**
 * Persist a profile to `dataDir/profile.json`.
 */
export async function saveProfile(dataDir: string, profile: Profile): Promise<void> {
  const filePath = join(dataDir, DATA_FILES.profile);
  const updated: Profile = {
    ...profile,
    updated_at: new Date().toISOString(),
  };
  await writeJson(filePath, updated);
}

/**
 * Return a new Profile with the named dimension updated.
 * Immutability is preserved via shallow copies.
 */
export function updateDimension(
  profile: Profile,
  name: DimensionName,
  value: string,
  confidence: number,
): Profile {
  const now = new Date().toISOString();

  const dimValue: DimensionValue = {
    value,
    confidence,
    last_updated: now,
  };

  return {
    ...profile,
    updated_at: now,
    dimensions: {
      ...profile.dimensions,
      [name]: dimValue,
    },
  };
}

/**
 * Get the current value string for a named dimension.
 */
export function getDimensionValue(profile: Profile, name: DimensionName): string {
  return profile.dimensions[name]?.value ?? '';
}

/**
 * Increment a numeric field in `profile.statistics` by 1.
 * Returns a new Profile (immutable).
 *
 * Supported fields: total_sessions, total_messages,
 *   positive_signals, negative_signals, explicit_directives
 */
export function incrementStats(
  profile: Profile,
  field: keyof ProfileStats,
): Profile {
  // Exclude non-numeric fields from increment
  if (field === 'last_active') {
    return profile;
  }

  const current = profile.statistics[field] as number;

  return {
    ...profile,
    updated_at: new Date().toISOString(),
    statistics: {
      ...profile.statistics,
      [field]: current + 1,
      last_active: new Date().toISOString(),
    },
  };
}

// ─── Topic-Aware Profile helpers ───

/**
 * Convert a Profile to a TopicAwareProfile with empty topic maps.
 */
export function toTopicAwareProfile(profile: Profile): TopicAwareProfile {
  return {
    ...profile,
    topic_profiles: {},
    topic_statistics: {},
  };
}

/**
 * Get the effective dimension value for a given topic.
 * Returns the topic-specific value if it exists and confidence > 0.5,
 * otherwise falls back to the global dimension value.
 */
export function getTopicDimensionValue(
  profile: TopicAwareProfile,
  topic: string,
  dimension: DimensionName,
): string {
  const topicDims = profile.topic_profiles[topic];
  if (topicDims) {
    const topicVal = topicDims[dimension];
    if (topicVal && topicVal.confidence > 0.5) {
      return topicVal.value;
    }
  }
  return profile.dimensions[dimension]?.value ?? '';
}

/**
 * Update a topic-specific dimension value.
 * Returns a new TopicAwareProfile (immutable).
 */
export function updateTopicDimension(
  profile: TopicAwareProfile,
  topic: string,
  dimension: DimensionName,
  value: string,
  confidence: number,
): TopicAwareProfile {
  const now = new Date().toISOString();

  const dimValue: DimensionValue = {
    value,
    confidence,
    last_updated: now,
  };

  const existingTopicDims = profile.topic_profiles[topic] ?? {};

  const topicStats = profile.topic_statistics[topic] ?? { interactions: 0, last_used: now };

  return {
    ...profile,
    updated_at: now,
    topic_profiles: {
      ...profile.topic_profiles,
      [topic]: {
        ...existingTopicDims,
        [dimension]: dimValue,
      },
    },
    topic_statistics: {
      ...profile.topic_statistics,
      [topic]: {
        interactions: topicStats.interactions + 1,
        last_used: now,
      },
    },
  };
}
