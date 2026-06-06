'use strict';
const { test, expect } = require('@playwright/test');

test.describe('Tic Tac Toe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tictactoe.html');
  });

  test('loads with title and empty board', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Tic Tac Toe');
    await expect(page.locator('.cell')).toHaveCount(9);
    await expect(page.locator('#status')).toHaveText("X's turn");
  });

  test('clicking a cell marks X and switches to O', async ({ page }) => {
    const cell = page.locator('.cell').first();
    await cell.click();
    await expect(cell).toHaveText('X');
    await expect(page.locator('#status')).toHaveText("O's turn");
  });

  test('X wins top row', async ({ page }) => {
    const cells = page.locator('.cell');
    await cells.nth(0).click(); // X
    await cells.nth(3).click(); // O
    await cells.nth(1).click(); // X
    await cells.nth(4).click(); // O
    await cells.nth(2).click(); // X wins top row
    await expect(page.locator('#status')).toHaveText('X wins!');
    await expect(page.locator('#score-x')).toHaveText('1');
  });

  test('detects a tie', async ({ page }) => {
    // Board: X O X / O X X / O X O — verified no winning line
    const cells = page.locator('.cell');
    await cells.nth(0).click(); // X
    await cells.nth(1).click(); // O
    await cells.nth(2).click(); // X
    await cells.nth(3).click(); // O
    await cells.nth(4).click(); // X
    await cells.nth(6).click(); // O
    await cells.nth(5).click(); // X
    await cells.nth(8).click(); // O
    await cells.nth(7).click(); // X — board full, no winner
    await expect(page.locator('#status')).toHaveText("It's a tie!");
    await expect(page.locator('#score-tie')).toHaveText('1');
  });

  test('restart clears the board and keeps score', async ({ page }) => {
    const cells = page.locator('.cell');
    await cells.nth(0).click(); // X
    await cells.nth(3).click(); // O
    await cells.nth(1).click(); // X
    await cells.nth(4).click(); // O
    await cells.nth(2).click(); // X wins
    await page.locator('#restart').click();
    await expect(cells.nth(0)).toHaveText('');
    await expect(page.locator('#status')).toHaveText("X's turn");
    await expect(page.locator('#score-x')).toHaveText('1'); // score persists
  });

  test('cannot click an already-taken cell', async ({ page }) => {
    const cell = page.locator('.cell').first();
    await cell.click(); // X marks it
    await cell.click(); // should be ignored
    await expect(page.locator('#status')).toHaveText("O's turn"); // still O's turn
  });
});
