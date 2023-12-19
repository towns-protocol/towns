import LocalhostAbi from '@towns/generated/localhost/v3/abis/UserEntitlement.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/UserEntitlement.abi'
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/UserEntitlement.abi'

import { decodeUsers } from '../ConvertersEntitlements'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'
import { Address, Hex, PublicClient } from 'viem'
import { BaseContractShim } from './BaseContractShim'

const abis = {
    localhostAbi: LocalhostAbi,
    goerliAbi: BaseGoerliAbi,
    sepoliaAbi: BaseSepoliaAbi,
} as const
export class UserEntitlementShim
    extends BaseContractShim<typeof abis>
    implements EntitlementModule
{
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }

    public get moduleType(): EntitlementModuleType {
        return EntitlementModuleType.UserEntitlement
    }

    public async getRoleEntitlement(roleId: bigint): Promise<string[]> {
        // a user-gated entitlement has multiple user arrays OR together or AND together.
        // the first dimensions are the ORs; the second dimensions are the ANDs.
        const rawUserDetails: string[][] = []
        let encodedUsers: readonly Hex[] = []
        try {
            encodedUsers = await this.read({
                functionName: 'getEntitlementDataByRoleId',
                args: [roleId],
            })
        } catch (e) {
            console.log('Error getting role entitlement:', e)
        }
        for (const u of encodedUsers) {
            const users = decodeUsers(u)
            rawUserDetails.push(users)
        }
        // verify that we have only one user entitlement.
        // the app only requires one at the moment.
        // in the future we might want to support more.
        if (rawUserDetails.length > 1) {
            console.error(
                'More than one user entitlement not supported at the moment.',
                rawUserDetails,
            )
            throw new Error('More than one user entitlement not supported at the moment.')
        }
        const users: string[] = rawUserDetails.length ? rawUserDetails[0] : []
        return users
    }
}
