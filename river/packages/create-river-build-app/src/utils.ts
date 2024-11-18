import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export type CreateRiverBuildAppConfig = {
    projectDir: string
    packageName: string
    targetDir: string
    viteTemplate: 'react-ts' | 'react'
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

export const addDependencies = async (cfg: {
    projectDir: string
    dependencies: string[]
    devDependencies?: string[]
}) => {
    const { projectDir, dependencies, devDependencies } = cfg

    const packageJsonPath = path.join(projectDir, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

    if (devDependencies && devDependencies.length > 0) {
        if (!packageJson.devDependencies) {
            packageJson.devDependencies = {}
        }
        for (const dep of devDependencies) {
            packageJson.devDependencies[dep] = 'latest'
        }
    }

    if (!packageJson.dependencies) {
        packageJson.dependencies = {}
    }
    for (const dep of dependencies) {
        packageJson.dependencies[dep] = 'latest'
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
}

export const formatTargetDir = (targetDir: string | undefined) =>
    targetDir?.trim().replace(/\/+$/g, '')
