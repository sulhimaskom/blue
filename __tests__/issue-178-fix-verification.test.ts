import { describe, it, expect } from '@jest/globals';

describe('Issue #178 - AGENTS.md Quality Gate Metrics', () => {
  it('should have no merge conflict markers in Quality Gate section', () => {
    const fs = require('fs');
    const agentsContent = fs.readFileSync('AGENTS.md', 'utf8');
    
    // Look for the Quality Gate Verification section
    const qualityGateSection = agentsContent.match(
      /2\. \*\*Quality Gate Verification\*\*: ALWAYS run these commands before starting work:([\s\S]*?)(?=\n\d+\.|\n###|\Z)/
    );
    
    expect(qualityGateSection).toBeTruthy();
    
    const sectionText = qualityGateSection[0];
    
    // Should not contain merge conflict markers
    expect(sectionText).not.toContain('<<<<<<< HEAD');
    expect(sectionText).not.toContain('>>>>>>>');
    expect(sectionText).not.toContain('=======');
  });

  it('should have current build metrics', () => {
    const fs = require('fs');
    const agentsContent = fs.readFileSync('AGENTS.md', 'utf8');

    // Extract build metrics
    const buildMatch = agentsContent.match(/`npm run build` - MUST pass \(([^)]+)\)/);
    expect(buildMatch).toBeTruthy();

    const buildInfo = buildMatch[1];

    // Should have current metrics
    expect(buildInfo).toContain('64 static pages');
    expect(buildInfo).toContain('55.3s compile time');

    // Should not have outdated metrics
    expect(buildInfo).not.toContain('25.5s');
    expect(buildInfo).not.toContain('17.0s');
    expect(buildInfo).not.toContain('62 static pages');
  });

  it('should have current test metrics', () => {
    const fs = require('fs');
    const agentsContent = fs.readFileSync('AGENTS.md', 'utf8');
    
    // Extract test metrics
    const testMatch = agentsContent.match(/`npm test --silent` - MUST return (\d+\.?\d*)% pass rate \(([^)]+)\)/);
    expect(testMatch).toBeTruthy();
    
    const testInfo = testMatch[2];
    
    // Should have reasonable test metrics  
    expect(testInfo).toMatch(/^\d+\/\d+ suites passing/);
    
    // Current test suite is stable, no timing issues
    expect(testInfo).not.toContain('timing issues');
  });

  it('should have current verification date', () => {
    const fs = require('fs');
    const agentsContent = fs.readFileSync('AGENTS.md', 'utf8');

    // Should contain recent verification date
    expect(agentsContent).toContain('January 16, 2026 FRESH VERIFICATION');

    // Should not have old dates
    expect(agentsContent).not.toContain('January 12, 2026 verification');
  });

  it('should have Quality Gate Verification section structure', () => {
    const fs = require('fs');
    const agentsContent = fs.readFileSync('AGENTS.md', 'utf8');
    
    // Should contain all required quality gate commands
    expect(agentsContent).toContain('npm audit');
    expect(agentsContent).toContain('npm run build');
    expect(agentsContent).toContain('npm run lint');
    expect(agentsContent).toContain('npm run typecheck');
    expect(agentsContent).toContain('npm test --silent');
    
    // Should have proper formatting
    expect(agentsContent).toContain('2. **Quality Gate Verification**');
    expect(agentsContent).toContain('MUST return 0 vulnerabilities');
    expect(agentsContent).toContain('MUST pass');
    expect(agentsContent).toContain('MUST return 0 warnings/errors');
    expect(agentsContent).toContain('MUST return 0 TypeScript errors');
    expect(agentsContent).toMatch(/MUST return \d+\.?\d*% pass rate/);
  });
});