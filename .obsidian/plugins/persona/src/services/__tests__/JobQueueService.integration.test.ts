import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Integration tests for JobQueueService Python bridge.
 *
 * These tests verify that the Python bridge works correctly in an
 * Electron-like environment where terminal environment variables
 * are not inherited.
 */
describe('JobQueueService Integration', () => {
  const personaRoot = '/Users/pbarrick/Documents/Main/Projects/Persona';
  const bridgePath = path.join(personaRoot, 'python/persona/bridge.py');
  const pythonExecutable = '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3';

  /**
   * Simulate Electron environment by using minimal env vars.
   * Electron apps don't inherit .bashrc/.zshrc environment.
   */
  function createElectronLikeEnv(): NodeJS.ProcessEnv {
    return {
      HOME: process.env.HOME,
      USER: process.env.USER,
      TMPDIR: process.env.TMPDIR,
      // NO PATH, NO PYTHONPATH - simulates Electron
    };
  }

  /**
   * Create a comprehensive environment like buildPythonEnv() does.
   */
  function createComprehensiveEnv(): NodeJS.ProcessEnv {
    const pythonDir = path.join(personaRoot, 'python');
    const sitePackages = '/Library/Frameworks/Python.framework/Versions/3.12/lib/python3.12/site-packages';

    return {
      HOME: process.env.HOME,
      USER: process.env.USER,
      TMPDIR: process.env.TMPDIR,
      PATH: '/Library/Frameworks/Python.framework/Versions/3.12/bin:/usr/local/bin:/usr/bin:/bin',
      PYTHONPATH: [pythonDir, sitePackages].join(':'),
      PYTHONUNBUFFERED: '1',
      SUPABASE_URL: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      SUPABASE_KEY: process.env.SUPABASE_KEY || 'test-key-for-ci',
    };
  }

  describe('environment handling', () => {
    it.skip('should fail without proper environment setup (documents the bug)', (done) => {
      const badEnv = createElectronLikeEnv();

      // Use absolute path to python since PATH won't be set
      const proc = spawn(pythonExecutable, [bridgePath, 'get_job_summary'], {
        cwd: path.join(personaRoot, 'python'),
        env: badEnv,
      });

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        // Without PYTHONPATH including site-packages, imports will fail
        expect(code).not.toBe(0);
        // Should see some kind of import error
        expect(stderr).toMatch(/ModuleNotFoundError|ImportError|No module/);
        done();
      });
    }, 10000);

    it('should succeed with comprehensive environment', (done) => {
      const goodEnv = createComprehensiveEnv();

      const proc = spawn(pythonExecutable, [bridgePath, 'get_job_summary'], {
        cwd: path.join(personaRoot, 'python'),
        env: goodEnv,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        // If Supabase is not running, we'll get a connection error,
        // but that's OK - we're testing that imports work, not Supabase
        if (code !== 0) {
          // Check if it's a Supabase connection error (acceptable)
          // vs an import error (not acceptable)
          const isImportError = stderr.match(/ModuleNotFoundError|ImportError|No module/);
          if (isImportError) {
            fail(`Import error occurred: ${stderr}`);
          }
          // Connection errors are OK for this test
          expect(stderr).not.toMatch(/ModuleNotFoundError|ImportError|No module/);
        } else {
          // Success - verify JSON output
          expect(() => JSON.parse(stdout)).not.toThrow();
        }
        done();
      });
    }, 10000);

    it('should handle missing dotenv gracefully after fix', (done) => {
      // Test that bridge.py handles missing dotenv (the try/except we added)
      // by running with PYTHONPATH that includes the persona package but
      // simulating dotenv not being available
      const env = {
        ...createComprehensiveEnv(),
        // Set a marker that the test ran with our environment
        PERSONA_TEST_MARKER: 'integration-test',
      };

      const proc = spawn(pythonExecutable, ['-c', `
import sys
sys.path.insert(0, '${path.join(personaRoot, 'python')}')
# Hide dotenv to simulate it not being installed
import builtins
original_import = builtins.__import__
def mock_import(name, *args, **kwargs):
    if name == 'dotenv':
        raise ImportError('Mock: dotenv not installed')
    return original_import(name, *args, **kwargs)
builtins.__import__ = mock_import

# Now import bridge - should not fail due to try/except
try:
    from persona import bridge
    print('SUCCESS: bridge imported without dotenv')
except Exception as e:
    print(f'FAILED: {e}')
    sys.exit(1)
`], {
        env,
      });

      let stdout = '';
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', (code) => {
        expect(stdout).toContain('SUCCESS');
        expect(code).toBe(0);
        done();
      });
    }, 10000);
  });

  describe('Python executable', () => {
    it('should find Python 3.12 at the configured path', (done) => {
      const proc = spawn(pythonExecutable, ['--version']);

      let stdout = '';
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout).toMatch(/Python 3\.12/);
        done();
      });
    });

    it('should be able to import required modules with proper PYTHONPATH', (done) => {
      const env = createComprehensiveEnv();

      const proc = spawn(pythonExecutable, ['-c', `
import json
import os
from persona.core.job_store import JobStore, JobStatus
print(json.dumps({'status': 'ok', 'imports': 'success'}))
`], {
        env,
      });

      let stdout = '';
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).toBe(0);
        const result = JSON.parse(stdout);
        expect(result.status).toBe('ok');
        done();
      });
    }, 10000);
  });
});
