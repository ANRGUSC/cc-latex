@echo off
REM cclatex — launch the cc-latex web-based LaTeX IDE
REM Usage: cclatex [project-directory]
REM
REM Prerequisites: Node.js 18+, npm
REM Optional: pdflatex (MiKTeX/TeX Live), claude CLI, git, gh

cd /d "%~dp0"

if not exist "node_modules" (
    echo [..] Installing dependencies...
    call npm install
)

npx tsx start.ts %*
