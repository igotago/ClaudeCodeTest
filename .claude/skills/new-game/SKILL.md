---
name: new-game
description: Scaffold a new standalone HTML game file following this project's conventions. Invoke with /new-game <game-name>.
---

The user wants to create a new browser game. Use `$ARGUMENTS` as the game name/concept.

Follow these conventions from the existing codebase:

**File:** Create `<game-name>.html` at the project root.

**Structure:**
```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Game Name]</title>
  <style>
    /* Dark neon theme: bg #1a1a2e, accent #e94560, secondary #aaddff */
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script>
    'use strict';
    // gameState: 'menu' | 'playing' | 'gameover'
    // requestAnimationFrame loop
    // Input wired to window event listeners
  </script>
</body>
</html>
```

**Patterns to follow:**
- `gameState` enum: `menu → playing → gameover`
- `requestAnimationFrame` for the main loop
- Dark background `#1a1a2e`, accent colors `#e94560` and `#aaddff`
- Vanilla JS only — no external libraries
- `'use strict'` at top of every script block
- Class-based entities (Player, Enemy, etc.) for games with multiple actors
- Canvas 2D context for all rendering

After creating the file, commit and push it using the git workflow in CLAUDE.md.
