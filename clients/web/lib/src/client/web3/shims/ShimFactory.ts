/* eslint-disable no-restricted-imports */

import GoerliIEntitlementModuleAbi from '@harmony/contracts/goerli/abis/IEntitlementModule.abi.json' assert { type: 'json' }
import GoerliSpaceAbi from '@harmony/contracts/goerli/abis/Space.abi.json' assert { type: 'json' }
import GoerliTokenEntitlementAbi from '@harmony/contracts/goerli/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import LocalhostIEntitlementModuleAbi from '@harmony/contracts/localhost/abis/IEntitlementModule.abi.json' assert { type: 'json' }
import LocalhostSpaceAbi from '@harmony/contracts/localhost/abis/Space.abi.json' assert { type: 'json' }
import LocalhostTokenEntitlementAbi from '@harmony/contracts/localhost/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import { IEntitlementModuleShim } from './IEntitlementModuleShim'
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
            case 5:
                return GoerliSpaceAbi
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
            case 5:
                return new IEntitlementModuleShim(
                    address,
                    GoerliIEntitlementModuleAbi,
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
            case 5:
                return new TokenEntitlementShim(
                    address,
                    GoerliTokenEntitlementAbi,
                    chainId,
                    provider,
                    signer,
                )
            default:
                throw new Error(`TokenEntitlement for chain id ${chainId} is not supported.`)
        }
    }
}
