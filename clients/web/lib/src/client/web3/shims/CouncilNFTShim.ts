/* eslint-disable no-restricted-imports */

import { BaseContractShim } from './BaseContractShim'
import {
    CouncilNFT as GoerliContract,
    CouncilNFTInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/CouncilNFT'
import {
    CouncilNFT as LocalhostContract,
    CouncilNFTInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/CouncilNFT'

export class CouncilNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
