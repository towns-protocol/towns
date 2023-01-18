/* eslint-disable no-restricted-imports */

import { BaseContractShimV2 } from './BaseContractShimV2'
import {
    CouncilNFT as GoerliContract,
    CouncilNFTInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/CouncilNFT'
import {
    CouncilNFT as LocalhostContract,
    CouncilNFTInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/CouncilNFT'

export class CouncilNFTShim extends BaseContractShimV2<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
