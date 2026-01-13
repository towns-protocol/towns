import { red, cyan, green } from 'picocolors'
import type { SkillArgs } from '../parser.js'
import { installTownsSkills } from './utils.js'

export async function skill(_argv: SkillArgs) {
    const cwd = process.cwd()
    await installSkill(cwd)
}

async function installSkill(projectDir: string) {
    console.log(cyan('Installing Towns Agent Skills...'))

    try {
        const success = await installTownsSkills(projectDir)
        if (success) {
            console.log(green('✓'), 'Towns Agent Skills installed successfully!')
            console.log()
            console.log('Skills have been installed to .claude/skills/ and .codex/skills/')
            console.log('They will be available when you open this project in your AI assistant')
        } else {
            console.error(red('Failed to install Towns Agent Skills'))
            process.exit(1)
        }
    } catch (error) {
        console.error(red('Error:'), error instanceof Error ? error.message : error)
        process.exit(1)
    }
}
