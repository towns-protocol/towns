import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Utility to check if a path exists and print debug information
 *
 * @param relativePath - Relative path to check
 * @param baseDir - Base directory to resolve from (defaults to __dirname)
 * @returns Object with path information
 */
export function checkPath(
    relativePath: string,
    baseDir: string = __dirname,
): {
    exists: boolean
    resolvedPath: string
    baseDir: string
    workingDir: string
} {
    const resolvedPath = path.resolve(baseDir, relativePath)
    const exists = fs.existsSync(resolvedPath)

    return {
        exists,
        resolvedPath,
        baseDir,
        workingDir: process.cwd(),
    }
}

/**
 * Utility to find the correct relative path to a target directory
 *
 * @param targetDir - Target directory to find
 * @param maxLevels - Maximum number of parent directories to check
 * @returns The correct relative path or null if not found
 */
export function findRelativePath(
    targetDir: string,
    maxLevels: number = 5,
): string | null {
    const workingDir = process.cwd()
    console.log(`Working directory: ${workingDir}`)
    console.log(`Current directory (__dirname): ${__dirname}`)

    // Try different relative paths
    for (let i = 0; i <= maxLevels; i++) {
        const prefix = '../'.repeat(i)
        const testPath = path.resolve(__dirname, `${prefix}${targetDir}`)
        const exists = fs.existsSync(testPath)

        console.log(
            `Testing path: ${testPath} - ${exists ? 'EXISTS' : 'NOT FOUND'}`,
        )

        if (exists) {
            return `${prefix}${targetDir}`
        }
    }

    return null
}

/**
 * List all files in a directory recursively
 *
 * @param dirPath - Directory path to list
 * @param options - Options for listing
 * @returns Array of file paths
 */
export function listFilesRecursive(
    dirPath: string,
    options: {
        maxDepth?: number
        currentDepth?: number
        filter?: (filePath: string) => boolean
    } = {},
): string[] {
    const { maxDepth = Infinity, currentDepth = 0, filter } = options

    if (currentDepth > maxDepth || !fs.existsSync(dirPath)) {
        return []
    }

    try {
        const files = fs.readdirSync(dirPath)
        let result: string[] = []

        for (const file of files) {
            const filePath = path.join(dirPath, file)
            const stat = fs.statSync(filePath)

            if (stat.isDirectory()) {
                result = result.concat(
                    listFilesRecursive(filePath, {
                        maxDepth,
                        currentDepth: currentDepth + 1,
                        filter,
                    }),
                )
            } else {
                if (!filter || filter(filePath)) {
                    result.push(filePath)
                }
            }
        }

        return result
    } catch (error) {
        console.error(`Error listing files in ${dirPath}:`, error)
        return []
    }
}

/**
 * Find all JSON files that match a pattern in a directory
 *
 * @param baseDir - Base directory to search in
 * @param pattern - Pattern to match in the file content
 * @returns Array of matching file paths
 */
export function findJsonFiles(baseDir: string, pattern: string): string[] {
    const files = listFilesRecursive(baseDir, {
        filter: (filePath) => filePath.endsWith('.json'),
    })

    return files.filter((filePath) => {
        try {
            const content = fs.readFileSync(filePath, 'utf8')
            return content.includes(pattern)
        } catch (error) {
            return false
        }
    })
}
