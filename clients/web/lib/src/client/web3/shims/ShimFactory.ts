/* eslint-disable no-restricted-imports */

import GoerliIEntitlementModuleAbi from '@towns/generated/goerli/abis/IEntitlement.abi.json' assert { type: 'json' }
import GoerliSpaceAbi from '@towns/generated/goerli/abis/Space.abi.json' assert { type: 'json' }
import GoerliTokenEntitlementAbi from '@towns/generated/goerli/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import GoerliUserEntitlementAbi from '@towns/generated/goerli/abis/UserEntitlement.abi.json' assert { type: 'json' }
import LocalhostUserEntitlementAbi from '@towns/generated/localhost/abis/UserEntitlement.abi.json' assert { type: 'json' }
import { IEntitlementModuleShim } from './IEntitlementModuleShim'
import LocalhostIEntitlementModuleAbi from '@towns/generated/localhost/abis/IEntitlement.abi.json' assert { type: 'json' }
import LocalhostSpaceAbi from '@towns/generated/localhost/abis/Space.abi.json' assert { type: 'json' }
import LocalhostTokenEntitlementAbi from '@towns/generated/localhost/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import SepoliaIEntitlementModuleAbi from '@towns/generated/sepolia/abis/IEntitlement.abi.json' assert { type: 'json' }
import SepoliaSpaceAbi from '@towns/generated/sepolia/abis/Space.abi.json' assert { type: 'json' }
import SepoliaTokenEntitlementAbi from '@towns/generated/sepolia/abis/TokenEntitlement.abi.json' assert { type: 'json' }
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
                )
            case 5:
                return new IEntitlementModuleShim(
                    address,
                    GoerliIEntitlementModuleAbi,
                    chainId,
                    provider,
                )
            case 11155111:
                return new IEntitlementModuleShim(
                    address,
                    SepoliaIEntitlementModuleAbi,
                    chainId,
                    provider,
                )
            default:
                throw new Error(`Entitlement module for chain id ${chainId} is not supported.`)
        }
    }

    public static createTokenEntitlement(
        address: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
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
                )
            case 5:
                return new TokenEntitlementShim(
                    address,
                    GoerliTokenEntitlementAbi,
                    chainId,
                    provider,
                )
            case 11155111:
                return new TokenEntitlementShim(
                    address,
                    SepoliaTokenEntitlementAbi,
                    chainId,
                    provider,
                )
            default:
                throw new Error(`TokenEntitlement for chain id ${chainId} is not supported.`)
        }
    }

    public static createUserEntitlement(
        address: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
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
                )
            case 5:
                return new UserEntitlementShim(address, GoerliUserEntitlementAbi, chainId, provider)
            case 11155111:
                return new UserEntitlementShim(
                    address,
                    SepoliaIEntitlementModuleAbi,
                    chainId,
                    provider,
                )
            default:
                throw new Error(`UserEntitlement for chain id ${chainId} is not supported.`)
        }
    }
}
