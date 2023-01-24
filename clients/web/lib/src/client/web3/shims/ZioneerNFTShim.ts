/* eslint-disable no-restricted-imports */

import { BaseContractShim } from './BaseContractShim'
import {
    Zioneer as GoerliContract,
    ZioneerInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/Zioneer'
import {
    Zioneer as LocalhostContract,
    ZioneerInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/Zioneer'

export class ZioneerNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
