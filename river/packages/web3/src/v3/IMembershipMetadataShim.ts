import {
    IMembershipMetadata as LocalhostContract,
    IMembershipMetadataInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IMembershipMetadata'

import LocalhostAbi from '@river-build/generated/dev/abis/IMembershipMetadata.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IMembershipMetadataShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface
> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
