/* eslint-disable no-restricted-imports */

import {
    Pioneer as GoerliContract,
    PioneerInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/Pioneer'
import {
    Pioneer as LocalhostContract,
    PioneerInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/Pioneer'

import { BaseContractShim } from './BaseContractShim'

export class PioneerNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
