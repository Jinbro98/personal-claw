/**
 * file-io — JSON / JSONL file I/O utilities
 */

import { readFile, writeFile, mkdir, access, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Read and parse a JSON file.
 * Returns null if the file does not exist.
 */
export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    if (err instanceof SyntaxError) {
      console.error(`[personal-claw] Corrupted JSON at ${path}, returning null`);
      return null;
    }
    throw err;
  }
}

/**
 * Write data as JSON to a file, creating parent directories if needed.
 */
export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const json = JSON.stringify(data, null, 2) + '\n';
  await writeFile(path, json, 'utf-8');
}

/**
 * Append a single JSON-serialised line to a JSONL file.
 * Creates parent directories if needed.
 */
export async function appendJsonl(path: string, line: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const json = JSON.stringify(line) + '\n';
  await appendFile(path, json, 'utf-8');
}

/**
 * Check whether a file exists at the given path.
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
