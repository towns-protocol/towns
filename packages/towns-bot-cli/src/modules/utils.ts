import * as fs from 'node:fs'
import * as path from 'node:path'
import { default as spawn } from 'cross-spawn'
import picocolors from 'picocolors'

export type PackageJson = {
    private?: boolean
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
}

export const getPackageManager = () => {
    if (process.env.npm_config_user_agent) {
        const agent = process.env.npm_config_user_agent
        if (agent.startsWith('yarn')) return 'yarn'
        if (agent.startsWith('npm')) return 'npm'
        if (agent.startsWith('pnpm')) return 'pnpm'
        if (agent.startsWith('bun')) return 'bun'
    }
    // Default to npm if no user agent is found
    return 'npm'
}

export function getInstallCommand(packageManager: string): string {
    switch (packageManager) {
        case 'bun':
            return 'bun install'
        case 'yarn':
            return 'yarn'
        case 'pnpm':
            return 'pnpm install'
        default:
            return 'npm install'
    }
}

export function getRunCommand(packageManager: string, script: string): string {
    switch (packageManager) {
        case 'bun':
            return `bun run ${script}`
        case 'yarn':
            return `yarn ${script}`
        case 'pnpm':
            return `pnpm ${script}`
        default:
            return `npm run ${script}`
    }
}

export function getDlxCommand(packageManager: string): string {
    switch (packageManager) {
        case 'bun':
            return 'bunx'
        case 'yarn':
            return 'yarn dlx'
        case 'pnpm':
            return 'pnpm dlx'
        default:
            return 'npx'
    }
}

export function runCommand(
    command: string,
    args: string[],
    opts: { cwd?: string; silent?: boolean } = { cwd: undefined, silent: false },
): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: opts.silent ? 'ignore' : 'inherit',
            cwd: opts.cwd,
            shell: process.platform === 'win32',
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with exit code ${code}`))
            } else {
                resolve()
            }
        })

        child.on('error', reject)
    })
}

export function runCommandWithOutput(
    command: string,
    args: string[],
    opts: { cwd?: string } = {},
): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: opts.cwd,
            shell: process.platform === 'win32',
        })

        let stdout = ''
        let stderr = ''

        child.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString()
        })

        child.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString()
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `Command failed with exit code ${code}`))
            } else {
                resolve(stdout)
            }
        })

        child.on('error', reject)
    })
}

export async function getLatestTownsProtocolVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn('npm', ['view', '@towns-protocol/bot', 'version'], {
            stdio: ['ignore', 'pipe', 'ignore'],
        })

        let output = ''
        child.stdout?.on('data', (data) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            output += data.toString()
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Failed to fetch latest @towns-protocol/bot version'))
            } else {
                resolve(output.trim())
            }
        })

        child.on('error', reject)
    })
}

export function copyDirectory(src: string, dest: string, replacements?: Map<string, string>) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'dist') {
                continue
            }
            copyDirectory(srcPath, destPath, replacements)
        } else {
            let content = fs.readFileSync(srcPath, 'utf-8')

            if (
                replacements &&
                (entry.name === 'package.json' ||
                    entry.name.endsWith('.ts') ||
                    entry.name.endsWith('.js'))
            ) {
                for (const [search, replace] of replacements) {
                    content = content.replace(new RegExp(search, 'g'), replace)
                }
            }

            fs.writeFileSync(destPath, content)
        }
    }
}

export function getLatestSdkTag(): string | null {
    const tagsResult = spawn.sync(
        'git',
        ['ls-remote', '--tags', 'https://github.com/towns-protocol/towns.git', 'sdk-*'],
        { encoding: 'utf8' },
    )

    if (tagsResult.status !== 0 || !tagsResult.stdout) return null

    const tags = tagsResult.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
            const [_hash, ref] = line.split('\t')
            const tag = ref.replace('refs/tags/', '').replace(/\^{}$/, '')

            // Extract version numbers from tags like sdk-hash-1.2.3
            const match = tag.match(/^sdk-[0-9a-f]+-(\d+)\.(\d+)\.(\d+)$/)
            if (!match) return null

            return {
                tag,
                version: [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])],
            }
        })
        .filter(
            (item): item is { tag: string; version: number[] } =>
                item !== null && Array.isArray(item.version) && item.version.length === 3,
        )
        .sort((a, b) => {
            // Compare version numbers
            for (let i = 0; i < 3; i++) {
                if (a.version[i] !== b.version[i]) {
                    return b.version[i] - a.version[i]
                }
            }
            return 0
        })

    return tags.length > 0 ? tags[0].tag : null
}

export async function cloneTemplate(packagePath: string, targetDir: string): Promise<boolean> {
    console.log(picocolors.blue('Cloning template from GitHub...'))

    const tempDir = `${targetDir}-temp`
    const fullTemplatePath = `packages/examples/${packagePath}`

    // Get latest SDK tag
    const latestSdkTag = getLatestSdkTag()
    if (!latestSdkTag) {
        console.error(picocolors.red('Failed to get latest SDK tag.'))
        return false
    }

    // Clone with minimal data to a temporary directory
    const cloneResult = spawn.sync(
        'git',
        [
            'clone',
            '--no-checkout',
            '--depth',
            '1',
            '--sparse',
            '--branch',
            latestSdkTag,
            'https://github.com/towns-protocol/towns.git',
            tempDir,
        ],
        { stdio: 'pipe' },
    )
    if (cloneResult.status !== 0) return false

    // Set up sparse checkout for the specific template
    const sparseResult = spawn.sync('git', ['sparse-checkout', 'set', fullTemplatePath], {
        stdio: 'pipe',
        cwd: tempDir,
    })
    if (sparseResult.status !== 0) {
        fs.rmSync(tempDir, { recursive: true, force: true })
        return false
    }

    // Checkout the content
    const checkoutResult = spawn.sync('git', ['checkout'], {
        stdio: 'pipe',
        cwd: tempDir,
    })
    if (checkoutResult.status !== 0) {
        fs.rmSync(tempDir, { recursive: true, force: true })
        return false
    }

    // Verify template directory exists
    const sourceDir = path.join(tempDir, fullTemplatePath)
    if (!fs.existsSync(sourceDir)) {
        console.error(picocolors.red(`\nTemplate directory not found at ${sourceDir}`))
        fs.rmSync(tempDir, { recursive: true, force: true })
        return false
    }

    // Copy template contents to target directory
    fs.mkdirSync(targetDir, { recursive: true })
    // Use filter to ensure all files (including hidden) are copied
    fs.cpSync(sourceDir, targetDir, {
        recursive: true,
        filter: () => {
            // Copy all files, including hidden ones
            return true
        },
    })

    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true })

    console.log(picocolors.green('✓'), 'Template cloned successfully!')
    return true
}

export function applyReplacements(targetDir: string, replacements: Map<string, string>) {
    function processDirectory(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)

            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === 'dist') {
                    continue
                }
                processDirectory(fullPath)
            } else {
                let content = fs.readFileSync(fullPath, 'utf-8')
                let modified = false

                if (
                    entry.name === 'package.json' ||
                    entry.name.endsWith('.ts') ||
                    entry.name.endsWith('.js')
                ) {
                    for (const [search, replace] of replacements) {
                        const regex = new RegExp(search, 'g')
                        if (regex.test(content)) {
                            content = content.replace(regex, replace)
                            modified = true
                        }
                    }

                    if (modified) {
                        fs.writeFileSync(fullPath, content)
                    }
                }
            }
        }
    }

    processDirectory(targetDir)
}

export function printSuccess(projectName: string, packageManager: string) {
    console.log(picocolors.green('✓'), 'Bot project created successfully!')
    console.log()
    console.log('Next steps:')
    console.log(picocolors.cyan(`  cd ${projectName}`))
    console.log(picocolors.cyan(`  ${getInstallCommand(packageManager)}`))
    console.log('Set up your environment variables:')
    console.log(picocolors.cyan('  cp .env.sample .env'))
    console.log('  Edit .env with your bot credentials')
    console.log('Start your bot:')
    console.log(picocolors.cyan(`  ${getRunCommand(packageManager, 'dev')}`))
}

export async function initializeGitRepository(targetDir: string): Promise<boolean> {
    try {
        await runCommand('git', ['init'], { cwd: targetDir, silent: true })
        await runCommand('git', ['add', '.'], { cwd: targetDir, silent: true })
        await runCommand('git', ['commit', '-m', 'feat: towns bot scaffolding'], {
            cwd: targetDir,
            silent: true,
        })
        return true
    } catch (error) {
        console.log(
            picocolors.yellow('⚠'),
            'Failed to initialize git repository:',
            error instanceof Error ? error.message : 'Unknown error',
        )
        console.log(picocolors.yellow('  You can manually initialize git later with: git init'))
        return false
    }
}

const TOWNS_SKILL_REPO = 'https://github.com/towns-protocol/skills.git'
const AGENTS_SKILL_FOLDERS = ['.claude/skills', '.codex/skills']

export async function installTownsSkills(projectDir: string): Promise<boolean> {
    const tempDir = `${projectDir}-skills-temp`
    try {
        const cloneResult = spawn.sync(
            'git',
            ['clone', '--depth', '1', '--filter=blob:none', '--sparse', TOWNS_SKILL_REPO, tempDir],
            { stdio: 'pipe' },
        )

        if (cloneResult.status !== 0) {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true })
            }
            return false
        }
        const sparseResult = spawn.sync('git', ['sparse-checkout', 'set', 'skills'], {
            stdio: 'pipe',
            cwd: tempDir,
        })
        if (sparseResult.status !== 0) {
            fs.rmSync(tempDir, { recursive: true, force: true })
            return false
        }
        const checkoutResult = spawn.sync('git', ['checkout'], {
            stdio: 'pipe',
            cwd: tempDir,
        })
        if (checkoutResult.status !== 0) {
            fs.rmSync(tempDir, { recursive: true, force: true })
            return false
        }
        const sourceSkillsDir = path.join(tempDir, 'skills')
        if (!fs.existsSync(sourceSkillsDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
            return false
        }

        const skillDirs = fs.readdirSync(sourceSkillsDir, { withFileTypes: true })
        for (const skillFolder of AGENTS_SKILL_FOLDERS) {
            const targetDir = path.join(projectDir, skillFolder)

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true })
            }

            for (const skillDir of skillDirs) {
                if (skillDir.isDirectory()) {
                    const sourcePath = path.join(sourceSkillsDir, skillDir.name)
                    const destPath = path.join(targetDir, skillDir.name)

                    fs.cpSync(sourcePath, destPath, { recursive: true })
                }
            }
        }

        fs.rmSync(tempDir, { recursive: true, force: true })
        return true
    } catch (error) {
        console.error(
            picocolors.red('Error installing skills:'),
            error instanceof Error ? error.message : error,
        )
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
        }
        return false
    }
}

export async function downloadAgentsMd(projectDir: string): Promise<boolean> {
    const tempDir = `${projectDir}-agents-md-temp`
    try {
        const agentsMdPath = 'packages/examples/bot-quickstart/AGENTS.md'
        const latestSdkTag = getLatestSdkTag()
        if (!latestSdkTag) {
            return false
        }
        const cloneResult = spawn.sync(
            'git',
            [
                'clone',
                '--no-checkout',
                '--depth',
                '1',
                '--sparse',
                '--branch',
                latestSdkTag,
                'https://github.com/towns-protocol/towns.git',
                tempDir,
            ],
            { stdio: 'pipe' },
        )
        if (cloneResult.status !== 0) {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true })
            }
            return false
        }
        const sparseResult = spawn.sync('git', ['sparse-checkout', 'set', agentsMdPath], {
            stdio: 'pipe',
            cwd: tempDir,
        })
        if (sparseResult.status !== 0) {
            fs.rmSync(tempDir, { recursive: true, force: true })
            return false
        }
        const checkoutResult = spawn.sync('git', ['checkout'], {
            stdio: 'pipe',
            cwd: tempDir,
        })
        if (checkoutResult.status !== 0) {
            fs.rmSync(tempDir, { recursive: true, force: true })
            return false
        }
        const sourceFile = path.join(tempDir, agentsMdPath)
        if (!fs.existsSync(sourceFile)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
            return false
        }
        const destFile = path.join(projectDir, 'AGENTS.md')
        fs.copyFileSync(sourceFile, destFile)
        fs.rmSync(tempDir, { recursive: true, force: true })
        return true
    } catch (error) {
        console.error(
            picocolors.red('Error downloading AGENTS.md:'),
            error instanceof Error ? error.message : error,
        )
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
        }
        return false
    }
}
