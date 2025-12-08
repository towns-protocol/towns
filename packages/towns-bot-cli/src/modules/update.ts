import fs from 'fs'
import path from 'path'
import { green, red, yellow, cyan } from 'picocolors'
import { getPackageManager, getInstallCommand, getDlxCommand, runCommand } from './utils.js'
import type { UpdateArgs } from '../parser.js'

interface PackageJson {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
}

interface VersionUpdate {
    package: string
    from: string
    to: string
}

function getTownsVersions(packageJson: PackageJson): Record<string, string> {
    const versions: Record<string, string> = {}
    for (const deps of [packageJson.dependencies, packageJson.devDependencies]) {
        if (deps) {
            for (const [pkg, version] of Object.entries(deps)) {
                if (pkg.startsWith('@towns-protocol/')) {
                    versions[pkg] = version
                }
            }
        }
    }
    return versions
}

export async function update(_argv: UpdateArgs) {
    const packageJsonPath = path.join(process.cwd(), 'package.json')

    if (!fs.existsSync(packageJsonPath)) {
        console.error(red('Error: No package.json found in the current directory'))
        console.log(yellow('Please run this command from a Towns Protocol bot project directory'))
        process.exit(1)
    }

    const packageManager = getPackageManager()
    const dlxCommand = getDlxCommand(packageManager)

    console.log(cyan('Checking for @towns-protocol updates...'))

    try {
        const [dlxBin, ...dlxArgs] = dlxCommand.split(' ')

        const packageJsonBefore: PackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        const versionsBefore = getTownsVersions(packageJsonBefore)

        await runCommand(dlxBin, [...dlxArgs, 'npm-check-updates', '-u', '-f', '@towns-protocol/*'], {
            silent: true,
        })

        const packageJsonAfter: PackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        const versionsAfter = getTownsVersions(packageJsonAfter)

        const updates: VersionUpdate[] = []
        for (const [pkg, newVersion] of Object.entries(versionsAfter)) {
            const oldVersion = versionsBefore[pkg]
            if (oldVersion && oldVersion !== newVersion) {
                updates.push({ package: pkg, from: oldVersion, to: newVersion })
            }
        }

        if (updates.length === 0) {
            console.log(green('✓'), 'All @towns-protocol packages are up to date!')
            return
        }

        console.log()
        for (const update of updates) {
            console.log(green('✓'), `${update.package} ${update.from} → ${update.to}`)
        }

        console.log()
        console.log(cyan(`Installing dependencies with ${packageManager}...`))
        const installCmd = getInstallCommand(packageManager)
        const [installBin, ...installArgs] = installCmd.split(' ')
        await runCommand(installBin, installArgs.length > 0 ? installArgs : [])

        console.log()
        console.log(green('✓'), 'Dependencies updated successfully!')
    } catch {
        console.error(red('Error:'), 'Failed to update dependencies')
        process.exit(1)
    }
}
