/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_CouncilAddresses from '@harmony/contracts/goerli/addresses/council.json'

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_CouncilAddresses from '@harmony/contracts/localhost/addresses/council.json'

export interface IZionContractsInfo {
    spaceManager: {
        addresses: {
            spacemanager: string
            usergranted: string
            tokengranted: string
        }
    }
    council: {
        addresses: { councilnft: string }
    }
}

/// get zion contract addresses for a given network id
export function getContractInfo(chainId: number): IZionContractsInfo {
    switch (chainId) {
        case 5:
            return {
                spaceManager: {
                    addresses: Goerli_SpaceManagerAddresses,
                },
                council: {
                    addresses: Goerli_CouncilAddresses,
                },
            }
        case 1337:
        case 31337:
            return {
                spaceManager: {
                    addresses: Localhost_SpaceManagerAddresses,
                },
                council: {
                    addresses: Localhost_CouncilAddresses,
                },
            }
        default:
            if (chainId !== 0) {
                console.error(
                    `Unsupported chainId, please add chainId: ${chainId} info to ZionContractAddresses.ts`,
                )
            }
            // return localhost, won't matter
            return {
                spaceManager: {
                    addresses: { spacemanager: '', usergranted: '', tokengranted: '' },
                },
                council: {
                    addresses: { councilnft: '' },
                },
            }
    }
}
