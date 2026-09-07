import { expect, test } from '@playwright/test';

test('ステージ切替時にタイトルを重複表示しない', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { game } = await import('/src/main.ts');
    game.scene.start('game');
  });

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { game } = await import('/src/main.ts');
        return game.scene.isActive('game');
      }),
    )
    .toBe(true);

  const titles = await page.evaluate(async () => {
    const { game } = await import('/src/main.ts');
    const scene = game.scene.getScene('game');
    (scene as unknown as { startStage: (stage: number, progress: number) => void }).startStage(
      2,
      0,
    );
    return scene.children.list
      .map((child) => (child as { text?: unknown }).text)
      .filter((text): text is string => typeof text === 'string' && text.startsWith('STAGE '));
  });

  expect(titles).toEqual(['STAGE 2\n翠風渓谷']);
});
