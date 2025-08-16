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
     * Default environment to use if none is specified
     * @default 'gamma'
     */
    defaultEnvironment?: string

    /**
     * Network name
     * @default 'base'
     */
    network?: string

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
    defaultEnvironment: 'gamma',
    network: 'base',
    throwOnError: true,
    debug: false,
}

/**
 * Get a contract address based on environment and contract name
 *
 * @param contractName - Name of the contract (e.g., 'spaceFactory')
 * @param environment - Environment name (e.g., 'gamma', 'beta', 'prod')
 * @param options - Configuration options
 * @returns The contract address or null if not found and throwOnError is false
 */
export function getContractAddress(
    contractName: string,
    environment?: string,
    options?: Partial<AddressResolverOptions>,
): Address | null {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const env = environment || process.env.PONDER_ENVIRONMENT || opts.defaultEnvironment

    try {
        // Construct the path to the address file
        const addressPath = path.resolve(
            __dirname,
            `${opts.baseDir}/${env}/${opts.network}/addresses/${contractName}.json`,
        )

        if (opts.debug) {
            console.log(`Looking for contract ${contractName} in environment ${env}`)
            console.log(`Address path: ${addressPath}`)
            console.log(`__dirname: ${__dirname}`)
            console.log(`Working directory: ${process.cwd()}`)
        }

        // Check if the file exists
        if (!fs.existsSync(addressPath)) {
            if (env !== opts.defaultEnvironment) {
                console.warn(
                    `Address file not found for contract ${contractName} in environment ${env}, falling back to ${opts.defaultEnvironment}`,
                )
                // Fallback to default environment if the file doesn't exist
                return getContractAddress(contractName, opts.defaultEnvironment, options)
            }

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

/**
 * Get multiple contract addresses based on environment
 *
 * @param contractNames - Array of contract names
 * @param environment - Environment name
 * @param options - Configuration options
 * @returns Object mapping contract names to addresses
 */
export function getContractAddresses(
    contractNames: string[],
    environment?: string,
    options?: Partial<AddressResolverOptions>,
): Record<string, Address> {
    const addresses: Record<string, Address> = {}
    const opts = { ...DEFAULT_OPTIONS, ...options }

    if (opts.debug) {
        console.log(`Getting addresses for contracts: ${contractNames.join(', ')}`)
        console.log(
            `Environment: ${
                environment || process.env.PONDER_ENVIRONMENT || opts.defaultEnvironment
            }`,
        )
    }

    for (const contractName of contractNames) {
        try {
            const address = getContractAddress(contractName, environment, {
                ...options,
                throwOnError: true,
            })
            if (address) {
                addresses[contractName] = address
            }
        } catch (error) {
            console.warn(`Failed to get address for ${contractName}:`, error)

            if (options?.throwOnError !== false) {
                throw error
            }
        }
    }

    return addresses
}

/**
 * Get all contract addresses for a specific environment
 *
 * @param environment - Environment name
 * @param options - Configuration options
 * @returns Object mapping contract names to addresses
 */
export function getAllContractAddresses(
    environment?: string,
    options?: Partial<AddressResolverOptions>,
): Record<string, Address> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const env = environment || process.env.PONDER_ENVIRONMENT || opts.defaultEnvironment

    if (opts.debug) {
        console.log(`Getting all addresses for environment: ${env}`)
    }

    try {
        // Construct the path to the addresses directory
        const addressesDir = path.resolve(
            __dirname,
            `${opts.baseDir}/${env}/${opts.network}/addresses`,
        )

        if (opts.debug) {
            console.log(`Addresses directory: ${addressesDir}`)
        }

        // Check if the directory exists
        if (!fs.existsSync(addressesDir)) {
            if (env !== opts.defaultEnvironment) {
                console.warn(
                    `Addresses directory not found for environment ${env}, falling back to ${opts.defaultEnvironment}`,
                )
                // Fallback to default environment if the directory doesn't exist
                return getAllContractAddresses(opts.defaultEnvironment, options)
            }

            if (opts.throwOnError) {
                throw new Error(`Addresses directory not found for environment ${env}`)
            }

            return {}
        }

        // Read all files in the directory
        const files = fs.readdirSync(addressesDir)
        const addresses: Record<string, Address> = {}

        for (const file of files) {
            if (file.endsWith('.json')) {
                const contractName = file.replace('.json', '')
                const filePath = path.join(addressesDir, file)
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
                addresses[contractName] = getAddress(data.address)

                if (opts.debug) {
                    console.log(`Found address for ${contractName}: ${data.address}`)
                }
            }
        }

        return addresses
    } catch (error) {
        console.error(`Error loading all addresses for environment ${env}:`, error)

        if (opts.throwOnError) {
            throw error
        }

        return {}
    }
}
