import spawn from 'cross-spawn'
import { addDependencies, type CreateRiverBuildAppConfig } from '../utils'
import path from 'node:path'
import picocolors from 'picocolors'
import fs from 'node:fs'
import * as jsoncParser from 'jsonc-parser'

export const clonePlayground = async (cfg: CreateRiverBuildAppConfig) => {
    console.log(picocolors.blue('\nCloning River Build Playground...'))

    const result = await cloneRepo(cfg)
    if (result?.signal === 'SIGINT' || result?.signal === 'SIGTERM') {
        console.log('\nOperation cancelled')
        process.exit(1)
    }
    if (result && result.status !== 0) {
        console.error(picocolors.red('\nFailed to clone playground.'))
        process.exit(1)
    }

    console.log(picocolors.green('\nPlayground cloned successfully.'))
    console.log(picocolors.blue('\nUpdating dependencies...'))

    await updateDependencies(cfg)
    console.log(picocolors.green('\nDependencies updated successfully.'))

    await fixTsConfig(cfg)
    spawn.sync('git', ['init'], {
        stdio: 'inherit',
        cwd: cfg.targetDir,
    })
}

const cloneRepo = async (cfg: CreateRiverBuildAppConfig) => {
    const { targetDir } = cfg
    const tempDir = `${targetDir}-temp`

    // Clone with minimal data to a temporary directory
    const cloneResult = spawn.sync(
        'git',
        [
            'clone',
            '--no-checkout',
            '--depth',
            '1',
            '--sparse',
            'https://github.com/river-build/river.git',
            tempDir,
        ],
        { stdio: 'inherit' },
    )
    if (cloneResult.status !== 0) return cloneResult

    // Set up sparse checkout
    const sparseResult = spawn.sync('git', ['sparse-checkout', 'set', 'packages/playground'], {
        stdio: 'inherit',
        cwd: tempDir,
    })
    if (sparseResult.status !== 0) return sparseResult

    // Checkout the content
    const checkoutResult = spawn.sync('git', ['checkout'], {
        stdio: 'inherit',
        cwd: tempDir,
    })
    if (checkoutResult.status !== 0) return checkoutResult

    // Verify playground directory exists
    const playgroundDir = path.join(tempDir, 'packages/playground')
    const baseTsConfigPath = path.join(tempDir, 'packages/tsconfig.base.json')

    if (!fs.existsSync(playgroundDir)) {
        console.error(picocolors.red(`\nPlayground directory not found at ${playgroundDir}`))
        return
    }

    // Move playground contents to target directory
    fs.mkdirSync(targetDir, { recursive: true })
    fs.cpSync(playgroundDir, targetDir, { recursive: true })

    // Copy tsconfig.base.json if it exists (since playground uses the config from monorepo)
    if (fs.existsSync(baseTsConfigPath)) {
        fs.copyFileSync(baseTsConfigPath, path.join(targetDir, 'tsconfig.base.json'))
    }
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true })
    return
}

const updateDependencies = async (cfg: CreateRiverBuildAppConfig) => {
    const { projectDir } = cfg

    // Update package.json with latest River Build dependencies
    await addDependencies(projectDir, (json) => {
        const allRiverBuildDeps = Object.keys(json.dependencies).filter((dep) =>
            dep.startsWith('@river-build'),
        )
        const allRiverBuildDevDeps = Object.keys(json.devDependencies).filter((dep) =>
            dep.startsWith('@river-build'),
        )
        return {
            dependencies: [...allRiverBuildDeps, ['@wagmi/core', json.dependencies.wagmi]],
            devDependencies: [
                ...allRiverBuildDevDeps,
                // hardcoded for now. ^5.1.6 will make npm install to get the latest 5.x.x
                ['typescript', '5.1.6'],
            ],
        }
    })
}

const fixTsConfig = async (cfg: CreateRiverBuildAppConfig) => {
    const { projectDir } = cfg
    const tsConfigPath = path.join(projectDir, 'tsconfig.json')

    if (fs.existsSync(tsConfigPath)) {
        const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf8')
        // TSConfig is a JSON with comments, so we need to parse it with jsonc-parser
        const tsConfig = jsoncParser.parse(tsConfigContent)

        if (tsConfig.extends === './../tsconfig.base.json') {
            // Create an edit to replace the extends value
            const edits = jsoncParser.modify(tsConfigContent, ['extends'], './tsconfig.base.json', {
                formattingOptions: { tabSize: 2 },
            })

            // Apply the edit
            const updatedContent = jsoncParser.applyEdits(tsConfigContent, edits)
            fs.writeFileSync(tsConfigPath, updatedContent)
        }
    }
}
