import {
    UserEntitlement as LocalhostContract,
    UserEntitlementInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/UserEntitlement'
import {
    UserEntitlement as BaseGoerliContract,
    UserEntitlementInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/UserEntitlement'

import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/UserEntitlement.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/UserEntitlement.abi.json' assert { type: 'json' }

import { BigNumberish, ethers } from 'ethers'
import { decodeUsers } from '../ConvertersEntitlements'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'

export class UserEntitlementShim
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
        return EntitlementModuleType.UserEntitlement
    }

    public async getRoleEntitlement(roleId: BigNumberish): Promise<string[]> {
        // a user-gated entitlement has multiple user arrays OR together or AND together.
        // the first dimensions are the ORs; the second dimensions are the ANDs.
        const rawUserDetails: string[][] = []
        let encodedUsers: string[] = []
        try {
            encodedUsers = await this.read.getEntitlementDataByRoleId(roleId)
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
