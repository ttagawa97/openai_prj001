import { expect, test } from '@playwright/test';

test('ゲームオーバー結果からZキーでタイトルへ戻る', async ({ page }) => {
  await page.route('**/api/scores', async (route) => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const { game } = await import('/src/main.ts');
    game.scene.start('result', { score: 100, stage: 1, outcome: 'game_over' });
  });
  await page.waitForTimeout(500);
  await page.keyboard.press('z');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { game } = await import('/src/main.ts');
        return game.scene.isActive('menu');
      }),
    )
    .toBe(true);
});
