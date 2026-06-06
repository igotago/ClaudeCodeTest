# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static HTML/JS browser games — no build step, no package manager, no bundler. Each game is a single self-contained `.html` file. Open directly in a browser to run.

## Code style

- 2-space indentation throughout
- Vanilla JavaScript only — no frameworks, no CDN dependencies
- Always use `'use strict'` at the top of every `<script>` block
- ES6+ features are fine (classes, arrow functions, template literals, destructuring)
- Dark neon color palette: background `#1a1a2e`, primary accent `#e94560` (red), secondary `#aaddff` (cyan)

## Game architecture conventions

- `gameState` enum controls flow: `menu → playing → gameover`
- Main loop via `requestAnimationFrame`; keep all update/draw logic inside it
- Canvas coordinate system: use a world-space (large map) + camera offset (`cam.x`, `cam.y`) for scrolling games
- Collision detection: distance-based circle checks (`Math.hypot`)
- Input: wire directly to `window` event listeners (`keydown`, `mousemove`, `click`)

## Linting

```
npm run lint
```

Lints all HTML files via ESLint v9 + `eslint-plugin-html` (parses `<script>` blocks). Run after any JS changes. Config: `eslint.config.mjs`.

## Git workflow

After every meaningful change: commit with a descriptive message and push to `origin/master`.

```
git add <files>
git commit -m "description of change"
git push
```

Always include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` in commit messages.

Remote: https://github.com/igotago/ClaudeCodeTest
