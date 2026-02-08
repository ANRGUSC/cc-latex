import fs from 'node:fs';
import path from 'node:path';
import type { FileNode } from 'cc-latex-shared';

const IGNORED_EXTENSIONS = new Set([
  '.aux', '.log', '.synctex.gz', '.fls', '.fdb_latexmk', '.out', '.toc',
]);

const IGNORED_DIRS = new Set(['node_modules', '.git']);

function shouldIgnore(name: string, isDirectory: boolean): boolean {
  if (isDirectory) {
    return IGNORED_DIRS.has(name);
  }
  for (const ext of IGNORED_EXTENSIONS) {
    if (name.endsWith(ext)) return true;
  }
  return false;
}

export function buildFileTree(dir: string, rootDir?: string): FileNode {
  const root = rootDir ?? dir;
  const name = path.basename(dir);
  const relativePath = path.relative(root, dir).replace(/\\/g, '/');

  const node: FileNode = {
    name,
    path: relativePath || '.',
    type: 'directory',
    children: [],
  };

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return node;
  }

  const dirs: FileNode[] = [];
  const files: FileNode[] = [];

  for (const entry of entries) {
    if (shouldIgnore(entry.name, entry.isDirectory())) continue;

    if (entry.isDirectory()) {
      dirs.push(buildFileTree(path.join(dir, entry.name), root));
    } else if (entry.isFile()) {
      const filePath = path.relative(root, path.join(dir, entry.name)).replace(/\\/g, '/');
      files.push({
        name: entry.name,
        path: filePath,
        type: 'file',
      });
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  node.children = [...dirs, ...files];
  return node;
}

function resolveAndGuard(projectDir: string, relativePath: string): string {
  const resolved = path.resolve(projectDir, relativePath);
  const normalizedProject = path.resolve(projectDir);
  if (!resolved.startsWith(normalizedProject + path.sep) && resolved !== normalizedProject) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

export function readFile(projectDir: string, relativePath: string): string {
  const resolved = resolveAndGuard(projectDir, relativePath);
  if (!fs.existsSync(resolved)) {
    const err = new Error('File not found') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  }
  return fs.readFileSync(resolved, 'utf-8');
}

export function writeFile(projectDir: string, relativePath: string, content: string): void {
  const resolved = resolveAndGuard(projectDir, relativePath);
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolved, content, 'utf-8');
}
