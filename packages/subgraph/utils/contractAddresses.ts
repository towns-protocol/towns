import * as fs from 'fs'
import * as path from 'path'
import { getAddress, Address } from 'viem'
import { findRelativePath } from './pathUtils'
import { fileURLToPath } from 'url'

// Get __dirname in a way that works for both ESM and CJS
let __dirname: string
if (typeof import.meta?.url !== 'undefined') {
    // ES modules
    const __filename = fileURLToPath(import.meta.url)
    __dirname = path.dirname(__filename)
} else {
    // CommonJS - __dirname is already defined globally
    // @ts-ignore
    __dirname = globalThis.__dirname || process.cwd()
}

// Try to find the contracts directory dynamically
const contractsPath = findRelativePath('contracts')
const defaultBaseDir = contractsPath
    ? `${contractsPath}/deployments`
    : '../../contracts/deployments'

/**
 * Configuration options for address resolution
 */
export interface AddressResolverOptions {
    /**
     * Base directory for contract deployments
     * @default Dynamically determined based on project structure
     */
    baseDir?: string

    /**
     * Whether to throw an error if address is not found
     * @default true
     */
    throwOnError?: boolean

    /**
     * Whether to enable debug logging
     * @default false
     */
    debug?: boolean
}

/**
 * Default options for address resolution
 */
const DEFAULT_OPTIONS: AddressResolverOptions = {
    baseDir: defaultBaseDir,
    throwOnError: true,
    debug: false,
}

/**
 * Get a contract address based on environment and contract name
 *
 * @param contractName - Name of the contract (e.g., 'spaceFactory')
 * @param environment - Environment name (e.g., 'gamma', 'alpha', 'omega', 'delta', 'local_multi')
 * @param options - Configuration options
 * @returns The contract address or null if not found and throwOnError is false
 */
export function getContractAddress(
    contractName: string,
    network: 'base' | 'river',
    environment: string,
    options?: Partial<AddressResolverOptions>,
): Address | null {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const env = environment

    try {
        // Construct the path to the address file
        const addressPath = path.resolve(
            __dirname,
            `${opts.baseDir}/${env}/${network}/addresses/${contractName}.json`,
        )

        if (opts.debug) {
            console.log(`Looking for contract ${contractName} in environment ${env}`)
            console.log(`Address path: ${addressPath}`)
            console.log(`__dirname: ${__dirname}`)
            console.log(`Working directory: ${process.cwd()}`)
        }

        // Check if the file exists
        if (!fs.existsSync(addressPath)) {
            if (opts.throwOnError) {
                throw new Error(
                    `Address file not found for contract ${contractName} in environment ${env}`,
                )
            }

            return null
        }

        // Read and parse the file
        const data = JSON.parse(fs.readFileSync(addressPath, 'utf8'))

        if (opts.debug) {
            console.log(`Found address for ${contractName}: ${data.address}`)
        }

        return getAddress(data.address)
    } catch (error) {
        console.error(
            `Error loading address for contract ${contractName} in environment ${env}:`,
            error,
        )

        if (opts.throwOnError) {
            throw error
        }

        return null
    }
}
