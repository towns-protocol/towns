import LocalhostAbi from '@towns/generated/localhost/v3/abis/TokenEntitlement.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TokenEntitlement.abi'
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/TokenEntitlement.abi'

import { BaseContractShim } from './BaseContractShim'
import { Address, PublicClient } from 'viem'
import { decodeExternalTokens } from '../ConvertersEntitlements'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'
import { TokenEntitlementDataTypes } from './types'

const abis = {
    localhostAbi: LocalhostAbi,
    goerliAbi: BaseGoerliAbi,
    sepoliaAbi: BaseSepoliaAbi,
} as const

export class TokenEntitlementShim
    extends BaseContractShim<typeof abis>
    implements EntitlementModule
{
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }

    public get moduleType(): EntitlementModuleType {
        return EntitlementModuleType.TokenEntitlement
    }

    public async getRoleEntitlement(
        roleId: bigint,
    ): Promise<TokenEntitlementDataTypes['ExternalTokenStruct'][]> {
        // a token-gated entitlement can have multiple tokens OR together, or AND together.
        // the first dimensions are the ORs; the second dimensions are the ANDs.
        const rawTokenDetails: TokenEntitlementDataTypes['ExternalTokenStruct'][][] = []
        let encodedTokens: readonly Address[] = []
        try {
            encodedTokens = await this.read({
                functionName: 'getEntitlementDataByRoleId',
                args: [roleId],
            })
        } catch (e) {
            console.log('Error reading token entitlement data by role id', e)
        }
        for (const t of encodedTokens) {
            const tokens = decodeExternalTokens(
                t,
                'v4',
            ) as TokenEntitlementDataTypes['ExternalTokenStruct'][]
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
        const tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][] = rawTokenDetails.length
            ? rawTokenDetails[0]
            : []
        return tokens
    }
}
