import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scratch = mkdtempSync(join(tmpdir(), 'glb-web-build-check-'));
const root = fileURLToPath(new URL('..', import.meta.url));
try
{
  for (const [task, args] of [
    ['build_app.mjs', []],
    ['copy_folder.mjs', ['missing', 'output']],
    ['zip_app.mjs', []]
  ])
  {
    const result = spawnSync(process.execPath, [join(root, 'tasks', task), ...args], {
      cwd: scratch, env: { ...process.env, PATH: scratch }, encoding: 'utf8'
    });
    assert.equal(result.status, 1, `${task} must fail when its input or command is unavailable`);
  }
}
finally
{
  rmSync(scratch, { recursive: true, force: true });
}

console.log('Web build task failure checks passed.');
