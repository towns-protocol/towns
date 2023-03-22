/* eslint-disable no-restricted-imports */

import GoerliIEntitlementModuleAbi from '@harmony/generated/goerli/abis/IEntitlement.abi.json' assert { type: 'json' }
import GoerliSpaceAbi from '@harmony/generated/goerli/abis/Space.abi.json' assert { type: 'json' }
import GoerliTokenEntitlementAbi from '@harmony/generated/goerli/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import GoerliUserEntitlementAbi from '@harmony/generated/goerli/abis/UserEntitlement.abi.json' assert { type: 'json' }
import LocalhostUserEntitlementAbi from '@harmony/generated/localhost/abis/UserEntitlement.abi.json' assert { type: 'json' }
import { IEntitlementModuleShim } from './IEntitlementModuleShim'
import LocalhostIEntitlementModuleAbi from '@harmony/generated/localhost/abis/IEntitlement.abi.json' assert { type: 'json' }
import LocalhostSpaceAbi from '@harmony/generated/localhost/abis/Space.abi.json' assert { type: 'json' }
import LocalhostTokenEntitlementAbi from '@harmony/generated/localhost/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import SepoliaIEntitlementModuleAbi from '@harmony/generated/sepolia/abis/IEntitlement.abi.json' assert { type: 'json' }
import SepoliaSpaceAbi from '@harmony/generated/sepolia/abis/Space.abi.json' assert { type: 'json' }
import SepoliaTokenEntitlementAbi from '@harmony/generated/sepolia/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import { TokenEntitlementShim } from './TokenEntitlementShim'
import { UserEntitlementShim } from './UserEntitlementShim'
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
            case 11155111:
                return SepoliaSpaceAbi
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
            case 11155111:
                return new IEntitlementModuleShim(
                    address,
                    SepoliaIEntitlementModuleAbi,
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
            case 11155111:
                return new TokenEntitlementShim(
                    address,
                    SepoliaTokenEntitlementAbi,
                    chainId,
                    provider,
                    signer,
                )
            default:
                throw new Error(`TokenEntitlement for chain id ${chainId} is not supported.`)
        }
    }

    public static createUserEntitlement(
        address: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ): UserEntitlementShim {
        // todo: fetch the abi by version. For now, use the latest abi
        // from json.
        switch (chainId) {
            case 31337:
                return new UserEntitlementShim(
                    address,
                    LocalhostUserEntitlementAbi,
                    chainId,
                    provider,
                    signer,
                )
            case 5:
                return new UserEntitlementShim(
                    address,
                    GoerliUserEntitlementAbi,
                    chainId,
                    provider,
                    signer,
                )
            case 11155111:
                return new UserEntitlementShim(
                    address,
                    SepoliaIEntitlementModuleAbi,
                    chainId,
                    provider,
                    signer,
                )
            default:
                throw new Error(`UserEntitlement for chain id ${chainId} is not supported.`)
        }
    }
}
