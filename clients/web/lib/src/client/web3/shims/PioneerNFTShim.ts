/* eslint-disable no-restricted-imports */

import {
    Pioneer as GoerliContract,
    PioneerInterface as GoerliInterface,
} from '@harmony/generated/goerli/typings/Pioneer'
import {
    Pioneer as LocalhostContract,
    PioneerInterface as LocalhostInterface,
} from '@harmony/generated/localhost/typings/Pioneer'

import { BaseContractShim } from './BaseContractShim'

export class PioneerNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
