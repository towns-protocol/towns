import spawn from 'cross-spawn'
import { addDependencies, getPackageManager, type CreateRiverBuildAppConfig } from '../utils'
import path from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import picocolors from 'picocolors'

export const buildRiverReactApp = async (cfg: CreateRiverBuildAppConfig) => {
    const result = await scaffoldViteReactApp(cfg)

    if (result.signal === 'SIGINT' || result.signal === 'SIGTERM') {
        console.log('\nOperation cancelled')
        process.exit(1)
    }
    if (result.status !== 0) {
        console.error(picocolors.red('\nFailed to scaffold project.'))
        process.exit(1)
    }

    console.log(picocolors.green('\nVite project created successfully.'))
    console.log(picocolors.blue('\nAdding River SDK dependencies...'))

    await addDependencies({
        projectDir: cfg.projectDir,
        dependencies: ['@river-build/react-sdk', '@river-build/sdk'],
        devDependencies: ['vite-plugin-node-polyfills'],
    })

    console.log(picocolors.green('\nRiver SDK dependencies added successfully.'))
    console.log(picocolors.blue('\nUpdating vite.config.ts...'))

    await updateViteConfigWithPolyfills(cfg)

    console.log(picocolors.green('\nvite.config.ts updated successfully.'))
}

const scaffoldViteReactApp = async (cfg: CreateRiverBuildAppConfig) => {
    const { targetDir, packageName, viteTemplate } = cfg
    const pkgManager = getPackageManager()

    const createViteCommand = (() => {
        const nameForViteScript = targetDir === '.' ? '.' : packageName
        switch (pkgManager) {
            case 'yarn':
                return ['create', 'vite', nameForViteScript, '--template', viteTemplate]
            case 'pnpm':
                return ['create', 'vite', nameForViteScript, '--template', viteTemplate]
            case 'bun':
                return ['create', 'vite', nameForViteScript, '--template', viteTemplate]
            default:
                // npm requires the -- flag to pass args to the template
                return [
                    'create',
                    'vite@latest',
                    nameForViteScript,
                    '--',
                    '--template',
                    viteTemplate,
                ]
        }
    })()

    return spawn.sync(pkgManager, createViteCommand, { stdio: 'inherit' })
}

const updateViteConfigWithPolyfills = async (cfg: CreateRiverBuildAppConfig) => {
    const { projectDir, viteTemplate } = cfg
    const isJsTemplate = viteTemplate === 'react'
    const viteConfigPath = path.join(projectDir, isJsTemplate ? 'vite.config.js' : 'vite.config.ts')
    let viteConfig = readFileSync(viteConfigPath, 'utf8')

    // Add import for vite-plugin-node-polyfills
    viteConfig = `import { nodePolyfills } from 'vite-plugin-node-polyfills'\n${viteConfig}`

    // Add nodePolyfills to plugins array
    viteConfig = viteConfig.replace(/plugins:\s*\[([\s\S]*?)\]/, (_, pluginsContent) => {
        const trimmedContent = pluginsContent.trim()
        const separator = trimmedContent ? ',\n    ' : ''
        return `plugins: [${pluginsContent}${separator}nodePolyfills()\n  ]`
    })

    writeFileSync(viteConfigPath, viteConfig)
}
