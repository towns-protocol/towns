import {
    IERC721A as DevContract,
    IERC721AInterface as DevInterface,
} from '@river-build/generated/dev/typings/IERC721A'
import {
    IERC721A as V3Contract,
    IERC721AInterface as V3Interface,
} from '@river-build/generated/v3/typings/IERC721A'

import DevAbi from '@river-build/generated/dev/abis/IERC721A.abi' assert { type: 'json' }
import V3Abi from '@river-build/generated/v3/abis/IERC721A.abi' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class IERC721AShim extends BaseContractShim<
    DevContract,
    DevInterface,
    V3Contract,
    V3Interface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: DevAbi,
            [ContractVersion.v3]: V3Abi,
        })
    }
}
