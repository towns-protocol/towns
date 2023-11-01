import LocalhostAbi from '@towns/generated/localhost/v3/abis/TokenEntitlement.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TokenEntitlement.abi'

import { BaseContractShimV4 } from './BaseContractShimV4'
import { Address, Chain, PublicClient, Transport } from 'viem'
import { ContractFunctionInputs } from './types'
import { decodeExternalTokens } from './ConvertersEntitlements'
import { EntitlementModuleType, EntitlementModule } from './ContractTypesV4'

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const

export interface TokenEntitlementDataTypes {
    // get a single array element encodeExternalTokens to match previous ethers type
    ExternalTokenStruct: ContractFunctionInputs<typeof LocalhostAbi, 'encodeExternalTokens'>[0][0]
}

export class TokenEntitlementShim<T extends Transport, C extends Chain>
    extends BaseContractShimV4<typeof abis, T, C>
    implements EntitlementModule
{
    constructor(address: Address, chainId: number, client: PublicClient<T, C> | undefined) {
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
        const tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][] = rawTokenDetails.length
            ? rawTokenDetails[0]
            : []
        return tokens
    }
}
