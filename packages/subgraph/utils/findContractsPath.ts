import { findRelativePath, checkPath } from './pathUtils'

/**
 * This script helps find the correct relative path to the contracts directory
 */

// Try to find the contracts directory
const contractsPath = findRelativePath('contracts')
console.log('\nResult:')
if (contractsPath) {
    console.log(`Found contracts directory at: ${contractsPath}`)

    // Check if the deployments directory exists
    const deploymentsPath = `${contractsPath}/deployments`
    const deploymentsCheck = checkPath(deploymentsPath)
    console.log(`\nDeployments directory check:`)
    console.log(`Path: ${deploymentsCheck.resolvedPath}`)
    console.log(`Exists: ${deploymentsCheck.exists}`)

    // If deployments exists, check for gamma environment
    if (deploymentsCheck.exists) {
        const gammaPath = `${deploymentsPath}/gamma`
        const gammaCheck = checkPath(gammaPath)
        console.log(`\nGamma environment check:`)
        console.log(`Path: ${gammaCheck.resolvedPath}`)
        console.log(`Exists: ${gammaCheck.exists}`)

        // If gamma exists, check for base network
        if (gammaCheck.exists) {
            const basePath = `${gammaPath}/base`
            const baseCheck = checkPath(basePath)
            console.log(`\nBase network check:`)
            console.log(`Path: ${baseCheck.resolvedPath}`)
            console.log(`Exists: ${baseCheck.exists}`)

            // If base exists, check for addresses directory
            if (baseCheck.exists) {
                const addressesPath = `${basePath}/addresses`
                const addressesCheck = checkPath(addressesPath)
                console.log(`\nAddresses directory check:`)
                console.log(`Path: ${addressesCheck.resolvedPath}`)
                console.log(`Exists: ${addressesCheck.exists}`)

                // If addresses exists, check for spaceFactory.json
                if (addressesCheck.exists) {
                    const spaceFactoryPath = `${addressesPath}/spaceFactory.json`
                    const spaceFactoryCheck = checkPath(spaceFactoryPath)
                    console.log(`\nspaceFactory.json check:`)
                    console.log(`Path: ${spaceFactoryCheck.resolvedPath}`)
                    console.log(`Exists: ${spaceFactoryCheck.exists}`)
                }
            }
        }
    }

    console.log(`\nRecommended baseDir setting: '${contractsPath}/deployments'`)
} else {
    console.log('Could not find contracts directory')
}

// Export the found path for potential use in other modules
export const foundContractsPath = contractsPath
