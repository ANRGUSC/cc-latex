import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import type { GitRepoInfo, GitSyncStatus } from 'cc-latex-shared';
import type { WebSocketServer } from 'ws';

function run(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `Exit code ${code}`));
    });
    proc.on('error', reject);
  });
}

export function findGit(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function isGhAvailable(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function isGitRepo(projectDir: string): Promise<boolean> {
  try {
    await run('git', ['rev-parse', '--is-inside-work-tree'], projectDir);
    return true;
  } catch {
    return false;
  }
}

export async function getRepoInfo(projectDir: string): Promise<GitRepoInfo> {
  const info: GitRepoInfo = {
    initialized: false,
    remote: null,
    branch: null,
    syncStatus: 'unknown',
    aheadCount: 0,
    behindCount: 0,
    hasUncommittedChanges: false,
    changedFiles: [],
    lastSyncTime: null,
    error: null,
  };

  try {
    if (!(await isGitRepo(projectDir))) return info;
    info.initialized = true;

    // Branch
    try {
      info.branch = await run('git', ['branch', '--show-current'], projectDir);
    } catch { /* detached HEAD */ }

    // Remote
    try {
      info.remote = await run('git', ['remote', 'get-url', 'origin'], projectDir);
    } catch { /* no remote */ }

    // Status (uncommitted changes)
    try {
      const status = await run('git', ['status', '--porcelain'], projectDir);
      if (status) {
        info.hasUncommittedChanges = true;
        info.changedFiles = status.split('\n').map((l) => l.slice(3).trim()).filter(Boolean);
      }
    } catch { /* ignore */ }

    // Ahead/behind (only if remote exists)
    if (info.remote && info.branch) {
      try {
        await run('git', ['fetch', '--quiet'], projectDir);
        const revList = await run(
          'git',
          ['rev-list', '--left-right', '--count', `origin/${info.branch}...HEAD`],
          projectDir
        );
        const parts = revList.split(/\s+/);
        const behind = parseInt(parts[0], 10) || 0;
        const ahead = parseInt(parts[1], 10) || 0;
        info.behindCount = behind;
        info.aheadCount = ahead;

        if (ahead === 0 && behind === 0) info.syncStatus = 'clean';
        else if (ahead > 0 && behind === 0) info.syncStatus = 'ahead';
        else if (ahead === 0 && behind > 0) info.syncStatus = 'behind';
        else info.syncStatus = 'diverged';
      } catch {
        info.syncStatus = 'unknown';
      }
    }

    info.lastSyncTime = Date.now();
  } catch (err) {
    info.error = err instanceof Error ? err.message : String(err);
  }

  return info;
}

export async function cloneRepo(
  projectDir: string,
  owner: string,
  repo: string,
  branch?: string
): Promise<void> {
  // Initialize git repo and set remote
  const isRepo = await isGitRepo(projectDir);
  if (!isRepo) {
    await run('git', ['init'], projectDir);
  }

  // Add remote
  try {
    await run('git', ['remote', 'remove', 'origin'], projectDir);
  } catch { /* no existing remote */ }
  await run('git', ['remote', 'add', 'origin', `https://github.com/${owner}/${repo}.git`], projectDir);

  // Pull
  const branchArg = branch || 'main';
  try {
    await run('git', ['pull', 'origin', branchArg], projectDir);
  } catch {
    // Try 'master' as fallback
    await run('git', ['pull', 'origin', 'master'], projectDir);
  }
}

export async function commitAndPush(projectDir: string, message: string): Promise<void> {
  await run('git', ['add', '-A'], projectDir);
  await run('git', ['commit', '-m', message], projectDir);

  const info = await getRepoInfo(projectDir);
  if (info.remote && info.branch) {
    await run('git', ['push', 'origin', info.branch], projectDir);
  }
}

export async function pull(projectDir: string): Promise<void> {
  try {
    await run('git', ['pull'], projectDir);
  } catch (err) {
    // If no tracking branch, detect branch and pull explicitly from origin
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('no tracking information') || msg.includes('specify which branch')) {
      const branch = (await run('git', ['branch', '--show-current'], projectDir)) || 'main';
      await run('git', ['pull', 'origin', branch], projectDir);
      // Set upstream so future pulls work without specifying
      try {
        await run('git', ['branch', '--set-upstream-to', `origin/${branch}`, branch], projectDir);
      } catch { /* best effort */ }
    } else {
      throw err;
    }
  }
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startStatusPolling(
  projectDir: string,
  wss: WebSocketServer,
  intervalMs = 60000
): void {
  if (pollInterval) clearInterval(pollInterval);

  const broadcast = async () => {
    try {
      const info = await getRepoInfo(projectDir);
      const msg = JSON.stringify({ type: 'git:status-updated', data: info });
      for (const client of wss.clients) {
        if (client.readyState === 1) client.send(msg);
      }
    } catch { /* ignore polling errors */ }
  };

  // Initial check
  broadcast();
  pollInterval = setInterval(broadcast, intervalMs);
}
