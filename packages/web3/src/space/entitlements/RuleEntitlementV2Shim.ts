import { IRuleEntitlementBase } from '@towns-protocol/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2'
import { IRuleEntitlementV2__factory } from '@towns-protocol/generated/dev/typings/factories/IRuleEntitlement.sol/IRuleEntitlementV2__factory'
import { BaseContractShim } from '../../BaseContractShim'
import { BigNumberish, ethers } from 'ethers'
import { EntitlementModuleType, EntitlementModule } from '../../types/ContractTypes'
import { dlogger } from '@towns-protocol/dlog'
const logger = dlogger('csb:SpaceDapp:debug')

const { abi, connect } = IRuleEntitlementV2__factory

export { abi as IRuleEntitlementV2Abi }
export type {
    IRuleEntitlementBase as IRuleEntitlementV2Base,
    IRuleEntitlementV2,
} from '@towns-protocol/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2'

export class RuleEntitlementV2Shim
    extends BaseContractShim<typeof connect>
    implements EntitlementModule
{
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }

    public get moduleType(): EntitlementModuleType {
        return EntitlementModuleType.RuleEntitlementV2
    }

    public async getRoleEntitlement(
        roleId: BigNumberish,
    ): Promise<IRuleEntitlementBase.RuleDataV2Struct | null> {
        if (roleId === 0) {
            return {
                operations: [],
                checkOperations: [],
                logicalOperations: [],
            }
        }
        return this.read.getRuleDataV2(roleId)
    }

    public decodeGetRuleData(
        entitlementData: string,
    ): IRuleEntitlementBase.RuleDataV2Struct | undefined {
        try {
            const decoded = this.decodeFunctionResult(
                'getRuleDataV2',
                entitlementData,
            ) as unknown as IRuleEntitlementBase.RuleDataV2Struct[]

            if (decoded.length === 0) {
                logger.error('RuleEntitlementV2Shim No rule data', decoded)
                return undefined
            }
            return decoded.length > 0 ? decoded[0] : undefined
        } catch (error) {
            logger.error('RuleEntitlementV2Shim Error decoding RuleDataV2Struct', error)
        }
        return
    }
}
