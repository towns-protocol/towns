#!/usr/bin/env node

/**
 * CONTRACT ARTIFACT MANAGEMENT
 *
 * Strategy: npm download when possible, local generation when needed.
 * Foundry auto-installation is removed; requires manual installation in local dev.
 *
 * 1. No artifacts → try npm download → validate hash:
 *    - Hash match: use npm artifacts
 *    - Hash mismatch + Foundry installed: regenerate locally
 *    - Hash mismatch + NO Foundry: use npm artifacts with warning (Vercel case)
 * 2. Artifacts exist + contracts changed → regenerate locally (Foundry required, local only)
 * 3. SKIP_CONTRACT_GEN=true → skip checks, use existing artifacts
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
const contractsDir = resolve(packageRoot, '../contracts');
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
  if (!existsSync(resolve(contractsDir, 'src'))) return null;
  
  try {
    return execSync('git rev-parse HEAD:./src', {
      cwd: contractsDir,
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
  
  if (!currentHash) return false; // No contracts source, use existing generated files
  
  if (!existsSync(hashFile)) return true; // No stored hash, need to generate
  
  const storedHash = readFileSync(hashFile, 'utf8').trim();
  return currentHash !== storedHash;
}

// Download artifacts from npm
async function downloadArtifactsFromNpm() {
  const currentVersion = getCurrentVersion();
  if (!currentVersion) return false;
  
  console.log(`Attempting npm download for version ${currentVersion}...`);
  
  const tempDir = resolve(packageRoot, '.temp-download');
  
  try {
    if (existsSync(tempDir)) execSync(`rm -rf "${tempDir}"`, { stdio: 'pipe' });
    mkdirSync(tempDir, { recursive: true });
    
    execSync(`npm pack @towns-protocol/generated@${currentVersion}`, {
      cwd: tempDir, stdio: 'pipe'
    });
    
    const files = execSync('ls *.tgz', { cwd: tempDir, encoding: 'utf8' }).trim().split('\n');
    execSync(`tar -xzf "${files[0]}" -C "${tempDir}"`, { 
      cwd: tempDir, 
      stdio: 'pipe' 
    });
    
    const extractedDevDir = resolve(tempDir, 'package/dev');
    if (!existsSync(extractedDevDir)) {
      console.log('Downloaded package missing dev/ directory');
      return false;
    }
    
    if (!existsSync(devDir)) mkdirSync(devDir, { recursive: true });
    execSync(`cp -r "${extractedDevDir}/." "${devDir}/"`, { stdio: 'pipe' });

    console.log('Successfully downloaded artifacts from npm');
    return true;
  } catch (error) {
    console.log('Error in downloadArtifactsFromNpm:', error.message);
    console.log('Stack trace:', error.stack);
    return false;
  } finally {
    if (existsSync(tempDir)) execSync(`rm -rf "${tempDir}"`, { stdio: 'pipe' });
  }
}

// Check if Foundry is installed
function isFoundryInstalled() {
  try {
    execSync('forge --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Generate contract artifacts
function generateArtifacts() {
  // Check for contracts directory
  if (!existsSync(contractsDir)) {
    throw new Error('Cannot generate artifacts: contracts package not available');
  }

  // Require Foundry to be installed
  if (!isFoundryInstalled()) {
    throw new Error('Foundry is not installed and is required to generate contract artifacts.');
  }

  const buildScript = resolve(contractsDir, 'scripts/build-contract-types.sh');

  if (!existsSync(buildScript)) {
    throw new Error(`Build script not found at ${buildScript}`);
  }

  execSync(`bash ${buildScript}`, {
    cwd: contractsDir,
    stdio: 'inherit'
  });
}

// Main logic
async function main() {
  const skipRequested = process.env.SKIP_CONTRACT_GEN === 'true';

  if (!generatedFilesExist()) {
    console.log('No artifacts found, trying npm download first...');
    if (await downloadArtifactsFromNpm()) {
      // Check if hash validation is needed
      const currentHash = getContractsHash();
      if (currentHash && existsSync(hashFile)) {
        const downloadedHash = readFileSync(hashFile, 'utf8').trim();
        if (currentHash !== downloadedHash) {
          // Hash mismatch: regenerate if Foundry available, otherwise use downloaded
          if (isFoundryInstalled()) {
            console.log('Hash mismatch detected, regenerating locally with Foundry...');
            generateArtifacts();
          } else {
            console.log('WARNING: Hash mismatch but Foundry not available, using downloaded artifacts');
          }
        }
      }
    } else {
      console.log('NPM download failed, attempting local generation...');
      generateArtifacts();
    }
    return;
  }

  if (skipRequested) {
    console.log('Skipping generation (SKIP_CONTRACT_GEN=true)');
    return;
  }

  if (contractsChanged()) {
    console.log('Contracts changed, regenerating...');
    generateArtifacts();
  } else {
    console.log('Artifacts up to date');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Preparation failed:', error.message);
    process.exit(1);
  });
}
