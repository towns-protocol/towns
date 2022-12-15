/* eslint-disable no-restricted-imports */

import Goerli_CouncilNFTArtifactAbi from '@harmony/contracts/goerli/abis/CouncilNFT.abi.json'
import Goerli_CouncilAddresses from '@harmony/contracts/goerli/addresses/council.json'
import { CouncilNFT as Goerli_CouncilNFT } from '@harmony/contracts/goerli/typings/CouncilNFT'

import Localhost_CouncilAddresses from '@harmony/contracts/localhost/addresses/council.json'
import Localhost_CouncilNFTArtifactAbi from '@harmony/contracts/localhost/abis/CouncilNFT.abi.json'
import { CouncilNFT as Localhost_CouncilNFT } from '@harmony/contracts/localhost/typings/CouncilNFT'
import { PromiseOrValue as Localhost_PromiseOrValue } from '@harmony/contracts/localhost/typings/common'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

/**
 * This class is a shim https://en.wikipedia.org/wiki/Shim_(computing)
 *
 * we want to enable fast development on local host
 * but we also want to be able to deploy to other networks
 * This class wraps the contract and provides a consistent interface
 * to the rest of the application, and handles any differences between
 * apis on different networks
 *
 * all return types should eithr be generic, or transform to the local host data types
 * adding a new network should be as simple as exporing new abis and types, and
 * adding a new case to the switch statement in the base class
 *
 * in the case that the api is the same (like signed.interface.parseError, feel free
 * to just use the base class common implementation)
 */

export type PromiseOrValue<T> = Localhost_PromiseOrValue<T>

export class CouncilNFTShim extends BaseContractShim<Localhost_CouncilNFT, Goerli_CouncilNFT> {
    constructor(
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
        chainId: number,
    ) {
        super(chainId, provider, signer, {
            localhost: {
                address: Localhost_CouncilAddresses.councilnft,
                abi: Localhost_CouncilNFTArtifactAbi,
            },
            goerli: {
                address: Goerli_CouncilAddresses.councilnft,
                abi: Goerli_CouncilNFTArtifactAbi,
            },
        })
    }
}
