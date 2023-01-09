/* eslint-disable no-restricted-imports */

import { BaseContractShimV2 } from './BaseContractShimV2'
// V2 smart contracts are not deployed to Goerli yet
//import { SpaceFactory as GoerliSpaceFactory } from '@harmony/contracts/goerli/typings/SpaceFactory'
import { SpaceFactory as LocalhostSpaceFactory } from '@harmony/contracts/localhost/typings/SpaceFactory'

export class SpaceFactoryShim extends BaseContractShimV2<LocalhostSpaceFactory, undefined> {}
