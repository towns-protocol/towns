import {
    TokenEntitlement as LocalhostContract,
    ITokenEntitlement as LocalhostDataTypes,
    TokenEntitlementInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/TokenEntitlement'
import {
    TokenEntitlement as BaseGoerliContract,
    TokenEntitlementInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/TokenEntitlement'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import { BigNumberish, ethers } from 'ethers'

import { BaseContractShim } from './BaseContractShim'
import { decodeExternalTokens } from '../ConvertersEntitlements'
import { EntitlementModuleType, EntitlementModule, ExternalTokenStruct } from '../ContractTypes'

export type { LocalhostDataTypes as TokenEntitlementDataTypes }

export class TokenEntitlementShim
    extends BaseContractShim<
        LocalhostContract,
        LocalhostInterface,
        BaseGoerliContract,
        BaseGoerliInterface
    >
    implements EntitlementModule
{
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
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
            const tokens = decodeExternalTokens(t) as ExternalTokenStruct<'v3'>[]
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
