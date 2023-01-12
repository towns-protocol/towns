/* eslint-disable no-restricted-imports */

import { BaseContractShimV2 } from './BaseContractShimV2'
import { CouncilNFT as GoerliCouncilNFT } from '@harmony/contracts/goerli/typings/CouncilNFT'
import { CouncilNFT as LocalhostCouncilNFT } from '@harmony/contracts/localhost/typings/CouncilNFT'

export class CouncilNFTShim extends BaseContractShimV2<LocalhostCouncilNFT, GoerliCouncilNFT> {}
