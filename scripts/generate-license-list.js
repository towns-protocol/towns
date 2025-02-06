#!/usr/bin/env node

/**
 * Script: generate-license-list.js
 * Usage: node scripts/generate-license-list.js
 *
 * Purpose:
 *   1) Recursively find all package.json files in a monorepo (excluding node_modules, dist, build, etc.).
 *   2) Gather unique dependencies (and devDependencies, if desired).
 *   3) For each dependency, fetch the license once via `npm view`.
 *   4) Output a CSV with columns: [library, used_in, license].
 *
 * Customizations:
 *   - Only use the final directory name (e.g., 'web3') instead of the full path.
 *   - Parse the license so we don't get a giant repeated list of "MIT".
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const glob = require('glob')

/**
 * Safely get a readable string for the license from npm's JSON output.
 * npm might return:
 *   - A string (e.g., "MIT")
 *   - An array of strings or objects
 *   - An object (e.g., { type: "MIT" })
 * We'll handle these cases gracefully.
 */
function parseLicenseField(rawJson) {
    if (!rawJson) {
        return 'UNKNOWN'
    }

    let parsed
    try {
        parsed = JSON.parse(rawJson)
    } catch {
        // If parse fails, fall back to the raw string
        return rawJson.trim() || 'UNKNOWN'
    }

    if (typeof parsed === 'string') {
        // Simple string, e.g. "MIT"
        return parsed || 'UNKNOWN'
    }

    if (Array.isArray(parsed)) {
        // An array of strings or objects
        // Example: ["MIT", "MIT", ...] or [{ type: "MIT" }, { type: "Apache-2.0" }]
        // Flatten this into a unique list of license strings
        const licenseStrings = parsed.map((item) => {
            if (typeof item === 'string') return item
            if (item && typeof item.type === 'string') return item.type
            return 'UNKNOWN'
        })
        // Remove duplicates, join with " OR " (or your choice)
        const uniqueLicenses = [...new Set(licenseStrings)].filter(Boolean)
        return uniqueLicenses.length ? uniqueLicenses.join(' OR ') : 'UNKNOWN'
    }

    // If it's an object, try to pick out the license type
    // e.g. { type: 'MIT' }
    if (typeof parsed === 'object') {
        if (parsed.type) {
            return parsed.type
        }
        // or if it's a nested structure, just JSON-stringify
        return JSON.stringify(parsed)
    }

    // Fallback
    return 'UNKNOWN'
}

/**
 * Use `npm view` to fetch license info for a given package@version.
 * If version is a semver range (e.g., ^1.2.3), npm view will pick a matching version.
 * This function returns a parsed license string or 'UNKNOWN'.
 */
function getLicense(packageName, version) {
    try {
        // We output license in JSON to parse it
        const cmd = `npm view ${packageName}@${version} license --json`
        const rawOutput = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
        return parseLicenseField(rawOutput)
    } catch (error) {
        // For example, private packages or unrecognized versions
        return 'UNKNOWN'
    }
}

async function main() {
    // 1. Find all package.json files (excluding node_modules, dist, build, etc.)
    const packageJsonPaths = glob.sync('**/package.json', {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    })

    // We'll store unique dependencies in a map of:
    // {
    //   "depName@version": {
    //     name: "depName",
    //     version: "versionRange",
    //     usedIn: Set(["folderA", "folderB", ...]),
    //     license: string
    //   },
    //   ...
    // }
    const dependenciesMap = {}

    // 2. Collect dependencies from each package.json
    for (const pkgPath of packageJsonPaths) {
        // The folder that contains the current package.json
        const folder = path.dirname(pkgPath)

        // We'll just use the last segment of the path as the "usedIn"
        // e.g. if folder="/Users/.../river/packages/web3", usedIn="web3"
        const usedInFolderName = path.basename(folder) || '(root)'

        const packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
            // If you want peerDeps, optionalDeps, etc., add them too
        }

        for (const [depName, depVersion] of Object.entries(allDeps || {})) {
            const key = `${depName}@${depVersion}`
            if (!dependenciesMap[key]) {
                dependenciesMap[key] = {
                    name: depName,
                    version: depVersion,
                    usedIn: new Set(),
                    license: null,
                }
            }
            dependenciesMap[key].usedIn.add(usedInFolderName)
        }
    }

    // 3. Fetch licenses once per unique dependency
    for (const key of Object.keys(dependenciesMap)) {
        const { name, version } = dependenciesMap[key]
        const license = getLicense(name, version)
        dependenciesMap[key].license = license
    }

    // 4. Build CSV lines: [library, used_in, license]
    const csvRows = []
    csvRows.push(['library', 'used_in', 'license'].join(',')) // CSV header

    Object.values(dependenciesMap).forEach((dep) => {
        const libraryCol = `${dep.name}@${dep.version}`
        // Join multiple folder names with a pipe, e.g. "harmony|web3"
        const usedInCol = Array.from(dep.usedIn).sort().join('|')
        // Make sure we don't break CSV with commas
        const licenseCol = (dep.license || 'UNKNOWN').replace(/,/g, '')

        csvRows.push([libraryCol, usedInCol, licenseCol].join(','))
    })

    // 5. Write out the CSV file
    const csvContent = csvRows.join('\n')
    fs.writeFileSync('dependency-licenses.csv', csvContent, 'utf8')

    console.log('Generated dependency-licenses.csv')
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
