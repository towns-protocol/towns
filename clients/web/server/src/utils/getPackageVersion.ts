import fs from 'node:fs/promises'
import path from 'node:path'

interface PackageJson {
    version: string
    [key: string]: unknown
}

export async function getPackageVersion(
    packagePath: string = '../app/package.json',
): Promise<string> {
    try {
        // Read the package.json file
        const fullPath = path.resolve(packagePath)
        const data = await fs.readFile(fullPath, 'utf8')

        // Parse the JSON content with type assertion
        const packageJson = JSON.parse(data) as PackageJson

        // Check if version exists and is a string
        if (typeof packageJson.version !== 'string') {
            throw new Error('Version not found or not a string in package.json')
        }

        return packageJson.version
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to parse package.json: ${error.message}`)
        } else {
            throw new Error('An unknown error occurred')
        }
    }
}
