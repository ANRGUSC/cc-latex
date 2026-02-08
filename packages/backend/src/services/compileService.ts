import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { CompilationResult, CompilationError } from 'cc-latex-shared';

// Find pdflatex - check PATH first, then known installation locations
function findPdflatex(): string {
  try {
    execSync('pdflatex --version', { stdio: 'ignore' });
    return 'pdflatex';
  } catch {
    // Check common MiKTeX installation paths on Windows
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe'),
      'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
      // macOS TeX Live
      '/usr/local/texlive/2024/bin/universal-darwin/pdflatex',
      '/Library/TeX/texbin/pdflatex',
      // Linux TeX Live
      '/usr/bin/pdflatex',
      '/usr/local/bin/pdflatex',
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return 'pdflatex'; // Fall back — will fail with a clear error
  }
}

const PDFLATEX = findPdflatex();

function parseErrors(log: string): CompilationError[] {
  const errors: CompilationError[] = [];
  const lines = log.split('\n');

  // Pattern: "./file.tex:123: error message" or "file.tex:123: error message"
  const fileLinePattern = /^(.+?):(\d+):\s*(.+)$/;
  // Pattern: "! LaTeX Error: message" or "! message"
  const latexErrorPattern = /^!\s*(?:LaTeX Error:\s*)?(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const fileLineMatch = line.match(fileLinePattern);
    if (fileLineMatch) {
      const file = fileLineMatch[1].replace(/^\.\//, '').replace(/\\/g, '/');
      const lineNum = parseInt(fileLineMatch[2], 10);
      const message = fileLineMatch[3].trim();
      errors.push({ file, line: lineNum, message });
      continue;
    }

    const latexMatch = line.match(latexErrorPattern);
    if (latexMatch && !line.startsWith('!!')) {
      const message = latexMatch[1].trim();
      // Check if next line has "l.<number>" for the line reference
      if (i + 1 < lines.length && lines[i + 1].startsWith('l.')) {
        const lMatch = lines[i + 1].match(/^l\.(\d+)\s*(.*)/);
        if (lMatch) {
          const lineNum = parseInt(lMatch[1], 10);
          const alreadyFound = errors.some(
            (e) => e.line === lineNum && e.message === message
          );
          if (!alreadyFound) {
            errors.push({ file: null, line: lineNum, message });
          }
          continue;
        }
      }
      const alreadyFound = errors.some((e) => e.message === message);
      if (!alreadyFound) {
        errors.push({ file: null, line: null, message });
      }
    }
  }

  return errors;
}

function parseWarnings(log: string): string[] {
  const warnings: string[] = [];
  const lines = log.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/LaTeX Warning:\s*(.+)/);
    if (match) {
      warnings.push(match[1].trim());
    }
  }

  return warnings;
}

// Auto-detect the main .tex file by looking for \documentclass
function detectMainFile(projectDir: string): string {
  const texFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.tex'));
  if (texFiles.length === 0) return 'main.tex';
  if (texFiles.length === 1) return texFiles[0];

  // Prefer the file containing \documentclass
  for (const file of texFiles) {
    try {
      const content = fs.readFileSync(path.join(projectDir, file), 'utf-8');
      if (/\\documentclass/m.test(content)) return file;
    } catch { /* skip unreadable files */ }
  }

  // Fall back to first .tex file
  return texFiles[0];
}

export function compileLaTeX(
  projectDir: string,
  mainFile?: string
): Promise<CompilationResult> {
  if (!mainFile) {
    mainFile = detectMainFile(projectDir);
  }
  return new Promise((resolve) => {
    const startTime = Date.now();
    const args = [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-file-line-error',
      mainFile,
    ];

    const proc = spawn(PDFLATEX, args, {
      cwd: projectDir,
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        pdfPath: null,
        log: `Failed to start pdflatex: ${err.message}`,
        errors: [{ line: null, file: null, message: `Failed to start pdflatex: ${err.message}` }],
        warnings: [],
        duration,
      });
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const fullLog = stdout + '\n' + stderr;
      const errors = parseErrors(fullLog);
      const warnings = parseWarnings(fullLog);

      const pdfName = mainFile.replace(/\.tex$/, '.pdf');
      const pdfFullPath = path.join(projectDir, pdfName);

      let pdfPath: string | null = null;
      if (fs.existsSync(pdfFullPath)) {
        pdfPath = pdfName;
      }

      resolve({
        success: code === 0,
        pdfPath,
        log: fullLog,
        errors,
        warnings,
        duration,
      });
    });
  });
}
