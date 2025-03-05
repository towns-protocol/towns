const fs = require('fs')
const path = require('path')

/**
 * Paths based on execution from /scripts/update-generated-dependencies.js
 */
const monorepoRoot = path.resolve(__dirname, '..')
const rootPackageJsonPath = path.join(monorepoRoot, 'package.json')
const generatedPackageJsonPath = path.join(monorepoRoot, 'packages/generated/package.json')

/**
 * Reads and returns the monorepo workspace paths manually (without `glob`)
 */
function getWorkspacePaths() {
    const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'))

    if (!rootPackageJson.workspaces) {
        throw new Error('No workspaces found in monorepo root package.json')
    }

    const workspaces = rootPackageJson.workspaces.flatMap((pattern) => {
        const baseDir = pattern.split('/*')[0] // Extract base directory (e.g., "packages" from "packages/*")
        const workspaceDir = path.join(monorepoRoot, baseDir)

        if (!fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory()) {
            return []
        }

        // Get subdirectories if it's a pattern like "packages/*"
        if (pattern.endsWith('/*')) {
            return fs
                .readdirSync(workspaceDir)
                .map((subdir) => path.join(workspaceDir, subdir))
                .filter((dir) => fs.statSync(dir).isDirectory())
        }

        // Otherwise, return the single workspace directory
        return [workspaceDir]
    })

    return workspaces
}

/**
 * Reads the version from packages/generated/package.json
 */
function getGeneratedVersion() {
    const packageJson = JSON.parse(fs.readFileSync(generatedPackageJsonPath, 'utf8'))
    return packageJson.version
}

/**
 * Updates package.json by replacing "workspace:^" with the actual version
 */
function updatePackageJson(packageJsonPath, generatedVersion) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    let updated = false

    if (
        packageJson.dependencies &&
        packageJson.dependencies['@river-build/generated'] === 'workspace:^'
    ) {
        packageJson.dependencies['@river-build/generated'] = generatedVersion
        updated = true
    }

    if (
        packageJson.devDependencies &&
        packageJson.devDependencies['@river-build/generated'] === 'workspace:^'
    ) {
        packageJson.devDependencies['@river-build/generated'] = generatedVersion
        updated = true
    }

    if (updated) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8')
        console.log(`Updated: ${packageJsonPath}`)
    }
}

/**
 * Main script execution
 */
;(function main() {
    const generatedVersion = getGeneratedVersion()
    console.log(`Using version: ${generatedVersion}`)

    const workspacePaths = getWorkspacePaths()

    console.log('Updating package.json files in workspaces:')
    workspacePaths.forEach((workspacePath) => {
        const packageJsonPath = path.join(workspacePath, 'package.json')
        if (fs.existsSync(packageJsonPath)) {
            updatePackageJson(packageJsonPath, generatedVersion)
        }
    })
})()
