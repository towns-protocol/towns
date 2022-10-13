/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_ZionSpaceManagerArtifact from '@harmony/contracts/goerli/abis/ZionSpaceManager.json'

import Goerli_CouncilNFTArtifact from '@harmony/contracts/goerli/abis/CouncilNFT.json'
import Goerli_CouncilAddresses from '@harmony/contracts/goerli/addresses/council.json'

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_ZionSpaceManagerArtifact from '@harmony/contracts/localhost/abis/ZionSpaceManager.json'

import Localhost_CouncilAddresses from '@harmony/contracts/localhost/addresses/council.json'
import Localhost_CouncilNFTArtifact from '@harmony/contracts/localhost/abis/CouncilNFT.json'

import { ethers } from 'ethers'

export interface IZionContractsInfo {
    spaceManager: {
        abi: ethers.ContractInterface
        addresses: {
            spacemanager: string
            usergranted: string
            tokengranted: string
        }
    }
    council: {
        abi: ethers.ContractInterface
        addresses: { councilnft: string }
    }
}

/// get zion contract addresses for a given network id
/// aellis 2021-09-09,
/// map chainId to json
export function getContractInfo(chainId: number): IZionContractsInfo {
    switch (chainId) {
        case 5:
            return {
                spaceManager: {
                    abi: Goerli_ZionSpaceManagerArtifact.abi,
                    addresses: Goerli_SpaceManagerAddresses,
                },
                council: {
                    abi: Goerli_CouncilNFTArtifact.abi,
                    addresses: Goerli_CouncilAddresses,
                },
            }
        case 1337:
        case 31337:
            return {
                spaceManager: {
                    abi: Localhost_ZionSpaceManagerArtifact.abi,
                    addresses: Localhost_SpaceManagerAddresses,
                },
                council: {
                    abi: Localhost_CouncilNFTArtifact.abi,
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
                    abi: Localhost_ZionSpaceManagerArtifact.abi,
                    addresses: { spacemanager: '', usergranted: '', tokengranted: '' },
                },
                council: {
                    abi: Localhost_CouncilNFTArtifact.abi,
                    addresses: { councilnft: '' },
                },
            }
    }
}
