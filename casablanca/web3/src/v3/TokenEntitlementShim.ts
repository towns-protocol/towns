import {
    TokenEntitlement as GoerliContract,
    TokenEntitlementInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/TokenEntitlement'
import {
    TokenEntitlement as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    TokenEntitlementInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/TokenEntitlement'
import {
    TokenEntitlement as SepoliaContract,
    TokenEntitlementInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/TokenEntitlement'
import {
    TokenEntitlement as BaseGoerliContract,
    TokenEntitlementInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/TokenEntitlement'

import GoerliAbi from '@towns/generated/goerli/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import { BigNumberish, ethers } from 'ethers'

import { BaseContractShimV3 } from './BaseContractShimV3'
import { decodeExternalTokens } from './ConvertersEntitlements'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'

export type { LocalhostDataTypes as TokenEntitlementDataTypes }

export class TokenEntitlementShim
    extends BaseContractShimV3<
        LocalhostContract,
        LocalhostInterface,
        GoerliContract,
        GoerliInterface,
        SepoliaContract,
        SepoliaInterface,
        BaseGoerliContract,
        BaseGoerliInterface
    >
    implements EntitlementModule
{
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }

    public get moduleType(): EntitlementModuleType {
        return EntitlementModuleType.TokenEntitlement
    }

    public async getRoleEntitlement(
        roleId: BigNumberish,
    ): Promise<LocalhostDataTypes.ExternalTokenStruct[]> {
        // a token-gated entitlement can have multiple tokens OR together, or AND together.
        // the first dimensions are the ORs; the second dimensions are the ANDs.
        const rawTokenDetails: LocalhostDataTypes.ExternalTokenStruct[][] = []
        let encodedTokens: string[] = []
        try {
            encodedTokens = await this.read.getEntitlementDataByRoleId(roleId)
        } catch (e) {
            console.log('Error reading token entitlement data by role id', e)
        }
        for (const t of encodedTokens) {
            const tokens = decodeExternalTokens(t)
            rawTokenDetails.push(tokens)
        }
        // verify that we have only one token.
        // the app only requires one at the moment.
        // tn the future we might want to support more.
        if (rawTokenDetails.length > 1) {
            console.error(
                'More than one token entitlement not supported at the moment.',
                rawTokenDetails,
            )
            throw new Error('More than one token entitlement not supported at the moment.')
        }

        // Return the token entitlement details.
        const tokens: LocalhostDataTypes.ExternalTokenStruct[] = rawTokenDetails.length
            ? rawTokenDetails[0]
            : []
        return tokens
    }
}
