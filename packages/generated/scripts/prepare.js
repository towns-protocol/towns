#!/usr/bin/env node

/**
 * CONTRACT ARTIFACT MANAGEMENT
 * 
 * Strategy: npm download when possible, local generation when needed.
 * 
 * 1. No artifacts → try npm download → validate hash → fallback to local gen
 * 2. Artifacts exist → compare hash → regenerate if contracts changed  
 * 3. SKIP_CONTRACT_GEN=true → use existing or npm download, never fail
 * 
 * Uses package.json version + git tree hash for validation.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const repoRoot = resolve(packageRoot, '../..');
const devDir = resolve(packageRoot, 'dev');
const hashFile = resolve(devDir, '.contracts-hash');

// Get current package version
function getCurrentVersion() {
  const require = createRequire(import.meta.url);
  const packageJson = require('../package.json');
  return packageJson.version;
}

// Check if generated files already exist
function generatedFilesExist() {
  return existsSync(resolve(devDir, 'abis')) && existsSync(resolve(devDir, 'typings'));
}

// Get git hash of contracts directory
function getContractsHash() {
  if (!existsSync(resolve(repoRoot, 'packages/contracts/src'))) {
    return null;
  }
  
  try {
    return execSync('git rev-parse HEAD:packages/contracts/src', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
  } catch (error) {
    return null; // Not in git repo or other error
  }
}

// Check if contracts have changed by comparing hashes
function contractsChanged() {
  const currentHash = getContractsHash();
  
  if (!currentHash) {
    return false; // No contracts source, use existing generated files
  }
  
  if (!existsSync(hashFile)) {
    return true; // No stored hash, need to generate
  }
  
  const storedHash = readFileSync(hashFile, 'utf8').trim();
  return currentHash !== storedHash;
}

// Download artifacts from npm
async function downloadArtifactsFromNpm() {
  const currentVersion = getCurrentVersion();
  if (!currentVersion) return false;
  
  const tempDir = resolve(packageRoot, '.temp-download');
  
  try {
    if (existsSync(tempDir)) execSync(`rm -rf "${tempDir}"`, { stdio: 'pipe' });
    mkdirSync(tempDir, { recursive: true });
    
    execSync(`npm pack @towns-protocol/generated@${currentVersion}`, {
      cwd: tempDir, stdio: 'pipe'
    });
    
    const files = execSync('ls *.tgz', { cwd: tempDir, encoding: 'utf8' }).trim().split('\n');
    execSync(`tar -xzf "${files[0]}" -C "${tempDir}"`, { stdio: 'pipe' });
    
    const extractedDevDir = resolve(tempDir, 'package/dev');
    if (!existsSync(extractedDevDir)) return false;
    
    if (!existsSync(devDir)) mkdirSync(devDir, { recursive: true });
    execSync(`cp -r "${extractedDevDir}/." "${devDir}/"`, { stdio: 'pipe' });
    
    // Validate hash if contracts exist
    const currentHash = getContractsHash();
    if (currentHash && existsSync(hashFile)) {
      const downloadedHash = readFileSync(hashFile, 'utf8').trim();
      if (currentHash !== downloadedHash) {
        execSync(`rm -rf "${devDir}"`, { stdio: 'pipe' });
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  } finally {
    if (existsSync(tempDir)) execSync(`rm -rf "${tempDir}"`, { stdio: 'pipe' });
  }
}

// Generate contract artifacts
function generateArtifacts() {
  execSync(`${repoRoot}/scripts/build-contract-types.sh`, {
    cwd: repoRoot,
    stdio: 'inherit'
  });
}

// Main logic
async function main() {
  const skipRequested = process.env.SKIP_CONTRACT_GEN === 'true';
  
  if (!generatedFilesExist()) {
    if (!(await downloadArtifactsFromNpm())) {
      generateArtifacts();
    }
    return;
  }
  
  if (skipRequested) return;
  
  if (contractsChanged()) {
    generateArtifacts();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Preparation failed:', error.message);
    process.exit(1);
  });
}
