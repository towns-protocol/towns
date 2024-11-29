import {
    IRuleEntitlement as LocalhostContract,
    IRuleEntitlementBase as LocalhostBase,
    IRuleEntitlementInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlement'

import LocalhostAbi from '@river-build/generated/dev/abis/IRuleEntitlement.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { BigNumberish, ethers } from 'ethers'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'
import { dlogger } from '@river-build/dlog'
const logger = dlogger('csb:SpaceDapp:debug')

export class RuleEntitlementShim
    extends BaseContractShim<LocalhostContract, LocalhostInterface>
    implements EntitlementModule
{
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }

    public get moduleType(): EntitlementModuleType {
        return EntitlementModuleType.RuleEntitlement
    }

    public async getRoleEntitlement(
        roleId: BigNumberish,
    ): Promise<LocalhostBase.RuleDataStruct | null> {
        if (roleId === 0) {
            return {
                operations: [],
                checkOperations: [],
                logicalOperations: [],
            }
        }
        return this.read.getRuleData(roleId)
    }

    public decodeGetRuleData(entitlementData: string): LocalhostBase.RuleDataStruct | undefined {
        try {
            const decoded = this.decodeFunctionResult(
                'getRuleData',
                entitlementData,
            ) as unknown as LocalhostBase.RuleDataStruct[]

            if (decoded.length === 0) {
                logger.error('RuleEntitlementShim No rule data', decoded)
                return undefined
            }
            return decoded?.length > 0 ? decoded[0] : undefined
        } catch (error) {
            logger.error('RuleEntitlementShim Error decoding RuleDataStruct', error)
        }
        return
    }
}
