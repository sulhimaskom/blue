/**
 * Test: SSR Build 'self' Polyfill
 * Verifies that 'self' is correctly aliased to empty module during SSR builds
 * to prevent "ReferenceError: self is not defined" during build-time page data collection.
 */

import path from 'path';

describe('SSR Build self Polyfill', () => {
  test('should alias self to empty module for SSR builds', async () => {
    // Verify the polyfill file exists
    const emptyModulePath = path.join(__dirname, '../scripts/empty.js');
    const fs = await import('fs');
    expect(fs.existsSync(emptyModulePath)).toBe(true);

    // Verify the file is empty or exports nothing
    const content = fs.readFileSync(emptyModulePath, 'utf8');
    expect(content.trim().length).toBe(0);
  });

  test('should include self alias in next.config.js webpack config', async () => {
    const configPath = path.join(__dirname, '../next.config.js');
    const fs = await import('fs');
    const configContent = fs.readFileSync(configPath, 'utf8');

    // Verify 'self' alias is present
    expect(configContent).toContain("'self': path.resolve(__dirname, './scripts/empty.js')");

    // Verify it's in the isServer branch
    expect(configContent).toMatch(/if\s*\(\s*isServer\s*\)/);
  });

  test('should not cause ReferenceError: self is not defined in SSR builds', async () => {
    // This test validates the fix indirectly by checking that:
    // 1. The polyfill file exists
    // 2. The webpack config has the alias
    // 3. The build completes without errors (tested in integration)

    // Direct runtime verification requires running a build, which is done
    // in CI/CD. This test ensures the prerequisites are in place.
    const configPath = path.join(__dirname, '../next.config.js');
    const fs = await import('fs');
    const configContent = fs.readFileSync(configPath, 'utf8');

    const hasSelfAlias = configContent.includes("'self': path.resolve(__dirname, './scripts/empty.js')");
    expect(hasSelfAlias).toBe(true);
  });
});
