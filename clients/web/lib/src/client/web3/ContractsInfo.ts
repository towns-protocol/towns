/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import GoerliCouncilAddresses from '@harmony/contracts/goerli/addresses/council.json'
// todo: goerli SpaceFactory is not deployed yet. Fake it for now.
import GoerliSpaceFactoryAbi from '@harmony/contracts/localhost/abis/SpaceFactory.abi.json'
// todo: goerli SpaceFactory is not deployed yet. Fake it for now.
import GoerliSpaceFactoryAddress from '@harmony/contracts/localhost/addresses/space-factory.json'
import GoerliSpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import LocalhostCouncilAddresses from '@harmony/contracts/localhost/addresses/council.json'
import LocalhostSpaceFactoryAbi from '@harmony/contracts/localhost/abis/SpaceFactory.abi.json'
import LocalhostSpaceFactoryAddress from '@harmony/contracts/localhost/addresses/space-factory.json'
import LocalhostSpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'

export interface IContractsInfo {
    spaceManager: {
        addresses: {
            spacemanager: string
            usergranted: string
            tokengranted: string
            rolemanager: string
        }
    }
    council: {
        address: { councilnft: string }
    }
    spaceFactory: {
        abi: typeof LocalhostSpaceFactoryAbi | typeof GoerliSpaceFactoryAbi
        address: typeof LocalhostSpaceFactoryAddress | typeof GoerliSpaceFactoryAddress
    }
}

/// get contract info for a given chain id
export function getContractsInfo(chainId: number): IContractsInfo {
    switch (chainId) {
        case 5:
            return {
                spaceManager: {
                    addresses: GoerliSpaceManagerAddresses,
                },
                council: {
                    address: GoerliCouncilAddresses,
                },
                spaceFactory: {
                    abi: GoerliSpaceFactoryAbi,
                    address: GoerliSpaceFactoryAddress,
                },
            }
        case 31337:
            return {
                spaceManager: {
                    addresses: LocalhostSpaceManagerAddresses,
                },
                council: {
                    address: LocalhostCouncilAddresses,
                },
                spaceFactory: {
                    abi: LocalhostSpaceFactoryAbi,
                    address: LocalhostSpaceFactoryAddress,
                },
            }
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update ContractsInfo.ts`)
    }
}
