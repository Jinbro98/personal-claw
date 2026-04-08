/**
 * agents-md — AGENTS.md auto-generation / update
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Profile, DimensionName } from '../types.js';
import { DIMENSIONS } from '../utils/constants.js';

const SECTION_START = '## Personal Preferences (auto-learned by personal-claw)';
const SECTION_END = '<!-- end personal-claw preferences -->';

// ─── Public API ───

/**
 * Generate the AGENTS.md personalization section content.
 */
export function generateAgentsMdSection(profile: Profile): string {
  const lines: string[] = [];

  lines.push(SECTION_START);
  lines.push('');
  lines.push('personal-claw가 대화를 통해 자동으로 학습한 선호 설정입니다.');
  lines.push('');

  for (const dimConfig of DIMENSIONS) {
    const dimName = dimConfig.name;
    const dimValue = profile.dimensions[dimName];
    if (!dimValue) continue;

    const confidencePct = Math.round(dimValue.confidence * 100);
    const confidenceBar = confidencePct >= 70 ? '✓' : confidencePct >= 50 ? '~' : '?';

    lines.push(`- **${dimConfig.description}**: \`${dimValue.value}\` (${confidenceBar} ${confidencePct}%)`);
  }

  lines.push('');
  lines.push('> Tell me "shorter please" or "more detail" to adjust anytime.');
  lines.push('> "짧게 해줘" 또는 "자세히 설명해" 라고 말하면 바로 적용됩니다.');
  lines.push('');
  lines.push(SECTION_END);

  return lines.join('\n');
}

/**
 * Generate a complete AGENTS.md with the personalization section.
 */
export function generateAgentsMd(profile: Profile): string {
  const section = generateAgentsMdSection(profile);

  return [
    '# AGENTS.md',
    '',
    'This file provides instructions for AI agents working in this workspace.',
    '',
    section,
    '',
  ].join('\n');
}

/**
 * Read an existing AGENTS.md, replace or append the personalization section,
 * then write it back. Preserves all other content.
 */
export async function updateAgentsMd(workspaceDir: string, profile: Profile): Promise<void> {
  const filePath = join(workspaceDir, 'AGENTS.md');
  const newSection = generateAgentsMdSection(profile);

  let content = '';

  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
    // File doesn't exist — create fresh
    const fresh = generateAgentsMd(profile);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, fresh, 'utf-8');
    return;
  }

  // Check if personalization section already exists
  const startIdx = content.indexOf(SECTION_START);
  const endIdx = content.indexOf(SECTION_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing section (include the END marker line length)
    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + SECTION_END.length);
    content = before + newSection + after;
  } else {
    // Append section at the end
    content = content.trimEnd() + '\n\n' + newSection + '\n';
  }

  await writeFile(filePath, content, 'utf-8');
}
