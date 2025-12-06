import fs from 'fs'
import path from 'path'
import { green, red, yellow, cyan } from 'picocolors'
import {
    getPackageManager,
    getInstallCommand,
    getDlxCommand,
    runCommand,
    runCommandWithOutput,
} from './utils.js'
import type { UpdateArgs } from '../parser.js'

interface VersionUpdate {
    package: string
    from: string
    to: string
}

function parseNcuOutput(output: string): VersionUpdate[] {
    const updates: VersionUpdate[] = []
    const lines = output.split('\n')

    for (const line of lines) {
        // Match lines like: @towns-protocol/bot  ^1.0.0  →  ^1.1.0
        const match = line.match(/^\s*(@towns-protocol\/\S+)\s+(\S+)\s+→\s+(\S+)/)
        if (match) {
            updates.push({
                package: match[1],
                from: match[2],
                to: match[3],
            })
        }
    }

    return updates
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
        // Run npm-check-updates and capture output
        const [dlxBin, ...dlxArgs] = dlxCommand.split(' ')
        const output = await runCommandWithOutput(dlxBin, [
            ...dlxArgs,
            'npm-check-updates',
            '-u',
            '-f',
            '@towns-protocol/*',
        ])

        const updates = parseNcuOutput(output)

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
