/* eslint-disable no-restricted-imports */

import {
    Member as GoerliContract,
    MemberInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/Member'
import {
    Member as LocalhostContract,
    MemberInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/Member'

import {
    Member as SepoliaContract,
    MemberInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/Member'

import { BaseContractShim } from './BaseContractShim'

export class MemberNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
