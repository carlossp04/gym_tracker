import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { deriveKey, encryptRecord } from '../../src/lib/vaultCrypto.js';

const fixture = await readFile(new URL('../fixtures/vault-v1.json', import.meta.url), 'utf8');
const storageKey = 'gym-tracker.encrypted-vault.v1';

async function unlock(page, password) {
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Entrar a mis entrenamientos' }).click();
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
}

test('immediate lock retains a set edit and finishing survives reopening', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(([key, record]) => localStorage.setItem(key, record), [storageKey, fixture]);
  await page.reload();
  await unlock(page, 'fixture-password');
  await page.getByRole('button', { name: 'Repetir hoy' }).click();
  const weight = page.getByLabel('Peso serie 1 de Sentadilla');
  await weight.fill('72.5');
  await page.getByRole('button', { name: 'Bloquear' }).click();
  await unlock(page, 'fixture-password');
  await page.getByRole('button', { name: 'Continuar entrenamiento' }).click();
  await expect(weight).toHaveValue('72.5');
  await page.getByLabel('Marcar serie 1 de Sentadilla').click();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar y finalizar' }).click();
  await expect(page.getByText('Entrenamiento guardado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bloquear' }).click();
  await unlock(page, 'fixture-password');
  await expect(page.getByRole('button', { name: 'Continuar entrenamiento' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Repetir hoy' }).click();
  await expect(weight).toHaveValue('72.5');
  await expect(page.getByLabel(/Peso serie/)).toHaveCount(1);
});

test('restore verifies the backup on the existing password screen before committing', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=password]').fill('original-password');
  await page.getByRole('button', { name: 'Crear y empezar' }).click();
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
  const original = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(fixture),
  });
  await page.locator('input[type=password]').fill('wrong-password');
  await page.getByRole('button', { name: 'Entrar a mis entrenamientos' }).click();
  await expect(page.getByText(/No se pudo restaurar la copia/)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(original);
  await unlock(page, 'fixture-password');
  await expect(page.getByRole('button', { name: 'Repetir hoy' })).toBeVisible();
});

for (const useWebLocks of [true, false]) {
  test(`editing from two tabs reports a conflict (${useWebLocks ? 'Web Locks' : 'IndexedDB fallback'})`, async ({ page, context }) => {
    if (!useWebLocks) {
      await context.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
    }
    await page.goto('/');
    await page.evaluate(([key, record]) => localStorage.setItem(key, record), [storageKey, fixture]);
    const other = await context.newPage();
    await Promise.all([page.reload(), other.goto('/')]);
    await Promise.all([page, other].map(async (tab, index) => {
      await unlock(tab, 'fixture-password');
      await tab.getByRole('button', { name: 'Crear perfil' }).click();
      await tab.getByLabel('Nombre del perfil').fill(`Perfil ${index}`);
    }));
    await Promise.all([page, other].map((tab) => tab.getByRole('button', { name: 'Guardar perfil' }).click()));
    const conflict = (tab) => tab.getByRole('alert').filter({ hasText: 'Hay dos versiones' });
    await expect.poll(async () => (await conflict(page).count()) + (await conflict(other).count())).toBe(1);
    const records = await page.evaluate((key) => ({
      committed: JSON.parse(localStorage.getItem(key)),
      recovery: JSON.parse(localStorage.getItem(key + '.pending:local:entrenamientos')),
    }), storageKey);
    expect(records.committed.revision).toBe(2);
    expect(records.recovery.baseRevision).toBe(1);
    expect(records.recovery.ciphertext).not.toBe(records.committed.ciphertext);
  });
}

test('unlocking recovers the original workout date while keeping other saved corrections', async ({ page }) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey('fixture-password', salt);
  const record = await encryptRecord(key, salt, {
    trainingText: '[04/10/26, 12:00] Ana: Sentadilla\n3 x 8 x 60',
    entryEdits: { 'ana__04/10/26__sentadilla__0': { date: 'Monday', weight: 72.5 } },
  }, 2);
  await page.goto('/');
  await page.evaluate(([name, value]) => localStorage.setItem(name, value), [storageKey, JSON.stringify(record)]);
  await page.reload();
  await unlock(page, 'fixture-password');
  await expect(page.getByText('Último entrenamiento · 04/10/26')).toBeVisible();
  await page.getByRole('button', { name: 'Repetir hoy' }).click();
  await expect(page.getByLabel('Peso serie 1 de Sentadilla')).toHaveValue('72.5');
});
