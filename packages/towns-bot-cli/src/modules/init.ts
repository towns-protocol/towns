import * as fs from 'node:fs'
import * as path from 'node:path'
import { default as prompts } from 'prompts'
import { red, yellow, cyan, green } from 'picocolors'
import * as jsonc from 'jsonc-parser'
import {
    getPackageManager,
    getLatestTownsProtocolVersion,
    cloneTemplate,
    applyReplacements,
    printSuccess,
    initializeGitRepository,
    installTownsSkills,
    type PackageJson,
} from './utils.js'
import type { InitArgs } from '../parser.js'

export type Template = (typeof TEMPLATES)[keyof typeof TEMPLATES]
export const TEMPLATES = {
    quickstart: {
        name: 'Bot Quickstart',
        description: 'Simple starter bot with basic commands',
        packagePath: 'bot-quickstart',
    },
} as const

export async function init(argv: InitArgs) {
    const projectName = argv._[1]
    const template = argv.template || 'quickstart'

    if (!projectName) {
        console.error(red('Error: Please provide a project name'))
        console.log(yellow('Usage: towns-bot init <project-name>'))
        process.exit(1)
    }

    if (!TEMPLATES[template as keyof typeof TEMPLATES]) {
        console.error(red(`Error: Unknown template "${template}"`))
        console.log(yellow('Available templates:'), Object.keys(TEMPLATES).join(', '))
        process.exit(1)
    }

    const targetDir = path.resolve(process.cwd(), projectName)

    if (fs.existsSync(targetDir)) {
        const { overwrite } = await prompts({
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${projectName} already exists. Overwrite?`,
            initial: false,
        })

        if (!overwrite) {
            console.log(yellow('Operation cancelled'))
            process.exit(0)
        }

        fs.rmSync(targetDir, { recursive: true, force: true })
    }

    console.log(cyan(`Creating a new Towns Protocol bot in ${targetDir}`))
    if (template !== 'quickstart') {
        console.log(cyan(`Using template: ${TEMPLATES[template as keyof typeof TEMPLATES].name}`))
    }

    const packageManager = getPackageManager()
    const selectedTemplate = TEMPLATES[template as keyof typeof TEMPLATES]

    try {
        // Clone template from GitHub
        const success = await cloneTemplate(selectedTemplate.packagePath, targetDir)
        if (!success) {
            console.error(red('Failed to clone template'))
            process.exit(1)
        }
        const latestVersion = await getLatestTownsProtocolVersion()
        // Replace workspace dependencies in package.json and other files
        const replacements = new Map([
            ['workspace:\\^', `^${latestVersion}`],
            ['workspace:\\*', `^${latestVersion}`],
        ])

        // Apply replacements to all relevant files
        applyReplacements(targetDir, replacements)

        const packageJsonPath = path.join(targetDir, 'package.json')
        if (fs.existsSync(packageJsonPath)) {
            const content = fs.readFileSync(packageJsonPath, 'utf-8')
            const edits = [
                jsonc.modify(content, ['name'], projectName, {}),
                jsonc.modify(content, ['version'], '0.0.1', {}),
            ]

            let modifiedContent = jsonc.applyEdits(content, edits.flat())

            const parsed = jsonc.parse(modifiedContent) as PackageJson
            delete parsed.private

            modifiedContent = JSON.stringify(parsed, null, 2)
            fs.writeFileSync(packageJsonPath, modifiedContent)
        }

        // Install skills
        console.log(cyan('Installing Towns Agent Skills...'))
        try {
            const skillSuccess = await installTownsSkills(targetDir)
            if (skillSuccess) {
                console.log(green('✓'), 'Towns Agent Skills installed successfully!')
            } else {
                console.log(
                    yellow('⚠'),
                    'Failed to install Towns Agent Skills. You can install them later with:',
                )
                console.log(yellow(`  cd ${projectName} && towns-bot install-skill`))
            }
        } catch (error) {
            console.log(
                yellow('⚠'),
                'Error installing skills:',
                error instanceof Error ? error.message : error,
            )
            console.log(yellow(`  You can install them later with: towns-bot install-skill`))
        }

        await initializeGitRepository(targetDir)
        printSuccess(projectName, packageManager)
    } catch (error) {
        console.error(red('Error:'), error instanceof Error ? error.message : error)
        console.error(red(`Please delete the directory ${targetDir} and try again.`))
        process.exit(1)
    }
}
