# Development Notes — cc-latex

## Lessons Learned

### Express 5 Wildcard Routes
- Express 5 uses `path-to-regexp` v8 which completely changed route syntax
- `/:path+` (Express 4) → `/*path` (Express 5)
- **Critical**: Wildcard params in Express 5 return **arrays**, not strings. Must `Array.isArray()` check and `.join('/')` to reconstruct the path.

### microtype Package + MiKTeX
- `\usepackage{microtype}` causes a fatal "auto expansion is only possible with scalable fonts" error with MiKTeX's default Computer Modern fonts
- Use `\usepackage{lmodern}` instead — Latin Modern fonts are scalable and look better
- Never use `microtype` without scalable fonts in demo/template documents

### MiKTeX on Windows
- MiKTeX installs to `%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\` but does NOT automatically add itself to PATH
- Must check known install locations as fallback when `pdflatex` isn't on PATH
- `winget install MiKTeX.MiKTeX` may report "already installed" without fixing PATH

### Port Conflicts
- Default ports (3000, 5173) are frequently busy on dev machines
- Use less common ports (3100, 5210) to avoid collisions
- Vite's `strictPort: true` makes it fail instead of auto-incrementing — avoid unless you need a fixed port

### Git Bash on Windows
- Git Bash mangles `/` prefixed args: `/PID` becomes `C:/Users/.../PID`
- Use `powershell -File -` with heredoc or `cmd.exe /c` for Windows-specific commands
- Environment variable `$_` in PowerShell gets mangled by Git Bash — use heredoc/file approach

### spawn() on Windows
- Always use `{ shell: true }` for spawning commands on Windows, otherwise PATH isn't searched
- Node.js v24+ warns about DEP0190 (args with shell: true) — cosmetic, not blocking

### Claude CLI for AI Chat
- Uses `claude -p` (print mode) instead of the Anthropic SDK
- Piggybacks on the user's Max subscription — no API key needed
- Pass message via stdin (not as argument) to avoid shell escaping issues with long prompts
- System instructions, context, and conversation history all bundled into the stdin payload

### Claude CLI Nested Session Detection
- When cc-latex is launched from within a Claude Code session (e.g. via `npx tsx start.ts`), the `CLAUDECODE` environment variable is inherited by child processes
- This causes the spawned `claude -p` CLI to refuse to run with: "Claude Code cannot be launched inside another Claude Code session"
- **Fix**: Delete `CLAUDECODE` from the env before spawning — both in `start.ts` (backend env) and `chatService.ts` (CLI spawn env)
- `delete env.CLAUDECODE` is safe; it's only a session detection flag, not needed by the CLI itself

### CSS Variables for Theming
- Never hardcode `rgba(137, 180, 250, ...)` or similar colors — always use CSS variables like `var(--accent-bg)`, `var(--accent-border)`
- Both themes (dark/light) define the same variable names with different values in `:root` and `[data-theme="light"]`
- CodeMirror needs its own theme compartment since it doesn't inherit CSS variables for syntax highlighting — use `Compartment` and reconfigure on theme change

### CodeMirror Theme Compartment Pattern
- Create a `Compartment` ref for any extension that needs runtime swapping (vim, theme)
- On state change, dispatch `effects: compartment.reconfigure(newExtension)` — avoids full editor teardown
- Read initial state from `useAppStore.getState()` at editor creation time to avoid stale closure values

## Architecture

- Monorepo with npm workspaces: `packages/shared`, `packages/backend`, `packages/frontend`
- Backend: Express 5 + ws + chokidar + claude CLI (for AI chat)
- Frontend: React 18 + Vite + CodeMirror 6 (vim) + pdf.js + zustand
- Ports: Backend 3100, Frontend 5210
- Start: `npx tsx start.ts [project-dir]`
