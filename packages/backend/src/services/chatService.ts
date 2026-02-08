import { spawn } from 'node:child_process';
import type { FileNode } from 'cc-latex-shared';

interface ChatContext {
  fileTree?: FileNode;
  currentFile?: { path: string; content: string };
  compilationErrors?: string[];
}

function buildContext(context?: ChatContext): string {
  let ctx = '';

  if (context?.fileTree) {
    ctx += `\nProject file tree:\n${formatFileTree(context.fileTree, 0)}`;
  }

  if (context?.currentFile) {
    ctx += `\nCurrently open file (${context.currentFile.path}):\n\`\`\`latex\n${context.currentFile.content}\n\`\`\``;
  }

  if (context?.compilationErrors && context.compilationErrors.length > 0) {
    ctx += `\nCurrent compilation errors:\n${context.compilationErrors.map((e) => `- ${e}`).join('\n')}`;
  }

  return ctx;
}

function formatFileTree(node: FileNode, depth: number): string {
  const indent = '  '.repeat(depth);
  let result = `${indent}${node.type === 'directory' ? '/' : ''}${node.name}\n`;
  if (node.children) {
    for (const child of node.children) {
      result += formatFileTree(child, depth + 1);
    }
  }
  return result;
}

const SYSTEM_INSTRUCTIONS = `You are a LaTeX editing assistant integrated into a web-based LaTeX IDE. You help users write, debug, and improve their LaTeX documents.

Your capabilities:
- Help write and edit LaTeX code
- Debug compilation errors
- Suggest improvements to document structure and formatting
- Explain LaTeX concepts and packages

When you want to suggest file edits, wrap them in special markers:

<<<EDIT filepath>>>
The complete new content for the file goes here.
<<<END_EDIT>>>

For example:
<<<EDIT main.tex>>>
\\documentclass{article}
\\begin{document}
Hello, world!
\\end{document}
<<<END_EDIT>>>

Always provide clear explanations alongside your edits. Be concise but thorough.`;

export async function* streamChat(
  userMessage: string,
  context?: ChatContext,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncGenerator<string, void, unknown> {
  // Build the full message to send via stdin
  const contextStr = buildContext(context);

  let fullMessage = `[System Instructions]\n${SYSTEM_INSTRUCTIONS}\n`;
  if (contextStr) {
    fullMessage += `\n[Context]${contextStr}\n`;
  }
  if (history && history.length > 0) {
    fullMessage += '\n[Conversation History]\n';
    for (const msg of history) {
      fullMessage += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    }
  }
  fullMessage += `\n[Current Request]\n${userMessage}`;

  // Spawn claude CLI — uses the user's Max subscription
  // Pass message via stdin with -p (print mode, non-interactive)
  const proc = spawn('claude', ['-p'], {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Write the full message to stdin
  proc.stdin.write(fullMessage);
  proc.stdin.end();

  // Collect stderr in background
  let stderr = '';
  proc.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  let hasOutput = false;

  // Stream stdout chunks as they arrive
  for await (const chunk of proc.stdout) {
    hasOutput = true;
    yield chunk.toString();
  }

  // Wait for exit
  const exitCode = await new Promise<number | null>((resolve) => {
    proc.on('close', resolve);
  });

  if (!hasOutput && exitCode !== 0) {
    yield `Error running claude CLI (exit code ${exitCode}): ${stderr || 'Make sure "claude" is installed and you are logged in with your Max subscription.'}`;
  }
}
