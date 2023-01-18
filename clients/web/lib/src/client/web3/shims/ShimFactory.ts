/* eslint-disable no-restricted-imports */

import { IEntitlementModuleShim } from './IEntitlementModuleShim'
import LocalhostIEntitlementModuleAbi from '@harmony/contracts/localhost/abis/IEntitlementModule.abi.json'
import LocalhostSpaceAbi from '@harmony/contracts/localhost/abis/Space.abi.json'
import LocalhostTokenEntitlementAbi from '@harmony/contracts/localhost/abis/TokenEntitlement.abi.json'
import { TokenEntitlementShim } from './TokenEntitlementShim'
import { ethers } from 'ethers'

/*
Factory to create shim objects
*/
export class ShimFactory {
    public static getSpaceAbi(chainId: number, _spaceId: string): ethers.ContractInterface {
        // todo: fetch the abi by version. For now, use the latest abi
        // from json.
        switch (chainId) {
            case 31337:
                return LocalhostSpaceAbi
            default:
                throw new Error(`Space abi for chain id ${chainId} is not supported.`)
        }
    }

    public static createEntitlementModule(
        address: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ): IEntitlementModuleShim {
        // todo: fetch the abi by version. For now, use the latest abi
        // from json.
        switch (chainId) {
            case 31337:
                return new IEntitlementModuleShim(
                    address,
                    LocalhostIEntitlementModuleAbi,
                    chainId,
                    provider,
                    signer,
                )
            default:
                throw new Error(`Entitlement module for chain id ${chainId} is not supported.`)
        }
    }

    public static createTokenEntitlement(
        address: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ): TokenEntitlementShim {
        // todo: fetch the abi by version. For now, use the latest abi
        // from json.
        switch (chainId) {
            case 31337:
                return new TokenEntitlementShim(
                    address,
                    LocalhostTokenEntitlementAbi,
                    chainId,
                    provider,
                    signer,
                )
            default:
                throw new Error(`TokenEntitlement for chain id ${chainId} is not supported.`)
        }
    }
}
