import {
    IRuleEntitlement,
    IRuleEntitlementBase,
} from '@towns-protocol/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlement'
import { BaseContractShim } from '../../BaseContractShim'
import { BigNumberish, ethers } from 'ethers'
import { EntitlementModuleType, EntitlementModule } from '../../types/ContractTypes'
import { dlogger } from '@towns-protocol/dlog'
import { IRuleEntitlement__factory } from '@towns-protocol/generated/dev/typings/factories/IRuleEntitlement.sol/IRuleEntitlement__factory'
const logger = dlogger('csb:SpaceDapp:debug')

const { abi, connect } = IRuleEntitlement__factory
export { abi as IRuleEntitlementAbi }
export type { IRuleEntitlementBase, IRuleEntitlement }

export class RuleEntitlementShim
    extends BaseContractShim<typeof connect>
    implements EntitlementModule
{
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }

    public get moduleType(): EntitlementModuleType {
        return EntitlementModuleType.RuleEntitlement
    }

    public async getRoleEntitlement(
        roleId: BigNumberish,
    ): Promise<IRuleEntitlementBase.RuleDataStruct | null> {
        if (roleId === 0) {
            return {
                operations: [],
                checkOperations: [],
                logicalOperations: [],
            }
        }
        return this.read.getRuleData(roleId)
    }

    public decodeGetRuleData(
        entitlementData: string,
    ): IRuleEntitlementBase.RuleDataStruct | undefined {
        try {
            const decoded = this.decodeFunctionResult(
                'getRuleData',
                entitlementData,
            ) as unknown as IRuleEntitlementBase.RuleDataStruct[]

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
