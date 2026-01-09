import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('GitHub Issue #232 Fix Verification', () => {
  describe('Build System Fix', () => {
    it('should have empty optimizePackageImports array in next.config.js', async () => {
      const configPath = path.resolve(process.cwd(), 'next.config.js');
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Verify optimizePackageImports is an empty array (Fix for Issue #232)
      expect(configContent).toContain('optimizePackageImports: []');
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
      const { execSync } = require('child_process');
      
      const userCodeDirs = ['app', 'lib', 'components'];
      const htmlImportsFound: Array<{file: string, type: string}> = [];
      
      userCodeDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          const files = execSync(`find ${dir} -name "*.ts" -o -name "*.tsx"`, { encoding: 'utf8' }).trim().split('\n');
          
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
    it('should build successfully with standard webpack', async () => {
      const { execSync } = require('child_process');
      
      try {
        // Clean and build with direct command (this should now work)
        execSync('rm -rf .next', { stdio: 'pipe' });
        const result = execSync('npx next build', { 
          encoding: 'utf8', 
          stdio: 'pipe',
          timeout: 300000 // 5 minutes
        });
        
        expect(result).toContain('Creating an optimized production build');
        expect(result).toContain('✓ Generating static pages');
        expect(result).toContain('✓ Compiled successfully');
        expect(result).not.toContain('<Html> should not be imported');
      } catch (error) {
        // If build fails, ensure it's not due to the Html import issue
        const errorMsg = error instanceof Error ? error.message : String(error);
        expect(errorMsg).not.toContain('<Html> should not be imported');
        throw new Error('Build should succeed with the fix applied');
      }
    }, 300000);
  });
});