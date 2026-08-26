import { expect, test } from '@playwright/test';

test.describe('authentication flow', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('register -> dashboard -> logout -> login', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.getByTestId('register-first-name').fill('E2E');
    await page.getByTestId('register-last-name').fill('Tester');
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill('Sup3rSecure!');
    await page.getByTestId('register-submit').click();
    await expect(page).toHaveURL(/\//);
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible();

    await page.getByTestId('user-menu-trigger').click();
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/login');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill('Sup3rSecure!');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible();
  });

  test('invalid credentials show an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('nobody@example.com');
    await page.getByTestId('login-password').fill('WrongPassword123!');
    await page.getByTestId('login-submit').click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});
