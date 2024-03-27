import {
    UserEntitlement as LocalhostContract,
    UserEntitlementInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/UserEntitlement'
import {
    UserEntitlement as BaseSepoliaContract,
    UserEntitlementInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/UserEntitlement'

import LocalhostAbi from '@river-build/generated/dev/abis/UserEntitlement.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/UserEntitlement.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { BigNumberish, ethers } from 'ethers'
import { decodeUsers } from '../ConvertersEntitlements'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'
import { dlogger } from '@river/dlog'

const logger = dlogger('csb:UserEntitlementShim:debug')

export class UserEntitlementShim
    extends BaseContractShim<
        LocalhostContract,
        LocalhostInterface,
        BaseSepoliaContract,
        BaseSepoliaInterface
    >
    implements EntitlementModule
{
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            31337: LocalhostAbi,
            84532: BaseSepoliaAbi,
        })
    }

    public get moduleType(): EntitlementModuleType {
        return EntitlementModuleType.UserEntitlement
    }

    public async getRoleEntitlement(roleId: BigNumberish): Promise<string[]> {
        try {
            const users = await this.read.getEntitlementDataByRoleId(roleId)
            if (typeof users === 'string') {
                return decodeUsers(users)
            } else {
                return []
            }
        } catch (e) {
            logger.error('Error getting role entitlement:', e)
            throw e
        }
    }
}
