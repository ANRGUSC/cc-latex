import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync, mkdirSync, readdirSync, cpSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const projectDir = args[0]
  ? path.resolve(args[0])
  : path.resolve(process.cwd(), 'project');

console.log('=== cc-latex: Web-Based LaTeX IDE ===\n');

// 1. Check pdflatex - also check known MiKTeX install locations
let pdflatexFound = false;
try {
  execSync('pdflatex --version', { stdio: 'ignore' });
  pdflatexFound = true;
  console.log('[OK] pdflatex found on PATH');
} catch {
  // Check common MiKTeX install location
  const miktexBin = path.join(
    process.env.LOCALAPPDATA || '',
    'Programs', 'MiKTeX', 'miktex', 'bin', 'x64'
  );
  if (existsSync(path.join(miktexBin, 'pdflatex.exe'))) {
    pdflatexFound = true;
    console.log(`[OK] pdflatex found at ${miktexBin} (not on PATH but backend will find it)`);
  }
}

if (!pdflatexFound) {
  console.log('[!!] pdflatex not found.');
  if (process.platform === 'win32') {
    console.log('[..] Attempting to install MiKTeX via winget...');
    try {
      execSync(
        'winget install MiKTeX.MiKTeX --accept-package-agreements --accept-source-agreements',
        { stdio: 'inherit' }
      );
      console.log('[OK] MiKTeX installed.');
    } catch {
      console.error('[!!] Could not install MiKTeX automatically.');
      console.error('     Install manually: winget install MiKTeX.MiKTeX');
      console.error('     Or download from https://miktex.org/download');
    }
  } else if (process.platform === 'darwin') {
    console.error('     Install a TeX distribution to compile LaTeX:');
    console.error('       brew install --cask mactex');
    console.error('     Or download from https://tug.org/mactex/');
  } else {
    console.error('     Install a TeX distribution to compile LaTeX:');
    console.error('       sudo apt install texlive-full    (Debian/Ubuntu)');
    console.error('       sudo dnf install texlive-scheme-full  (Fedora)');
    console.error('       sudo pacman -S texlive           (Arch)');
  }
}

// 2. Check claude CLI
try {
  execSync('claude --version', { stdio: 'ignore' });
  console.log('[OK] claude CLI found (using Max subscription for AI chat)');
} catch {
  console.log('[!!] claude CLI not found. Use API key mode in Settings, or install from: https://claude.ai/claude-code');
}

// 2b. Check git
try {
  execSync('git --version', { stdio: 'ignore' });
  console.log('[OK] git found');
} catch {
  console.log('[..] git not found — GitHub sync will be unavailable');
}

// 2c. Check gh CLI
try {
  execSync('gh --version', { stdio: 'ignore' });
  console.log('[OK] gh CLI found');
} catch {
  console.log('[..] gh CLI not found — GitHub operations will use HTTPS fallback');
}

// 3. Create project directory if needed
if (!existsSync(projectDir)) {
  mkdirSync(projectDir, { recursive: true });
  console.log(`[OK] Created project directory: ${projectDir}`);
}

// 4. Seed from demo/ if no .tex files exist
const hasTexFiles = existsSync(projectDir) &&
  readdirSync(projectDir).some(f => f.endsWith('.tex'));

if (!hasTexFiles) {
  const demoDir = path.join(__dirname, 'demo');
  cpSync(demoDir, projectDir, { recursive: true });
  console.log(`[OK] Seeded demo project in ${projectDir}`);
}

console.log(`\n[..] Project directory: ${projectDir}`);
console.log('[..] Starting backend and frontend...\n');

// 5. Launch backend
const backendEnv = { ...process.env, PROJECT_DIR: projectDir };
const backend = spawn('npx', ['tsx', 'packages/backend/src/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: backendEnv,
  cwd: process.cwd(),
});

// 6. Launch frontend
const frontend = spawn('npm', ['run', 'dev', '-w', 'packages/frontend'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

// 7. Open browser after delay
setTimeout(() => {
  const url = 'http://localhost:5210';
  console.log(`\n[OK] Opening browser at ${url}`);
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { shell: true });
    } else if (process.platform === 'darwin') {
      execSync(`open "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch {
    console.log(`[!!] Could not open browser. Navigate to ${url} manually.`);
  }
}, 5000);

// 8. Handle shutdown
const children: ChildProcess[] = [backend, frontend];

function cleanup() {
  console.log('\n[..] Shutting down...');
  for (const child of children) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      // Process may already be dead
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// If either process exits, log it
backend.on('close', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[!!] Backend exited with code ${code}`);
  }
});

frontend.on('close', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[!!] Frontend exited with code ${code}`);
  }
});
