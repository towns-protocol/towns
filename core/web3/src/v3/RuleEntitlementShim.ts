import {
    IRuleEntitlement as LocalhostContract,
    IRuleEntitlementInterface as LocalhostInterface,
} from '@river/generated/dev/typings/IRuleEntitlement'

type BaseSepoliaContract = LocalhostContract
type BaseSepoliaInterface = LocalhostInterface
import LocalhostAbi from '@river/generated/dev/abis/UserEntitlement.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river/generated/v3/abis/UserEntitlement.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { BigNumberish, ethers } from 'ethers'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'

export class RuleEntitlementShim
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
        return EntitlementModuleType.RuleEntitlement
    }

    public async getRoleEntitlement(
        roleId: BigNumberish,
    ): Promise<LocalhostContract.RuleDataStruct | null> {
        if (roleId === 0) {
            return {
                operations: [],
                checkOperations: [],
                logicalOperations: [],
            }
        }
        return null
    }
}
