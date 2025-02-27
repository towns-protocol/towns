import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import playgroundPackageJson from '../../playground/package.json' assert { type: 'json' }

export type CreateRiverBuildAppConfig = {
    projectDir: string
    packageName: string
    targetDir: string
    viteTemplate?: 'react-ts' | 'react'
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

type PackageJson = typeof playgroundPackageJson

export const addDependencies = async (
    projectDir: string,
    cfg: (currentDeps: PackageJson) => {
        dependencies: Array<string | string[]>
        devDependencies?: Array<string | string[]>
    },
) => {
    const packageJsonPath = path.join(projectDir, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const { dependencies, devDependencies } = cfg(packageJson)

    if (devDependencies && devDependencies.length > 0) {
        if (!packageJson.devDependencies) {
            packageJson.devDependencies = {}
        }
        for (const dep of devDependencies) {
            if (Array.isArray(dep)) {
                packageJson.devDependencies[dep[0]] = dep[1]
            } else {
                packageJson.devDependencies[dep] = 'latest'
            }
        }
    }

    if (!packageJson.dependencies) {
        packageJson.dependencies = {}
    }
    for (const dep of dependencies) {
        if (Array.isArray(dep)) {
            packageJson.dependencies[dep[0]] = dep[1]
        } else {
            packageJson.dependencies[dep] = 'latest'
        }
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
}

export const formatTargetDir = (targetDir: string | undefined) =>
    targetDir?.trim().replace(/\/+$/g, '')
