import fs from 'fs'
import path from 'path'
import { default as spawn } from 'cross-spawn'
import { green, red, yellow, cyan } from 'picocolors'
import * as jsonc from 'jsonc-parser'
import { getPackageManager, getInstallCommand, runCommand, type PackageJson } from './utils.js'
import type { Argv } from '../index.js'

interface PackageVersions {
    [key: string]: string
}

export async function update(_argv: Argv) {
    const packageJsonPath = path.join(process.cwd(), 'package.json')

    if (!fs.existsSync(packageJsonPath)) {
        console.error(red('Error: No package.json found in the current directory'))
        console.log(yellow('Please run this command from a Towns Protocol bot project directory'))
        process.exit(1)
    }

    const packageJson = jsonc.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }

    const townsPackages = Object.keys(dependencies).filter((pkg) =>
        pkg.startsWith('@towns-protocol/'),
    )

    if (townsPackages.length === 0) {
        console.log(yellow('No @towns-protocol packages found in this project'))
        process.exit(0)
    }

    console.log(cyan('Found Towns Protocol packages:'))
    townsPackages.forEach((pkg) => {
        console.log(`  - ${pkg}@${dependencies[pkg]}`)
    })
    console.log()

    console.log(cyan('Fetching latest versions...'))
    const latestVersions: PackageVersions = {}

    for (const pkg of townsPackages) {
        try {
            const version = await getLatestVersion(pkg)
            latestVersions[pkg] = version
            console.log(green('✓'), `${pkg}: ${version}`)
        } catch {
            console.error(red('✗'), `Failed to fetch version for ${pkg}`)
        }
    }

    console.log()
    console.log(cyan('Updating package.json...'))

    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    const edits: jsonc.Edit[] = []

    for (const [pkg, version] of Object.entries(latestVersions)) {
        const currentVersion = dependencies[pkg]
        if (currentVersion !== `^${version}`) {
            if (packageJson.dependencies?.[pkg]) {
                edits.push(...jsonc.modify(content, ['dependencies', pkg], `^${version}`, {}))
            }
            if (packageJson.devDependencies?.[pkg]) {
                edits.push(...jsonc.modify(content, ['devDependencies', pkg], `^${version}`, {}))
            }
        }
    }

    if (edits.length > 0) {
        const modifiedContent = jsonc.applyEdits(content, edits)
        fs.writeFileSync(packageJsonPath, modifiedContent)
        console.log(green('✓'), 'Updated package.json')

        const packageManager = getPackageManager()
        console.log()
        console.log(cyan(`Installing dependencies with ${packageManager}...`))

        try {
            await runCommand(packageManager, [
                getInstallCommand(packageManager).split(' ')[1] || 'install',
            ])
            console.log()
            console.log(green('✓'), 'Dependencies updated successfully!')
        } catch {
            console.error(red('Error:'), 'Failed to install dependencies')
            console.log(
                yellow('Please run'),
                cyan(getInstallCommand(packageManager)),
                yellow('manually'),
            )
        }
    } else {
        console.log(green('✓'), 'All packages are already up to date!')
    }
}

async function getLatestVersion(packageName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn('npm', ['view', packageName, 'version'], {
            stdio: ['ignore', 'pipe', 'ignore'],
        })

        let output = ''
        child.stdout?.on('data', (data) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            output += data.toString()
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Failed to fetch version for ${packageName}`))
            } else {
                resolve(output.trim())
            }
        })

        child.on('error', reject)
    })
}
