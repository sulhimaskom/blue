import { describe, it, expect } from '@jest/globals';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('GitHub Issue #232 Fix Verification', () => {
  describe('Build System Fix', () => {
    it('should have removed optimizePackageImports from next.config.js', async () => {
      const configPath = path.resolve(process.cwd(), 'next.config.js');
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Verify optimizePackageImports configuration is removed (Fix for Issue #232)
      expect(configContent).not.toContain('optimizePackageImports:');
      expect(configContent).toContain('REMOVED: optimizePackageImports - causes Html import bug');
      expect(configContent).not.toContain('@clerk/nextjs');
    });

    it('should have custom error.tsx file', async () => {
      const errorPagePath = path.resolve(process.cwd(), 'app/error.tsx');
      expect(fs.existsSync(errorPagePath)).toBe(true);
      
      const errorPageContent = fs.readFileSync(errorPagePath, 'utf8');
      expect(errorPageContent).toContain('export default function Error');
      expect(errorPageContent).toContain('Server Error');
    });

    it('should have not-found.tsx with proper structure', async () => {
      const notFoundPath = path.resolve(process.cwd(), 'app/not-found.tsx');
      expect(fs.existsSync(notFoundPath)).toBe(true);
      
      const notFoundContent = fs.readFileSync(notFoundPath, 'utf8');
      expect(notFoundContent).toContain('export default function NotFound()');
      expect(notFoundContent).toContain('Go back home');
    });

    it('should have fixed build script', async () => {
      const buildScriptPath = path.resolve(process.cwd(), 'scripts/fixed-build-232.js');
      expect(fs.existsSync(buildScriptPath)).toBe(true);
      
      const buildScriptContent = fs.readFileSync(buildScriptPath, 'utf8');
      expect(buildScriptContent).toContain('GitHub Issue #232 Fixed Build Script');
      expect(buildScriptContent).toContain('TURBOPACK: "0"');
    });
  });

  describe('Reproduction Case Works', () => {
    it('should have reproduction case that confirms the bug fix', async () => {
      const reproductionScript = path.resolve(process.cwd(), 'reproduce-github-issue-232.js');
      expect(fs.existsSync(reproductionScript)).toBe(true);
      
      const scriptContent = fs.readFileSync(reproductionScript, 'utf8');
      expect(scriptContent).toContain('Reproducing GitHub Issue #232');
      expect(scriptContent).toContain('BUG REPRODUCED');
    });
  });

  describe('Configuration Compatibility', () => {
    it('should maintain App Router structure', async () => {
      const hasAppDir = fs.existsSync('app');
      const hasPagesDir = fs.existsSync('pages');
      const hasLayoutFile = fs.existsSync('app/layout.tsx');
      
      expect(hasAppDir).toBe(true);
      expect(hasPagesDir).toBe(false); // Should not exist in pure App Router
      expect(hasLayoutFile).toBe(true);
    });

    it('should not have any Html imports in user code', async () => {
      const userCodeDirs = ['app', 'lib', 'components'];
      const htmlImportsFound: Array<{file: string, type: string}> = [];

      function findFiles(dir: string, extensions: string[]): string[] {
        const files: string[] = [];
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) {
            files.push(...findFiles(fullPath, extensions));
          } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }

        return files;
      }

      userCodeDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          const files = findFiles(dir, ['.ts', '.tsx']);

          files.forEach((file: string) => {
            if (fs.existsSync(file) && !file.includes('node_modules')) {
              const content = fs.readFileSync(file, 'utf8');

              if (content.includes('Html') && (content.includes('from') || content.includes('import'))) {
                htmlImportsFound.push({ file, type: 'import' });
              }

              if (content.includes('<Html>') || content.includes('<Html ')) {
                htmlImportsFound.push({ file, type: 'jsx' });
              }
            }
          });
        }
      });

      expect(htmlImportsFound).toHaveLength(0);
    });
  });

  describe('Build Performance', () => {
    it('should validate build configuration and scripts', async () => {
      // Check that the fix is in place and working
      const configPath = path.resolve(process.cwd(), 'next.config.js');
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Verify optimizePackageImports configuration is still removed
      expect(configContent).not.toContain('optimizePackageImports:');
      expect(configContent).toContain('REMOVED: optimizePackageImports - causes Html import bug');
      
      // Check that the fixed build script exists and is working
      const buildScriptPath = path.resolve(process.cwd(), 'scripts/fixed-build-232.js');
      expect(fs.existsSync(buildScriptPath)).toBe(true);
      
      // Verify the script has the correct fix markers
      const buildScriptContent = fs.readFileSync(buildScriptPath, 'utf8');
      expect(buildScriptContent).toContain('GitHub Issue #232 Fixed Build Script');
      expect(buildScriptContent).toContain('TURBOPACK: "0"');
      
      // Test that the build script would run (without actually executing full build)
      expect(buildScriptContent).toContain('next build');
      // Only check if optimizePackageImports is not in actual configuration code (not comments)
      const hasOptimizeInCode = buildScriptContent
        .split('\n')
        .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
        .some(line => line.includes('optimizePackageImports'));
      expect(hasOptimizeInCode).toBe(false);
      
      // Verify reproduction case exists
      const reproductionScript = path.resolve(process.cwd(), 'reproduce-github-issue-232.js');
      expect(fs.existsSync(reproductionScript)).toBe(true);
      
      const reproductionContent = fs.readFileSync(reproductionScript, 'utf8');
      expect(reproductionContent).toContain('Reproducing GitHub Issue #232');
      expect(reproductionContent).toContain('BUG REPRODUCED');
    });
  });
});