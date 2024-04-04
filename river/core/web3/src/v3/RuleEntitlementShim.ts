import {
    IRuleEntitlement as LocalhostContract,
    IRuleEntitlementInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IRuleEntitlement'

type BaseSepoliaContract = LocalhostContract
type BaseSepoliaInterface = LocalhostInterface
import LocalhostAbi from '@river-build/generated/dev/abis/IRuleEntitlement.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/IRuleEntitlement.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { BigNumberish, ethers } from 'ethers'
import { EntitlementModuleType, EntitlementModule } from '../ContractTypes'
import { ContractVersion } from '../IStaticContractsInfo'

export class RuleEntitlementShim
    extends BaseContractShim<
        LocalhostContract,
        LocalhostInterface,
        BaseSepoliaContract,
        BaseSepoliaInterface
    >
    implements EntitlementModule
{
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: LocalhostAbi,
            [ContractVersion.v3]: BaseSepoliaAbi,
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
        return this.read.getRuleData(roleId)
    }
}
